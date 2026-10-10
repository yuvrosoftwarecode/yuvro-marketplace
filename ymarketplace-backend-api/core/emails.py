import logging
import re
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def get_frontend_base_url() -> str:
    """
    Returns the frontend web base URL.
    """
    url = getattr(settings, "FRONTEND_URL", "").strip().rstrip("/")
    return url or "http://localhost:3004"


def get_email_logo_url() -> str:
    """
    Returns the logo URL for emails.
    - If EMAIL_LOGO_URL is configured, uses it.
    - If running on localhost or 127.0.0.1, falls back to the public hosted URL
      (https://marketplace.yuvro.ai/knowledge-tree.png) so email clients like Gmail can render it.
    - Otherwise, derives from FRONTEND_URL.
    """
    custom = getattr(settings, "EMAIL_LOGO_URL", "").strip()
    if custom:
        return custom

    frontend_url = get_frontend_base_url()
    if "localhost" in frontend_url or "127.0.0.1" in frontend_url:
        return "https://marketplace.yuvro.ai/knowledge-tree.png"

    return f"{frontend_url}/knowledge-tree.png"


def format_stage_label(stage: str) -> str:
    """
    Formats a pipeline stage identifier into a clean human-readable label.
    """
    if not stage:
        return "AM Review"

    raw = str(stage).strip()
    mapping = {
        "submitted": "AM Review",
        "am_review": "AM Review",
        "pending": "AM Review",
        "company_review": "Company Review",
        "client_review": "Client Review",
        "first_round": "First Round",
        "interview": "Interview Round",
        "screening": "Screening",
        "technical_interview": "Technical Interview",
        "technical_round": "Technical Round",
        "hiring_manager": "Hiring Manager",
        "final": "Final Round",
        "final_interview": "Final Interview",
        "offer": "Offer Stage",
        "hired": "Hired",
        "rejected": "Rejected",
    }

    lower = raw.lower().replace("-", "_")
    if lower in mapping:
        return mapping[lower]

    return raw.replace("_", " ").replace("-", " ").title()


def format_bounty(job) -> str:
    """
    Formats the recruiter bounty from the job model.
    """
    if not job:
        return ""
    bounty = getattr(job, "bounty", None)
    if bounty is not None and bounty > 0:
        return f"${bounty:,.0f}"
    min_bounty = getattr(job, "bounty_range_min", None)
    max_bounty = getattr(job, "bounty_range_max", None)
    if min_bounty and max_bounty:
        return f"${min_bounty:,.0f} - ${max_bounty:,.0f}"
    return ""


