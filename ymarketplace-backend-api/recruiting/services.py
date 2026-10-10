import logging
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

logger = logging.getLogger(__name__)


from marketplace.models import Job, JobStatus
from recruiting.models import (
    ApplicationStatus,
    Candidate,
    CandidateSubmission,
    RecruiterJobApplication,
    SubmissionStatus,
)
from recruiting.permissions import (
    is_user_account_manager,
    is_user_admin,
    is_user_recruiter,
    user_manages_job,
)
from recruiting.validators import validate_and_snapshot_answers, validate_why_fit_text


def apply_to_job(*, user, job: Job, why_fit: str) -> RecruiterJobApplication:
    """
    Creates a new RecruiterJobApplication for the given user and job.
    """
    if not user or not user.is_authenticated:
        raise PermissionDenied("Authentication required to apply for jobs.")

    if not is_user_recruiter(user):
        raise PermissionDenied(
            "Only freelancer recruiters can apply to recruit for jobs."
        )

    if not job or not job.is_active:
        raise ValidationError(
            {"detail": "The requested job does not exist or is inactive."}
        )

    # Check job eligibility
    if job.status in [JobStatus.CLOSED, JobStatus.DRAFT]:
        raise ValidationError(
            {
                "detail": f"This job is currently {job.status} and cannot accept applications."
            }
        )

    cleaned_why_fit = validate_why_fit_text(why_fit)

    # Check for existing application
    existing_app = RecruiterJobApplication.objects.filter(
        recruiter=user, job=job
    ).first()
    if existing_app:
        if existing_app.status in [ApplicationStatus.WITHDRAWN, ApplicationStatus.REJECTED]:
            with transaction.atomic():
                existing_app.why_fit = cleaned_why_fit
                existing_app.status = ApplicationStatus.PENDING
                existing_app.reviewed_by = None
                existing_app.reviewed_at = None
                existing_app.rejection_reason = ""
                existing_app.save(
                    update_fields=[
                        "why_fit",
                        "status",
                        "reviewed_by",
                        "reviewed_at",
                        "rejection_reason",
                        "updated_at",
                    ]
                )
            try:
                from core.notifications import notify_am_recruiter_job_application_received
                notify_am_recruiter_job_application_received(existing_app)
            except Exception as e:
                logger.warning(f"Failed to dispatch AM notification for reactivated job application: {e}")
            return existing_app
        raise ValidationError({"detail": "You have already applied for this job."})

    with transaction.atomic():
        application = RecruiterJobApplication.objects.create(
            recruiter=user,
            job=job,
            why_fit=cleaned_why_fit,
            status=ApplicationStatus.PENDING,
        )

    try:
        from core.notifications import notify_am_recruiter_job_application_received
        notify_am_recruiter_job_application_received(application)
    except Exception as e:
        logger.warning(f"Failed to dispatch AM notification for new job application: {e}")

    return application


def approve_application(
    *, application: RecruiterJobApplication, user
) -> RecruiterJobApplication:
    """
    Approves a pending RecruiterJobApplication.
    Must be performed by an authorized Account Manager managing the Job's company or Admin.
    """
    if not user_manages_job(user, application.job):
        raise PermissionDenied(
            "You do not have permission to review applications for this job."
        )

    if application.status != ApplicationStatus.PENDING:
        raise ValidationError(
            {
                "detail": f"Cannot approve application with status '{application.status}'."
            }
        )

    with transaction.atomic():
        application.status = ApplicationStatus.APPROVED
        application.reviewed_by = user
        application.reviewed_at = timezone.now()
        application.rejection_reason = ""
        application.save(
            update_fields=[
                "status",
                "reviewed_by",
                "reviewed_at",
                "rejection_reason",
                "updated_at",
            ]
        )

    try:
        from core.emails import send_job_assigned_or_approved_email
        send_job_assigned_or_approved_email(application, is_direct_assignment=False)
    except Exception as e:
        logger.warning(f"Failed to dispatch job approved email: {e}")

    try:
        from core.notifications import notify_recruiter_job_assigned
        notify_recruiter_job_assigned(application, is_direct_assignment=False)
    except Exception as e:
        logger.warning(f"Failed to dispatch job approved notification: {e}")

    return application



