import uuid
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from marketplace.models import Company, Job, JobStatus
from recruiting.models import ApplicationStatus, Candidate, RecruiterJobApplication

User = get_user_model()


class RecruitingPermissionsTests(APITestCase):
    def setUp(self):
        self.am_1 = User.objects.create_user(
            email="am1@yuvro.com",
            full_name="AM One",
            role=User.Role.RECRUITER_ACCOUNT_MANAGER,
        )
        self.am_2 = User.objects.create_user(
            email="am2@yuvro.com",
            full_name="AM Two",
            role=User.Role.RECRUITER_ACCOUNT_MANAGER,
        )
        self.recruiter = User.objects.create_user(
            email="recruiter@yuvro.com",
            full_name="Freelancer Recruiter",
            role=User.Role.RECRUITER_FREELANCER,
        )
        self.other_recruiter = User.objects.create_user(
            email="other_recruiter@yuvro.com",
            full_name="Other Freelancer",
            role=User.Role.RECRUITER_FREELANCER,
        )

        self.company_1 = Company.objects.create(
            name="Alpha Corp",
            account_manager=self.am_1,
        )
        self.job_1 = Job.objects.create(
            company=self.company_1,
            title="Lead DevOps",
            status=JobStatus.ACTIVE,
            location="Remote",
            salary_min=Decimal("150000.00"),
            salary_max=Decimal("190000.00"),
        )

        self.candidate = Candidate.objects.create(
            recruiter=self.recruiter,
            first_name="David",
            last_name="Miller",
            email="david@example.com",
        )

    def test_01_recruiter_cannot_create_company(self):
        self.client.force_authenticate(user=self.recruiter)
        url = reverse("company-list")
        response = self.client.post(url, {"name": "Hacker Corp"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_02_recruiter_cannot_create_job(self):
        self.client.force_authenticate(user=self.recruiter)
        url = reverse("job-list")
        data = {
            "company_id": str(self.company_1.id),
            "title": "Unauthorized Job",
            "status": JobStatus.ACTIVE,
            "location": "Remote",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_03_recruiter_cannot_modify_job(self):
        self.client.force_authenticate(user=self.recruiter)
        url = reverse("job-detail", kwargs={"pk": str(self.job_1.id)})
        response = self.client.patch(url, {"title": "Hacked Title"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_04_am_cannot_modify_another_am_company(self):
        self.client.force_authenticate(user=self.am_2)
        url = reverse("company-detail", kwargs={"pk": str(self.company_1.id)})
        response = self.client.patch(url, {"name": "Renamed"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_05_unauthenticated_user_cannot_access_applications(self):
        url = reverse("application-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_06_unauthenticated_user_cannot_access_submissions(self):
        url = reverse("submission-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_07_recruiter_cannot_access_other_recruiter_candidate(self):
        self.client.force_authenticate(user=self.other_recruiter)
        url = reverse("candidate-detail", kwargs={"pk": str(self.candidate.id)})
        response = self.client.get(url)
        self.assertIn(
            response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]
        )

    def test_08_job_serializer_provides_recruiter_application_context(self):
        # Create approved application for recruiter
        app = RecruiterJobApplication.objects.create(
            recruiter=self.recruiter,
            job=self.job_1,
            why_fit="Devops placement expert",
            status=ApplicationStatus.APPROVED,
            reviewed_by=self.am_1,
        )
        self.client.force_authenticate(user=self.recruiter)
        url = reverse("job-detail", kwargs={"pk": str(self.job_1.id)})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rec_app = response.data.get("recruiter_application")
        self.assertIsNotNone(rec_app)
        self.assertTrue(rec_app["applied"])
        self.assertEqual(rec_app["status"], ApplicationStatus.APPROVED)
        self.assertEqual(rec_app["application_id"], str(app.id))
