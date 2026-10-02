from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from authentication.views import (
    AuthViewSet,
    UserViewSet,
    sync_shadow_user,
    user_info_view,
)

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"", AuthViewSet, basename="auth")

urlpatterns = [
    path("user/", user_info_view, name="user_info"),
    path("sync-shadow-user/", sync_shadow_user, name="sync_shadow_user"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("", include(router.urls)),
]
