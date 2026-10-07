import logging

import jwt
import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

logger = logging.getLogger(__name__)
User = get_user_model()


class YHubAuthBackend(ModelBackend):
    """
    Django Authentication Backend that validates credentials against YHub
    when logging into Django Admin or other standard Django session views.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        email = username or kwargs.get("email")
        if not email or not password:
            return None

        # Try local authentication first if a local password has already been set/cached
        try:
            user = User.objects.get(email__iexact=email.strip())
            if user.has_usable_password() and user.check_password(password):
                return user
        except User.DoesNotExist:
            user = None

        # Authenticate with centralized YHub
        yhub_base_url = getattr(
            settings,
            "YHUB_BACKEND_API_BASE_URL",
            "https://backend-hub-dev.yuvro.ai/api",
        ).rstrip("/")

        try:
            res = requests.post(
                f"{yhub_base_url}/auth/login/?product=marketplace",
                json={"email": email, "password": password},
                timeout=10,
            )
            if res.status_code != 200:
                logger.warning(
                    f"[YHubAuthBackend] YHub authentication failed for {email}: {res.status_code} {res.text}"
                )
                return None

            data = res.json()
            access_token = data.get("access")
            if not access_token:
                return None

            # Decode token or extract user payload
            signing_key = getattr(settings, "JWT_SECRET_KEY", settings.SECRET_KEY)
            try:
                payload = jwt.decode(
                    access_token,
                    signing_key,
                    algorithms=["HS256"],
                    options={"verify_exp": False, "verify_signature": False},
                )
            except Exception:
                payload = {}

            user_data = data.get("user") or {}
            user_id = payload.get("user_id") or user_data.get("id")
            if not user_id:
                return None

            token_first = payload.get("first_name") or user_data.get("first_name", "")
            token_last = payload.get("last_name") or user_data.get("last_name", "")
            token_email = payload.get("email") or user_data.get("email", email)
            token_username = payload.get("username") or user_data.get(
                "username", str(user_id)
            )
            token_profile_image = payload.get("profile_image") or user_data.get(
                "profile_image", ""
            )
            token_is_staff = bool(
                payload.get("is_staff", user_data.get("is_staff", False))
            )
            token_is_superuser = bool(
                payload.get("is_superuser", user_data.get("is_superuser", False))
            )
            roles = payload.get("roles") or user_data.get("roles", {})
            marketplace_role = roles.get("marketplace")

            if not marketplace_role:
                if (
                    token_is_superuser
                    or token_is_staff
                    or roles.get("admin") == "admin"
                    or "acctmanager" in token_email.lower()
                ):
                    marketplace_role = User.Role.RECRUITER_ACCOUNT_MANAGER
                else:
                    marketplace_role = User.Role.RECRUITER_FREELANCER

            full_name = f"{token_first} {token_last}".strip()
            is_staff_val = bool(
                token_is_staff
                or token_is_superuser
                or marketplace_role == User.Role.RECRUITER_ACCOUNT_MANAGER
                or roles.get("admin") == "admin"
                or "acctmanager" in token_email.lower()
            )
            is_superuser_val = bool(
                token_is_superuser
                or marketplace_role == User.Role.RECRUITER_ACCOUNT_MANAGER
                or roles.get("admin") == "admin"
                or "acctmanager" in token_email.lower()
            )

            user, _ = User.objects.get_or_create(
                id=user_id,
                defaults={
                    "email": token_email,
                    "username": token_username,
                    "first_name": token_first,
                    "last_name": token_last,
                    "full_name": full_name,
                    "role": marketplace_role,
                    "profile_image": token_profile_image,
                    "is_active": True,
                    "is_staff": is_staff_val,
                    "is_superuser": is_superuser_val,
                },
            )

            # Sync user details and update local password hash for Django Admin session login
            user.email = token_email
            user.first_name = token_first
            user.last_name = token_last
            user.full_name = full_name
            user.role = marketplace_role
            user.is_staff = is_staff_val
            user.is_superuser = is_superuser_val
            user.is_active = True
            user.set_password(password)
            user.save()

            return user

        except Exception as e:
            logger.error(f"[YHubAuthBackend] Error during YHub auth: {e}")
            return None
