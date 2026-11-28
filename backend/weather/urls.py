from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import WeatherRecordViewSet

app_name = 'weather'

router = DefaultRouter()
router.register(r'', WeatherRecordViewSet, basename='weatherrecord')

urlpatterns = [
    path('', include(router.urls)),
]
