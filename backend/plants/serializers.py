from rest_framework import serializers

from .models import CareLog, Plant


class PlantSerializer(serializers.ModelSerializer):
    """Serializer for creating, retrieving, and updating user-owned plants."""

    class Meta:
        model = Plant
        fields = [
            'id',
            'plant_name',
            'scientific_name',
            'plant_type',
            'plant_image',
            'location',
            'health_status',
            'date_added',
            'updated_at',
        ]
        # Ownership is derived from request.user; timestamps are system-managed
        read_only_fields = ['id', 'date_added', 'updated_at']

    def validate_plant_name(self, value):
        """Ensure plant_name is not blank or whitespace-only."""
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError('Plant name cannot be empty.')
        return cleaned

    def create(self, validated_data):
        """Assign the authenticated user as the owner of the new plant."""
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            raise serializers.ValidationError(
                'Authentication is required to create a plant.'
            )
        validated_data['user'] = request.user
        return super().create(validated_data)


class CareLogSerializer(serializers.ModelSerializer):
    """Serializer for plant care logs with strict plant ownership validation."""

    plant_name = serializers.CharField(source='plant.plant_name', read_only=True)

    class Meta:
        model = CareLog
        fields = [
            'id',
            'plant',
            'plant_name',
            'care_type',
            'description',
            'care_date',
            'created_at',
        ]
        read_only_fields = ['id', 'plant_name', 'created_at']

    def validate_plant(self, plant):
        """Ensure the target plant belongs to the authenticated user."""
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            raise serializers.ValidationError(
                'Authentication is required to access plant care logs.'
            )
        if plant.user_id != request.user.id:
            raise serializers.ValidationError(
                'You do not have permission to add or modify care logs for this plant.'
            )
        return plant

    def validate(self, attrs):
        """Verify existing care log ownership on partial or full updates."""
        request = self.context.get('request')
        if self.instance is not None:
            if (
                not request
                or not request.user
                or not request.user.is_authenticated
                or self.instance.plant.user_id != request.user.id
            ):
                raise serializers.ValidationError(
                    'You do not have permission to modify this care log.'
                )
        return attrs
