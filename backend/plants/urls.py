from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CareLogViewSet, PlantViewSet

app_name = 'plants'

router = DefaultRouter()
# Register care-logs before root '' so it is not matched as a plant pk
router.register(r'care-logs', CareLogViewSet, basename='carelog')
router.register(r'', PlantViewSet, basename='plant')

urlpatterns = [
    path('', include(router.urls)),
]
