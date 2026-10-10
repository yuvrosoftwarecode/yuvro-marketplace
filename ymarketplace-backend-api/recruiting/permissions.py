from rest_framework import permissions


def is_user_admin(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    return bool(
        user.is_staff
        or getattr(user, "is_superuser", False)
        or getattr(user, "is_admin_user", False)
    )


def is_user_account_manager(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if is_user_admin(user):
        return True
    return bool(
        getattr(user, "is_account_manager", False)
        or getattr(user, "role", "") in ["recruiter_account_manager", "admin"]
    )


def is_user_recruiter(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if is_user_admin(user):
        return True
    return bool(
        getattr(user, "is_freelancer", False)
        or getattr(user, "role", "") == "recruiter_freelancer"
    )


def is_user_company_user(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if is_user_admin(user):
        return True
    if getattr(user, "is_freelancer", False) or getattr(user, "role", "") == "recruiter_freelancer":
        return False
    if getattr(user, "is_company_user", False):
        return True
    if getattr(user, "role", "") in ["recruiter_company_manager", "recruiter_company_employee", "company"]:
        return True
    try:
        if getattr(user, "company_profile", None) is not None:
            return True
    except Exception:
        pass
    try:
        from marketplace.models import Company
        if Company.objects.filter(company_manager=user).exists():
            return True
    except Exception:
        pass
    return False


def user_manages_job(user, job) -> bool:
    if is_user_admin(user):
        return True
    if not user or not user.is_authenticated or not job:
        return False
    company = getattr(job, "company", None)
    if not company:
        return False
    if company.account_manager_id is None and is_user_account_manager(user):
        return True
    if company.account_manager_id == user.id:
        return True
    if getattr(company, "company_manager_id", None) == user.id:
        return True
    if hasattr(user, "company_profile") and user.company_profile and user.company_profile.company_id == company.id:
        return True
    return False


class IsRecruiterUser(permissions.BasePermission):
    """
    Allows access only to authenticated freelance recruiters or admins.
    """

    def has_permission(self, request, view):
        return is_user_recruiter(request.user)


class IsAccountManagerUser(permissions.BasePermission):
    """
    Allows access only to authenticated Account Managers or Admins.
    """

    def has_permission(self, request, view):
        return is_user_account_manager(request.user)


class IsApplicationOwnerOrJobAM(permissions.BasePermission):
    """
    Object-level permission for RecruiterJobApplication:
    - Application's recruiter can view/withdraw.
    - Job's Account Manager (or Admin) can view, approve, or reject.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if is_user_admin(request.user):
            return True

        # Check recruiter ownership
        if obj.recruiter_id == request.user.id:
            return True

        # Check Account Manager ownership for the job's company
        return user_manages_job(request.user, obj.job)


class IsCandidateOwner(permissions.BasePermission):
    """
    Object-level permission for Candidate:
    - Only the owning recruiter or Admin can view/modify.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if is_user_admin(request.user):
            return True
        return obj.recruiter_id == request.user.id


class IsSubmissionOwnerOrJobAM(permissions.BasePermission):
    """
    Object-level permission for CandidateSubmission:
    - Submitting recruiter can view.
    - Job's Account Manager or Admin can view / review / update.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if is_user_admin(request.user):
            return True

        if request.method in permissions.SAFE_METHODS:
            return True

        if obj.application.recruiter_id == request.user.id:
            return True

        return user_manages_job(request.user, obj.application.job)
