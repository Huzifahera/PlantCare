from rest_framework import serializers

from .models import Diagnosis


class DiagnosisSerializer(serializers.ModelSerializer):
    """Serializer for storing and retrieving plant disease diagnosis records."""

    plant_name = serializers.CharField(source='plant.plant_name', read_only=True)

    class Meta:
        model = Diagnosis
        fields = [
            'id',
            'plant',
            'plant_name',
            'original_image',
            'segmented_image',
            'disease_name',
            'confidence_score',
            'severity',
            'affected_area_percentage',
            'recommendation',
            'model_version',
            'diagnosis_date',
        ]
        read_only_fields = ['id', 'plant_name', 'diagnosis_date']

    def validate_plant(self, plant):
        """Ensure the diagnosed plant belongs to the authenticated user."""
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            raise serializers.ValidationError(
                'Authentication is required to create or update a diagnosis.'
            )
        if plant.user_id != request.user.id:
            raise serializers.ValidationError(
                'You do not have permission to diagnose a plant you do not own.'
            )
        return plant

    def validate_confidence_score(self, value):
        """Validate that confidence_score is within 0-100 when provided."""
        if value is not None and not (0.0 <= value <= 100.0):
            raise serializers.ValidationError(
                'Confidence score must be between 0 and 100.'
            )
        return value

    def validate_affected_area_percentage(self, value):
        """Validate that affected_area_percentage is within 0-100 when provided."""
        if value is not None and not (0.0 <= value <= 100.0):
            raise serializers.ValidationError(
                'Affected area percentage must be between 0 and 100.'
            )
        return value
