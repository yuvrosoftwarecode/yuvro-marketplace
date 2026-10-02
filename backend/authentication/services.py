import random
import string
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from authentication.models import OTPToken, UserSession


def get_tokens_for_user(user, request=None):
    refresh = RefreshToken.for_user(user)
    refresh["email"] = user.email
    refresh["username"] = user.username
    refresh["first_name"] = user.first_name
    refresh["last_name"] = user.last_name
    refresh["is_staff"] = user.is_staff
    refresh["is_superuser"] = user.is_superuser
    if hasattr(user, "role"):
        refresh["roles"] = {"marketplace": user.role}

    if request:
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0].strip()
        else:
            ip = request.META.get("REMOTE_ADDR")
        user_agent = request.META.get("HTTP_USER_AGENT", "")
        UserSession.objects.create(
            user=user, refresh_token=str(refresh), user_agent=user_agent, ip_address=ip
        )
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


def generate_otp(email: str, purpose: str = "login", length: int = 6) -> OTPToken:
    normalized_email = email.strip().lower()
    OTPToken.objects.filter(
        email__iexact=normalized_email, purpose=purpose, is_used=False
    ).update(is_used=True)
    otp_code = "".join(random.choices(string.digits, k=length))
    expires_at = timezone.now() + timedelta(minutes=10)
    token = OTPToken.objects.create(
        email=normalized_email,
        otp_code=otp_code,
        purpose=purpose,
        expires_at=expires_at,
    )
    return token


def send_otp_email(email: str, otp_code: str, purpose: str = "login"):
    from core.emails import send_password_reset_otp_email, send_templated_email

    normalized_email = email.strip().lower()
    if purpose == "password_reset":
        return send_password_reset_otp_email(normalized_email, otp_code)

    subject = "Your Verification Code — Yuvro Marketplace"
    context = {
        "email": normalized_email,
        "otp_code": otp_code,
        "user_name": normalized_email.split("@")[0],
        "header_badge": "Verification Code",
        "preheader": f"Your verification code is {otp_code}. Valid for 10 minutes.",
    }
    return send_templated_email(
        to_email=normalized_email,
        subject=subject,
        template_name="emails/otp_password_reset.html",
        context=context,
    )


def verify_otp(email: str, otp_code: str, purpose: str = "login") -> bool:
    normalized_email = email.strip().lower()
    clean_code = str(otp_code).strip()
    try:
        token = OTPToken.objects.filter(
            email__iexact=normalized_email,
            otp_code=clean_code,
            purpose=purpose,
            is_used=False,
            expires_at__gte=timezone.now(),
        ).latest("created_at")
        token.is_used = True
        token.save(update_fields=["is_used"])
        return True
    except OTPToken.DoesNotExist:
        return False
