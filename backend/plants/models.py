
from django.db import models
from django.conf import settings


# Model 1: Plant
class Plant(models.Model):

    HEALTH_STATUS_CHOICES = [
        ('healthy', 'Healthy'),
        ('moderate', 'Moderate'),
        ('unhealthy', 'Unhealthy'),
        ('critical', 'Critical'),
        ('unknown', 'Unknown'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='plants'
    )

    plant_name = models.CharField(max_length=150)

    scientific_name = models.CharField(
        max_length=150,
        blank=True,
        null=True
    )

    plant_type = models.CharField(
        max_length=100,
        blank=True
    )

    plant_image = models.ImageField(
        upload_to='plants/',
        blank=True,
        null=True
    )

    location = models.CharField(
        max_length=200,
        blank=True
    )

    health_status = models.CharField(
        max_length=20,
        choices=HEALTH_STATUS_CHOICES,
        default='unknown'
    )

    date_added = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.plant_name


# Model 2: CareLog
class CareLog(models.Model):

    CARE_TYPE_CHOICES = [
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
        related_name='care_logs'
    )

    care_type = models.CharField(
        max_length=30,
        choices=CARE_TYPE_CHOICES
    )

    description = models.TextField(blank=True)

    care_date = models.DateTimeField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.plant.plant_name} - {self.care_type}"
