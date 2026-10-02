from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase

from marketplace.models import Company, Job, JobStatus

User = get_user_model()


class CompanyModelTests(TestCase):
    def setUp(self):
        self.am_user = User.objects.create_user(
            email="am@yuvro.test",
            password="password123",
            role=User.Role.RECRUITER_ACCOUNT_MANAGER,
        )

    def test_create_company(self):
        company = Company.objects.create(
            name="Within",
            website="https://within.ai",
            company_size="140 employees",
            funding_stage="Series B",
            founded_year=2019,
            industry="Document Intelligence",
            headquarters="San Francisco, CA",
            account_manager=self.am_user,
            why_company=[{"title": "Top Investors", "description": "Sequoia backed"}],
            leadership=[{"name": "Nadia Okonkwo", "title": "Co-founder & CEO"}],
        )

        self.assertEqual(str(company), "Within")
        self.assertEqual(company.account_manager, self.am_user)
        self.assertEqual(len(company.why_company), 1)
        self.assertEqual(len(company.leadership), 1)


class JobModelTests(TestCase):
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

    def test_job_bounty_calculation_exact(self):
        job = Job.objects.create(
            company=self.company,
            title="Senior/Staff AI Frontend Engineer",
            location="San Francisco, CA",
            salary_min=Decimal("210000.00"),
            salary_max=Decimal("265000.00"),
            salary_currency="USD",
            company_to_yuvro_percentage=Decimal("20.00"),
            yuvro_commission_percentage=Decimal("5.00"),
            status=JobStatus.ACTIVE,
        )

        # 20% - 5% = 15%
        self.assertEqual(job.recruiter_percentage, Decimal("15.00"))
        # 210,000 * 15% = 31,500
        self.assertEqual(job.recruiter_bounty_min, Decimal("31500.00"))
        # 265,000 * 15% = 39,750
        self.assertEqual(job.recruiter_bounty_max, Decimal("39750.00"))
        self.assertTrue(
            job.slug.startswith("seniorstaff-ai-frontend-engineer")
            or "frontend-engineer" in job.slug
        )

    def test_job_validation_salary_min_greater_than_max(self):
        job = Job(
            company=self.company,
            title="Frontend Engineer",
            location="San Francisco, CA",
            salary_min=Decimal("300000.00"),
            salary_max=Decimal("200000.00"),
            company_to_yuvro_percentage=Decimal("20.00"),
            yuvro_commission_percentage=Decimal("5.00"),
        )
        with self.assertRaises(ValidationError):
            job.full_clean()

    def test_job_validation_commission_greater_than_company_percentage(self):
        job = Job(
            company=self.company,
            title="Frontend Engineer",
            location="San Francisco, CA",
            salary_min=Decimal("200000.00"),
            salary_max=Decimal("250000.00"),
            company_to_yuvro_percentage=Decimal("20.00"),
            yuvro_commission_percentage=Decimal("25.00"),
        )
        with self.assertRaises(ValidationError):
            job.full_clean()

    def test_job_validation_negative_salary(self):
        job = Job(
            company=self.company,
            title="Frontend Engineer",
            location="San Francisco, CA",
            salary_min=Decimal("-100.00"),
            salary_max=Decimal("200000.00"),
            company_to_yuvro_percentage=Decimal("20.00"),
            yuvro_commission_percentage=Decimal("5.00"),
        )
        with self.assertRaises(ValidationError):
            job.full_clean()
