from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, APITestCase

from plants.models import Plant

from .serializers import HealthRecordSerializer

User = get_user_model()


class HealthRecordSerializerTests(APITestCase):
    """Tests for HealthRecordSerializer ownership and health score validation."""

    def setUp(self):
        self.factory = APIRequestFactory()
        self.owner = User.objects.create_user(
            username='health_owner',
            email='health_owner@example.com',
            password='StrongPassword!2026',
        )
        self.other_user = User.objects.create_user(
            username='health_other',
            email='health_other@example.com',
            password='StrongPassword!2026',
        )
        self.plant = Plant.objects.create(
            user=self.owner,
            plant_name='Peace Lily',
        )

    def _request_for(self, user):
        request = self.factory.post('/')
        request.user = user
        return request

    def test_health_record_prevents_other_users_plant(self):
        """HealthRecordSerializer rejects plants owned by another user."""
        serializer = HealthRecordSerializer(
            data={
                'plant': self.plant.id,
                'health_status': 'healthy',
                'health_score': 90.0,
            },
            context={'request': self._request_for(self.other_user)},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('plant', serializer.errors)

    def test_health_score_validation_range(self):
        """Health score must be within 0-100 inclusive."""
        for bad_score in (-1.0, 101.0):
            serializer = HealthRecordSerializer(
                data={
                    'plant': self.plant.id,
                    'health_status': 'moderate',
                    'health_score': bad_score,
                },
                context={'request': self._request_for(self.owner)},
            )
            self.assertFalse(serializer.is_valid())
            self.assertIn('health_score', serializer.errors)

        for good_score in (0.0, 75.5, 100.0):
            serializer = HealthRecordSerializer(
                data={
                    'plant': self.plant.id,
                    'health_status': 'healthy',
                    'health_score': good_score,
                    'notes': 'Checked leaves',
                },
                context={'request': self._request_for(self.owner)},
            )
            self.assertTrue(serializer.is_valid(), serializer.errors)


from django.urls import reverse
from rest_framework import status

from .models import HealthRecord


class HealthRecordAPITests(APITestCase):
    """End-to-end API tests for Plant Health endpoints."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username='api_health_owner',
            email='api_health_owner@example.com',
            password='StrongPassword!2026',
        )
        self.other = User.objects.create_user(
            username='api_health_other',
            email='api_health_other@example.com',
            password='StrongPassword!2026',
        )
        self.plant = Plant.objects.create(user=self.owner, plant_name='Pothos')
        self.list_url = reverse('plant_health:healthrecord-list')

    def test_health_record_crud(self):
        """Owner can create, list, update, and delete health records."""
        self.client.force_authenticate(user=self.owner)
        create_resp = self.client.post(
            self.list_url,
            {
                'plant': self.plant.id,
                'health_status': 'healthy',
                'health_score': 88.0,
                'notes': 'Strong new growth',
            },
            format='json',
        )
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        record_id = create_resp.data['id']

        detail_url = reverse('plant_health:healthrecord-detail', args=[record_id])
        patch_resp = self.client.patch(
            detail_url, {'health_score': 92.5}, format='json'
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data['health_score'], 92.5)

        del_resp = self.client.delete(detail_url)
        self.assertEqual(del_resp.status_code, status.HTTP_204_NO_CONTENT)

    def test_health_record_cross_user_blocked_and_invalid_score(self):
        """Other users cannot access records and invalid scores return 400."""
        record = HealthRecord.objects.create(
            plant=self.plant, health_status='healthy', health_score=80.0
        )
        self.client.force_authenticate(user=self.other)
        self.assertEqual(len(self.client.get(self.list_url).data), 0)
        self.assertEqual(
            self.client.get(
                reverse('plant_health:healthrecord-detail', args=[record.id])
            ).status_code,
            status.HTTP_404_NOT_FOUND,
        )

        self.client.force_authenticate(user=self.owner)
        bad_resp = self.client.post(
            self.list_url,
            {'plant': self.plant.id, 'health_score': -10.0},
            format='json',
        )
        self.assertEqual(bad_resp.status_code, status.HTTP_400_BAD_REQUEST)
