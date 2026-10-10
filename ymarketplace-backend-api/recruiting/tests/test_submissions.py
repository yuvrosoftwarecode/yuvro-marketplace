import uuid
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from marketplace.models import Company, Job, JobStatus
from recruiting.models import (
    ApplicationStatus,
    Candidate,
    CandidateSubmission,
    RecruiterJobApplication,
    SubmissionStatus,
)

User = get_user_model()


class CandidateSubmissionTests(APITestCase):
    def setUp(self):
        # Users
        self.am_user = User.objects.create_user(
            email="am@yuvro.com",
            full_name="Account Manager",
            role=User.Role.RECRUITER_ACCOUNT_MANAGER,
        )
        self.other_am = User.objects.create_user(
            email="other_am@yuvro.com",
            full_name="Other AM",
            role=User.Role.RECRUITER_ACCOUNT_MANAGER,
        )
        self.recruiter_1 = User.objects.create_user(
            email="rec1@yuvro.com",
            full_name="Recruiter One",
            role=User.Role.RECRUITER_FREELANCER,
        )
        self.recruiter_2 = User.objects.create_user(
            email="rec2@yuvro.com",
            full_name="Recruiter Two",
            role=User.Role.RECRUITER_FREELANCER,
        )

        # Company & Job
        self.company = Company.objects.create(
            name="TechCorp",
            account_manager=self.am_user,
        )
        self.job = Job.objects.create(
            company=self.company,
            title="Senior Backend Engineer",
            status=JobStatus.ACTIVE,
            location="San Francisco, CA",
            candidate_questions=[
                {
                    "id": "q1",
                    "question": "LinkedIn profile URL",
                    "required": True,
                    "type": "URL",
                },
                {
                    "id": "q2",
                    "question": "Current location",
                    "required": True,
                    "type": "Short text",
                },
                {
                    "id": "q3",
                    "question": "Years of Python experience",
                    "required": False,
                    "type": "Short text",
                },
            ],
        )

        # Approved application for Recruiter 1
        self.app_approved = RecruiterJobApplication.objects.create(
            recruiter=self.recruiter_1,
            job=self.job,
            why_fit="8 years tech recruiting",
            status=ApplicationStatus.APPROVED,
            reviewed_by=self.am_user,
        )

        # Pending application for Recruiter 2
        self.app_pending = RecruiterJobApplication.objects.create(
            recruiter=self.recruiter_2,
            job=self.job,
            why_fit="5 years tech recruiting",
            status=ApplicationStatus.PENDING,
        )

        # Candidate for Recruiter 1
        self.candidate_1 = Candidate.objects.create(
            recruiter=self.recruiter_1,
            first_name="Alice",
            last_name="Smith",
            email="alice@example.com",
            phone="+1234567890",
            linkedin_url="https://linkedin.com/in/alicesmith",
            current_title="Backend Lead",
            current_company="OldCo",
            current_location="San Francisco, CA",
            work_authorization_status="US Citizen",
            open_to_relocation=True,
            base_compensation_expectation=Decimal("170000.00"),
            earliest_start_date="2026-11-01",
        )

        self.submissions_url = reverse("submission-list")

    def test_01_approved_recruiter_can_submit_candidate(self):
        self.client.force_authenticate(user=self.recruiter_1)
        data = {
            "application": str(self.app_approved.id),
            "candidate_id": str(self.candidate_1.id),
            "answers": [
                {"question_id": "q1", "answer": "https://linkedin.com/in/alicesmith"},
                {"question_id": "q2", "answer": "San Francisco, CA"},
            ],
            "recruiter_notes": "Top tier candidate with strong distributed systems background.",
        }
        response = self.client.post(self.submissions_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], SubmissionStatus.SUBMITTED)
        self.assertEqual(response.data["candidate"]["id"], str(self.candidate_1.id))
        self.assertEqual(response.data["application"]["id"], str(self.app_approved.id))
        self.assertEqual(len(response.data["answers"]), 2)

    def test_02_pending_recruiter_cannot_submit_candidate(self):
        candidate_2 = Candidate.objects.create(
            recruiter=self.recruiter_2,
            first_name="Bob",
            last_name="Jones",
            email="bob@example.com",
        )
        self.client.force_authenticate(user=self.recruiter_2)
        data = {
            "application": str(self.app_pending.id),
            "candidate_id": str(candidate_2.id),
            "answers": [
                {"question_id": "q1", "answer": "https://linkedin.com/in/bobjones"},
                {"question_id": "q2", "answer": "Austin, TX"},
            ],
        }
        response = self.client.post(self.submissions_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("must be approved", str(response.data))

    def test_03_rejected_recruiter_cannot_submit_candidate(self):
        self.app_pending.status = ApplicationStatus.REJECTED
        self.app_pending.save()

        candidate_2 = Candidate.objects.create(
            recruiter=self.recruiter_2,
            first_name="Bob",
            last_name="Jones",
            email="bob@example.com",
        )
        self.client.force_authenticate(user=self.recruiter_2)
        data = {
            "application": str(self.app_pending.id),
            "candidate_id": str(candidate_2.id),
            "answers": [
                {"question_id": "q1", "answer": "https://linkedin.com/in/bobjones"},
                {"question_id": "q2", "answer": "Austin, TX"},
            ],
        }
        response = self.client.post(self.submissions_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_04_withdrawn_recruiter_cannot_submit_candidate(self):
        self.app_pending.status = ApplicationStatus.WITHDRAWN
        self.app_pending.save()

        candidate_2 = Candidate.objects.create(
            recruiter=self.recruiter_2,
            first_name="Bob",
            last_name="Jones",
            email="bob@example.com",
        )
        self.client.force_authenticate(user=self.recruiter_2)
        data = {
            "application": str(self.app_pending.id),
            "candidate_id": str(candidate_2.id),
            "answers": [
                {"question_id": "q1", "answer": "https://linkedin.com/in/bobjones"},
                {"question_id": "q2", "answer": "Austin, TX"},
            ],
        }
        response = self.client.post(self.submissions_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_05_recruiter_cannot_use_another_recruiter_approved_application(self):
        candidate_2 = Candidate.objects.create(
            recruiter=self.recruiter_2,
            first_name="Bob",
            last_name="Jones",
            email="bob@example.com",
        )
        self.client.force_authenticate(user=self.recruiter_2)
        # Recruiter 2 tries using Recruiter 1's approved application
        data = {
            "application": str(self.app_approved.id),
            "candidate_id": str(candidate_2.id),
            "answers": [
                {"question_id": "q1", "answer": "https://linkedin.com/in/bobjones"},
                {"question_id": "q2", "answer": "Austin, TX"},
            ],
        }
        response = self.client.post(self.submissions_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_06_missing_required_question_is_rejected(self):
        self.client.force_authenticate(user=self.recruiter_1)
        # Missing q2 (Current location) which is required
        data = {
            "application": str(self.app_approved.id),
            "candidate_id": str(self.candidate_1.id),
            "answers": [
                {"question_id": "q1", "answer": "https://linkedin.com/in/alicesmith"},
            ],
        }
        response = self.client.post(self.submissions_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("has not been answered", str(response.data))

    def test_07_invalid_question_id_is_rejected(self):
        self.client.force_authenticate(user=self.recruiter_1)
        data = {
            "application": str(self.app_approved.id),
            "candidate_id": str(self.candidate_1.id),
            "answers": [
                {"question_id": "q1", "answer": "https://linkedin.com/in/alicesmith"},
                {"question_id": "q2", "answer": "San Francisco, CA"},
                {"question_id": "q_invalid_999", "answer": "Something"},
            ],
        }
        response = self.client.post(self.submissions_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not a valid candidate question", str(response.data))

    def test_08_duplicate_submission_prevented(self):
        self.client.force_authenticate(user=self.recruiter_1)
        data = {
            "application": str(self.app_approved.id),
            "candidate_id": str(self.candidate_1.id),
            "answers": [
                {"question_id": "q1", "answer": "https://linkedin.com/in/alicesmith"},
                {"question_id": "q2", "answer": "San Francisco, CA"},
            ],
        }
        # First submission succeeds
        response1 = self.client.post(self.submissions_url, data, format="json")
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)

        # Second submission of same candidate under same application fails
        response2 = self.client.post(self.submissions_url, data, format="json")
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already been submitted", str(response2.data))

    def test_09_inline_candidate_creation_on_submission(self):
        self.client.force_authenticate(user=self.recruiter_1)
        data = {
            "application": str(self.app_approved.id),
            "candidate": {
                "first_name": "Charlie",
                "last_name": "Brown",
                "email": "charlie@example.com",
                "phone": "+1987654321",
                "current_title": "Fullstack Dev",
                "current_company": "StartupX",
                "current_location": "New York, NY",
                "work_authorization_status": "Green Card",
                "open_to_relocation": False,
                "base_compensation_expectation": "150000.00",
            },
            "answers": [
                {"question_id": "q1", "answer": "https://linkedin.com/in/charliebrown"},
                {"question_id": "q2", "answer": "New York, NY"},
            ],
            "recruiter_notes": "Great culture fit",
        }
        response = self.client.post(self.submissions_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["candidate"]["first_name"], "Charlie")
        self.assertEqual(response.data["candidate"]["email"], "charlie@example.com")
        self.assertEqual(
            response.data["candidate"]["recruiter"]["id"], str(self.recruiter_1.id)
        )
