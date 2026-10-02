import logging
from django.conf import settings
from django.contrib.auth import get_user_model
from core.models import Notification

logger = logging.getLogger(__name__)


def create_notification(
    *,
    recipient,
    title: str,
    body: str,
    category: str = Notification.Category.GENERAL,
    notification_type: str = "general",
    link: str = "",
    data: dict = None,
) -> Notification | None:
    """
    Creates an in-app notification for a given user.
    """
    if not recipient:
        return None

    try:
        return Notification.objects.create(
            recipient=recipient,
            title=title,
            body=body,
            category=category,
            notification_type=notification_type,
            link=link or "",
            data=data or {},
            read=False,
        )
    except Exception as e:
        logger.exception(f"Failed to create notification for {recipient}: {e}")
        return None


# ---------------------------------------------------------------------------
# Account Manager Notifications
# ---------------------------------------------------------------------------

def notify_am_recruiter_application_received(application) -> list[Notification]:
    """
    AM Trigger: when a recruiter application is received.
    Notifies all active Account Managers and Admins.
    """
    notifications = []
    try:
        User = get_user_model()
        am_users = User.objects.filter(
            role=User.Role.RECRUITER_ACCOUNT_MANAGER,
            is_active=True,
        )
        if not am_users.exists():
            am_users = User.objects.filter(is_staff=True, is_active=True)

        recruiter_name = getattr(application, "name", "") or getattr(application, "email", "A recruiter")
        title = "New Recruiter Application"
        body = f"{recruiter_name} submitted an application to join the recruiter network."
        link = "/am/recruiters/applications"
        data = {
            "applicationId": str(application.id),
            "recruiterName": recruiter_name,
            "email": getattr(application, "email", ""),
        }

        for am in am_users:
            notif = create_notification(
                recipient=am,
                title=title,
                body=body,
                category=Notification.Category.RECRUITERS,
                notification_type="recruiter_application_received",
                link=link,
                data=data,
            )
            if notif:
                notifications.append(notif)
    except Exception as e:
        logger.exception(f"Error notifying AMs of recruiter application: {e}")

    return notifications


def notify_am_recruiter_job_application_received(application) -> list[Notification]:
    """
    AM Trigger: when a recruiter applies for a job.
    Notifies the Account Manager assigned to the job's company, or all active AMs/admins.
    """
    notifications = []
    try:
        User = get_user_model()
        job = getattr(application, "job", None)
        company = getattr(job, "company", None) if job else None
        recruiter = getattr(application, "recruiter", None)

        recruiter_name = (
            getattr(recruiter, "full_name", "")
            or getattr(recruiter, "first_name", "")
            or getattr(recruiter, "email", "Recruiter")
        )
        job_title = getattr(job, "title", "Open Role")
        company_name = getattr(company, "name", "Client")

        assigned_am = getattr(company, "account_manager", None)
        target_ams = set()
        if assigned_am and getattr(assigned_am, "is_active", True):
            target_ams.add(assigned_am)
        for am in User.objects.filter(role=User.Role.RECRUITER_ACCOUNT_MANAGER, is_active=True):
            target_ams.add(am)
        if not target_ams:
            for am in User.objects.filter(is_staff=True, is_active=True):
                target_ams.add(am)

        title = f"New Recruiter Request: {job_title}"
        body = f"{recruiter_name} requested to recruit for {job_title} at {company_name}."
        link = f"/am/jobs/{job.id}?tab=requests" if job else "/am/jobs"
        data = {
            "jobId": str(job.id) if job else "",
            "jobTitle": job_title,
            "companyName": company_name,
            "applicationId": str(application.id),
            "tab": "requests",
            "focus": str(application.id),
            "recruiterId": str(recruiter.id) if recruiter else "",
            "recruiterName": recruiter_name,
        }

        for am in target_ams:
            notif = create_notification(
                recipient=am,
                title=title,
                body=body,
                category=Notification.Category.RECRUITERS,
                notification_type="recruiter_job_application_received",
                link=link,
                data=data,
            )
            if notif:
                notifications.append(notif)
    except Exception as e:
        logger.exception(f"Error notifying AMs of recruiter job application: {e}")

    return notifications


