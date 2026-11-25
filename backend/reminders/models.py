
from django.db import models
from plants.models import Plant


class Reminder(models.Model):

    REMINDER_TYPE_CHOICES = [
        ('watering', 'Watering'),
        ('fertilizing', 'Fertilizing'),
        ('pruning', 'Pruning'),
        ('repotting', 'Repotting'),
        ('pest_control', 'Pest Control'),
        ('other', 'Other'),
    ]

    plant = models.ForeignKey(
        Plant,
        on_delete=models.CASCADE,
        related_name='reminders'
    )

    title = models.CharField(
        max_length=150
    )

    reminder_type = models.CharField(
        max_length=30,
        choices=REMINDER_TYPE_CHOICES,
        default='other'
    )

    description = models.TextField(
        blank=True
    )

    reminder_date = models.DateTimeField()

    is_completed = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.title} - {self.plant.plant_name}"
