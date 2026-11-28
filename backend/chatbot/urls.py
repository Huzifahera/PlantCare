from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ChatHistoryViewSet

app_name = 'chatbot'

router = DefaultRouter()
router.register(r'', ChatHistoryViewSet, basename='chathistory')

urlpatterns = [
    path('', include(router.urls)),
]