def notify_am_candidate_submitted(submission) -> list[Notification]:
    """
    AM Trigger: when a recruiter submitted a candidate.
    Notifies the Account Manager assigned to the job's company, or all active AMs.
    """
    notifications = []
    try:
        User = get_user_model()
        job = submission.application.job
        company = job.company if job else None
        recruiter = submission.application.recruiter
        candidate = submission.candidate

        recruiter_name = getattr(recruiter, "full_name", "") or getattr(recruiter, "first_name", "") or getattr(recruiter, "email", "Recruiter")
        candidate_name = getattr(candidate, "full_name", "Candidate")
        job_title = getattr(job, "title", "Role")
        company_name = getattr(company, "name", "")

        assigned_am = getattr(company, "account_manager", None)
        target_ams = set()
        if assigned_am and getattr(assigned_am, "is_active", True):
            target_ams.add(assigned_am)
        for am in User.objects.filter(role=User.Role.RECRUITER_ACCOUNT_MANAGER, is_active=True):
            target_ams.add(am)
        if not target_ams:
            for am in User.objects.filter(is_staff=True, is_active=True):
                target_ams.add(am)

        title = "New Candidate Submission"
        body = f"{recruiter_name} submitted {candidate_name} for {job_title}."
        link = f"/am/jobs/{job.id}?tab=submissions" if job else "/am"
        data = {
            "jobId": str(job.id) if job else "",
            "jobTitle": job_title,
            "companyName": company_name,
            "submissionId": str(submission.id),
            "candidateId": str(candidate.id) if candidate else "",
            "candidateName": candidate_name,
            "recruiterName": recruiter_name,
        }

        for am in target_ams:
            notif = create_notification(
                recipient=am,
                title=title,
                body=body,
                category=Notification.Category.SUBMISSIONS,
                notification_type="candidate_submitted",
                link=link,
                data=data,
            )
            if notif:
                notifications.append(notif)
    except Exception as e:
        logger.exception(f"Error notifying AM of candidate submission: {e}")

    return notifications


# ---------------------------------------------------------------------------
# Recruiter Notifications
# ---------------------------------------------------------------------------

def notify_recruiter_application_approved(application) -> Notification | None:
    """
    Recruiter Trigger: when his application is approved.
    """
    try:
        user = getattr(application, "user", None)
        if not user and getattr(application, "email", None):
            User = get_user_model()
            user = User.objects.filter(email__iexact=application.email).first()

        if not user:
            logger.warning("No user found to notify for approved recruiter application")
            return None

        title = "Application Approved 🎉"
        body = "Congratulations! Your recruiter application has been approved. You can now browse jobs and submit candidates."
        link = "/jobs"
        data = {
            "applicationId": str(application.id),
        }

        return create_notification(
            recipient=user,
            title=title,
            body=body,
            category=Notification.Category.RECRUITERS,
            notification_type="recruiter_application_approved",
            link=link,
            data=data,
        )
    except Exception as e:
        logger.exception(f"Error notifying recruiter of application approval: {e}")
        return None


def notify_recruiter_job_assigned(application, is_direct_assignment: bool = False) -> Notification | None:
    """
    Recruiter Trigger: when a job is assigned or approved to work.
    """
    try:
        recruiter = application.recruiter
        job = application.job
        company = job.company if job else None

        company_name = getattr(company, "name", "Client")
        job_title = getattr(job, "title", "Open Role")

        if is_direct_assignment:
            title = f"Job Assigned: {job_title}"
            body = f"You have been assigned to recruit for {job_title} at {company_name}."
            notif_type = "job_assigned"
        else:
            title = f"Job Request Approved: {job_title}"
            body = f"Your request to recruit for {job_title} at {company_name} has been approved."
            notif_type = "job_approved"

        link = f"/jobs/{job.slug or job.id}" if job else "/jobs"
        data = {
            "jobId": str(job.id) if job else "",
            "jobTitle": job_title,
            "companyName": company_name,
            "applicationId": str(application.id),
        }

        return create_notification(
            recipient=recruiter,
            title=title,
            body=body,
            category=Notification.Category.JOBS,
            notification_type=notif_type,
            link=link,
            data=data,
        )
    except Exception as e:
        logger.exception(f"Error notifying recruiter of job assignment: {e}")
        return None


