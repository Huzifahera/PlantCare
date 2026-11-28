from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AskBotanistView, ChatHistoryViewSet

app_name = 'chatbot'

router = DefaultRouter()
router.register(r'', ChatHistoryViewSet, basename='chathistory')

urlpatterns = [
    path('ask/', AskBotanistView.as_view(), name='ask-botanist'),
    path('', include(router.urls)),
]
