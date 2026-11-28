import io

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APIRequestFactory, APITestCase

from plants.models import Plant

from .serializers import DiagnosisSerializer

User = get_user_model()


def _make_test_image(name='leaf.png'):
    buf = io.BytesIO()
    Image.new('RGB', (10, 10), color='green').save(buf, format='PNG')
    buf.seek(0)
    return SimpleUploadedFile(name, buf.read(), content_type='image/png')


class DiagnosisSerializerTests(APITestCase):
    """Tests for DiagnosisSerializer ownership and percentage validation."""

    def setUp(self):
        self.factory = APIRequestFactory()
        self.owner = User.objects.create_user(
            username='diag_owner',
            email='diag_owner@example.com',
            password='StrongPassword!2026',
        )
        self.other_user = User.objects.create_user(
            username='diag_other',
            email='diag_other@example.com',
            password='StrongPassword!2026',
        )
        self.plant = Plant.objects.create(
            user=self.owner,
            plant_name='Tomato',
        )

    def _request_for(self, user):
        request = self.factory.post('/')
        request.user = user
        return request

    def test_diagnosis_prevents_other_users_plant(self):
        """DiagnosisSerializer rejects plants not owned by request.user."""
        serializer = DiagnosisSerializer(
            data={
                'plant': self.plant.id,
                'original_image': _make_test_image(),
                'confidence_score': 85.0,
                'affected_area_percentage': 15.0,
            },
            context={'request': self._request_for(self.other_user)},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('plant', serializer.errors)

    def test_diagnosis_percentage_validation_bounds(self):
        """Confidence score and affected area percentage must be within 0-100."""
        # Out-of-bounds values fail
        invalid_serializer = DiagnosisSerializer(
            data={
                'plant': self.plant.id,
                'original_image': _make_test_image(),
                'confidence_score': 100.1,
                'affected_area_percentage': -0.5,
            },
            context={'request': self._request_for(self.owner)},
        )
        self.assertFalse(invalid_serializer.is_valid())
        self.assertIn('confidence_score', invalid_serializer.errors)
        self.assertIn('affected_area_percentage', invalid_serializer.errors)

        # Boundary values 0 and 100 pass
        valid_serializer = DiagnosisSerializer(
            data={
                'plant': self.plant.id,
                'original_image': _make_test_image(),
                'disease_name': 'Early Blight',
                'confidence_score': 100.0,
                'severity': 'low',
                'affected_area_percentage': 0.0,
            },
            context={'request': self._request_for(self.owner)},
        )
        self.assertTrue(valid_serializer.is_valid(), valid_serializer.errors)


import tempfile
from django.test import override_settings
from django.urls import reverse
from rest_framework import status

from .models import Diagnosis


class DiagnosisAPITests(APITestCase):
    """End-to-end API tests for Diagnosis endpoints."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username='api_diag_owner',
            email='api_diag_owner@example.com',
            password='StrongPassword!2026',
        )
        self.other = User.objects.create_user(
            username='api_diag_other',
            email='api_diag_other@example.com',
            password='StrongPassword!2026',
        )
        self.plant = Plant.objects.create(user=self.owner, plant_name='Rose')
        self.list_url = reverse('diagnosis:diagnosis-list')

    def test_diagnosis_create_with_images_and_retrieve(self):
        """Owner can upload original and segmented images and retrieve diagnosis."""
        self.client.force_authenticate(user=self.owner)
        with tempfile.TemporaryDirectory() as tmp_media:
            with override_settings(MEDIA_ROOT=tmp_media):
                resp = self.client.post(
                    self.list_url,
                    {
                        'plant': self.plant.id,
                        'original_image': _make_test_image('orig.png'),
                        'segmented_image': _make_test_image('seg.png'),
                        'disease_name': 'Black Spot',
                        'confidence_score': 94.5,
                        'severity': 'moderate',
                        'affected_area_percentage': 22.0,
                        'recommendation': 'Apply fungicide.',
                        'model_version': 'v1.0',
                    },
                    format='multipart',
                )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        diag_id = resp.data['id']

        list_resp = self.client.get(self.list_url)
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_resp.data), 1)

        detail_resp = self.client.get(
            reverse('diagnosis:diagnosis-detail', args=[diag_id])
        )
        self.assertEqual(detail_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_resp.data['disease_name'], 'Black Spot')

    def test_diagnosis_cross_user_and_invalid_percentage(self):
        """Cross-user access is blocked and out-of-range percentages return 400."""
        with tempfile.TemporaryDirectory() as tmp_media:
            with override_settings(MEDIA_ROOT=tmp_media):
                diag = Diagnosis.objects.create(
                    plant=self.plant,
                    original_image=_make_test_image('saved.png'),
                    disease_name='Rust',
                )

        self.client.force_authenticate(user=self.other)
        self.assertEqual(len(self.client.get(self.list_url).data), 0)
        self.assertEqual(
            self.client.get(
                reverse('diagnosis:diagnosis-detail', args=[diag.id])
            ).status_code,
            status.HTTP_404_NOT_FOUND,
        )

        self.client.force_authenticate(user=self.owner)
        bad_resp = self.client.post(
            self.list_url,
            {
                'plant': self.plant.id,
                'original_image': _make_test_image('bad.png'),
                'confidence_score': 150.0,
            },
            format='multipart',
        )
        self.assertEqual(bad_resp.status_code, status.HTTP_400_BAD_REQUEST)
