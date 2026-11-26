
from django.db import models
from plants.models import Plant


class HealthRecord(models.Model):

    HEALTH_STATUS_CHOICES = [
        ('healthy', 'Healthy'),
        ('moderate', 'Moderate'),
        ('unhealthy', 'Unhealthy'),
        ('critical', 'Critical'),
        ('unknown', 'Unknown'),
    ]

    plant = models.ForeignKey(
        Plant,
        on_delete=models.CASCADE,
        related_name='health_records'
    )

    health_status = models.CharField(
        max_length=20,
        choices=HEALTH_STATUS_CHOICES,
        default='unknown'
    )

    health_score = models.FloatField(
        blank=True,
        null=True
    )

    notes = models.TextField(
        blank=True
    )

    recorded_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.plant.plant_name} - {self.health_status}"
