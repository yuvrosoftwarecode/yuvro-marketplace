from rest_framework import permissions


class IsAccountManagerOrReadOnly(permissions.BasePermission):
    """
    Allows read-only access to all authenticated users (including freelancer recruiters),
    allows write operations to Account Managers, Admins, and Company Managers.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        role = getattr(request.user, "role", "")
        return bool(
            request.user.is_staff
            or getattr(request.user, "is_admin_user", False)
            or getattr(request.user, "is_account_manager", False)
            or role in ["admin", "recruiter_account_manager", "recruiter_company_manager"]
            or hasattr(request.user, "company_profile")
        )


class IsCompanyOwnerOrAdmin(permissions.BasePermission):
    """
    Object-level permission allowing the managing Account Manager, Admin,
    or the Company Manager to modify a Company.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        if request.user.is_staff or getattr(request.user, "is_admin_user", False):
            return True

        # Account Manager of this company
        if getattr(obj, "account_manager", None) and obj.account_manager == request.user:
            return True

        # Company Manager of this company
        if getattr(obj, "company_manager", None) and obj.company_manager == request.user:
            return True

        # Linked via CompanyUserProfile
        if hasattr(request.user, "company_profile") and request.user.company_profile.company_id == obj.id:
            return True

        return False


class IsJobOwnerOrAdmin(permissions.BasePermission):
    """
    Object-level permission allowing the managing Account Manager, Admin,
    or Company Manager to modify a Job.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        if request.user.is_staff or getattr(request.user, "is_admin_user", False):
            return True

        if getattr(obj, "company", None):
            if getattr(obj.company, "account_manager", None) and obj.company.account_manager == request.user:
                return True
            if getattr(obj.company, "company_manager", None) and obj.company.company_manager == request.user:
                return True
            if hasattr(request.user, "company_profile") and request.user.company_profile.company_id == obj.company.id:
                return True

        return False
