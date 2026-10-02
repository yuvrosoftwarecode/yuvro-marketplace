from rest_framework import permissions


class IsAdminUserRole(permissions.BasePermission):
    """Allows access only to admin users."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or request.user.role == "admin")
        )


class IsOwnerOrAdmin(permissions.BasePermission):
    """Allows access to object owner or admin."""

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff or getattr(request.user, "role", "") == "admin":
            return True
        if hasattr(obj, "user"):
            return obj.user == request.user
        return obj == request.user
