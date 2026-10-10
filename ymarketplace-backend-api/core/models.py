import uuid

from django.db import models


class BaseModel(models.Model):
    """
    Abstract base model inherited by all domain models.
    Provides: UUID primary key, created_at, updated_at, is_active.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class Notification(BaseModel):
    """
    In-app notification model for Account Managers and Recruiters.
    """

    class Category(models.TextChoices):
        RECRUITERS = "Recruiters", "Recruiters"
        SUBMISSIONS = "Submissions", "Submissions"
        JOBS = "Jobs", "Jobs"
        PIPELINE = "Pipeline", "Pipeline"
        COMPANY = "Company", "Company"
        GENERAL = "General", "General"

    recipient = models.ForeignKey(
        "authentication.User",
        on_delete=models.CASCADE,
        related_name="notifications",
        help_text="User who receives this notification.",
    )
    title = models.CharField(max_length=255)
    body = models.TextField()
    category = models.CharField(
        max_length=50,
        choices=Category.choices,
        default=Category.GENERAL,
        db_index=True,
    )
    notification_type = models.CharField(max_length=100, db_index=True)
    link = models.CharField(max_length=500, blank=True, default="")
    data = models.JSONField(default=dict, blank=True)
    read = models.BooleanField(default=False, db_index=True)

    class Meta:
        db_table = "core_notifications"
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "read", "-created_at"]),
            models.Index(fields=["recipient", "-created_at"]),
            models.Index(fields=["category", "created_at"]),
        ]

    def __str__(self):
        return f"Notification({self.recipient.email}): {self.title}"
