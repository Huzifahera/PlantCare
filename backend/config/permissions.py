from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """Allow access only to objects whose `user` matches `request.user`."""

    def has_object_permission(self, request, view, obj):
        return obj.user_id == request.user.id


class IsPlantOwner(BasePermission):
    """Allow access only to records linked to a Plant owned by `request.user`."""

    def has_object_permission(self, request, view, obj):
        return obj.plant is not None and obj.plant.user_id == request.user.id


class IsWeatherRecordAccessible(BasePermission):
    """Allow access to unlinked weather records or records for the user's own plants."""

    def has_object_permission(self, request, view, obj):
        if obj.plant is None:
            return True
        return obj.plant.user_id == request.user.id
