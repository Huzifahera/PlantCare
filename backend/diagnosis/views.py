from rest_framework import mixins, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated

from config.permissions import IsPlantOwner

from .models import Diagnosis
from .serializers import DiagnosisSerializer


class DiagnosisViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """API for creating and retrieving plant diagnosis records and image uploads."""

    serializer_class = DiagnosisSerializer
    permission_classes = [IsAuthenticated, IsPlantOwner]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        queryset = (
            Diagnosis.objects.select_related('plant')
            .filter(plant__user=self.request.user)
            .order_by('-diagnosis_date')
        )
        plant_id = self.request.query_params.get('plant')
        if plant_id is not None:
            queryset = queryset.filter(plant_id=plant_id)
        return queryset
