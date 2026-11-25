
from django.db import models
from django.conf import settings


class UserProfile(models.Model):

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile'
    )

    full_name = models.CharField(
        max_length=150,
        blank=True
    )

    phone_number = models.CharField(
        max_length=20,
        blank=True
    )

    location = models.CharField(
        max_length=200,
        blank=True
    )

    profile_image = models.ImageField(
        upload_to='profiles/',
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.user.username
