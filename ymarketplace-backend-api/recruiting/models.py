import uuid
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models import BaseModel


def candidate_resume_path(instance, filename):
    ext = filename.split(".")[-1]
    app_name = getattr(settings, "APP_NAME", "ymarketplace").strip().strip("/")
    prefix = f"{app_name}/" if app_name else ""
    return f"{prefix}candidates/{instance.id}/resume.{ext}"


class ApplicationStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    WITHDRAWN = "withdrawn", "Withdrawn"


class RecruiterJobApplication(BaseModel):
    """
    Represents a recruiter's application to recruit for a specific Job.
    Must be approved by an authorized Account Manager before candidates can be submitted.
    """

    recruiter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="job_applications",
        help_text="The freelancer recruiter applying to work on this job.",
    )
    job = models.ForeignKey(
        "marketplace.Job",
        on_delete=models.CASCADE,
        related_name="recruiter_applications",
        help_text="The job being applied for.",
    )
    why_fit = models.TextField(
        blank=True,
        default="",
        help_text="Recruiter's explanation of why they are a strong fit to recruit for this specific role.",
    )
    status = models.CharField(
        max_length=30,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.PENDING,
        db_index=True,
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_recruiter_applications",
        help_text="Account Manager or Admin who approved or rejected this application.",
    )
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when the application was reviewed.",
    )
    rejection_reason = models.TextField(
        blank=True,
        default="",
        help_text="Reason provided by the Account Manager if the application is rejected.",
    )

    class Meta:
        db_table = "recruiting_job_applications"
        verbose_name = "Recruiter Job Application"
        verbose_name_plural = "Recruiter Job Applications"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["recruiter", "job"],
                name="unique_recruiter_job_application",
            ),
        ]
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["recruiter", "status"]),
            models.Index(fields=["job", "status"]),
        ]

    def __str__(self):
        return f"{self.recruiter} -> {self.job} [{self.status}]"

    def clean(self):
        super().clean()
        if (
            self.why_fit is not None
            and not str(self.why_fit).strip()
            and self.status == ApplicationStatus.PENDING
        ):
            raise ValidationError(
                {"why_fit": "Why fit explanation cannot be empty or whitespace."}
            )


class Candidate(BaseModel):
    """
    Represents a candidate/talent record owned by a recruiter.
    A candidate can exist independently of any specific job submission.
    """

    recruiter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="candidates",
        help_text="Recruiter who owns and created this candidate profile.",
    )
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    current_title = models.CharField(max_length=255, blank=True, default="")
    current_company = models.CharField(max_length=255, blank=True, default="")
    email = models.EmailField(db_index=True)
    phone = models.CharField(max_length=50, blank=True, default="")
    linkedin_url = models.URLField(max_length=500, blank=True, default="")
    github_url = models.URLField(max_length=500, blank=True, default="")
    portfolio_url = models.URLField(max_length=500, blank=True, default="")
    current_location = models.CharField(max_length=255, blank=True, default="")
    work_authorization_status = models.CharField(max_length=100, blank=True, default="")
    open_to_relocation = models.BooleanField(default=False)
    base_compensation_expectation = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Expected annual base compensation.",
    )
    compensation = models.CharField(
        max_length=150,
        blank=True,
        default="",
        help_text="Text representation of compensation / salary expectation.",
    )
    current_compensation = models.CharField(
        max_length=150,
        blank=True,
        default="",
        help_text="Current compensation / salary.",
    )
    compensation_currency = models.CharField(max_length=10, default="USD")
    earliest_start_date = models.DateField(null=True, blank=True)
    availability = models.CharField(
        max_length=150,
        blank=True,
        default="",
        help_text="Availability / notice period string (e.g. 4 weeks notice, Immediate).",
    )
    notice_period = models.CharField(
        max_length=150,
        blank=True,
        default="",
        help_text="Notice period if applicable.",
    )
    resume = models.FileField(
        upload_to=candidate_resume_path,
        blank=True,
        null=True,
        help_text="Uploaded resume document.",
    )
    resume_url = models.URLField(
        max_length=500,
        blank=True,
        default="",
        help_text="External or CDN resume link.",
    )
    notes = models.TextField(
        blank=True,
        default="",
        help_text="General recruiter notes regarding this candidate.",
    )

    class Meta:
        db_table = "recruiting_candidates"
        verbose_name = "Candidate"
        verbose_name_plural = "Candidates"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recruiter", "email"]),
            models.Index(fields=["email"]),
            models.Index(fields=["first_name", "last_name"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(base_compensation_expectation__gte=0)
                | models.Q(base_compensation_expectation__isnull=True),
                name="candidate_compensation_non_negative",
            )
        ]

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def visa(self) -> str:
        return self.work_authorization_status or ""

    @property
    def visa_status(self) -> str:
        return self.work_authorization_status or ""

    @property
    def current_salary(self) -> str:
        return self.current_compensation or ""

    @property
    def expected_salary(self) -> str:
        return self.compensation or (
            f"${self.base_compensation_expectation}"
            if self.base_compensation_expectation is not None
            else ""
        )

    def __str__(self):
        return f"{self.full_name} ({self.email})"

    def clean(self):
        super().clean()
        if (
            self.base_compensation_expectation is not None
            and self.base_compensation_expectation < Decimal("0.00")
        ):
            raise ValidationError(
                {
                    "base_compensation_expectation": (
                        "Base compensation expectation cannot be negative."
                    )
                }
            )


