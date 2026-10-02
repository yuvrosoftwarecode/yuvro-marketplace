from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from marketplace.models import Company, Job, JobStatus
from marketplace.serializers import CompanySerializer, JobSerializer

User = get_user_model()


class SerializerValidationTests(TestCase):
    def setUp(self):
        self.am_user = User.objects.create_user(
            email="am@yuvro.test",
            password="password123",
            role=User.Role.RECRUITER_ACCOUNT_MANAGER,
        )
        self.company = Company.objects.create(
            name="Within",
            account_manager=self.am_user,
            industry="AI",
        )

    def test_payout_terms_valid_cases(self):
        for valid_terms in [[30], [30, 60], [30, 60, 90]]:
            serializer = JobSerializer(
                data={
                    "company_id": str(self.company.id),
                    "title": "Staff Engineer",
                    "location": "Remote",
                    "salary_min": "100000.00",
                    "salary_max": "150000.00",
                    "company_to_yuvro_percentage": "20.00",
                    "yuvro_commission_percentage": "5.00",
                    "payout_terms": valid_terms,
                }
            )
            self.assertTrue(
                serializer.is_valid(),
                f"Failed on valid terms {valid_terms}: {serializer.errors}",
            )

    def test_payout_terms_invalid_cases(self):
        invalid_cases = [
            [60, 30],  # Not ascending
            [30, 30],  # Duplicates
            [-30, 60],  # Negative
            [0, 30],  # Zero
            ["30", "60"],  # Strings instead of ints
            "30, 60, 90",  # String instead of list
        ]
        for invalid_terms in invalid_cases:
            serializer = JobSerializer(
                data={
                    "company_id": str(self.company.id),
                    "title": "Staff Engineer",
                    "location": "Remote",
                    "salary_min": "100000.00",
                    "salary_max": "150000.00",
                    "company_to_yuvro_percentage": "20.00",
                    "yuvro_commission_percentage": "5.00",
                    "payout_terms": invalid_terms,
                }
            )
            self.assertFalse(
                serializer.is_valid(),
                f"Expected invalid terms {invalid_terms} to fail validation",
            )
            self.assertIn("payout_terms", serializer.errors)

    def test_bounty_percentage_validation_failure(self):
        # 20% company fee, 25% Yuvro commission -> must fail
        serializer = JobSerializer(
            data={
                "company_id": str(self.company.id),
                "title": "Staff Engineer",
                "location": "Remote",
                "salary_min": "100000.00",
                "salary_max": "150000.00",
                "company_to_yuvro_percentage": "20.00",
                "yuvro_commission_percentage": "25.00",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("yuvro_commission_percentage", serializer.errors)

    def test_candidate_questions_validation(self):
        valid_data = {
            "company_id": str(self.company.id),
            "title": "Frontend Engineer",
            "location": "San Francisco",
            "salary_min": "210000.00",
            "salary_max": "265000.00",
            "company_to_yuvro_percentage": "20.00",
            "yuvro_commission_percentage": "5.00",
            "candidate_questions": [
                {
                    "id": "q1",
                    "question": "How many years of frontend experience?",
                    "required": True,
                },
                {
                    "id": "q2",
                    "question": "Open to relocation?",
                    "required": False,
                },
            ],
            "must_haves": [
                "6+ years frontend",
                "TypeScript depth",
            ],
            "signals": {
                "green": ["Early engineer at Series A/B"],
                "red": ["No TypeScript in last 3 years"],
            },
        }
        serializer = JobSerializer(data=valid_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        job = serializer.save()

        # Check representation
        rep = serializer.to_representation(job)
        self.assertEqual(rep["salary"]["min"], 210000.0)
        self.assertEqual(rep["salary"]["max"], 265000.0)
        self.assertEqual(rep["bounty"]["company_to_yuvro_percentage"], 20.0)
        self.assertEqual(rep["bounty"]["yuvro_commission_percentage"], 5.0)
        self.assertEqual(rep["bounty"]["recruiter_percentage"], 15.0)
        self.assertEqual(rep["bounty"]["min"], 31500.0)
        self.assertEqual(rep["bounty"]["max"], 39750.0)

    def test_company_why_company_and_leadership_validation(self):
        # Invalid why_company: missing title
        invalid_comp = {
            "name": "Test Company",
            "why_company": [{"description": "Missing title"}],
        }
        serializer = CompanySerializer(data=invalid_comp)
        self.assertFalse(serializer.is_valid())
        self.assertIn("why_company", serializer.errors)

        # Invalid leadership: missing name
        invalid_leader = {
            "name": "Test Company",
            "leadership": [{"title": "CTO"}],
        }
        serializer2 = CompanySerializer(data=invalid_leader)
        self.assertFalse(serializer2.is_valid())
        self.assertIn("leadership", serializer2.errors)

    def test_must_haves_and_signals_invalid_structure(self):
        # Invalid must_haves: contains non-strings
        serializer = JobSerializer(
            data={
                "company_id": str(self.company.id),
                "title": "Engineer",
                "location": "Remote",
                "salary_min": "100000.00",
                "salary_max": "120000.00",
                "company_to_yuvro_percentage": "20.00",
                "yuvro_commission_percentage": "5.00",
                "must_haves": ["Valid", 12345],
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("must_haves", serializer.errors)

        # Invalid signals: non-list value
        serializer_sig = JobSerializer(
            data={
                "company_id": str(self.company.id),
                "title": "Engineer",
                "location": "Remote",
                "salary_min": "100000.00",
                "salary_max": "120000.00",
                "company_to_yuvro_percentage": "20.00",
                "yuvro_commission_percentage": "5.00",
                "signals": {"green": "not a list"},
            }
        )
        self.assertFalse(serializer_sig.is_valid())
        self.assertIn("signals", serializer_sig.errors)

    def test_target_companies_validation(self):
        # Valid list of strings
        serializer = JobSerializer(
            data={
                "company_id": str(self.company.id),
                "title": "Backend Engineer",
                "location": "Remote",
                "salary_min": "120000.00",
                "salary_max": "160000.00",
                "company_to_yuvro_percentage": "20.00",
                "yuvro_commission_percentage": "5.00",
                "target_companies": ["Google", "Stripe", "Meta"],
            }
        )
        self.assertTrue(serializer.is_valid(), f"Errors: {serializer.errors}")
        job = serializer.save()
        self.assertEqual(job.target_companies, ["Google", "Stripe", "Meta"])

        # Valid comma-separated string
        serializer2 = JobSerializer(
            data={
                "company_id": str(self.company.id),
                "title": "Backend Engineer 2",
                "location": "Remote",
                "salary_min": "120000.00",
                "salary_max": "160000.00",
                "company_to_yuvro_percentage": "20.00",
                "yuvro_commission_percentage": "5.00",
                "target_companies": "Google, Stripe, Amazon",
            }
        )
        self.assertTrue(serializer2.is_valid(), f"Errors: {serializer2.errors}")
        job2 = serializer2.save()
        self.assertEqual(job2.target_companies, ["Google", "Stripe", "Amazon"])

    def test_recruiter_creation_with_existing_user_or_profile(self):
        from marketplace.models import Recruiter
        from marketplace.serializers import RecruiterSerializer

        # Test creating recruiter when user is created first (which fires signal)
        data = {
            "name": "Manikanta Test",
            "email": "manitest@yuvro.test",
            "password": "password123",
            "location": "Hyderabad",
            "type": "Independent",
        }
        serializer = RecruiterSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        recruiter = serializer.save()
        self.assertEqual(recruiter.email, "manitest@yuvro.test")
        self.assertEqual(recruiter.location, "Hyderabad")

        # Test saving again with same email does not raise IntegrityError
        serializer2 = RecruiterSerializer(data=data)
        self.assertTrue(serializer2.is_valid(), serializer2.errors)
        recruiter2 = serializer2.save()
        self.assertEqual(recruiter2.id, recruiter.id)


