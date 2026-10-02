import uuid

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone

from authentication.managers import CustomUserManager
from core.models import BaseModel


def user_avatar_path(instance, filename):
    ext = filename.split(".")[-1]
    app_name = getattr(settings, "APP_NAME", "yuvro-marketplace").strip().strip("/")
    prefix = f"{app_name}/" if app_name else ""
    return f"{prefix}users/{instance.id}/avatar.{ext}"


class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    """
    Custom user model using email as the unique identifier.
    """

    class Role(models.TextChoices):
        RECRUITER_ACCOUNT_MANAGER = (
            "recruiter_account_manager",
            "Recruiter Account Manager",
        )
        RECRUITER_FREELANCER = "recruiter_freelancer", "Recruiter Freelancer"
        RECRUITER_COMPANY_EMPLOYEE = (
            "recruiter_company_employee",
            "Recruiter Company Employee",
        )
        RECRUITER_COMPANY_MANAGER = (
            "recruiter_company_manager",
            "Recruiter Company Manager",
        )

    email = models.EmailField(unique=True, db_index=True)
    username = models.CharField(max_length=150, blank=True, db_index=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    full_name = models.CharField(max_length=255, blank=True)
    role = models.CharField(
        max_length=40, choices=Role.choices, default=Role.RECRUITER_FREELANCER
    )
    profile_image = models.URLField(blank=True, null=True)
    avatar = models.ImageField(upload_to=user_avatar_path, blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True)

    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True, db_index=True)
    is_applied = models.BooleanField(default=False, db_index=True)
    is_temp_pw = models.BooleanField(
        default=False,
        db_index=True,
        help_text="True if the user is using a temporary password and must change it on login.",
    )
    last_login = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    class Meta:
        db_table = "auth_user"
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["-created_at"]

    def __str__(self):
        return self.email

    @property
    def is_admin_user(self):
        return self.is_superuser or self.is_staff

    @property
    def is_account_manager(self):
        return self.role == self.Role.RECRUITER_ACCOUNT_MANAGER or self.is_admin_user

    @property
    def is_freelancer(self):
        return self.role == self.Role.RECRUITER_FREELANCER

    @property
    def is_company_manager(self):
        return self.role == self.Role.RECRUITER_COMPANY_MANAGER

    @property
    def is_company_employee(self):
        return self.role == self.Role.RECRUITER_COMPANY_EMPLOYEE

    @property
    def is_company_user(self):
        return self.role in (
            self.Role.RECRUITER_COMPANY_MANAGER,
            self.Role.RECRUITER_COMPANY_EMPLOYEE,
        )


class UserSession(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sessions")
    refresh_token = models.TextField()
    user_agent = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = "auth_user_sessions"
        ordering = ["-created_at"]


class OTPToken(BaseModel):
    email = models.EmailField()
    otp_code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=50, default="login")
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        db_table = "auth_otp_tokens"
        ordering = ["-created_at"]

    def is_valid(self):
        return not self.is_used and timezone.now() <= self.expires_at
