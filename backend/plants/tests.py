from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIRequestFactory, APITestCase

from .models import CareLog, Plant
from .serializers import CareLogSerializer, PlantSerializer

User = get_user_model()


class PlantsSerializerTests(APITestCase):
    """Tests for PlantSerializer and CareLogSerializer."""

    def setUp(self):
        self.factory = APIRequestFactory()
        self.owner = User.objects.create_user(
            username='owner_user',
            email='owner@example.com',
            password='StrongPassword!2026',
        )
        self.other_user = User.objects.create_user(
            username='other_user',
            email='other@example.com',
            password='StrongPassword!2026',
        )
        self.owner_plant = Plant.objects.create(
            user=self.owner,
            plant_name='Monstera',
            plant_type='Indoor',
            health_status='healthy',
        )

    def _request_for(self, user):
        request = self.factory.post('/')
        request.user = user
        return request

    def test_plant_serializer_valid_creation_and_owner_assignment(self):
        """PlantSerializer assigns request.user and ignores client-supplied user."""
        serializer = PlantSerializer(
            data={
                'plant_name': 'Fiddle Leaf Fig',
                'scientific_name': 'Ficus lyrata',
                'plant_type': 'Indoor',
                'location': 'Balcony',
                'health_status': 'healthy',
                'user': self.other_user.id,
            },
            context={'request': self._request_for(self.owner)},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        plant = serializer.save()

        self.assertEqual(plant.user_id, self.owner.id)
        self.assertEqual(plant.plant_name, 'Fiddle Leaf Fig')
        self.assertIn('date_added', serializer.data)
        self.assertIn('updated_at', serializer.data)

    def test_plant_serializer_rejects_blank_name(self):
        """PlantSerializer rejects whitespace-only plant names."""
        serializer = PlantSerializer(
            data={'plant_name': '   '},
            context={'request': self._request_for(self.owner)},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('plant_name', serializer.errors)

    def test_carelog_prevents_assigning_other_users_plant(self):
        """CareLogSerializer blocks creating a log for another user's plant."""
        serializer = CareLogSerializer(
            data={
                'plant': self.owner_plant.id,
                'care_type': 'watering',
                'description': 'Morning water',
                'care_date': timezone.now().isoformat(),
            },
            context={'request': self._request_for(self.other_user)},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('plant', serializer.errors)

    def test_carelog_allows_own_plant(self):
        """CareLogSerializer accepts a care log for the user's own plant."""
        serializer = CareLogSerializer(
            data={
                'plant': self.owner_plant.id,
                'care_type': 'watering',
                'description': 'Morning water',
                'care_date': timezone.now().isoformat(),
            },
            context={'request': self._request_for(self.owner)},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        care_log = serializer.save()
        self.assertIsInstance(care_log, CareLog)
        self.assertEqual(care_log.plant_id, self.owner_plant.id)


import io
import tempfile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from PIL import Image
from rest_framework import status


def _make_plant_image(name='plant.png'):
    buf = io.BytesIO()
    Image.new('RGB', (20, 20), color='green').save(buf, format='PNG')
    buf.seek(0)
    return SimpleUploadedFile(name, buf.read(), content_type='image/png')


class PlantsAPITests(APITestCase):
    """End-to-end API tests for Plant and CareLog endpoints."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username='api_plant_owner',
            email='api_plant_owner@example.com',
            password='StrongPassword!2026',
        )
        self.other = User.objects.create_user(
            username='api_plant_other',
            email='api_plant_other@example.com',
            password='StrongPassword!2026',
        )
        self.owner_plant = Plant.objects.create(
            user=self.owner,
            plant_name='Owner Fern',
            health_status='healthy',
        )
        self.plant_list_url = reverse('plants:plant-list')
        self.carelog_list_url = reverse('plants:carelog-list')

    def test_plants_require_authentication(self):
        """Unauthenticated plant list returns 401."""
        resp = self.client.get(self.plant_list_url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_plant_crud_and_image_upload(self):
        """Authenticated user can create (with image), list, update, and delete plants."""
        self.client.force_authenticate(user=self.owner)
        with tempfile.TemporaryDirectory() as tmp_media:
            with override_settings(MEDIA_ROOT=tmp_media):
                create_resp = self.client.post(
                    self.plant_list_url,
                    {
                        'plant_name': 'Orchid',
                        'plant_type': 'Flowering',
                        'plant_image': _make_plant_image(),
                    },
                    format='multipart',
                )
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        plant_id = create_resp.data['id']

        list_resp = self.client.get(self.plant_list_url)
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_resp.data), 2)

        detail_url = reverse('plants:plant-detail', args=[plant_id])
        patch_resp = self.client.patch(
            detail_url, {'location': 'Window'}, format='json'
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data['location'], 'Window')

        del_resp = self.client.delete(detail_url)
        self.assertEqual(del_resp.status_code, status.HTTP_204_NO_CONTENT)

    def test_cross_user_plant_and_carelog_access_blocked(self):
        """Other user cannot list, retrieve, update, delete, or add logs to owner's plant."""
        care_log = CareLog.objects.create(
            plant=self.owner_plant,
            care_type='watering',
            care_date=timezone.now(),
        )
        self.client.force_authenticate(user=self.other)

        # List is scoped to other user (empty)
        self.assertEqual(len(self.client.get(self.plant_list_url).data), 0)
        self.assertEqual(len(self.client.get(self.carelog_list_url).data), 0)

        # Direct detail access returns 404 (queryset filtered)
        plant_detail = reverse('plants:plant-detail', args=[self.owner_plant.id])
        self.assertEqual(
            self.client.get(plant_detail).status_code, status.HTTP_404_NOT_FOUND
        )
        self.assertEqual(
            self.client.delete(plant_detail).status_code, status.HTTP_404_NOT_FOUND
        )

        care_detail = reverse('plants:carelog-detail', args=[care_log.id])
        self.assertEqual(
            self.client.get(care_detail).status_code, status.HTTP_404_NOT_FOUND
        )

        # Cannot create CareLog for owner's plant
        bad_log = self.client.post(
            self.carelog_list_url,
            {
                'plant': self.owner_plant.id,
                'care_type': 'pruning',
                'care_date': timezone.now().isoformat(),
            },
            format='json',
        )
        self.assertEqual(bad_log.status_code, status.HTTP_400_BAD_REQUEST)