def assign_recruiter_to_job(
    *, user, job: Job, recruiter_user, why_fit: str = ""
) -> RecruiterJobApplication:
    """
    Directly assigns an active recruiter to a job with APPROVED status.
    Must be performed by an authorized Account Manager managing the Job's company or Admin.
    """
    if not user or not user.is_authenticated:
        raise PermissionDenied("Authentication required to assign recruiters.")

    if not is_user_account_manager(user):
        raise PermissionDenied(
            "Only Account Managers or Admins can assign recruiters to jobs."
        )

    if not user_manages_job(user, job):
        raise PermissionDenied(
            "You do not have permission to assign recruiters for this job."
        )

    if not job or not job.is_active:
        raise ValidationError(
            {"detail": "The requested job does not exist or is inactive."}
        )

    if job.status in [JobStatus.CLOSED, JobStatus.DRAFT]:
        raise ValidationError(
            {
                "detail": f"This job is currently {job.status} and cannot accept assignments."
            }
        )

    if not recruiter_user or not is_user_recruiter(recruiter_user):
        raise ValidationError(
            {"recruiter": "A valid freelance recruiter user must be selected."}
        )

    note = (why_fit or "").strip() or "Directly assigned by Account Manager"

    existing_app = RecruiterJobApplication.objects.filter(
        recruiter=recruiter_user, job=job
    ).first()

    with transaction.atomic():
        if existing_app:
            existing_app.status = ApplicationStatus.APPROVED
            existing_app.reviewed_by = user
            existing_app.reviewed_at = timezone.now()
            existing_app.why_fit = note
            existing_app.rejection_reason = ""
            existing_app.is_active = True
            existing_app.save(
                update_fields=[
                    "status",
                    "reviewed_by",
                    "reviewed_at",
                    "why_fit",
                    "rejection_reason",
                    "is_active",
                    "updated_at",
                ]
            )
            try:
                from core.emails import send_job_assigned_or_approved_email
                send_job_assigned_or_approved_email(existing_app, is_direct_assignment=True)
            except Exception as e:
                logger.warning(f"Failed to dispatch job assigned email: {e}")
            try:
                from core.notifications import notify_recruiter_job_assigned
                notify_recruiter_job_assigned(existing_app, is_direct_assignment=True)
            except Exception as e:
                logger.warning(f"Failed to dispatch job assigned notification: {e}")
            return existing_app

        application = RecruiterJobApplication.objects.create(
            recruiter=recruiter_user,
            job=job,
            why_fit=note,
            status=ApplicationStatus.APPROVED,
            reviewed_by=user,
            reviewed_at=timezone.now(),
            is_active=True,
        )

    try:
        from core.emails import send_job_assigned_or_approved_email
        send_job_assigned_or_approved_email(application, is_direct_assignment=True)
    except Exception as e:
        logger.warning(f"Failed to dispatch job assigned email: {e}")

    try:
        from core.notifications import notify_recruiter_job_assigned
        notify_recruiter_job_assigned(application, is_direct_assignment=True)
    except Exception as e:
        logger.warning(f"Failed to dispatch job assigned notification: {e}")

    return application



def reject_application(
    *, application: RecruiterJobApplication, user, rejection_reason: str
) -> RecruiterJobApplication:
    """
    Rejects a pending RecruiterJobApplication with a required reason.
    Must be performed by an authorized Account Manager managing the Job's company or Admin.
    """
    if not user_manages_job(user, application.job):
        raise PermissionDenied(
            "You do not have permission to review applications for this job."
        )

    if application.status != ApplicationStatus.PENDING:
        raise ValidationError(
            {"detail": f"Cannot reject application with status '{application.status}'."}
        )

    reason = str(rejection_reason or "").strip()
    if not reason:
        raise ValidationError({"rejection_reason": "Rejection reason is required."})

    with transaction.atomic():
        application.status = ApplicationStatus.REJECTED
        application.reviewed_by = user
        application.reviewed_at = timezone.now()
        application.rejection_reason = reason
        application.save(
            update_fields=[
                "status",
                "reviewed_by",
                "reviewed_at",
                "rejection_reason",
                "updated_at",
            ]
        )

    return application


