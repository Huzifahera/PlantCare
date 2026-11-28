from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIRequestFactory, APITestCase

from plants.models import Plant

from .models import Reminder
from .serializers import ReminderSerializer

User = get_user_model()


class ReminderSerializerTests(APITestCase):
    """Tests for ReminderSerializer plant ownership and field validation."""

    def setUp(self):
        self.factory = APIRequestFactory()
        self.owner = User.objects.create_user(
            username='rem_owner',
            email='rem_owner@example.com',
            password='StrongPassword!2026',
        )
        self.other_user = User.objects.create_user(
            username='rem_other',
            email='rem_other@example.com',
            password='StrongPassword!2026',
        )
        self.plant = Plant.objects.create(
            user=self.owner,
            plant_name='Snake Plant',
        )

    def _request_for(self, user):
        request = self.factory.post('/')
        request.user = user
        return request

    def test_reminder_prevents_other_users_plant(self):
        """ReminderSerializer blocks creating reminders for another user's plant."""
        serializer = ReminderSerializer(
            data={
                'plant': self.plant.id,
                'title': 'Water Snake Plant',
                'reminder_type': 'watering',
                'reminder_date': timezone.now().isoformat(),
            },
            context={'request': self._request_for(self.other_user)},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('plant', serializer.errors)

    def test_reminder_allows_own_plant_and_blocks_other_user_update(self):
        """Owner can create a reminder; another user cannot update it."""
        create_ser = ReminderSerializer(
            data={
                'plant': self.plant.id,
                'title': 'Water Snake Plant',
                'reminder_type': 'watering',
                'reminder_date': timezone.now().isoformat(),
            },
            context={'request': self._request_for(self.owner)},
        )
        self.assertTrue(create_ser.is_valid(), create_ser.errors)
        reminder = create_ser.save()
        self.assertIsInstance(reminder, Reminder)

        update_ser = ReminderSerializer(
            reminder,
            data={'is_completed': True},
            partial=True,
            context={'request': self._request_for(self.other_user)},
        )
        self.assertFalse(update_ser.is_valid())


from django.urls import reverse
from rest_framework import status


class ReminderAPITests(APITestCase):
    """End-to-end API tests for Reminder endpoints."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username='api_rem_owner',
            email='api_rem_owner@example.com',
            password='StrongPassword!2026',
        )
        self.other = User.objects.create_user(
            username='api_rem_other',
            email='api_rem_other@example.com',
            password='StrongPassword!2026',
        )
        self.plant = Plant.objects.create(user=self.owner, plant_name='Cactus')
        self.list_url = reverse('reminders:reminder-list')

    def test_reminder_crud_filtering_and_complete_action(self):
        """Owner can create, filter, complete, update, and delete reminders."""
        self.client.force_authenticate(user=self.owner)
        create_resp = self.client.post(
            self.list_url,
            {
                'plant': self.plant.id,
                'title': 'Water Cactus',
                'reminder_type': 'watering',
                'reminder_date': timezone.now().isoformat(),
            },
            format='json',
        )
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        rem_id = create_resp.data['id']

        # Filter incomplete
        incomplete_resp = self.client.get(
            f'{self.list_url}?plant={self.plant.id}&is_completed=false'
        )
        self.assertEqual(len(incomplete_resp.data), 1)

        # Complete via custom action
        complete_url = reverse('reminders:reminder-complete', args=[rem_id])
        comp_resp = self.client.post(complete_url)
        self.assertEqual(comp_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(comp_resp.data['is_completed'])

        # Filter completed
        completed_resp = self.client.get(f'{self.list_url}?is_completed=true')
        self.assertEqual(len(completed_resp.data), 1)

        # Delete
        detail_url = reverse('reminders:reminder-detail', args=[rem_id])
        self.assertEqual(
            self.client.delete(detail_url).status_code, status.HTTP_204_NO_CONTENT
        )

    def test_reminder_cross_user_blocked(self):
        """Other user cannot view, complete, or create reminders for owner's plant."""
        rem = Reminder.objects.create(
            plant=self.plant,
            title='Fertilize',
            reminder_type='fertilizing',
            reminder_date=timezone.now(),
        )
        self.client.force_authenticate(user=self.other)
        self.assertEqual(len(self.client.get(self.list_url).data), 0)
        self.assertEqual(
            self.client.post(
                reverse('reminders:reminder-complete', args=[rem.id])
            ).status_code,
            status.HTTP_404_NOT_FOUND,
        )
        bad_post = self.client.post(
            self.list_url,
            {
                'plant': self.plant.id,
                'title': 'Steal Reminder',
                'reminder_date': timezone.now().isoformat(),
            },
            format='json',
        )
        self.assertEqual(bad_post.status_code, status.HTTP_400_BAD_REQUEST)
