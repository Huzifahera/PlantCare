from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, APITestCase

from plants.models import Plant

from .serializers import WeatherRecordSerializer

User = get_user_model()


class WeatherRecordSerializerTests(APITestCase):
    """Tests for WeatherRecordSerializer optional plant ownership and ranges."""

    def setUp(self):
        self.factory = APIRequestFactory()
        self.owner = User.objects.create_user(
            username='weather_owner',
            email='weather_owner@example.com',
            password='StrongPassword!2026',
        )
        self.other_user = User.objects.create_user(
            username='weather_other',
            email='weather_other@example.com',
            password='StrongPassword!2026',
        )
        self.plant = Plant.objects.create(
            user=self.owner,
            plant_name='Basil',
        )

    def _request_for(self, user):
        request = self.factory.post('/')
        request.user = user
        return request

    def test_weather_prevents_other_users_plant(self):
        """WeatherRecordSerializer rejects linking another user's plant."""
        serializer = WeatherRecordSerializer(
            data={
                'plant': self.plant.id,
                'temperature': 26.0,
                'humidity': 65.0,
            },
            context={'request': self._request_for(self.other_user)},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('plant', serializer.errors)

    def test_weather_allows_optional_null_plant_and_valid_ranges(self):
        """WeatherRecordSerializer allows plant=None and valid numeric values."""
        serializer = WeatherRecordSerializer(
            data={
                'temperature': 29.5,
                'humidity': 70.0,
                'rainfall': 0.0,
                'wind_speed': 12.0,
                'weather_condition': 'Clear',
                'location': 'Dhaka',
            },
            context={'request': self._request_for(self.owner)},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_weather_rejects_out_of_range_values(self):
        """WeatherRecordSerializer rejects invalid temperature, humidity, rainfall, wind."""
        serializer = WeatherRecordSerializer(
            data={
                'plant': self.plant.id,
                'temperature': 95.0,
                'humidity': 120.0,
                'rainfall': -1.0,
                'wind_speed': -5.0,
            },
            context={'request': self._request_for(self.owner)},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('temperature', serializer.errors)
        self.assertIn('humidity', serializer.errors)
        self.assertIn('rainfall', serializer.errors)
        self.assertIn('wind_speed', serializer.errors)


from django.urls import reverse
from rest_framework import status

from .models import WeatherRecord


class WeatherRecordAPITests(APITestCase):
    """End-to-end API tests for Weather endpoints."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username='api_weather_owner',
            email='api_weather_owner@example.com',
            password='StrongPassword!2026',
        )
        self.other = User.objects.create_user(
            username='api_weather_other',
            email='api_weather_other@example.com',
            password='StrongPassword!2026',
        )
        self.plant = Plant.objects.create(user=self.owner, plant_name='Mint')
        self.list_url = reverse('weather:weatherrecord-list')

    def test_weather_create_with_null_plant_and_list(self):
        """Authenticated user can create and list weather records with plant=null."""
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(
            self.list_url,
            {
                'plant': None,
                'temperature': 27.5,
                'humidity': 68.0,
                'rainfall': 2.0,
                'wind_speed': 9.5,
                'weather_condition': 'Light Rain',
                'location': 'Dhaka',
            },
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(resp.data['plant'])
        self.assertEqual(len(self.client.get(self.list_url).data), 1)

    def test_weather_cross_user_plant_blocked(self):
        """Other user cannot link or retrieve weather records tied to owner's plant."""
        linked = WeatherRecord.objects.create(
            plant=self.plant,
            temperature=25.0,
            humidity=60.0,
            location='Garden',
        )
        self.client.force_authenticate(user=self.other)
        self.assertEqual(len(self.client.get(self.list_url).data), 0)
        self.assertEqual(
            self.client.get(
                reverse('weather:weatherrecord-detail', args=[linked.id])
            ).status_code,
            status.HTTP_404_NOT_FOUND,
        )

        bad_post = self.client.post(
            self.list_url,
            {'plant': self.plant.id, 'temperature': 25.0},
            format='json',
        )
        self.assertEqual(bad_post.status_code, status.HTTP_400_BAD_REQUEST)