def notify_recruiter_pipeline_moved(
    submission,
    old_stage: str = "",
    new_stage: str = "",
    is_rejected: bool = False,
    rejected_at_stage: str = "",
) -> Notification | None:
    """
    Recruiter Trigger: when a candidate is moved in pipeline (advanced or rejected).
    """
    try:
        from core.emails import format_stage_label

        recruiter = submission.application.recruiter
        candidate = submission.candidate
        job = submission.application.job

        candidate_name = getattr(candidate, "full_name", "Candidate")
        job_title = getattr(job, "title", "Role")

        if is_rejected:
            stage_str = rejected_at_stage or old_stage or submission.stage
            stage_label = format_stage_label(stage_str)
            title = f"Candidate Rejected: {candidate_name}"
            body = f"{candidate_name} for {job_title} was not selected at {stage_label} stage."
            notif_type = "candidate_rejected"
        else:
            stage_label = format_stage_label(new_stage or submission.stage)
            title = f"Pipeline Update: {candidate_name}"
            body = f"{candidate_name} moved to {stage_label} for {job_title}."
            notif_type = "pipeline_stage_moved"

        link = f"/jobs/{job.slug or job.id}/pipeline" if job else "/jobs"
        data = {
            "jobId": str(job.id) if job else "",
            "jobTitle": job_title,
            "candidateId": str(candidate.id) if candidate else "",
            "candidateName": candidate_name,
            "submissionId": str(submission.id),
            "oldStage": old_stage,
            "newStage": new_stage,
            "isRejected": is_rejected,
        }

        return create_notification(
            recipient=recruiter,
            title=title,
            body=body,
            category=Notification.Category.PIPELINE,
            notification_type=notif_type,
            link=link,
            data=data,
        )
    except Exception as e:
        logger.exception(f"Error notifying recruiter of pipeline move: {e}")
        return None


# ---------------------------------------------------------------------------
# Company Notifications
# ---------------------------------------------------------------------------

def get_company_users(company) -> list:
    """
    Helper to fetch all active company managers and team members for a company.
    """
    if not company:
        return []
    recipients = set()
    User = get_user_model()
    if getattr(company, "company_manager", None) and company.company_manager.is_active:
        recipients.add(company.company_manager)
    try:
        for tm in company.team_members.select_related("user").all():
            if tm.user and tm.user.is_active:
                recipients.add(tm.user)
    except Exception:
        pass
    try:
        for u in User.objects.filter(company_profile__company=company, is_active=True):
            recipients.add(u)
    except Exception:
        pass
    return list(recipients)


def notify_company_job_approved(job) -> list[Notification]:
    """
    Company Trigger 1: when AM accepts/approves the job post.
    Notifies the company manager and team members.
    """
    notifications = []
    try:
        company = getattr(job, "company", None)
        if not company:
            return []

        company_users = get_company_users(company)
        if not company_users:
            logger.warning(f"No company users found to notify for job approval: {job.title}")
            return []

        job_title = getattr(job, "title", "Open Role")
        company_name = getattr(company, "name", "Your Company")
        title = "Job Approved 🎉"
        body = f"Your job post '{job_title}' was approved by the Account Manager and is now open for recruiters."
        link = f"/company/candidates/review"
        data = {
            "jobId": str(job.id),
            "jobTitle": job_title,
            "companyName": company_name,
            "type": "job_approved",
        }

        for user in company_users:
            notif = create_notification(
                recipient=user,
                title=title,
                body=body,
                category=Notification.Category.JOBS,
                notification_type="company_job_approved",
                link=link,
                data=data,
            )
            if notif:
                notifications.append(notif)
    except Exception as e:
        logger.exception(f"Error notifying company of job approval: {e}")

    return notifications


