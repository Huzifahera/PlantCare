from rest_framework import mixins, status, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from config.permissions import IsPlantOwner
from plants.models import Plant

from .models import Diagnosis
from .serializers import AnalyzeImageSerializer, DiagnosisSerializer
from .services import VisionServiceError, analyze_plant_image


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


class AnalyzePlantImageView(APIView):
    """Analyze an uploaded plant image using Hugging Face Vision AI and return species & health diagnosis."""

    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]
    throttle_scope = 'ai_inference'

    def post(self, request, *args, **kwargs):
        serializer = AnalyzeImageSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        image_file = serializer.validated_data["image"]
        plant_id = serializer.validated_data.get("plant_id")

        try:
            result = analyze_plant_image(image_file)
        except VisionServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=exc.status_code,
            )

        if plant_id and request.user and request.user.is_authenticated:
            plant = Plant.objects.filter(id=plant_id, user=request.user).first()
            if plant:
                image_file.seek(0)
                Diagnosis.objects.create(
                    plant=plant,
                    original_image=image_file,
                    disease_name=result["disease_name"],
                    severity=result["severity"],
                    recommendation="\n".join(result["qwen_advice"]),
                    model_version=result["model_version"],
                )

        return Response(result, status=status.HTTP_200_OK)
