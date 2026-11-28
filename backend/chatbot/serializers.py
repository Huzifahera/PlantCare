from rest_framework import serializers

from .models import ChatHistory


class ChatHistorySerializer(serializers.ModelSerializer):
    """Serializer for user-scoped chatbot conversation history."""

    plant_name = serializers.CharField(
        source='plant.plant_name',
        read_only=True,
        default=None,
    )

    class Meta:
        model = ChatHistory
        fields = [
            'id',
            'plant',
            'plant_name',
            'message_type',
            'message',
            'created_at',
        ]
        # User is always assigned from request.user; timestamps are read-only
        read_only_fields = ['id', 'plant_name', 'created_at']

    def validate_message(self, value):
        """Ensure chat message content is not blank or whitespace-only."""
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError('Message content cannot be empty.')
        return cleaned

    def validate_plant(self, plant):
        """When a plant is linked, verify it belongs to the authenticated user."""
        if plant is None:
            return None
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            raise serializers.ValidationError(
                'Authentication is required to associate chat with a plant.'
            )
        if plant.user_id != request.user.id:
            raise serializers.ValidationError(
                'You do not have permission to reference this plant in chat.'
            )
        return plant

    def create(self, validated_data):
        """Associate the new chat record with the authenticated user."""
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            raise serializers.ValidationError(
                'Authentication is required to create chat history.'
            )
        validated_data['user'] = request.user
        return super().create(validated_data)


class AskBotanistSerializer(serializers.Serializer):
    """Validates a live AI Botanist question with optional conversation history and plant ID."""

    message = serializers.CharField(max_length=2000)
    plant_id = serializers.IntegerField(required=False, allow_null=True)
    history = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
    )

    def validate_message(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError('Message cannot be empty.')
        return cleaned
