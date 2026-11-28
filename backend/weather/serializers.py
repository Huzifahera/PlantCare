from rest_framework import serializers

from .models import WeatherRecord


class WeatherRecordSerializer(serializers.ModelSerializer):
    """Serializer for weather observations optionally linked to a user's plant."""

    plant_name = serializers.CharField(
        source='plant.plant_name',
        read_only=True,
        default=None,
    )

    class Meta:
        model = WeatherRecord
        fields = [
            'id',
            'plant',
            'plant_name',
            'temperature',
            'humidity',
            'rainfall',
            'wind_speed',
            'weather_condition',
            'location',
            'recorded_at',
        ]
        read_only_fields = ['id', 'plant_name', 'recorded_at']

    def validate_plant(self, plant):
        """When a plant is specified, verify it belongs to the authenticated user."""
        if plant is None:
            return None
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            raise serializers.ValidationError(
                'Authentication is required to link weather records to a plant.'
            )
        if plant.user_id != request.user.id:
            raise serializers.ValidationError(
                'You do not have permission to link weather data to this plant.'
            )
        return plant

    def validate_temperature(self, value):
        """Validate temperature is within realistic Earth bounds (-90 to 60 C)."""
        if value is not None and not (-90.0 <= value <= 60.0):
            raise serializers.ValidationError(
                'Temperature must be between -90 and 60 degrees Celsius.'
            )
        return value

    def validate_humidity(self, value):
        """Validate relative humidity percentage is within 0-100."""
        if value is not None and not (0.0 <= value <= 100.0):
            raise serializers.ValidationError(
                'Humidity must be between 0 and 100 percent.'
            )
        return value

    def validate_rainfall(self, value):
        """Validate rainfall is non-negative."""
        if value is not None and value < 0.0:
            raise serializers.ValidationError('Rainfall cannot be negative.')
        return value

    def validate_wind_speed(self, value):
        """Validate wind speed is non-negative."""
        if value is not None and value < 0.0:
            raise serializers.ValidationError('Wind speed cannot be negative.')
        return value
