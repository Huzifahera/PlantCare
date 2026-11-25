
from django.db import models
from django.conf import settings
from plants.models import Plant


class ChatHistory(models.Model):

    MESSAGE_TYPE_CHOICES = [
        ('user', 'User'),
        ('bot', 'Bot'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_history'
    )

    plant = models.ForeignKey(
        Plant,
        on_delete=models.SET_NULL,
        related_name='chat_history',
        blank=True,
        null=True
    )

    message_type = models.CharField(
        max_length=10,
        choices=MESSAGE_TYPE_CHOICES
    )

    message = models.TextField()

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.user.username} - {self.message_type}"
