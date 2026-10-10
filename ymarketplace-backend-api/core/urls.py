from django.urls import include, path
from rest_framework.routers import DefaultRouter

from core.views import NotificationViewSet, PingView

router = DefaultRouter()
router.register(r"notifications", NotificationViewSet, basename="notification")

urlpatterns = [
    path("ping/", PingView.as_view(), name="ping"),
    path("", include(router.urls)),
]
