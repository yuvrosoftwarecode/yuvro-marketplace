import uuid
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from core.models import BaseModel


def company_logo_path(instance, filename):
    ext = filename.split(".")[-1]
    app_name = getattr(settings, "APP_NAME", "ymarketplace").strip().strip("/")
    prefix = f"{app_name}/" if app_name else ""
    return f"{prefix}companies/{instance.id}/logo.{ext}"


class Company(BaseModel):
    """
    Represents a client company whose jobs are listed on the marketplace.
    """

    account_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_companies",
        help_text="Account manager responsible for this company account.",
    )
    company_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_company_accounts",
        help_text="Primary company manager account.",
    )
    name = models.CharField(max_length=255, db_index=True)
    logo = models.ImageField(
        upload_to=company_logo_path,
        blank=True,
        null=True,
        help_text="Uploaded company logo file.",
    )
    logo_url = models.URLField(max_length=500, blank=True, default="")
    website = models.URLField(max_length=500, blank=True, default="")
    company_size = models.CharField(max_length=100, blank=True, default="")
    funding_stage = models.CharField(max_length=100, blank=True, default="")
    founded_year = models.PositiveIntegerField(null=True, blank=True)
    industry = models.CharField(max_length=255, blank=True, default="", db_index=True)
    headquarters = models.CharField(max_length=255, blank=True, default="")

    slug = models.SlugField(max_length=280, blank=True, db_index=True)
    overview = models.TextField(
        blank=True, default="", help_text="Company overview and description."
    )
    why_role = models.TextField(
        blank=True, default="", help_text="Why these roles matter."
    )

    # Structured data stored as JSON
    why_company = models.JSONField(
        default=list,
        blank=True,
        help_text="List of highlights/reasons to join (e.g. [{'title': '...', 'description': '...'}]).",
    )
    leadership = models.JSONField(
        default=list,
        blank=True,
        help_text="List of key leaders (e.g. [{'name': '...', 'title': '...', 'linkedin_url': '...'}]).",
    )

    class Meta:
        db_table = "marketplace_companies"
        verbose_name = "Company"
        verbose_name_plural = "Companies"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["industry"]),
            models.Index(fields=["account_manager"]),
            models.Index(fields=["slug"]),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug and self.name:
            base_slug = slugify(self.name) or "company"
            existing = (
                Company.objects.filter(slug=base_slug).exclude(id=self.id).exists()
            )
            if existing:
                unique_suffix = str(self.id or uuid.uuid4())[:8]
                self.slug = f"{base_slug}-{unique_suffix}"
            else:
                self.slug = base_slug
        if self.logo and hasattr(self.logo, "name") and self.logo.name:
            from core.storage import build_public_url

            public_url = build_public_url(self.logo.name)
            if public_url:
                self.logo_url = public_url
        super().save(*args, **kwargs)