def send_templated_email(
    *,
    to_email: str,
    subject: str,
    template_name: str,
    context: dict,
    plain_message: str = None,
) -> bool:
    """
    Renders an HTML email template with base context (logo_url, frontend_url, subject)
    and sends it via Django's configured EMAIL_BACKEND.
    """
    if not to_email:
        logger.warning("send_templated_email called without to_email")
        return False

    frontend_url = get_frontend_base_url()
    logo_url = get_email_logo_url()

    full_context = {
        "frontend_url": frontend_url,
        "logo_url": logo_url,
        "subject": subject,
        **context,
    }

    try:
        html_message = render_to_string(template_name, full_context)
        if not plain_message:
            plain_message = strip_tags(html_message)
            # Collapse excess whitespace
            plain_message = re.sub(r"\n\s*\n+", "\n\n", plain_message).strip()

        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "contact@yuvro.ai")

        send_mail(
            subject=subject,
            message=plain_message,
            from_email=from_email,
            recipient_list=[to_email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"Successfully sent email '{subject}' to {to_email}")
        return True
    except Exception as e:
        logger.exception(f"Failed to send email '{subject}' to {to_email}: {e}")
        return False


# ---------------------------------------------------------------------------
# Typed Event Email Handlers
# ---------------------------------------------------------------------------

def send_candidate_submitted_email(submission) -> bool:
    """
    Trigger 1: When profile is submitted by recruiter to AM.
    Sends confirmation email to the recruiter.
    """
    try:
        recruiter = submission.application.recruiter
        candidate = submission.candidate
        job = submission.application.job
        company = job.company if job else None

        recruiter_email = getattr(recruiter, "email", "")
        if not recruiter_email:
            return False

        frontend_url = get_frontend_base_url()
        submission_url = f"{frontend_url}/jobs/{job.slug or job.id}/pipeline" if job else f"{frontend_url}/jobs"

        candidate_name = candidate.full_name if candidate else "Candidate"
        job_title = job.title if job else "Open Role"
        company_name = company.name if company else "Yuvro Client"
        recruiter_name = getattr(recruiter, "full_name", "") or getattr(recruiter, "first_name", "") or "Recruiter"

        subject = f"Profile Submitted: {candidate_name} for {job_title}"

        context = {
            "recruiter_name": recruiter_name,
            "candidate_name": candidate_name,
            "job_title": job_title,
            "company_name": company_name,
            "bounty": format_bounty(job),
            "header_badge": "Profile Submitted",
            "cta_text": "View in Recruiter Portal",
            "cta_url": submission_url,
            "preheader": f"Your candidate profile for {candidate_name} has been submitted for AM review.",
        }

        return send_templated_email(
            to_email=recruiter_email,
            subject=subject,
            template_name="emails/candidate_submitted.html",
            context=context,
        )
    except Exception as e:
        logger.exception(f"Error preparing candidate submitted email: {e}")
        return False


def send_candidate_approved_email(submission, old_stage: str = None) -> bool:
    """
    Trigger 2: When profile is approved by AM.
    Sends approval notification to the recruiter.
    """
    try:
        recruiter = submission.application.recruiter
        candidate = submission.candidate
        job = submission.application.job
        company = job.company if job else None

        recruiter_email = getattr(recruiter, "email", "")
        if not recruiter_email:
            return False

        frontend_url = get_frontend_base_url()
        submission_url = f"{frontend_url}/jobs/{job.slug or job.id}/pipeline" if job else f"{frontend_url}/jobs"

        candidate_name = candidate.full_name if candidate else "Candidate"
        job_title = job.title if job else "Open Role"
        company_name = company.name if company else "Yuvro Client"
        recruiter_name = getattr(recruiter, "full_name", "") or getattr(recruiter, "first_name", "") or "Recruiter"
        new_stage_label = format_stage_label(submission.stage)

        subject = f"Profile Approved: {candidate_name} for {job_title}"

        context = {
            "recruiter_name": recruiter_name,
            "candidate_name": candidate_name,
            "job_title": job_title,
            "company_name": company_name,
            "new_stage_label": new_stage_label,
            "decision_note": submission.decision_note or submission.rejection_reason or "",
            "bounty": format_bounty(job),
            "header_badge": "Profile Approved",
            "cta_text": "View Pipeline Status",
            "cta_url": submission_url,
            "preheader": f"Great news! {candidate_name}'s profile for {job_title} was approved by the Account Manager.",
        }

        return send_templated_email(
            to_email=recruiter_email,
            subject=subject,
            template_name="emails/candidate_approved.html",
            context=context,
        )
    except Exception as e:
        logger.exception(f"Error preparing candidate approved email: {e}")
        return False


def send_candidate_rejected_email(submission, rejected_at_stage: str) -> bool:
    """
    Triggered when a candidate is rejected at any stage OTHER than AM review.
    Sends notification to the recruiter mentioning the stage where rejected and reason.
    """
    try:
        recruiter = submission.application.recruiter
        candidate = submission.candidate
        job = submission.application.job
        company = job.company if job else None

        recruiter_email = getattr(recruiter, "email", "")
        if not recruiter_email:
            return False

        frontend_url = get_frontend_base_url()
        submission_url = f"{frontend_url}/jobs/{job.slug or job.id}/pipeline" if job else f"{frontend_url}/jobs"

        candidate_name = candidate.full_name if candidate else "Candidate"
        job_title = job.title if job else "Open Role"
        company_name = company.name if company else "Yuvro Client"
        recruiter_name = getattr(recruiter, "full_name", "") or getattr(recruiter, "first_name", "") or "Recruiter"

        stage_label = format_stage_label(rejected_at_stage)
        rejection_reason = (
            getattr(submission, "rejection_reason", "")
            or getattr(submission, "decision_note", "")
            or "No specific reason provided."
        ).strip()

        subject = f"Candidate Update: {candidate_name} for {job_title} ({stage_label})"

        context = {
            "recruiter_name": recruiter_name,
            "candidate_name": candidate_name,
            "job_title": job_title,
            "company_name": company_name,
            "rejected_stage_label": stage_label,
            "rejection_reason": rejection_reason,
            "header_badge": "Candidate Rejected",
            "badge_bg": "#FEF2F2",
            "badge_color": "#991B1B",
            "badge_border": "#FECACA",
            "cta_text": "View Pipeline Status",
            "cta_url": submission_url,
            "preheader": f"Update on {candidate_name} for {job_title}: not selected at {stage_label} stage.",
        }

        return send_templated_email(
            to_email=recruiter_email,
            subject=subject,
            template_name="emails/candidate_rejected.html",
            context=context,
        )
    except Exception as e:
        logger.exception(f"Error preparing candidate rejected email: {e}")
        return False


def send_job_assigned_or_approved_email(application, is_direct_assignment: bool = False) -> bool:
    """
    Trigger 3: When job is assigned or approved to recruiter by AM.
    Sends notification to the recruiter.
    """
    try:
        recruiter = application.recruiter
        job = application.job
        company = job.company if job else None

        recruiter_email = getattr(recruiter, "email", "")
        if not recruiter_email:
            return False

        frontend_url = get_frontend_base_url()
        job_url = f"{frontend_url}/jobs/{job.slug or job.id}" if job else f"{frontend_url}/jobs"

        job_title = job.title if job else "Open Position"
        company_name = company.name if company else "Yuvro Partner Company"
        recruiter_name = getattr(recruiter, "full_name", "") or getattr(recruiter, "first_name", "") or "Recruiter"

        action_type = "Assigned" if is_direct_assignment else "Approved"
        subject = f"Job {action_type}: {job_title} at {company_name}"

        location = getattr(job, "location", "") or getattr(job, "work_model", "")
        employment_type = getattr(job, "employment_type", "").replace("_", " ").title() if getattr(job, "employment_type", None) else ""

        context = {
            "recruiter_name": recruiter_name,
            "job_title": job_title,
            "company_name": company_name,
            "location": location,
            "bounty": format_bounty(job),
            "employment_type": employment_type,
            "is_direct_assignment": is_direct_assignment,
            "action_type": action_type,
            "header_badge": f"Job {action_type}",
            "cta_text": "View Job & Submit Candidates",
            "cta_url": job_url,
            "preheader": f"You have been {action_type.lower()} to recruit for {job_title} at {company_name}.",
        }

        return send_templated_email(
            to_email=recruiter_email,
            subject=subject,
            template_name="emails/job_assigned_or_approved.html",
            context=context,
        )
    except Exception as e:
        logger.exception(f"Error preparing job assignment email: {e}")
        return False


def send_pipeline_stage_moved_email(submission, old_stage: str, new_stage: str) -> bool:
    """
    Trigger 4: When pipeline moved ONLY from first round onwards, NOT AM review.
    Sends update to the recruiter.
    """
    try:
        recruiter = submission.application.recruiter
        candidate = submission.candidate
        job = submission.application.job
        company = job.company if job else None

        recruiter_email = getattr(recruiter, "email", "")
        if not recruiter_email:
            return False

        frontend_url = get_frontend_base_url()
        submission_url = f"{frontend_url}/jobs/{job.slug or job.id}/pipeline" if job else f"{frontend_url}/jobs"

        candidate_name = candidate.full_name if candidate else "Candidate"
        job_title = job.title if job else "Open Role"
        company_name = company.name if company else "Yuvro Client"
        recruiter_name = getattr(recruiter, "full_name", "") or getattr(recruiter, "first_name", "") or "Recruiter"

        old_label = format_stage_label(old_stage)
        new_label = format_stage_label(new_stage)

        subject = f"Pipeline Update: {candidate_name} moved to {new_label} for {job_title}"

        context = {
            "recruiter_name": recruiter_name,
            "candidate_name": candidate_name,
            "job_title": job_title,
            "company_name": company_name,
            "old_stage_label": old_label,
            "new_stage_label": new_label,
            "decision_note": submission.decision_note or "",
            "header_badge": "Pipeline Advancement",
            "cta_text": "Track Candidate Status",
            "cta_url": submission_url,
            "preheader": f"{candidate_name} has moved to {new_label} in the hiring pipeline for {job_title}.",
        }

        return send_templated_email(
            to_email=recruiter_email,
            subject=subject,
            template_name="emails/pipeline_stage_moved.html",
            context=context,
        )
    except Exception as e:
        logger.exception(f"Error preparing pipeline stage moved email: {e}")
        return False


def send_password_reset_otp_email(email: str, otp_code: str, user_name: str = None) -> bool:
    """
    Trigger 5: Reset password as OTP password reset.
    Sends 6-digit OTP code in branded template.
    """
    subject = "Your Password Reset Code — Yuvro Marketplace"
    context = {
        "email": email,
        "otp_code": otp_code,
        "user_name": user_name or email.split("@")[0],
        "header_badge": "Password Reset",
        "preheader": f"Your verification code is {otp_code}. Valid for 10 minutes.",
    }
    return send_templated_email(
        to_email=email,
        subject=subject,
        template_name="emails/otp_password_reset.html",
        context=context,
    )


def send_recruiter_profile_submitted_email(app) -> bool:
    """
    Optional helper: When recruiter submits their recruiter onboarding profile to AM.
    """
    try:
        email = getattr(app, "email", "")
        if not email and getattr(app, "user", None):
            email = getattr(app.user, "email", "")
        if not email:
            return False

        frontend_url = get_frontend_base_url()
        name = getattr(app, "name", "") or email.split("@")[0]

        subject = "Recruiter Profile Submitted — Yuvro Marketplace"
        context = {
            "recipient_name": name,
            "headline": "Recruiter Profile Submitted",
            "header_badge": "Under Review",
            "body_paragraphs": [
                "Thank you for submitting your profile to join the Yuvro Recruiter Network!",
                "Our team is reviewing your application. You will receive an approval email once your account is activated.",
            ],
            "details_items": [
                {"label": "Name", "value": name},
                {"label": "Email", "value": email},
                {"label": "Status", "value": "<span style='color: #D97706; font-weight: 600;'>Pending Review</span>"},
            ],
            "cta_text": "Go to Marketplace",
            "cta_url": f"{frontend_url}/dashboard",
            "preheader": "Your recruiter network profile has been submitted and is under review.",
        }
        return send_templated_email(
            to_email=email,
            subject=subject,
            template_name="emails/base_email.html",
            context=context,
        )
    except Exception as e:
        logger.exception(f"Error sending recruiter profile submitted email: {e}")
        return False


def send_recruiter_profile_approved_email(app) -> bool:
    """
    Optional helper: When recruiter onboarding profile is approved by AM.
    """
    try:
        email = getattr(app, "email", "")
        if not email and getattr(app, "user", None):
            email = getattr(app.user, "email", "")
        if not email:
            return False

        frontend_url = get_frontend_base_url()
        name = getattr(app, "name", "") or email.split("@")[0]

        subject = "Your Recruiter Profile Has Been Approved! 🎉"
        context = {
            "recipient_name": name,
            "headline": "Welcome to Yuvro Marketplace! 🎉",
            "header_badge": "Profile Approved",
            "body_paragraphs": [
                "Congratulations! Your recruiter profile has been approved by our team.",
                "Your account is now fully active. You can browse high-priority roles and start earning recruitment bounties by submitting top candidates.",
            ],
            "details_items": [
                {"label": "Account", "value": email},
                {"label": "Network Status", "value": "<span style='color: #059669; font-weight: 600;'>Active</span>"},
            ],
            "cta_text": "Browse Open Jobs",
            "cta_url": f"{frontend_url}/jobs",
            "preheader": "Your recruiter profile has been approved! You can now start recruiting on Yuvro.",
        }
        return send_templated_email(
            to_email=email,
            subject=subject,
            template_name="emails/base_email.html",
            context=context,
        )
    except Exception as e:
        logger.exception(f"Error sending recruiter profile approved email: {e}")
        return False


def send_recruiter_welcome_email(user) -> bool:
    """
    Triggered when a recruiter registers an account.
    """
    try:
        email = getattr(user, "email", "")
        if not email:
            return False

        frontend_url = get_frontend_base_url()
        name = getattr(user, "full_name", "") or getattr(user, "first_name", "") or email.split("@")[0]

        subject = "Welcome to Yuvro Marketplace!"
        context = {
            "recipient_name": name,
            "headline": "Welcome to Yuvro Marketplace! 🚀",
            "header_badge": "Welcome",
            "body_paragraphs": [
                "Thank you for creating your account on Yuvro Marketplace.",
                "To start browsing exclusive jobs and submitting candidates to earn placement bounties, complete your recruiter application.",
            ],
            "details_items": [
                {"label": "Account Email", "value": email},
                {"label": "Role", "value": "Hiring Partner"},
                {"label": "Next Step", "value": "<span style='color: #2563EB; font-weight: 600;'>Submit Recruiter Profile</span>"},
            ],
            "cta_text": "Complete Your Application",
            "cta_url": f"{frontend_url}/application",
            "preheader": "Welcome to Yuvro Marketplace! Complete your application to start recruiting.",
        }
        return send_templated_email(
            to_email=email,
            subject=subject,
            template_name="emails/base_email.html",
            context=context,
        )
    except Exception as e:
        logger.exception(f"Error sending recruiter welcome email: {e}")
        return False


def send_company_manager_welcome_email(
    *,
    email: str,
    name: str,
    temp_password: str,
    company_name: str,
    designation: str = "",
) -> bool:
    """
    Triggered when an Account Manager provisions a new company and company manager.
    Sends login credentials with temporary password and instruction to change password on login.
    """
    try:
        if not email:
            return False

        frontend_url = get_frontend_base_url()
        login_url = f"{frontend_url}/company/login"
        subject = f"Your Company Manager Account for {company_name} — Yuvro Marketplace"

        context = {
            "manager_name": name or email.split("@")[0],
            "company_name": company_name,
            "email": email,
            "temp_password": temp_password,
            "designation": designation,
            "login_url": login_url,
            "header_badge": "Company Portal",
            "preheader": f"Your hiring manager account for {company_name} is ready. Temporary password enclosed.",
        }

        return send_templated_email(
            to_email=email,
            subject=subject,
            template_name="emails/company_manager_welcome.html",
            context=context,
        )
    except Exception as e:
        logger.exception(f"Error sending company manager welcome email: {e}")
        return False


def send_company_job_added_email(job) -> int:
    """
    Trigger: When a company adds a job post.
    Sends notification emails to:
    1. All active Account Managers (and assigned company AM)
    2. rohith@yuvro.ai
    """
    sent_count = 0
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()

        company = getattr(job, "company", None)
        company_name = getattr(company, "name", "A Company") if company else "A Company"
        job_title = getattr(job, "title", "Open Role")

        # Collect recipient email addresses
        recipient_emails = set()

        # Add mandatory email: rohith@yuvro.ai
        recipient_emails.add("rohith@yuvro.ai")

        # Assigned AM for this company
        assigned_am = getattr(company, "account_manager", None) if company else None
        if assigned_am and getattr(assigned_am, "email", None):
            recipient_emails.add(assigned_am.email.strip().lower())

        # All active AMs
        for am in User.objects.filter(role=User.Role.RECRUITER_ACCOUNT_MANAGER, is_active=True):
            if getattr(am, "email", None):
                recipient_emails.add(am.email.strip().lower())

        # If no AM found in role, fallback to active staff/admins
        if len(recipient_emails) <= 1:
            for admin in User.objects.filter(is_staff=True, is_active=True):
                if getattr(admin, "email", None):
                    recipient_emails.add(admin.email.strip().lower())

        # Salary formatting
        salary_parts = []
        if getattr(job, "salary_min", None):
            salary_parts.append(f"${job.salary_min:,.0f}")
        if getattr(job, "salary_max", None):
            salary_parts.append(f"${job.salary_max:,.0f}")
        salary_range = " – ".join(salary_parts) if salary_parts else "Competitive"

        # Fee percentage
        fee_pct = getattr(job, "company_to_yuvro_percentage", None)
        fee_display = f"{fee_pct}% to Yuvro" if fee_pct else "Standard"

        frontend_url = get_frontend_base_url()
        review_url = f"{frontend_url}/am/jobs/{job.id}"

        subject = f"New Job Post Added: {job_title} by {company_name}"

        context = {
            "job_title": job_title,
            "company_name": company_name,
            "location": getattr(job, "location", "Remote") or "Remote",
            "work_model": getattr(job, "work_model", "") or "Hybrid",
            "employment_type": getattr(job, "employment_type", "Full-time") or "Full-time",
            "salary_range": salary_range,
            "fee_display": fee_display,
            "header_badge": "New Job Submission",
            "cta_text": "Review Job Post",
            "cta_url": review_url,
            "preheader": f"{company_name} submitted a new job post '{job_title}' for Account Manager review.",
        }

        for email_addr in recipient_emails:
            if send_templated_email(
                to_email=email_addr,
                subject=subject,
                template_name="emails/company_job_added.html",
                context=context,
            ):
                sent_count += 1

    except Exception as e:
        logger.exception(f"Error sending company job added emails for job {getattr(job, 'id', None)}: {e}")

    return sent_count




