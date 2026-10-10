import uuid
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from marketplace.models import Company, Job, JobStatus
from recruiting.models import ApplicationStatus, RecruiterJobApplication

User = get_user_model()


class RecruiterJobApplicationTests(APITestCase):
    def setUp(self):
        # Account Manager 1
        self.am_user_1 = User.objects.create_user(
            email="am1@yuvro.com",
            full_name="Account Manager 1",
            role=User.Role.RECRUITER_ACCOUNT_MANAGER,
        )
        # Account Manager 2
        self.am_user_2 = User.objects.create_user(
            email="am2@yuvro.com",
            full_name="Account Manager 2",
            role=User.Role.RECRUITER_ACCOUNT_MANAGER,
        )
        # Recruiter 1
        self.recruiter_1 = User.objects.create_user(
            email="recruiter1@yuvro.com",
            full_name="Freelancer Recruiter 1",
            role=User.Role.RECRUITER_FREELANCER,
        )
        # Recruiter 2
        self.recruiter_2 = User.objects.create_user(
            email="recruiter2@yuvro.com",
            full_name="Freelancer Recruiter 2",
            role=User.Role.RECRUITER_FREELANCER,
        )

        # Company 1 managed by AM 1
        self.company_1 = Company.objects.create(
            name="Acme Tech",
            account_manager=self.am_user_1,
        )
        # Company 2 managed by AM 2
        self.company_2 = Company.objects.create(
            name="Beta Corp",
            account_manager=self.am_user_2,
        )

        # Active Job for Company 1
        self.job_1 = Job.objects.create(
            company=self.company_1,
            title="Senior Frontend Engineer",
            status=JobStatus.ACTIVE,
            salary_min=Decimal("120000.00"),
            salary_max=Decimal("160000.00"),
            location="Remote",
            candidate_questions=[
                {"id": "q1", "question": "LinkedIn profile URL", "required": True},
                {
                    "id": "q2",
                    "question": "Years of TypeScript experience",
                    "required": True,
                },
            ],
        )

        # Closed Job for Company 1
        self.closed_job = Job.objects.create(
            company=self.company_1,
            title="Closed Architect Role",
            status=JobStatus.CLOSED,
            salary_min=Decimal("180000.00"),
            salary_max=Decimal("220000.00"),
            location="Remote",
        )

        self.apps_url = reverse("application-list")

    def test_01_recruiter_can_apply_to_active_job(self):
        self.client.force_authenticate(user=self.recruiter_1)
        data = {
            "job_id": str(self.job_1.id),
            "why_fit": "I have 8 years experience placing top frontend engineers.",
        }
        response = self.client.post(self.apps_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], ApplicationStatus.PENDING)
        self.assertEqual(response.data["recruiter"]["id"], str(self.recruiter_1.id))
        self.assertEqual(response.data["job"]["id"], str(self.job_1.id))

    def test_02_recruiter_cannot_apply_twice(self):
        RecruiterJobApplication.objects.create(
            recruiter=self.recruiter_1,
            job=self.job_1,
            why_fit="First application",
            status=ApplicationStatus.PENDING,
        )
        self.client.force_authenticate(user=self.recruiter_1)
        data = {
            "job_id": str(self.job_1.id),
            "why_fit": "Second attempt",
        }
        response = self.client.post(self.apps_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already applied", str(response.data))

    def test_03_recruiter_cannot_apply_to_closed_job(self):
        self.client.force_authenticate(user=self.recruiter_1)
        data = {
            "job_id": str(self.closed_job.id),
            "why_fit": "I want to apply to a closed role",
        }
        response = self.client.post(self.apps_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_04_why_fit_is_required(self):
        self.client.force_authenticate(user=self.recruiter_1)
        data = {
            "job_id": str(self.job_1.id),
        }
        response = self.client.post(self.apps_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("why_fit", response.data)

    def test_05_why_fit_cannot_be_whitespace(self):
        self.client.force_authenticate(user=self.recruiter_1)
        data = {
            "job_id": str(self.job_1.id),
            "why_fit": "   \n\t  ",
        }
        response = self.client.post(self.apps_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_06_recruiter_derived_from_request_user(self):
        self.client.force_authenticate(user=self.recruiter_1)
        # Attempt to pass recruiter_2's ID
        data = {
            "job_id": str(self.job_1.id),
            "why_fit": "Good fit explanation.",
            "recruiter": str(self.recruiter_2.id),
        }
        response = self.client.post(self.apps_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Ensure the backend set recruiter to recruiter_1
        self.assertEqual(response.data["recruiter"]["id"], str(self.recruiter_1.id))

    def test_07_recruiter_can_view_own_applications(self):
        app1 = RecruiterJobApplication.objects.create(
            recruiter=self.recruiter_1,
            job=self.job_1,
            why_fit="Recruiter 1 fit",
        )
        self.client.force_authenticate(user=self.recruiter_1)
        response = self.client.get(self.apps_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], str(app1.id))

    def test_08_recruiter_cannot_view_another_recruiter_application(self):
        app2 = RecruiterJobApplication.objects.create(
            recruiter=self.recruiter_2,
            job=self.job_1,
            why_fit="Recruiter 2 fit",
        )
        self.client.force_authenticate(user=self.recruiter_1)
        # Try listing
        response = self.client.get(self.apps_url)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 0)

        # Try detail endpoint
        detail_url = reverse("application-detail", kwargs={"pk": str(app2.id)})
        response = self.client.get(detail_url)
        self.assertIn(
            response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]
        )

    def test_09_account_manager_can_approve_pending_application(self):
        app = RecruiterJobApplication.objects.create(
            recruiter=self.recruiter_1,
            job=self.job_1,
            why_fit="Strong technical network",
            status=ApplicationStatus.PENDING,
        )
        self.client.force_authenticate(user=self.am_user_1)
        approve_url = reverse("application-approve", kwargs={"pk": str(app.id)})
        response = self.client.post(approve_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], ApplicationStatus.APPROVED)
        self.assertEqual(response.data["reviewed_by"]["id"], str(self.am_user_1.id))
        self.assertIsNotNone(response.data["reviewed_at"])

    def test_10_account_manager_cannot_approve_unauthorized_job_application(self):
        app = RecruiterJobApplication.objects.create(
            recruiter=self.recruiter_1,
            job=self.job_1,  # Job 1 is managed by AM 1
            why_fit="Strong network",
            status=ApplicationStatus.PENDING,
        )
        self.client.force_authenticate(
            user=self.am_user_2
        )  # AM 2 manages Company 2, not Company 1
        approve_url = reverse("application-approve", kwargs={"pk": str(app.id)})
        response = self.client.post(approve_url)
        self.assertIn(
            response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]
        )

    def test_11_recruiter_cannot_approve_own_application(self):
        app = RecruiterJobApplication.objects.create(
            recruiter=self.recruiter_1,
            job=self.job_1,
            why_fit="Recruiter trying self-approval",
            status=ApplicationStatus.PENDING,
        )
        self.client.force_authenticate(user=self.recruiter_1)
        approve_url = reverse("application-approve", kwargs={"pk": str(app.id)})
        response = self.client.post(approve_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_12_cannot_approve_rejected_application(self):
        app = RecruiterJobApplication.objects.create(
            recruiter=self.recruiter_1,
            job=self.job_1,
            why_fit="Fit explanation",
            status=ApplicationStatus.REJECTED,
            rejection_reason="Already filled",
        )
        self.client.force_authenticate(user=self.am_user_1)
        approve_url = reverse("application-approve", kwargs={"pk": str(app.id)})
        response = self.client.post(approve_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_13_account_manager_can_reject_pending_application(self):
        app = RecruiterJobApplication.objects.create(
            recruiter=self.recruiter_1,
            job=self.job_1,
            why_fit="Recruiter fit",
            status=ApplicationStatus.PENDING,
        )
        self.client.force_authenticate(user=self.am_user_1)
        reject_url = reverse("application-reject", kwargs={"pk": str(app.id)})
        data = {"rejection_reason": "Recruiter capacity reached for this role."}
        response = self.client.post(reject_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], ApplicationStatus.REJECTED)
        self.assertEqual(
            response.data["rejection_reason"],
            "Recruiter capacity reached for this role.",
        )
        self.assertEqual(response.data["reviewed_by"]["id"], str(self.am_user_1.id))

    def test_14_rejection_reason_is_required(self):
        app = RecruiterJobApplication.objects.create(
            recruiter=self.recruiter_1,
            job=self.job_1,
            why_fit="Recruiter fit",
            status=ApplicationStatus.PENDING,
        )
        self.client.force_authenticate(user=self.am_user_1)
        reject_url = reverse("application-reject", kwargs={"pk": str(app.id)})
        # Empty rejection reason
        response = self.client.post(
            reject_url, {"rejection_reason": "   "}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_15_recruiter_can_withdraw_own_pending_application(self):
        app = RecruiterJobApplication.objects.create(
            recruiter=self.recruiter_1,
            job=self.job_1,
            why_fit="Recruiter fit",
            status=ApplicationStatus.PENDING,
        )
        self.client.force_authenticate(user=self.recruiter_1)
        withdraw_url = reverse("application-withdraw", kwargs={"pk": str(app.id)})
        response = self.client.post(withdraw_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], ApplicationStatus.WITHDRAWN)

    def test_16_recruiter_cannot_withdraw_another_recruiter_application(self):
        app = RecruiterJobApplication.objects.create(
            recruiter=self.recruiter_2,
            job=self.job_1,
            why_fit="Recruiter 2 fit",
            status=ApplicationStatus.PENDING,
        )
        self.client.force_authenticate(user=self.recruiter_1)
        withdraw_url = reverse("application-withdraw", kwargs={"pk": str(app.id)})
        response = self.client.post(withdraw_url)
        self.assertIn(
            response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]
        )

    def test_17_recruiter_can_unassign_own_approved_application(self):
        app = RecruiterJobApplication.objects.create(
            recruiter=self.recruiter_1,
            job=self.job_1,
            why_fit="Recruiter fit",
            status=ApplicationStatus.APPROVED,
        )
        self.client.force_authenticate(user=self.recruiter_1)
        unassign_url = reverse("application-unassign", kwargs={"pk": str(app.id)})
        response = self.client.post(unassign_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], ApplicationStatus.WITHDRAWN)

    def test_18_recruiter_can_reapply_after_withdrawing_or_unassigning(self):
        app = RecruiterJobApplication.objects.create(
            recruiter=self.recruiter_1,
            job=self.job_1,
            why_fit="Initial pitch",
            status=ApplicationStatus.WITHDRAWN,
        )
        self.client.force_authenticate(user=self.recruiter_1)
        data = {
            "job_id": str(self.job_1.id),
            "why_fit": "Updated pitch for re-application",
        }
        response = self.client.post(self.apps_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], ApplicationStatus.PENDING)
        self.assertEqual(response.data["why_fit"], "Updated pitch for re-application")
        self.assertEqual(response.data["id"], str(app.id))

    def test_19_recruiter_can_reapply_after_rejection(self):
        app = RecruiterJobApplication.objects.create(
            recruiter=self.recruiter_1,
            job=self.job_1,
            why_fit="Initial pitch that was rejected",
            status=ApplicationStatus.REJECTED,
            rejection_reason="Need more experience in React Native",
        )
        self.client.force_authenticate(user=self.recruiter_1)
        data = {
            "job_id": str(self.job_1.id),
            "why_fit": "Updated pitch addressing the requirements",
        }
        response = self.client.post(self.apps_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], ApplicationStatus.PENDING)
        self.assertEqual(response.data["why_fit"], "Updated pitch addressing the requirements")
        self.assertEqual(response.data["id"], str(app.id))
        app.refresh_from_db()
        self.assertEqual(app.rejection_reason, "")
        self.assertIsNone(app.reviewed_by)

    def test_20_am_can_assign_recruiter_to_job(self):
        self.client.force_authenticate(user=self.am_user_1)
        assign_url = reverse("application-assign")
        data = {
            "job_id": str(self.job_1.id),
            "recruiter_id": str(self.recruiter_1.id),
            "note": "Assigned directly by AM",
        }
        response = self.client.post(assign_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], ApplicationStatus.APPROVED)
        self.assertEqual(response.data["why_fit"], "Assigned directly by AM")
        self.assertEqual(response.data["reviewed_by"]["id"], str(self.am_user_1.id))

    def test_21_unauthorized_am_cannot_assign_recruiter_to_other_job(self):
        # AM 2 tries to assign recruiter to Job 1 (managed by AM 1)
        self.client.force_authenticate(user=self.am_user_2)
        assign_url = reverse("application-assign")
        data = {
            "job_id": str(self.job_1.id),
            "recruiter_id": str(self.recruiter_1.id),
            "note": "Unauthorized assignment attempt",
        }
        response = self.client.post(assign_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_22_assign_existing_withdrawn_application_updates_to_approved(self):
        app = RecruiterJobApplication.objects.create(
            recruiter=self.recruiter_1,
            job=self.job_1,
            why_fit="Was withdrawn",
            status=ApplicationStatus.WITHDRAWN,
        )
        self.client.force_authenticate(user=self.am_user_1)
        assign_url = reverse("application-assign")
        data = {
            "job_id": str(self.job_1.id),
            "recruiter_id": str(self.recruiter_1.id),
            "note": "Re-assigned by AM",
        }
        response = self.client.post(assign_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], ApplicationStatus.APPROVED)
        self.assertEqual(response.data["id"], str(app.id))
        app.refresh_from_db()
        self.assertEqual(app.status, ApplicationStatus.APPROVED)
        self.assertEqual(app.why_fit, "Re-assigned by AM")




