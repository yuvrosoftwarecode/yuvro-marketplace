from django.urls import include, path
from rest_framework.routers import DefaultRouter

from marketplace.views import (
    CompanyViewSet,
    JobViewSet,
    RecruiterApplicationViewSet,
    RecruiterViewSet,
)

router = DefaultRouter()
router.register(r"companies", CompanyViewSet, basename="company")
router.register(r"jobs", JobViewSet, basename="job")
router.register(r"recruiters", RecruiterViewSet, basename="recruiter")
router.register(
    r"recruiter-applications",
    RecruiterApplicationViewSet,
    basename="recruiter-application",
)

urlpatterns = [
    path("", include(router.urls)),
]
