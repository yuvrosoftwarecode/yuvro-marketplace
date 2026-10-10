from django.urls import include, path
from rest_framework.routers import DefaultRouter

from recruiting.views import (
    CandidateSubmissionViewSet,
    CandidateViewSet,
    RecruiterJobApplicationViewSet,
)

router = DefaultRouter()
router.register(r"applications", RecruiterJobApplicationViewSet, basename="application")
router.register(r"candidates", CandidateViewSet, basename="candidate")
router.register(r"submissions", CandidateSubmissionViewSet, basename="submission")

urlpatterns = [
    path("", include(router.urls)),
]
