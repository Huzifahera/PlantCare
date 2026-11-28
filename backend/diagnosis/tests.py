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


import json
from unittest.mock import MagicMock, patch


class AnalyzePlantImageTests(APITestCase):
    """Tests for the Qwen Vision plant image analysis endpoint."""

    url = '/api/diagnosis/analyze/'

    @override_settings(
        HF_ROUTER_URL='https://router.huggingface.co/v1/chat/completions',
        HF_TOKEN='test-key',
        HF_VISION_MODEL='Qwen/Qwen2.5-VL-7B-Instruct',
    )
    @patch('config.hf_client.requests.post')
    def test_analyze_jackfruit_image_success(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            'choices': [
                {
                    'message': {
                        'content': json.dumps(
                            {
                                'plant_name': 'Jackfruit (Artocarpus heterophyllus)',
                                'confidence': '97.2%',
                                'uncertainty_note': 'Visual identification only; root health cannot be confirmed from a leaf photo.',
                                'health_status': 'Healthy & Thriving 🌿',
                                'health_score': 94,
                                'disease_name': 'Healthy',
                                'symptoms': 'No visible lesions.',
                                'possible_causes': 'N/A',
                                'severity': 'low',
                                'diagnosis': 'Broad, glossy dark-green leaves characteristic of Artocarpus heterophyllus with no visible fungal lesions.',
                                'qwen_advice': [
                                    'Ensure full sunlight for at least 6 hours daily.',
                                    'Water deeply when the top 2 inches of soil dry out.',
                                    'Maintain well-draining loamy soil.',
                                ],
                            }
                        )
                    }
                }
            ]
        }
        mock_post.return_value = mock_response

        response = self.client.post(
            self.url,
            {'image': _make_test_image('jackfruit.png')},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['plant_name'], 'Jackfruit (Artocarpus heterophyllus)')
        self.assertEqual(response.data['confidence'], '97.2%')
        self.assertIn('uncertainty_note', response.data)
        self.assertEqual(response.data['health_score'], 94)
        self.assertEqual(len(response.data['qwen_advice']), 3)

    def test_analyze_requires_image(self):
        response = self.client.post(self.url, {}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('image', response.data)

    @override_settings(
        HF_ROUTER_URL='https://router.huggingface.co/v1/chat/completions',
        HF_TOKEN='',
    )
    def test_analyze_without_api_key_returns_503(self):
        response = self.client.post(
            self.url,
            {'image': _make_test_image('jackfruit.png')},
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn('HF_TOKEN', response.data['detail'])
