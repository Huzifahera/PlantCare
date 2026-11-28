from rest_framework import serializers

from .models import HealthRecord


class HealthRecordSerializer(serializers.ModelSerializer):
    """Serializer for recording and retrieving plant health status entries."""

    plant_name = serializers.CharField(source='plant.plant_name', read_only=True)

    class Meta:
        model = HealthRecord
        fields = [
            'id',
            'plant',
            'plant_name',
            'health_status',
            'health_score',
            'notes',
            'recorded_at',
        ]
        read_only_fields = ['id', 'plant_name', 'recorded_at']

    def validate_plant(self, plant):
        """Ensure the target plant belongs to the authenticated user."""
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            raise serializers.ValidationError(
                'Authentication is required to record plant health.'
            )
        if plant.user_id != request.user.id:
            raise serializers.ValidationError(
                'You do not have permission to access health records for this plant.'
            )
        return plant

    def validate_health_score(self, value):
        """Validate that health_score falls within the 0-100 range."""
        if value is not None and not (0.0 <= value <= 100.0):
            raise serializers.ValidationError(
                'Health score must be between 0 and 100.'
            )
        return value