class CompanyUserProfile(BaseModel):
    """
    Profile exclusively for Company Managers and Company Employees
    (recruiter_company_manager, recruiter_company_employee).
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="company_profile",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="team_members",
        help_text="The company this manager or employee belongs to.",
    )
    designation = models.CharField(max_length=255, blank=True, default="")
    department = models.CharField(max_length=255, blank=True, default="")
    phone_number = models.CharField(max_length=50, blank=True, default="")
    is_primary_contact = models.BooleanField(
        default=False,
        help_text="True if this user is the primary company manager/contact.",
    )

    class Meta:
        db_table = "marketplace_company_user_profiles"
        verbose_name = "Company User Profile"
        verbose_name_plural = "Company User Profiles"
        indexes = [
            models.Index(fields=["company", "is_primary_contact"]),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.company.name} ({self.designation or 'Member'})"


class JobStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PENDING_APPROVAL = "pending_approval", "Pending Approval"
    ACTIVE = "active", "Active"
    HIRING = "hiring", "Hiring"
    PAUSED = "paused", "Paused"
    FILLED = "filled", "Filled"
    CLOSED = "closed", "Closed"


class EmploymentType(models.TextChoices):
    FULL_TIME = "full_time", "Full-time"
    PART_TIME = "part_time", "Part-time"
    CONTRACT = "contract", "Contract"
    INTERNSHIP = "internship", "Internship"


class WorkModel(models.TextChoices):
    REMOTE = "remote", "Remote"
    HYBRID = "hybrid", "Hybrid"
    ONSITE = "onsite", "On-site"


class Job(BaseModel):
    """
    Represents an open role posted by an Account Manager on behalf of a Company.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="jobs",
        help_text="Company offering this role.",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_jobs",
        help_text="User who created or submitted this job.",
    )
    title = models.CharField(max_length=255, db_index=True)
    slug = models.SlugField(max_length=280, blank=True, db_index=True)
    status = models.CharField(
        max_length=30,
        choices=JobStatus.choices,
        default=JobStatus.DRAFT,
        db_index=True,
    )

    # Core Job Metadata
    location = models.CharField(max_length=255, db_index=True)
    employment_type = models.CharField(
        max_length=50,
        choices=EmploymentType.choices,
        default=EmploymentType.FULL_TIME,
        db_index=True,
    )
    work_model = models.CharField(
        max_length=50,
        choices=WorkModel.choices,
        default=WorkModel.HYBRID,
        db_index=True,
    )
    experience = models.CharField(max_length=100, blank=True, default="")
    open_roles = models.PositiveIntegerField(default=1)
    recruiter_slots = models.PositiveIntegerField(
        default=6,
        help_text="Maximum number of recruiters who may work this job simultaneously.",
    )
    posted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    # Single text block for Job Description
    job_description = models.TextField(
        blank=True,
        default="",
        help_text="Complete job description text.",
    )

    # Compensation & Details
    salary_min = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Minimum annual salary in base currency.",
    )
    salary_max = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Maximum annual salary in base currency.",
    )
    salary_currency = models.CharField(max_length=10, default="USD")

    equity = models.DecimalField(
        max_digits=6,
        decimal_places=3,
        null=True,
        blank=True,
        help_text="Equity percentage (e.g., 0.100 for 0.10%).",
    )
    visa_sponsorship = models.CharField(max_length=255, blank=True, default="")

    # Single text block for Benefits & Perks
    benefits_and_perks = models.TextField(
        blank=True,
        default="",
        help_text="All company benefits and perks.",
    )

    # Bounty & Recruiter Financials
    company_to_yuvro_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Percentage of first-year salary paid by the company to Yuvro (e.g. 20.00).",
    )
    yuvro_commission_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Percentage retained by Yuvro as commission (e.g. 5.00).",
    )

    # Flexible JSON structured configurations
    payout_terms = models.JSONField(
        default=list,
        blank=True,
        help_text="List of milestone days in ascending order (e.g. [30, 60, 90]).",
    )
    candidate_questions = models.JSONField(
        default=list,
        blank=True,
        help_text="Job-specific candidate questions configured by Account Manager.",
    )
    must_haves = models.JSONField(
        default=list,
        blank=True,
        help_text="List of hard qualification requirements.",
    )
    signals = models.JSONField(
        default=dict,
        blank=True,
        help_text="Evaluation signals: {'green': [...], 'red': [...]}.",
    )
    hiring_process = models.JSONField(
        default=list,
        blank=True,
        help_text="Job-specific hiring process steps (e.g. ['Screening', 'Technical interview', 'Hiring manager', 'Offer']).",
    )
    target_companies = models.JSONField(
        default=list,
        blank=True,
        help_text="List of target companies to source candidates from (e.g. ['Google', 'Meta', 'Stripe']).",
    )

    class Meta:
        db_table = "marketplace_jobs"
        verbose_name = "Job"
        verbose_name_plural = "Jobs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["status", "work_model", "employment_type"]),
            models.Index(fields=["salary_min", "salary_max"]),
        ]

    def __str__(self):
        return f"{self.title} at {self.company.name if self.company else 'Unknown'}"

    @property
    def recruiter_percentage(self) -> Decimal:
        """
        Recruiter percentage is dynamically calculated as:
        company_to_yuvro_percentage - yuvro_commission_percentage
        """
        c_pct = self.company_to_yuvro_percentage or Decimal("0.00")
        y_pct = self.yuvro_commission_percentage or Decimal("0.00")
        return c_pct - y_pct

    @property
    def recruiter_bounty_min(self) -> Decimal:
        """
        Minimum recruiter reward in salary currency.
        salary_min * recruiter_percentage / 100
        """
        if not self.salary_min or self.recruiter_percentage <= Decimal("0.00"):
            return Decimal("0.00")
        return (self.salary_min * self.recruiter_percentage) / Decimal("100")

    @property
    def recruiter_bounty_max(self) -> Decimal:
        """
        Maximum recruiter reward in salary currency.
        salary_max * recruiter_percentage / 100
        """
        if not self.salary_max or self.recruiter_percentage <= Decimal("0.00"):
            return Decimal("0.00")
        return (self.salary_max * self.recruiter_percentage) / Decimal("100")

    def clean(self):
        super().clean()
        if self.salary_min < Decimal("0.00"):
            raise ValidationError({"salary_min": "Salary minimum cannot be negative."})
        if self.salary_max < Decimal("0.00"):
            raise ValidationError({"salary_max": "Salary maximum cannot be negative."})
        if self.salary_min > self.salary_max:
            raise ValidationError(
                {"salary_min": "Salary minimum cannot exceed salary maximum."}
            )

        if self.equity is not None and self.equity < Decimal("0.00"):
            raise ValidationError({"equity": "Equity percentage cannot be negative."})

        if self.company_to_yuvro_percentage < Decimal("0.00"):
            raise ValidationError(
                {"company_to_yuvro_percentage": "Percentage cannot be negative."}
            )
        if self.yuvro_commission_percentage < Decimal("0.00"):
            raise ValidationError(
                {"yuvro_commission_percentage": "Commission cannot be negative."}
            )
        if self.yuvro_commission_percentage > self.company_to_yuvro_percentage:
            raise ValidationError(
                {
                    "yuvro_commission_percentage": (
                        "Yuvro commission percentage cannot exceed the company fee percentage."
                    )
                }
            )

    def save(self, *args, **kwargs):
        if not self.slug and self.title:
            base_slug = slugify(self.title) or "job"
            # Ensure unique or company-scoped slug
            unique_suffix = str(self.id or uuid.uuid4())[:8]
            self.slug = f"{base_slug}-{unique_suffix}"

        if self.status == JobStatus.ACTIVE and not self.posted_at:
            self.posted_at = timezone.now()

        self.full_clean()
        super().save(*args, **kwargs)


class RecruiterStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    PENDING = "pending", "Pending"
    SUSPENDED = "suspended", "Suspended"
    INACTIVE = "inactive", "Inactive"


class RecruiterType(models.TextChoices):
    INDEPENDENT = "Independent", "Independent"
    AGENCY = "Agency", "Agency"


class Recruiter(BaseModel):
    """
    Represents a recruiter or agency on the Yuvro marketplace.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recruiter_profile",
        help_text="Linked User account with recruiter_freelancer role.",
    )
    account_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_recruiters",
        help_text="Account Manager managing this recruiter.",
    )
    name = models.CharField(max_length=255, db_index=True)
    slug = models.SlugField(max_length=280, blank=True, db_index=True)
    email = models.EmailField(db_index=True)
    phone = models.CharField(max_length=50, blank=True, default="")
    location = models.CharField(max_length=255, blank=True, default="")
    linkedin = models.CharField(max_length=500, blank=True, default="")
    website = models.CharField(max_length=500, blank=True, default="")
    type = models.CharField(
        max_length=50,
        choices=RecruiterType.choices,
        default=RecruiterType.INDEPENDENT,
        db_index=True,
    )
    agency = models.CharField(max_length=255, blank=True, default="")
    experience = models.CharField(max_length=100, blank=True, default="")
    status = models.CharField(
        max_length=30,
        choices=RecruiterStatus.choices,
        default=RecruiterStatus.ACTIVE,
        db_index=True,
    )
    specializations = models.JSONField(
        default=list,
        blank=True,
        help_text="List of specialization tags (e.g. ['Frontend', 'AI/ML']).",
    )
    markets = models.JSONField(
        default=list,
        blank=True,
        help_text="List of markets/regions (e.g. ['US', 'Remote']).",
    )
    response_rate = models.PositiveIntegerField(
        default=0, help_text="Response rate percentage (0-100)."
    )
    quality_score = models.PositiveIntegerField(
        default=0, help_text="Quality score (0-100)."
    )
    verification = models.JSONField(
        default=dict,
        blank=True,
        help_text="Verification statuses: {'identity': bool, 'agency': bool, 'payment': bool, 'tax': bool, 'agreement': bool}.",
    )
    interview_stats = models.JSONField(
        default=dict,
        blank=True,
        help_text="Interview statistics: {'scheduled': int, 'completed': int, ...}.",
    )
    am_rejection_reasons = models.JSONField(
        default=list,
        blank=True,
        help_text="Reasons AM rejected submissions: [{'reason': '...', 'count': int}].",
    )
    company_rejection_reasons = models.JSONField(
        default=list,
        blank=True,
        help_text="Reasons companies rejected candidates: [{'reason': '...', 'count': int}].",
    )
    created_by = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        db_table = "marketplace_recruiters"
        verbose_name = "Recruiter"
        verbose_name_plural = "Recruiters"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "type"]),
            models.Index(fields=["account_manager", "status"]),
            models.Index(fields=["slug"]),
            models.Index(fields=["email"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.type})"

    def save(self, *args, **kwargs):
        if not self.slug and self.name:
            base_slug = slugify(self.name) or "recruiter"
            existing = (
                Recruiter.objects.filter(slug=base_slug).exclude(id=self.id).exists()
            )
            if existing:
                unique_suffix = str(self.id or uuid.uuid4())[:8]
                self.slug = f"{base_slug}-{unique_suffix}"
            else:
                self.slug = base_slug

        # Default verification dict if empty
        if not self.verification or not isinstance(self.verification, dict):
            self.verification = {
                "identity": False,
                "agency": False,
                "payment": False,
                "tax": False,
                "agreement": False,
            }

        # Default interview stats dict if empty
        if not self.interview_stats or not isinstance(self.interview_stats, dict):
            self.interview_stats = {
                "scheduled": 0,
                "completed": 0,
                "technical": 0,
                "hiringManager": 0,
                "final": 0,
                "noShows": 0,
                "cancelled": 0,
                "rescheduled": 0,
            }

        super().save(*args, **kwargs)


class RecruiterApplication(BaseModel):
    """
    Represents an application by a freelance recruiter to join the Yuvro recruiter network.
    Reviewed and approved or rejected by Account Managers.
    """

    class ApplicationStatus(models.TextChoices):
        PENDING = "pending", "Pending review"
        ACTIVE = "active", "Active"
        REJECTED = "rejected", "Rejected"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="recruiter_application",
        help_text="User account associated with this application.",
    )
    name = models.CharField(max_length=255, db_index=True)
    email = models.EmailField(db_index=True)
    phone = models.CharField(max_length=50, blank=True, default="")
    linkedin = models.CharField(max_length=500, blank=True, default="")
    experience_years = models.CharField(max_length=50, blank=True, default="")
    top_roles = models.JSONField(
        default=list,
        blank=True,
        help_text="Top 3 roles or specializations (e.g. ['AI / ML', 'Founding Engineer', 'Backend Engineer']).",
    )
    early_stage_startup_hiring = models.BooleanField(
        default=True,
        help_text="Has experience recruiting for early-stage startups.",
    )
    startup_hiring_detail = models.TextField(
        blank=True,
        default="",
        help_text="Details of early-stage startup hiring achievements.",
    )
    hiring_geography = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Geographies/countries where the recruiter hires (e.g. 'India, United States').",
    )
    sourcing_tools = models.CharField(
        max_length=500,
        blank=True,
        default="",
        help_text="Primary sourcing tools (e.g. 'LinkedIn Recruiter, Gem, GitHub search').",
    )
    hiring_references = models.JSONField(
        default=list,
        blank=True,
        help_text="List of reference links or contacts (e.g. ['linkedin.com/in/arjun-rao', 'linkedin.com/in/kavya-n']).",
    )
    status = models.CharField(
        max_length=30,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.PENDING,
        db_index=True,
    )
    decision_notes = models.TextField(blank=True, default="")
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_recruiter_network_applications",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "marketplace_recruiter_applications"
        verbose_name = "Recruiter Application"
        verbose_name_plural = "Recruiter Applications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["email"]),
        ]

    def __str__(self):
        return f"Application by {self.name} ({self.status})"

