import uuid
from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Notification
from core.notifications import (
    notify_am_recruiter_application_received,
    notify_am_candidate_submitted,
    notify_recruiter_application_approved,
    notify_recruiter_job_assigned,
    notify_recruiter_pipeline_moved,
)
from marketplace.models import Company, Job, JobStatus, RecruiterApplication
from recruiting.models import (
    ApplicationStatus,
    Candidate,
    CandidateSubmission,
    RecruiterJobApplication,
    SubmissionStatus,
)

User = get_user_model()


class NotificationSystemTests(APITestCase):
    def setUp(self):
        # 1. AM User
        self.am_user = User.objects.create_user(
            email="am@yuvro.ai",
            full_name="Sarah AM",
            role=User.Role.RECRUITER_ACCOUNT_MANAGER,
        )

        # 2. Recruiter User
        self.recruiter = User.objects.create_user(
            email="recruiter@yuvro.ai",
            full_name="Alex Recruiter",
            role=User.Role.RECRUITER_FREELANCER,
        )

        # 3. Company & Job
        self.company = Company.objects.create(
            name="Stripe Partner",
            account_manager=self.am_user,
        )
        self.job = Job.objects.create(
            company=self.company,
            title="Senior Backend Engineer",
            status=JobStatus.ACTIVE,
            salary_min=Decimal("150000.00"),
            salary_max=Decimal("180000.00"),
            location="Remote",
        )

        # 4. Job Application & Candidate
        self.job_application = RecruiterJobApplication.objects.create(
            job=self.job,
            recruiter=self.recruiter,
            status=ApplicationStatus.APPROVED,
            why_fit="Strong technical recruiter",
        )
        self.candidate = Candidate.objects.create(
            recruiter=self.recruiter,
            first_name="Jane",
            last_name="Doe",
            email="jane.doe@example.com",
            current_title="Lead Architect",
        )

    def test_api_list_notifications_and_mark_read(self):
        # Create unread notifications for recruiter
        Notification.objects.create(
            recipient=self.recruiter,
            title="Job Assigned: Senior Backend Engineer",
            body="You have been assigned to recruit for Senior Backend Engineer.",
            category=Notification.Category.JOBS,
            notification_type="job_assigned",
            link=f"/jobs/{self.job.id}",
            read=False,
        )
        Notification.objects.create(
            recipient=self.recruiter,
            title="Application Approved",
            body="Your profile is approved.",
            category=Notification.Category.RECRUITERS,
            notification_type="recruiter_application_approved",
            link="/jobs",
            read=False,
        )

        self.client.force_authenticate(user=self.recruiter)
        res = self.client.get("/api/notifications/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 2)
        self.assertEqual(res.data["unread_count"], 2)

        # Mark single as read
        notif_id = res.data["results"][0]["id"]
        res_read = self.client.post(f"/api/notifications/{notif_id}/read/")
        self.assertEqual(res_read.status_code, status.HTTP_200_OK)
        self.assertEqual(res_read.data["unread_count"], 1)

        # Mark all as read
        res_all = self.client.post("/api/notifications/mark-all-read/")
        self.assertEqual(res_all.status_code, status.HTTP_200_OK)
        self.assertEqual(res_all.data["unread_count"], 0)

        # Verify unread count is 0
        res_count = self.client.get("/api/notifications/unread-count/")
        self.assertEqual(res_count.data["unread_count"], 0)

    def test_am_notification_when_recruiter_application_received(self):
        app = RecruiterApplication.objects.create(
            name="John Talent",
            email="john@talent.com",
            experience_years="5",
        )
        notify_am_recruiter_application_received(app)

        notif = Notification.objects.filter(recipient=self.am_user).first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.notification_type, "recruiter_application_received")
        self.assertEqual(notif.category, Notification.Category.RECRUITERS)
        self.assertIn("John Talent", notif.body)
        self.assertEqual(notif.link, "/am/recruiters/applications")

    def test_am_notification_when_candidate_submitted(self):
        sub = CandidateSubmission.objects.create(
            application=self.job_application,
            candidate=self.candidate,
            status=SubmissionStatus.SUBMITTED,
        )
        notify_am_candidate_submitted(sub)

        notif = Notification.objects.filter(
            recipient=self.am_user,
            notification_type="candidate_submitted",
        ).first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.category, Notification.Category.SUBMISSIONS)
        self.assertIn("Jane Doe", notif.body)
        self.assertIn("Senior Backend Engineer", notif.body)

    def test_am_notification_when_recruiter_applies_for_job(self):
        from core.notifications import notify_am_recruiter_job_application_received
        notify_am_recruiter_job_application_received(self.job_application)

        notif = Notification.objects.filter(
            recipient=self.am_user,
            notification_type="recruiter_job_application_received",
        ).first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.category, Notification.Category.RECRUITERS)
        self.assertIn("requested to recruit for", notif.body)
        self.assertIn("tab=requests", notif.link)

    def test_recruiter_notification_when_application_approved(self):
        app = RecruiterApplication.objects.create(
            user=self.recruiter,
            name=self.recruiter.full_name,
            email=self.recruiter.email,
        )
        notify_recruiter_application_approved(app)

        notif = Notification.objects.filter(
            recipient=self.recruiter,
            notification_type="recruiter_application_approved",
        ).first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.category, Notification.Category.RECRUITERS)
        self.assertEqual(notif.link, "/jobs")

    def test_recruiter_notification_when_job_assigned(self):
        notify_recruiter_job_assigned(self.job_application, is_direct_assignment=True)

        notif = Notification.objects.filter(
            recipient=self.recruiter,
            notification_type="job_assigned",
        ).first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.category, Notification.Category.JOBS)
        self.assertIn("Senior Backend Engineer", notif.title)

    def test_recruiter_notification_when_candidate_moved_in_pipeline(self):
        sub = CandidateSubmission.objects.create(
            application=self.job_application,
            candidate=self.candidate,
            stage="client_review",
            status=SubmissionStatus.SUBMITTED,
        )
        notify_recruiter_pipeline_moved(
            submission=sub,
            old_stage="am_review",
            new_stage="client_review",
            is_rejected=False,
        )

        notif = Notification.objects.filter(
            recipient=self.recruiter,
            notification_type="pipeline_stage_moved",
        ).first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.category, Notification.Category.PIPELINE)
        self.assertIn("Jane Doe", notif.body)
        self.assertIn("Client Review", notif.body)
