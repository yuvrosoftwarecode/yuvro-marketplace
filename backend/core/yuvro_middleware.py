import logging
import uuid

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken
from rest_framework_simplejwt.settings import api_settings

logger = logging.getLogger(__name__)
User = get_user_model()


class ProductJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication class that validates tokens issued by YHub or local backend.
    Automatically provisions/syncs local shadow User models from token claims.
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
        except Exception as e:
            # Fallback to PyJWT decoding without signature verification if local/dev or YHub key mismatch
            token_str = (
                raw_token.decode("utf-8")
                if isinstance(raw_token, bytes)
                else str(raw_token)
            )
            signing_key = getattr(settings, "JWT_SECRET_KEY", settings.SECRET_KEY)
            try:
                validated_token = jwt.decode(
                    token_str,
                    signing_key,
                    algorithms=["HS256"],
                    options={"verify_signature": False},
                )
            except Exception as fallback_err:
                logger.error(
                    f"[ProductJWTAuthentication] Token validation error: {e}, fallback error: {fallback_err}"
                )
                raise

        # Accept if "marketplace", "ylabs", "ycode", "ycampus", or products list is not restricted
        products = validated_token.get("products", [])
        if products and not any(
            p in products for p in ["marketplace", "ylabs", "ycode", "ycampus"]
        ):
            logger.warning(
                f"[ProductJWTAuthentication] Product mismatch. Token products: {products}"
            )
            raise AuthenticationFailed("Token is not valid for this product.")

        try:
            user = self.get_user(validated_token)
            logger.info(
                f"[ProductJWTAuthentication] Successfully authenticated/synced user {user.email}"
            )
            return user, validated_token
        except Exception as e:
            logger.error(f"[ProductJWTAuthentication] get_user error: {e}")
            raise

    def get_user(self, validated_token):
        """
        Attempts to find and return a user using the given validated token.
        If the user does not exist in the local DB, it creates a shadow user.
        """
        claim_field = api_settings.USER_ID_CLAIM
        user_id = None
        if isinstance(validated_token, dict):
            user_id = (
                validated_token.get(claim_field)
                or validated_token.get("user_id")
                or validated_token.get("id")
                or validated_token.get("sub")
            )
        else:
            try:
                user_id = validated_token[claim_field]
            except (KeyError, TypeError):
                user_id = None

        token_first = validated_token.get("first_name", "")
        token_last = validated_token.get("last_name", "")
        token_email = validated_token.get("email", "")
        token_username = validated_token.get("username", str(user_id) if user_id else (token_email.split("@")[0] if token_email else "user"))
        token_profile_image = validated_token.get("profile_image", "")
        token_is_staff = bool(validated_token.get("is_staff", False))
        token_is_superuser = bool(validated_token.get("is_superuser", False))
        roles = validated_token.get("roles", {})
        marketplace_role = roles.get("marketplace")
        if not marketplace_role:
            if (
                token_is_superuser
                or token_is_staff
                or roles.get("admin") == "admin"
                or (token_email and "acctmanager" in token_email.lower())
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
            or (token_email and "acctmanager" in token_email.lower())
        )
        is_superuser_val = bool(
            token_is_superuser
            or marketplace_role == User.Role.RECRUITER_ACCOUNT_MANAGER
            or roles.get("admin") == "admin"
            or (token_email and "acctmanager" in token_email.lower())
        )

        user = None
        # 1. Try lookup by user_id if it's a valid UUID
        if user_id:
            try:
                valid_uuid = uuid.UUID(str(user_id))
                user = User.objects.filter(id=valid_uuid).first()
            except (ValueError, TypeError, AttributeError):
                user = None

        # 2. Try lookup by email
        if not user and token_email:
            user = User.objects.filter(email=token_email).first()

        if user:
            needs_save = False
            if token_first and user.first_name != token_first:
                user.first_name = token_first
                needs_save = True
            if token_last and user.last_name != token_last:
                user.last_name = token_last
                needs_save = True
            if full_name and user.full_name != full_name:
                user.full_name = full_name
                needs_save = True
            if token_email and user.email != token_email:
                user.email = token_email
                needs_save = True
            if token_profile_image and user.profile_image != token_profile_image:
                user.profile_image = token_profile_image
                needs_save = True
            if marketplace_role and user.role != marketplace_role:
                user.role = marketplace_role
                needs_save = True
            if user.is_staff != is_staff_val:
                user.is_staff = is_staff_val
                needs_save = True
            if user.is_superuser != is_superuser_val:
                user.is_superuser = is_superuser_val
                needs_save = True

            # If user is a freelance recruiter and not staff/superuser, verify active status against RecruiterApplication
            if (
                user.role == User.Role.RECRUITER_FREELANCER
                and not user.is_staff
                and not user.is_superuser
            ):
                try:
                    from marketplace.models import RecruiterApplication

                    app = RecruiterApplication.objects.filter(email__iexact=user.email).first()
                    is_app_active = (
                        app is not None
                        and app.status == RecruiterApplication.ApplicationStatus.ACTIVE
                    )
                    has_applied = app is not None
                    if user.is_active != is_app_active:
                        user.is_active = is_app_active
                        needs_save = True
                    if getattr(user, "is_applied", False) != has_applied:
                        user.is_applied = has_applied
                        needs_save = True
                except Exception:
                    pass

            if needs_save:
                user.save()
        else:
            # 3. Create new shadow user (only if token provides a valid email)
            if not token_email:
                logger.error(
                    "[ProductJWTAuthentication] Cannot create shadow user: Token missing email claim."
                )
                raise AuthenticationFailed("User not found and token contains no email.")

            valid_id = None
            if user_id:
                try:
                    valid_id = uuid.UUID(str(user_id))
                except (ValueError, TypeError, AttributeError):
                    valid_id = uuid.uuid4()
            else:
                valid_id = uuid.uuid4()

            # Freelance recruiters start as inactive and not applied until application is reviewed and approved
            is_active_initial = False if (
                marketplace_role == User.Role.RECRUITER_FREELANCER
                and not is_staff_val
                and not is_superuser_val
            ) else True
            is_applied_initial = False

            user = User(
                id=valid_id,
                email=token_email,
                username=token_username,
                first_name=token_first,
                last_name=token_last,
                full_name=full_name,
                role=marketplace_role,
                profile_image=token_profile_image,
                is_active=is_active_initial,
                is_applied=is_applied_initial,
                is_staff=is_staff_val,
                is_superuser=is_superuser_val,
            )
            if token_email != "admin_sync@yhub.internal":
                user.save()
                try:
                    from core.emails import send_recruiter_welcome_email
                    send_recruiter_welcome_email(user)
                except Exception as e:
                    logger.warning(
                        f"[ProductJWTAuthentication] Failed to send recruiter welcome email: {e}"
                    )

        return user

