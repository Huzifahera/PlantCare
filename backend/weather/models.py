
from django.db import models
from plants.models import Plant


class WeatherRecord(models.Model):

    plant = models.ForeignKey(
        Plant,
        on_delete=models.CASCADE,
        related_name='weather_records',
        blank=True,
        null=True
    )

    temperature = models.FloatField(
        blank=True,
        null=True
    )

    humidity = models.FloatField(
        blank=True,
        null=True
    )

    rainfall = models.FloatField(
        blank=True,
        null=True
    )

    wind_speed = models.FloatField(
        blank=True,
        null=True
    )

    weather_condition = models.CharField(
        max_length=100,
        blank=True
    )

    location = models.CharField(
        max_length=200,
        blank=True
    )

    recorded_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.location} - {self.weather_condition}"
