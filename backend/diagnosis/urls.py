from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AnalyzePlantImageView, DiagnosisViewSet

app_name = 'diagnosis'

router = DefaultRouter()
router.register(r'', DiagnosisViewSet, basename='diagnosis')

urlpatterns = [
    path('analyze/', AnalyzePlantImageView.as_view(), name='analyze-plant-image'),
    path('', include(router.urls)),
]
