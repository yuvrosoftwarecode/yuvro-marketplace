from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from marketplace.models import (
    Company,
    EmploymentType,
    Job,
    JobStatus,
    Recruiter,
    RecruiterApplication,
    RecruiterStatus,
    RecruiterType,
    WorkModel,
)

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds initial Companies, Jobs, and Recruiters into the Marketplace database"

    def handle(self, *args, **options):
        self.stdout.write("Seeding marketplace data...")

        # Create or fetch default Account Manager user
        am_user, _ = User.objects.get_or_create(
            email="priya@yuvro.com",
            defaults={
                "username": "priya",
                "first_name": "Priya",
                "last_name": "Raghunathan",
                "full_name": "Priya Raghunathan",
                "role": User.Role.RECRUITER_ACCOUNT_MANAGER,
                "is_staff": True,
            },
        )

        companies_data = [
            {
                "name": "Within",
                "slug": "within",
                "industry": "Document intelligence / AI infrastructure",
                "website": "https://within.ai",
                "company_size": "140 employees",
                "funding_stage": "Series B",
                "founded_year": 2019,
                "headquarters": "San Francisco, CA",
                "overview": "Within builds document intelligence infrastructure for finance and audit teams. Four of the Big Four and 60+ public companies review filings on the platform; revenue grew 4.1x last year at 140% net retention.",
                "why_company": [
                    {
                        "title": "Top-tier investors",
                        "description": "$78M raised from Sequoia, Index Ventures, Conviction, Neo",
                    },
                    {
                        "title": "Founder track record",
                        "description": "Second-time founders with prior exits (Stripe, Palantir, Scale AI, Figma)",
                    },
                ],
                "why_role": "Review surface is the bottleneck for two enterprise rollouts; leadership funded a dedicated staff-level owner.",
                "leadership": [
                    {
                        "name": "Nadia Okonkwo",
                        "title": "Co-founder & CEO",
                        "linkedin_url": "https://linkedin.com",
                    },
                    {
                        "name": "Ben Aldridge",
                        "title": "Co-founder & CTO",
                        "linkedin_url": "https://linkedin.com",
                    },
                ],
            },
            {
                "name": "Helio Systems",
                "slug": "helio",
                "industry": "Observability & cloud cost governance",
                "website": "https://heliosystems.com",
                "company_size": "320 employees",
                "funding_stage": "Series C",
                "founded_year": 2016,
                "headquarters": "London, UK",
                "overview": "Helio Systems sells observability and cost-governance software to mid-market engineering organisations across EMEA. $52M ARR, 118% net retention, nine-week median sales cycle.",
                "why_company": [
                    {
                        "title": "Uncapped Commission",
                        "description": "Operating CRO scaled Datadog EMEA from $12M to $180M; commission plan is uncapped.",
                    },
                ],
                "why_role": "EMEA team over-attained by 118% and is splitting one oversized territory in two.",
                "leadership": [
                    {
                        "name": "Marta Reyes",
                        "title": "Founder & CEO",
                        "linkedin_url": "https://linkedin.com",
                    },
                    {
                        "name": "Tom Whitfield",
                        "title": "President & CRO",
                        "linkedin_url": "https://linkedin.com",
                    },
                ],
            },
            {
                "name": "Orbital Freight",
                "slug": "orbital",
                "industry": "Logistics infrastructure",
                "website": "https://orbitalfreight.com",
                "company_size": "85 employees",
                "funding_stage": "Series A",
                "founded_year": 2021,
                "headquarters": "Austin, TX",
                "overview": "Orbital Freight operates an autonomous routing layer for intermodal cross-border shipping across North America.",
                "why_company": [],
                "why_role": "High growth supply chain technology platform.",
                "leadership": [],
            },
            {
                "name": "Northlane Health",
                "slug": "northlane",
                "industry": "Value-based care",
                "website": "https://northlanehealth.com",
                "company_size": "210 employees",
                "funding_stage": "Series B",
                "founded_year": 2020,
                "headquarters": "Boston, MA",
                "overview": "Northlane Health develops care coordination workflows for Medicare Advantage provider networks.",
                "why_company": [],
                "why_role": "Modern healthcare infrastructure.",
                "leadership": [],
            },
        ]

        for c_data in companies_data:
            slug = c_data.pop("slug")
            comp, created = Company.objects.update_or_create(
                slug=slug,
                defaults={
                    **c_data,
                    "account_manager": am_user,
                },
            )
            self.stdout.write(
                f"  Company '{comp.name}' ({comp.slug}): {'Created' if created else 'Updated'}"
            )

            # Create default job for Within
            if comp.name == "Within":
                Job.objects.update_or_create(
                    company=comp,
                    title="Senior/Staff AI Frontend Engineer",
                    defaults={
                        "location": "San Francisco, CA",
                        "status": JobStatus.ACTIVE,
                        "work_model": WorkModel.HYBRID,
                        "employment_type": EmploymentType.FULL_TIME,
                        "experience": "6+ years",
                        "open_roles": 3,
                        "salary_min": Decimal("210000.00"),
                        "salary_max": Decimal("265000.00"),
                        "salary_currency": "USD",
                        "company_to_yuvro_percentage": Decimal("20.00"),
                        "yuvro_commission_percentage": Decimal("5.00"),
                        "payout_terms": [30, 60, 90],
                        "job_description": "We are seeking a Senior/Staff AI Frontend Engineer to lead our core document intelligence canvas.",
                        "benefits_and_perks": "100% health coverage, 401(k) with match, learning stipend.",
                        "must_haves": [
                            "6+ years product frontend",
                            "Streaming / websocket UI experience",
                            "Strong TypeScript depth",
                        ],
                        "signals": {
                            "green": [
                                "Early engineer at Series A/B",
                                "Public writeups",
                            ],
                            "red": ["No TypeScript in last 3 years"],
                        },
                        "posted_at": timezone.now(),
                    },
                )

        # Seed Recruiters (Users with role recruiter_freelancer and Recruiter profiles)
        recruiters_data = [
            {
                "name": "Sarah Lin",
                "slug": "sarah-lin",
                "email": "sarah@abcrecruiting.com",
                "phone": "+1 415 555 0233",
                "location": "San Francisco, CA",
                "linkedin": "https://linkedin.com/in/sarahlin",
                "website": "https://abcrecruiting.com",
                "type": RecruiterType.AGENCY,
                "agency": "ABC Recruiting",
                "experience": "9 years",
                "status": RecruiterStatus.ACTIVE,
                "specializations": ["Frontend", "AI/ML", "Product"],
                "markets": ["US", "San Francisco", "Remote", "Startup"],
                "quality_score": 92,
                "response_rate": 96,
                "verification": {
                    "identity": True,
                    "agency": True,
                    "payment": True,
                    "tax": True,
                    "agreement": True,
                },
                "interview_stats": {
                    "scheduled": 34,
                    "completed": 31,
                    "technical": 18,
                    "hiringManager": 9,
                    "final": 4,
                    "noShows": 1,
                    "cancelled": 2,
                    "rescheduled": 5,
                },
                "am_rejection_reasons": [
                    {"reason": "Skills mismatch", "count": 4},
                    {"reason": "Experience", "count": 2},
                    {"reason": "Compensation", "count": 1},
                ],
                "company_rejection_reasons": [
                    {"reason": "Technical", "count": 5},
                    {"reason": "Experience", "count": 2},
                    {"reason": "Culture", "count": 1},
                ],
            },
            {
                "name": "Marcus Obi",
                "slug": "marcus-obi",
                "email": "marcus@obitalent.co",
                "phone": "+44 20 7946 0455",
                "location": "London, UK",
                "linkedin": "https://linkedin.com/in/marcusobi",
                "website": "https://obitalent.co",
                "type": RecruiterType.AGENCY,
                "agency": "Obi Talent",
                "experience": "12 years",
                "status": RecruiterStatus.ACTIVE,
                "specializations": ["GTM", "Sales", "Finance"],
                "markets": ["UK", "EMEA", "Remote", "Enterprise"],
                "quality_score": 88,
                "response_rate": 91,
                "verification": {
                    "identity": True,
                    "agency": True,
                    "payment": True,
                    "tax": False,
                    "agreement": True,
                },
                "interview_stats": {
                    "scheduled": 22,
                    "completed": 20,
                    "technical": 4,
                    "hiringManager": 11,
                    "final": 5,
                    "noShows": 0,
                    "cancelled": 1,
                    "rescheduled": 3,
                },
                "am_rejection_reasons": [
                    {"reason": "Location", "count": 3},
                    {"reason": "Skills mismatch", "count": 2},
                ],
                "company_rejection_reasons": [
                    {"reason": "Experience", "count": 3},
                    {"reason": "Compensation", "count": 2},
                ],
            },
            {
                "name": "Aisha Farrow",
                "slug": "aisha-farrow",
                "email": "aisha.farrow@gmail.com",
                "phone": "+1 512 555 0187",
                "location": "Austin, TX",
                "linkedin": "https://linkedin.com/in/aishafarrow",
                "website": "",
                "type": RecruiterType.INDEPENDENT,
                "agency": "—",
                "experience": "6 years",
                "status": RecruiterStatus.ACTIVE,
                "specializations": ["DevOps", "Backend", "Data"],
                "markets": ["US", "Austin", "Remote"],
                "quality_score": 84,
                "response_rate": 87,
                "verification": {
                    "identity": True,
                    "agency": False,
                    "payment": True,
                    "tax": True,
                    "agreement": True,
                },
                "interview_stats": {
                    "scheduled": 14,
                    "completed": 12,
                    "technical": 8,
                    "hiringManager": 3,
                    "final": 1,
                    "noShows": 1,
                    "cancelled": 1,
                    "rescheduled": 2,
                },
                "am_rejection_reasons": [
                    {"reason": "Duplicate", "count": 2},
                    {"reason": "Experience", "count": 2},
                ],
                "company_rejection_reasons": [{"reason": "Technical", "count": 3}],
            },
            {
                "name": "Diego Marin",
                "slug": "diego-marin",
                "email": "diego@northpeaksearch.com",
                "phone": "+1 646 555 0122",
                "location": "New York, NY",
                "linkedin": "https://linkedin.com/in/diegomarin",
                "website": "https://northpeaksearch.com",
                "type": RecruiterType.AGENCY,
                "agency": "Northpeak Search",
                "experience": "8 years",
                "status": RecruiterStatus.PENDING,
                "specializations": ["Product", "Design", "Frontend"],
                "markets": ["US", "New York", "Remote"],
                "quality_score": 71,
                "response_rate": 78,
                "verification": {
                    "identity": True,
                    "agency": False,
                    "payment": False,
                    "tax": False,
                    "agreement": False,
                },
                "interview_stats": {
                    "scheduled": 3,
                    "completed": 2,
                    "technical": 1,
                    "hiringManager": 1,
                    "final": 0,
                    "noShows": 0,
                    "cancelled": 1,
                    "rescheduled": 0,
                },
                "am_rejection_reasons": [{"reason": "Skills mismatch", "count": 1}],
                "company_rejection_reasons": [],
            },
            {
                "name": "Hana Sato",
                "slug": "hana-sato",
                "email": "hana@satotalent.jp",
                "phone": "+81 3 5555 0198",
                "location": "Tokyo, JP",
                "linkedin": "https://linkedin.com/in/hanasato",
                "website": "https://satotalent.jp",
                "type": RecruiterType.INDEPENDENT,
                "agency": "—",
                "experience": "5 years",
                "status": RecruiterStatus.INACTIVE,
                "specializations": ["AI/ML", "Data"],
                "markets": ["APAC", "Remote"],
                "quality_score": 69,
                "response_rate": 64,
                "verification": {
                    "identity": True,
                    "agency": False,
                    "payment": True,
                    "tax": False,
                    "agreement": True,
                },
                "interview_stats": {
                    "scheduled": 6,
                    "completed": 5,
                    "technical": 3,
                    "hiringManager": 2,
                    "final": 0,
                    "noShows": 1,
                    "cancelled": 0,
                    "rescheduled": 1,
                },
                "am_rejection_reasons": [{"reason": "Location", "count": 2}],
                "company_rejection_reasons": [{"reason": "Culture", "count": 1}],
            },
            {
                "name": "Omar Haddad",
                "slug": "omar-haddad",
                "email": "omar@haddadpartners.com",
                "phone": "+1 312 555 0144",
                "location": "Chicago, IL",
                "linkedin": "https://linkedin.com/in/omarhaddad",
                "website": "https://haddadpartners.com",
                "type": RecruiterType.AGENCY,
                "agency": "Haddad Partners",
                "experience": "14 years",
                "status": RecruiterStatus.SUSPENDED,
                "specializations": ["Finance", "Operations"],
                "markets": ["US", "Remote", "Enterprise"],
                "quality_score": 55,
                "response_rate": 42,
                "verification": {
                    "identity": True,
                    "agency": True,
                    "payment": True,
                    "tax": True,
                    "agreement": False,
                },
                "interview_stats": {
                    "scheduled": 9,
                    "completed": 6,
                    "technical": 2,
                    "hiringManager": 3,
                    "final": 1,
                    "noShows": 3,
                    "cancelled": 2,
                    "rescheduled": 4,
                },
                "am_rejection_reasons": [
                    {"reason": "Duplicate", "count": 5},
                    {"reason": "Other", "count": 3},
                ],
                "company_rejection_reasons": [{"reason": "Technical", "count": 2}],
            },
        ]

        for r_data in recruiters_data:
            email = r_data["email"]
            slug = r_data.pop("slug")
            # Create or update User with role RECRUITER_FREELANCER
            rec_user, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    "full_name": r_data["name"],
                    "role": User.Role.RECRUITER_FREELANCER,
                    "phone_number": r_data.get("phone", ""),
                    "is_active": r_data["status"] != RecruiterStatus.SUSPENDED,
                },
            )
            # Create or update Recruiter profile
            rec, created = Recruiter.objects.update_or_create(
                email=email,
                defaults={
                    **r_data,
                    "slug": slug,
                    "user": rec_user,
                    "account_manager": am_user,
                    "created_by": am_user.full_name or "Priya Raghunathan",
                },
            )
            self.stdout.write(
                f"  Recruiter '{rec.name}' ({rec.email}): {'Created' if created else 'Updated'}"
            )

        self.stdout.write(self.style.SUCCESS("Marketplace successfully seeded!"))

