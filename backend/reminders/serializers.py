from rest_framework import serializers

from .models import Reminder


class ReminderSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating plant care reminders."""

    plant_name = serializers.CharField(source='plant.plant_name', read_only=True)

    class Meta:
        model = Reminder
        fields = [
            'id',
            'plant',
            'plant_name',
            'title',
            'reminder_type',
            'description',
            'reminder_date',
            'is_completed',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'plant_name', 'created_at', 'updated_at']

    def validate_title(self, value):
        """Ensure reminder title is not blank or whitespace-only."""
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError('Reminder title cannot be empty.')
        return cleaned

    def validate_plant(self, plant):
        """Ensure reminders can only be created or moved for user-owned plants."""
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            raise serializers.ValidationError(
                'Authentication is required to manage reminders.'
            )
        if plant.user_id != request.user.id:
            raise serializers.ValidationError(
                'You do not have permission to set reminders for this plant.'
            )
        return plant

    def validate(self, attrs):
        """Verify ownership of existing reminder's plant during updates."""
        request = self.context.get('request')
        if self.instance is not None:
            if (
                not request
                or not request.user
                or not request.user.is_authenticated
                or self.instance.plant.user_id != request.user.id
            ):
                raise serializers.ValidationError(
                    'You do not have permission to modify this reminder.'
                )
        return attrs
