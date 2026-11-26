
from django.db import models
from plants.models import Plant


class Diagnosis(models.Model):

    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('moderate', 'Moderate'),
        ('high', 'High'),
        ('critical', 'Critical'),
        ('unknown', 'Unknown'),
    ]

    plant = models.ForeignKey(
        Plant,
        on_delete=models.CASCADE,
        related_name='diagnoses'
    )

    original_image = models.ImageField(
        upload_to='diagnosis/original/'
    )

    segmented_image = models.ImageField(
        upload_to='diagnosis/segmented/',
        blank=True,
        null=True
    )

    disease_name = models.CharField(
        max_length=150,
        blank=True,
        default='Unknown'
    )

    confidence_score = models.FloatField(
        blank=True,
        null=True
    )

    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_CHOICES,
        default='unknown'
    )

    affected_area_percentage = models.FloatField(
        blank=True,
        null=True
    )

    recommendation = models.TextField(
        blank=True
    )

    model_version = models.CharField(
        max_length=50,
        blank=True
    )

    diagnosis_date = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.disease_name} - {self.plant.plant_name}"
