from django.db.models import Q
from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated

from config.permissions import IsWeatherRecordAccessible

from .models import WeatherRecord
from .serializers import WeatherRecordSerializer


class WeatherRecordViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """API for creating, listing, and retrieving weather records."""

    serializer_class = WeatherRecordSerializer
    permission_classes = [IsAuthenticated, IsWeatherRecordAccessible]

    def get_queryset(self):
        queryset = (
            WeatherRecord.objects.select_related('plant')
            .filter(Q(plant__user=self.request.user) | Q(plant__isnull=True))
            .order_by('-recorded_at')
        )
        plant_id = self.request.query_params.get('plant')
        if plant_id is not None:
            queryset = queryset.filter(plant_id=plant_id)
        return queryset
