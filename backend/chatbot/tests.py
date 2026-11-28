from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, APITestCase

from plants.models import Plant

from .serializers import ChatHistorySerializer

User = get_user_model()


class ChatHistorySerializerTests(APITestCase):
    """Tests for ChatHistorySerializer user assignment and impersonation protection."""

    def setUp(self):
        self.factory = APIRequestFactory()
        self.owner = User.objects.create_user(
            username='chat_owner',
            email='chat_owner@example.com',
            password='StrongPassword!2026',
        )
        self.other_user = User.objects.create_user(
            username='chat_other',
            email='chat_other@example.com',
            password='StrongPassword!2026',
        )
        self.plant = Plant.objects.create(
            user=self.owner,
            plant_name='Aloe Vera',
        )

    def _request_for(self, user):
        request = self.factory.post('/')
        request.user = user
        return request

    def test_chat_history_assigns_authenticated_user_and_prevents_impersonation(self):
        """ChatHistorySerializer assigns request.user and ignores client user field."""
        serializer = ChatHistorySerializer(
            data={
                'plant': self.plant.id,
                'message_type': 'user',
                'message': 'How much sunlight does Aloe Vera need?',
                'user': self.other_user.id,
            },
            context={'request': self._request_for(self.owner)},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        chat = serializer.save()

        self.assertEqual(chat.user_id, self.owner.id)
        self.assertNotIn('user', serializer.data)

    def test_chat_history_prevents_other_users_plant(self):
        """ChatHistorySerializer rejects linking a plant owned by another user."""
        serializer = ChatHistorySerializer(
            data={
                'plant': self.plant.id,
                'message_type': 'user',
                'message': 'Is my plant healthy?',
            },
            context={'request': self._request_for(self.other_user)},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('plant', serializer.errors)


from django.urls import reverse
from rest_framework import status

from .models import ChatHistory


class ChatHistoryAPITests(APITestCase):
    """End-to-end API tests for ChatHistory endpoints."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username='api_chat_owner',
            email='api_chat_owner@example.com',
            password='StrongPassword!2026',
        )
        self.other = User.objects.create_user(
            username='api_chat_other',
            email='api_chat_other@example.com',
            password='StrongPassword!2026',
        )
        self.plant = Plant.objects.create(user=self.owner, plant_name='Spider Plant')
        self.list_url = reverse('chatbot:chathistory-list')

    def test_chat_save_list_and_impersonation_prevention(self):
        """User and bot messages save to request.user and ignore client user ID."""
        self.client.force_authenticate(user=self.owner)
        user_msg = self.client.post(
            self.list_url,
            {
                'plant': self.plant.id,
                'message_type': 'user',
                'message': 'Why are tips brown?',
                'user': self.other.id,
            },
            format='json',
        )
        self.assertEqual(user_msg.status_code, status.HTTP_201_CREATED)
        chat_obj = ChatHistory.objects.get(id=user_msg.data['id'])
        self.assertEqual(chat_obj.user_id, self.owner.id)

        bot_msg = self.client.post(
            self.list_url,
            {
                'plant': None,
                'message_type': 'bot',
                'message': 'Check watering and humidity.',
            },
            format='json',
        )
        self.assertEqual(bot_msg.status_code, status.HTTP_201_CREATED)

        list_resp = self.client.get(self.list_url)
        self.assertEqual(len(list_resp.data), 2)

        # Other user cannot see owner's chat history
        self.client.force_authenticate(user=self.other)
        self.assertEqual(len(self.client.get(self.list_url).data), 0)
        self.assertEqual(
            self.client.get(
                reverse('chatbot:chathistory-detail', args=[chat_obj.id])
            ).status_code,
            status.HTTP_404_NOT_FOUND,
        )
