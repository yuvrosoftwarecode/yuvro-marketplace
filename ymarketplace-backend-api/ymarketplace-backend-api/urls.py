from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from core.health import health_check

urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),
    # Auth endpoints (JWT + OAuth)
    path("api/auth/", include("authentication.urls")),
    path("auth/", include("authentication.urls")),
    # Marketplace endpoints (Company + Job)
    path("api/marketplace/", include("marketplace.urls")),
    path("api/", include("marketplace.urls")),
    # Recruiting endpoints (Applications + Candidates + Submissions)
    path("api/recruiting/", include("recruiting.urls")),
    path("api/", include("recruiting.urls")),
    # Core endpoints
    path("api/core/", include("core.urls")),
    path("core/", include("core.urls")),
    path("api/", include("core.urls")),
    # Health check
    path("api/health/", health_check, name="health_check"),
    path("health/", health_check, name="health_check_root"),
    # OpenAPI schema & Swagger UI
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
    # Django Allauth (Google OAuth callback)
    path("accounts/", include("allauth.urls")),
]

if settings.DEBUG and getattr(settings, "MEDIA_ROOT", None):
    from django.conf.urls.static import static

    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

