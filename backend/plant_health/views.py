from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from config.permissions import IsPlantOwner

from .models import HealthRecord
from .serializers import HealthRecordSerializer


class HealthRecordViewSet(viewsets.ModelViewSet):
    """CRUD API for plant health records scoped to the authenticated user's plants."""

    serializer_class = HealthRecordSerializer
    permission_classes = [IsAuthenticated, IsPlantOwner]

    def get_queryset(self):
        queryset = (
            HealthRecord.objects.select_related('plant')
            .filter(plant__user=self.request.user)
            .order_by('-recorded_at')
        )
        plant_id = self.request.query_params.get('plant')
        if plant_id is not None:
            queryset = queryset.filter(plant_id=plant_id)
        return queryset