def withdraw_application(
    *, application: RecruiterJobApplication, user
) -> RecruiterJobApplication:
    """
    Withdraws/unassigns a RecruiterJobApplication (pending or approved).
    Must be performed by the recruiter who submitted the application or admin.
    """
    if application.recruiter_id != user.id and not is_user_admin(user):
        raise PermissionDenied("You cannot withdraw another recruiter's application.")

    if application.status not in [ApplicationStatus.PENDING, ApplicationStatus.APPROVED]:
        raise ValidationError(
            {
                "detail": f"Cannot withdraw or unassign application with status '{application.status}'."
            }
        )

    with transaction.atomic():
        application.status = ApplicationStatus.WITHDRAWN
        application.save(update_fields=["status", "updated_at"])

    return application


def normalize_linkedin_url(url: str) -> str:
    if not url:
        return ""
    import re
    clean = str(url).strip().lower()
    clean = re.sub(r"^https?://", "", clean)
    clean = re.sub(r"^(www\.|[a-z]{2}\.)?linkedin\.com/", "", clean)
    clean = re.sub(r"^(in|pub|profile)/", "", clean)
    clean = clean.split("?")[0].split("#")[0]
    return clean.rstrip("/")


def submit_candidate(
    *,
    application: RecruiterJobApplication,
    candidate: Candidate,
    answers: list,
    recruiter_notes: str = "",
    user,
) -> CandidateSubmission:
    """
    Submits a candidate for an approved job application.
    Enforces that:
    1. Recruiter owns the application.
    2. Application status is APPROVED.
    3. Candidate is owned by the recruiter.
    4. Required question answers are verified and snapshotted.
    5. Duplicate candidate submissions per application are prevented.
    6. Unique constraint per job + LinkedIn URL is enforced.
    """
    if application.recruiter_id != user.id and not is_user_admin(user):
        raise PermissionDenied(
            "You cannot submit candidates using another recruiter's application."
        )

    if application.status != ApplicationStatus.APPROVED:
        raise ValidationError(
            {
                "detail": "You must be approved to recruit for this job before submitting candidates."
            }
        )

    if application.job.status in [JobStatus.CLOSED, JobStatus.DRAFT]:
        raise ValidationError(
            {
                "detail": f"This job is currently {application.job.status} and cannot accept candidate submissions."
            }
        )

    # Check for existing submission of this candidate under this application
    if CandidateSubmission.objects.filter(
        application=application, candidate=candidate
    ).exists():
        raise ValidationError(
            {
                "detail": "This candidate has already been submitted for this application."
            }
        )

    # Check unique constraint: (job + linkedin_url)
    norm_linkedin = normalize_linkedin_url(getattr(candidate, "linkedin_url", ""))
    if norm_linkedin:
        existing_subs = CandidateSubmission.objects.filter(
            application__job=application.job
        ).select_related("candidate")
        for existing in existing_subs:
            if existing.candidate and normalize_linkedin_url(getattr(existing.candidate, "linkedin_url", "")) == norm_linkedin:
                raise ValidationError(
                    {
                        "detail": f"A candidate ({existing.candidate.full_name}) with this LinkedIn profile URL has already been submitted for this job."
                    }
                )

    # Validate and snapshot screening question answers
    snapshot_answers = validate_and_snapshot_answers(answers, application.job)

    with transaction.atomic():
        submission = CandidateSubmission.objects.create(
            application=application,
            candidate=candidate,
            answers=snapshot_answers,
            recruiter_notes=str(recruiter_notes or "").strip(),
            status=SubmissionStatus.SUBMITTED,
        )

    # 1. Notify AM that a recruiter submitted a candidate
    try:
        from core.notifications import notify_am_candidate_submitted
        notify_am_candidate_submitted(submission)
    except Exception as e:
        logger.warning(f"Failed to dispatch AM candidate submitted notification: {e}")

    # 2. Email confirmation to recruiter
    try:
        from core.emails import send_candidate_submitted_email
        send_candidate_submitted_email(submission)
    except Exception as e:
        logger.warning(f"Failed to dispatch candidate submitted email: {e}")

    return submission