def notify_company_candidate_ready_for_review(
    submission, old_stage: str = "", new_stage: str = ""
) -> list[Notification]:
    """
    Company Trigger 2: when a candidate is moved from AM review to next stage (ready for company review).
    Notifies the company manager and team members.
    """
    notifications = []
    try:
        from core.emails import format_stage_label

        job = submission.application.job if submission.application else None
        company = getattr(job, "company", None) if job else None
        if not company:
            return []

        company_users = get_company_users(company)
        if not company_users:
            logger.warning(
                f"No company users found to notify for candidate ready for review: {submission.candidate}"
            )
            return []

        candidate = submission.candidate
        candidate_name = getattr(candidate, "full_name", "A candidate")
        job_title = getattr(job, "title", "Open Role")
        stage_name = format_stage_label(new_stage or submission.stage)

        match_score = getattr(submission, "match", 90) or 90

        title = "New candidate ready for review"
        body = f"{candidate_name} was approved by the Account Manager and added to {job_title} with a {match_score}% match."
        link = f"/company/candidates/{submission.id}"
        data = {
            "submissionId": str(submission.id),
            "candidateId": str(candidate.id) if candidate else "",
            "candidateName": candidate_name,
            "jobId": str(job.id) if job else "",
            "jobTitle": job_title,
            "stage": new_stage or submission.stage,
            "match": match_score,
            "type": "candidate_ready_for_review",
        }

        for user in company_users:
            notif = create_notification(
                recipient=user,
                title=title,
                body=body,
                category=Notification.Category.JOBS,
                notification_type="company_candidate_ready_for_review",
                link=link,
                data=data,
            )
            if notif:
                notifications.append(notif)
    except Exception as e:
        logger.exception(f"Error notifying company of candidate ready for review: {e}")

    return notifications


def notify_ams_company_job_added(job) -> list[Notification]:
    """
    Trigger: When a company adds a job post.
    Creates in-app notifications for:
    - All active Account Managers
    - Assigned AM for the company (if any)
    - rohith@yuvro.ai (if user account exists)
    """
    notifications = []
    try:
        User = get_user_model()
        company = getattr(job, "company", None)
        company_name = getattr(company, "name", "A Company") if company else "A Company"
        job_title = getattr(job, "title", "Open Role")

        target_ams = set()

        # 1. Assigned AM for this company
        assigned_am = getattr(company, "account_manager", None) if company else None
        if assigned_am and getattr(assigned_am, "is_active", True):
            target_ams.add(assigned_am)

        # 2. All active AMs
        for am in User.objects.filter(role=User.Role.RECRUITER_ACCOUNT_MANAGER, is_active=True):
            target_ams.add(am)

        # 3. Fallback to active staff/admins if no AM exists
        if not target_ams:
            for am in User.objects.filter(is_staff=True, is_active=True):
                target_ams.add(am)

        # 4. If rohith@yuvro.ai exists as a user in-app, notify as well
        rohith_user = User.objects.filter(email__iexact="rohith@yuvro.ai", is_active=True).first()
        if rohith_user:
            target_ams.add(rohith_user)

        title = f"New Job Post: {job_title}"
        body = f"{company_name} submitted a new job post '{job_title}' requiring Account Manager review."
        link = f"/am/jobs/{job.id}"
        data = {
            "jobId": str(job.id),
            "jobTitle": job_title,
            "companyId": str(company.id) if company else "",
            "companyName": company_name,
            "status": getattr(job, "status", ""),
            "type": "company_job_added",
        }

        for user in target_ams:
            notif = create_notification(
                recipient=user,
                title=title,
                body=body,
                category=Notification.Category.JOBS,
                notification_type="company_job_added",
                link=link,
                data=data,
            )
            if notif:
                notifications.append(notif)
    except Exception as e:
        logger.exception(f"Error creating in-app notifications for company job added: {e}")

    return notifications


