from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from config.permissions import IsPlantOwner

from .models import Reminder
from .serializers import ReminderSerializer


class ReminderViewSet(viewsets.ModelViewSet):
    """CRUD API for plant care reminders with plant and completion filtering."""

    serializer_class = ReminderSerializer
    permission_classes = [IsAuthenticated, IsPlantOwner]

    def get_queryset(self):
        queryset = (
            Reminder.objects.select_related('plant')
            .filter(plant__user=self.request.user)
            .order_by('reminder_date')
        )
        plant_id = self.request.query_params.get('plant')
        if plant_id is not None:
            queryset = queryset.filter(plant_id=plant_id)

        is_completed = self.request.query_params.get('is_completed')
        if is_completed is not None:
            normalized = is_completed.strip().lower()
            if normalized in ('true', '1', 'yes'):
                queryset = queryset.filter(is_completed=True)
            elif normalized in ('false', '0', 'no'):
                queryset = queryset.filter(is_completed=False)

        return queryset

    @action(detail=True, methods=['post', 'patch'], url_path='complete')
    def complete(self, request, pk=None):
        """Mark a reminder owned by the authenticated user as completed."""
        reminder = self.get_object()
        reminder.is_completed = True
        reminder.save(update_fields=['is_completed', 'updated_at'])
        serializer = self.get_serializer(reminder)
        return Response(serializer.data, status=status.HTTP_200_OK)
