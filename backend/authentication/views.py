import logging
from django.contrib.auth import authenticate, get_user_model
from django.db import IntegrityError
from django.utils import timezone

logger = logging.getLogger(__name__)

from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from authentication.models import OTPToken, UserSession
from authentication.permissions import IsAdminUserRole, IsOwnerOrAdmin
from authentication.serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    SendOTPSerializer,
    UserSerializer,
    UserSessionSerializer,
    VerifyOTPSerializer,
)
from authentication.services import (
    generate_otp,
    get_tokens_for_user,
    send_otp_email,
    verify_otp,
)

User = get_user_model()


class AuthViewSet(viewsets.ViewSet):
    """
    ViewSet for handling authentication actions: login, register, logout, OTP flows.
    """

    permission_classes = [AllowAny]

    @action(detail=False, methods=["post"])
    def register(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
            except IntegrityError:
                return Response(
                    {"email": ["A user with this email address already exists."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            tokens = get_tokens_for_user(user, request=request)
            try:
                from core.emails import send_recruiter_welcome_email
                send_recruiter_welcome_email(user)
            except Exception as e:
                logger.warning(f"Failed to dispatch recruiter welcome email: {e}")

            return Response(

                {
                    "user": UserSerializer(user).data,
                    "tokens": tokens,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


    @action(detail=False, methods=["post"])
    def login(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            user = serializer.validated_data["user"]
            user.last_login = timezone.now()
            user.save(update_fields=["last_login"])
            tokens = get_tokens_for_user(user, request=request)
            return Response(
                {
                    "user": UserSerializer(user).data,
                    "tokens": tokens,
                },
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def logout(self, request):
        return Response(
            {"message": "Logged out successfully"}, status=status.HTTP_200_OK
        )

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def me(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @action(
        detail=False,
        methods=["patch", "put"],
        permission_classes=[IsAuthenticated],
    )
    def update_profile(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            import logging
            import requests
            from django.conf import settings

            logger = logging.getLogger(__name__)
            user = request.user
            old_password = serializer.validated_data["old_password"]
            new_password = serializer.validated_data["new_password"]

            is_local_valid = user.check_password(old_password)
            is_yhub_valid = False

            # Try validating and changing password on YHub if available
            yhub_base_url = getattr(
                settings,
                "YHUB_BACKEND_API_BASE_URL",
                "https://backend-hub-dev.yuvro.ai/api",
            ).rstrip("/")

            try:
                login_res = requests.post(
                    f"{yhub_base_url}/auth/login/?product=marketplace",
                    json={"email": user.email, "password": old_password},
                    timeout=6,
                )
                if login_res.status_code == 200:
                    is_yhub_valid = True
                    yhub_token = login_res.json().get("access")
                    if yhub_token:
                        change_res = requests.post(
                            f"{yhub_base_url}/auth/change-password/",
                            json={
                                "current_password": old_password,
                                "password": new_password,
                            },
                            headers={"Authorization": f"Bearer {yhub_token}"},
                            timeout=6,
                        )
                        logger.info(
                            f"[change_password] YHub change-password response for {user.email}: {change_res.status_code}"
                        )
            except Exception as e:
                logger.warning(f"[change_password] YHub sync exception for {user.email}: {e}")

            if not is_local_valid and not is_yhub_valid:
                return Response(
                    {"error": "Current password is not correct."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Update password in local DB as well
            user.set_password(new_password)
            user.is_temp_pw = False
            user.save(update_fields=["password", "is_temp_pw", "updated_at"])
            return Response(
                {
                    "message": "Password changed successfully.",
                    "user": UserSerializer(user).data,
                },
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"])
    def send_otp(self, request):
        serializer = SendOTPSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data["email"].strip().lower()
            purpose = serializer.validated_data["purpose"]

            if purpose in ["login", "password_reset"]:
                if not User.objects.filter(email__iexact=email).exists():
                    return Response(
                        {"error": "User with this email not found."},
                        status=status.HTTP_404_NOT_FOUND,
                    )

            token = generate_otp(email, purpose)
            logger.info(f"[send_otp] Generated OTP for {email} ({purpose}): {token.otp_code}")
            try:
                send_otp_email(email, token.otp_code, purpose)
            except Exception as e:
                logger.error(f"[send_otp] Failed to dispatch OTP email: {e}")

            return Response(
                {"message": "Verification code sent successfully."},
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"])
    def verify_otp_login(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data["email"].strip().lower()
            otp_code = serializer.validated_data["otp_code"].strip()
            purpose = serializer.validated_data["purpose"]

            if verify_otp(email, otp_code, purpose):
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={"role": User.Role.RECRUITER_FREELANCER},
                )
                tokens = get_tokens_for_user(user, request=request)
                return Response(
                    {
                        "user": UserSerializer(user).data,
                        "tokens": tokens,
                        "is_new_user": created,
                    },
                    status=status.HTTP_200_OK,
                )
            return Response(
                {"error": "Invalid or expired verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"])
    def reset_password(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data["email"].strip().lower()
            otp_code = serializer.validated_data["otp_code"].strip()
            new_password = serializer.validated_data["new_password"]

            if verify_otp(email, otp_code, "password_reset"):
                try:
                    user = User.objects.get(email__iexact=email)
                    user.set_password(new_password)
                    user.is_temp_pw = False
                    user.save(update_fields=["password", "is_temp_pw", "updated_at"])
                    OTPToken.objects.filter(
                        email__iexact=email, purpose="password_reset", is_used=False
                    ).update(is_used=True)
                    logger.info(f"[reset_password] Password reset successfully for {email}")
                    return Response(
                        {"message": "Password reset successfully."},
                        status=status.HTTP_200_OK,
                    )
                except User.DoesNotExist:
                    return Response(
                        {"error": "User not found."},
                        status=status.HTTP_404_NOT_FOUND,
                    )
            return Response(
                {"error": "Invalid or expired verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUserRole]


@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def user_info_view(request):
    """
    Get or update the currently authenticated user profile.
    """
    if request.method == "GET":
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    serializer = UserSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminUserRole])
def sync_shadow_user(request):
    """
    Webhook/endpoint to synchronize shadow user data pushed from YHub or admin.
    """
    data = request.data
    user_id = data.get("id")
    if not user_id:
        return Response(
            {"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    email = data.get("email", "")
    username = data.get("username", email or str(user_id))
    first_name = data.get("first_name", "")
    last_name = data.get("last_name", "")
    roles = data.get("roles", {})
    password_hash = data.get("password_hash")
    profile_image = data.get("profile_image", "")

    local_role = roles.get("marketplace", User.Role.RECRUITER_FREELANCER)
    full_name = f"{first_name} {last_name}".strip()
    is_active = bool(data.get("is_active", True))

    defaults = {
        "username": username,
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "full_name": full_name,
        "role": local_role,
        "profile_image": profile_image,
        "is_active": is_active,
        "is_staff": bool(local_role in ["admin", User.Role.RECRUITER_ACCOUNT_MANAGER] or data.get("is_staff", False)),
        "is_superuser": bool(local_role == "admin" or data.get("is_superuser", False)),
    }

    existing_user = User.objects.filter(email=email).first()
    if existing_user and str(existing_user.id) != str(user_id):
        existing_user.delete()

    user, created = User.objects.update_or_create(id=user_id, defaults=defaults)

    if password_hash:
        user.password = password_hash
        user.save(update_fields=["password"])
    else:
        user.set_unusable_password()

    return Response({"status": "success", "created": created})
