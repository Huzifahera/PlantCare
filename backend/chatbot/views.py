from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated

from config.permissions import IsOwner

from .models import ChatHistory
from .serializers import ChatHistorySerializer


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
