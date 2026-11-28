from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import HealthRecordViewSet

app_name = 'plant_health'

router = DefaultRouter()
router.register(r'', HealthRecordViewSet, basename='healthrecord')

urlpatterns = [
    path('', include(router.urls)),
]
