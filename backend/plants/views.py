from rest_framework import viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated

from config.permissions import IsOwner, IsPlantOwner

from .models import CareLog, Plant
from .serializers import CareLogSerializer, PlantSerializer


class PlantViewSet(viewsets.ModelViewSet):
    """CRUD API for authenticated user's plants with image upload support."""

    serializer_class = PlantSerializer
    permission_classes = [IsAuthenticated, IsOwner]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Plant.objects.filter(user=self.request.user).order_by('-date_added')


class CareLogViewSet(viewsets.ModelViewSet):
    """CRUD API for care logs scoped to the authenticated user's plants."""

    serializer_class = CareLogSerializer
    permission_classes = [IsAuthenticated, IsPlantOwner]

    def get_queryset(self):
        queryset = (
            CareLog.objects.select_related('plant')
            .filter(plant__user=self.request.user)
            .order_by('-care_date')
        )
        plant_id = self.request.query_params.get('plant')
        if plant_id is not None:
            queryset = queryset.filter(plant_id=plant_id)
        return queryset
