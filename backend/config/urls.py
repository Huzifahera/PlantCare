from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('accounts.urls')),
    path('api/plants/', include('plants.urls')),
    path('api/diagnosis/', include('diagnosis.urls')),
    path('api/plant-health/', include('plant_health.urls')),
    path('api/weather/', include('weather.urls')),
    path('api/reminders/', include('reminders.urls')),
    path('api/chatbot/', include('chatbot.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
