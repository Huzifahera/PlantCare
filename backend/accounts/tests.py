from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import UserProfile
from .serializers import RegisterSerializer, UserProfileSerializer

User = get_user_model()


class AccountsSerializerTests(APITestCase):
    """Tests for RegisterSerializer and UserProfileSerializer."""

    def test_user_registration_with_valid_data(self):
        """Valid registration creates a User and an associated UserProfile."""
        data = {
            'username': 'plantlover',
            'email': 'PlantLover@Example.com',
            'password': 'StrongPassword!2026',
        }
        serializer = RegisterSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()

        self.assertEqual(user.username, 'plantlover')
        self.assertEqual(user.email, 'plantlover@example.com')
        self.assertTrue(UserProfile.objects.filter(user=user).exists())

    def test_duplicate_email_registration_rejected(self):
        """Registration rejects duplicate emails regardless of case."""
        User.objects.create_user(
            username='existing_user',
            email='duplicate@example.com',
            password='StrongPassword!2026',
        )
        serializer = RegisterSerializer(
            data={
                'username': 'new_user',
                'email': 'DUPLICATE@example.com',
                'password': 'StrongPassword!2026',
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)

    def test_password_hashing_and_write_only_behavior(self):
        """Password is hashed in DB and never exposed in serialized output."""
        raw_password = 'StrongPassword!2026'
        serializer = RegisterSerializer(
            data={
                'username': 'secureuser',
                'email': 'secure@example.com',
                'password': raw_password,
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()

        self.assertNotEqual(user.password, raw_password)
        self.assertTrue(user.check_password(raw_password))
        self.assertNotIn('password', serializer.data)

    def test_user_profile_serialization_and_protected_fields(self):
        """Profile updates allowed fields while protecting account identity fields."""
        user = User.objects.create_user(
            username='alice',
            email='alice@example.com',
            password='StrongPassword!2026',
        )
        other_user = User.objects.create_user(
            username='bob',
            email='bob@example.com',
            password='StrongPassword!2026',
        )
        profile = UserProfile.objects.create(user=user)

        serializer = UserProfileSerializer(
            profile,
            data={
                'full_name': 'Alice Green',
                'phone_number': '01711111111',
                'location': 'Dhaka',
                'username': 'tampered_name',
                'email': 'tampered@example.com',
                'user': other_user.id,
            },
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated = serializer.save()

        self.assertEqual(updated.full_name, 'Alice Green')
        self.assertEqual(updated.phone_number, '01711111111')
        self.assertEqual(updated.location, 'Dhaka')
        self.assertEqual(updated.user_id, user.id)
        self.assertEqual(updated.user.username, 'alice')
        self.assertEqual(updated.user.email, 'alice@example.com')
        self.assertEqual(serializer.data['username'], 'alice')
        self.assertEqual(serializer.data['email'], 'alice@example.com')


import io
import tempfile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from PIL import Image
from rest_framework import status


def _make_avatar_image(name='avatar.png'):
    buf = io.BytesIO()
    Image.new('RGB', (20, 20), color='teal').save(buf, format='PNG')
    buf.seek(0)
    return SimpleUploadedFile(name, buf.read(), content_type='image/png')


class AccountsAPITests(APITestCase):
    """End-to-end API tests for registration, JWT auth, and user profile."""

    def setUp(self):
        self.register_url = reverse('accounts:register')
        self.login_url = reverse('accounts:token_obtain_pair')
        self.refresh_url = reverse('accounts:token_refresh')
        self.profile_url = reverse('accounts:profile')

    def test_register_login_and_refresh_flow(self):
        """Public register, JWT login, and token refresh work end-to-end."""
        reg_resp = self.client.post(
            self.register_url,
            {
                'username': 'api_user',
                'email': 'api_user@example.com',
                'password': 'StrongPassword!2026',
            },
            format='json',
        )
        self.assertEqual(reg_resp.status_code, status.HTTP_201_CREATED)
        self.assertNotIn('password', reg_resp.data)

        login_resp = self.client.post(
            self.login_url,
            {'username': 'api_user', 'password': 'StrongPassword!2026'},
            format='json',
        )
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_resp.data)
        self.assertIn('refresh', login_resp.data)

        refresh_resp = self.client.post(
            self.refresh_url,
            {'refresh': login_resp.data['refresh']},
            format='json',
        )
        self.assertEqual(refresh_resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', refresh_resp.data)

    def test_profile_requires_authentication(self):
        """Unauthenticated requests to profile endpoint return 401."""
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_retrieve_update_and_image_upload(self):
        """Authenticated user can retrieve and update profile with image upload."""
        self.client.post(
            self.register_url,
            {
                'username': 'img_user',
                'email': 'img_user@example.com',
                'password': 'StrongPassword!2026',
            },
            format='json',
        )
        login_resp = self.client.post(
            self.login_url,
            {'username': 'img_user', 'password': 'StrongPassword!2026'},
            format='json',
        )
        access = login_resp.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        get_resp = self.client.get(self.profile_url)
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(get_resp.data['username'], 'img_user')

        with tempfile.TemporaryDirectory() as tmp_media:
            with override_settings(MEDIA_ROOT=tmp_media):
                patch_resp = self.client.patch(
                    self.profile_url,
                    {
                        'full_name': 'Api User',
                        'location': 'Dhaka',
                        'profile_image': _make_avatar_image(),
                    },
                    format='multipart',
                )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data['full_name'], 'Api User')
        self.assertTrue(patch_resp.data['profile_image'])