class SubmissionStatus(models.TextChoices):
    SUBMITTED = "submitted", "Submitted"
    UNDER_REVIEW = "under_review", "Under Review"
    SHORTLISTED = "shortlisted", "Shortlisted"
    REJECTED = "rejected", "Rejected"


class CandidateSubmission(BaseModel):
    """
    Represents the submission of a Candidate for a specific Job by an approved Recruiter.
    Enforces the security relationship via the approved RecruiterJobApplication.
    """

    application = models.ForeignKey(
        RecruiterJobApplication,
        on_delete=models.PROTECT,
        related_name="candidate_submissions",
        help_text="The approved job application granting permission for this submission.",
    )
    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.PROTECT,
        related_name="submissions",
        help_text="The candidate being submitted.",
    )
    answers = models.JSONField(
        default=list,
        blank=True,
        help_text="List of answers to job-specific screening questions with snapshot metadata.",
    )
    recruiter_notes = models.TextField(
        blank=True,
        default="",
        help_text="Notes and pitch provided by the recruiter for this submission.",
    )
    stage = models.CharField(
        max_length=100,
        default="am_review",
        blank=True,
        help_text="Current stage in the hiring pipeline.",
    )
    status = models.CharField(
        max_length=30,
        choices=SubmissionStatus.choices,
        default=SubmissionStatus.SUBMITTED,
        db_index=True,
    )
    rejection_reason = models.TextField(
        blank=True,
        default="",
        help_text="Reason for rejection provided by the reviewer / account manager.",
    )
    decision_note = models.TextField(
        blank=True,
        default="",
        help_text="Decision note or commentary from the account manager or client.",
    )
    submitted_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        help_text="Timestamp when the candidate was submitted.",
    )

    class Meta:
        db_table = "recruiting_candidate_submissions"
        verbose_name = "Candidate Submission"
        verbose_name_plural = "Candidate Submissions"
        ordering = ["-submitted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["application", "candidate"],
                name="unique_candidate_submission_per_application",
            ),
        ]
        indexes = [
            models.Index(fields=["application", "status"]),
            models.Index(fields=["candidate", "status"]),
            models.Index(fields=["status", "submitted_at"]),
        ]

    def __str__(self):
        return (
            f"Submission: {self.candidate.full_name} for "
            f"{self.application.job.title} [{self.status}]"
        )
