from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DiagnosisViewSet

app_name = 'diagnosis'

router = DefaultRouter()
router.register(r'', DiagnosisViewSet, basename='diagnosis')

urlpatterns = [
    path('', include(router.urls)),
]
