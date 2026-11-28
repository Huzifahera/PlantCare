from rest_framework import mixins, status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from config.permissions import IsOwner
from plants.models import Plant

from .models import ChatHistory
from .serializers import AskBotanistSerializer, ChatHistorySerializer
from .services import ChatbotServiceError, ask_botanist


class ChatHistoryViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """API for saving and retrieving the authenticated user's chat history."""

    serializer_class = ChatHistorySerializer
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        queryset = (
            ChatHistory.objects.select_related('plant')
            .filter(user=self.request.user)
            .order_by('created_at')
        )
        plant_id = self.request.query_params.get('plant')
        if plant_id is not None:
            queryset = queryset.filter(plant_id=plant_id)
        return queryset


class AskBotanistView(APIView):
    """Send a botanical question to Hugging Face hosted LLM and return a live response."""

    permission_classes = [AllowAny]
    throttle_scope = 'ai_inference'

    def post(self, request, *args, **kwargs):
        serializer = AskBotanistSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        message = serializer.validated_data['message']
        plant_id = serializer.validated_data.get('plant_id')
        history = serializer.validated_data.get('history', [])

        plant = None
        plant_context = None
        if plant_id and request.user and request.user.is_authenticated:
            plant = Plant.objects.filter(id=plant_id, user=request.user).first()
            if plant:
                plant_context = (
                    f"{plant.plant_name} ({plant.scientific_name or 'species unspecified'}), "
                    f"type: {plant.plant_type or 'general'}, location: {plant.location or 'unspecified'}, "
                    f"health: {plant.health_status}"
                )

        try:
            result = ask_botanist(message=message, history=history, plant_context=plant_context)
        except ChatbotServiceError as exc:
            return Response({'detail': str(exc)}, status=exc.status_code)

        if request.user and request.user.is_authenticated:
            ChatHistory.objects.create(
                user=request.user,
                plant=plant,
                message_type='user',
                message=message,
            )
            ChatHistory.objects.create(
                user=request.user,
                plant=plant,
                message_type='bot',
                message=result['reply'],
            )

        return Response(result, status=status.HTTP_200_OK)
