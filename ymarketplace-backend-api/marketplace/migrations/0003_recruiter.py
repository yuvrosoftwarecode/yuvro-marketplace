# Generated for Recruiter Model

import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("marketplace", "0002_company_overview_company_slug_company_why_role_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Recruiter",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("name", models.CharField(db_index=True, max_length=255)),
                ("slug", models.SlugField(blank=True, max_length=280)),
                ("email", models.EmailField(db_index=True, max_length=254)),
                ("phone", models.CharField(blank=True, default="", max_length=50)),
                ("location", models.CharField(blank=True, default="", max_length=255)),
                ("linkedin", models.CharField(blank=True, default="", max_length=500)),
                ("website", models.CharField(blank=True, default="", max_length=500)),
                (
                    "type",
                    models.CharField(
                        choices=[
                            ("Independent", "Independent"),
                            ("Agency", "Agency"),
                        ],
                        db_index=True,
                        default="Independent",
                        max_length=50,
                    ),
                ),
                ("agency", models.CharField(blank=True, default="", max_length=255)),
                ("experience", models.CharField(blank=True, default="", max_length=100)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("active", "Active"),
                            ("pending", "Pending"),
                            ("suspended", "Suspended"),
                            ("inactive", "Inactive"),
                        ],
                        db_index=True,
                        default="active",
                        max_length=30,
                    ),
                ),
                (
                    "specializations",
                    models.JSONField(
                        blank=True,
                        default=list,
                        help_text="List of specialization tags (e.g. ['Frontend', 'AI/ML']).",
                    ),
                ),
                (
                    "markets",
                    models.JSONField(
                        blank=True,
                        default=list,
                        help_text="List of markets/regions (e.g. ['US', 'Remote']).",
                    ),
                ),
                (
                    "response_rate",
                    models.PositiveIntegerField(
                        default=0, help_text="Response rate percentage (0-100)."
                    ),
                ),
                (
                    "quality_score",
                    models.PositiveIntegerField(
                        default=0, help_text="Quality score (0-100)."
                    ),
                ),
                (
                    "verification",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text="Verification statuses: {'identity': bool, 'agency': bool, 'payment': bool, 'tax': bool, 'agreement': bool}.",
                    ),
                ),
                (
                    "interview_stats",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text="Interview statistics: {'scheduled': int, 'completed': int, ...}.",
                    ),
                ),
                (
                    "am_rejection_reasons",
                    models.JSONField(
                        blank=True,
                        default=list,
                        help_text="Reasons AM rejected submissions: [{'reason': '...', 'count': int}].",
                    ),
                ),
                (
                    "company_rejection_reasons",
                    models.JSONField(
                        blank=True,
                        default=list,
                        help_text="Reasons companies rejected candidates: [{'reason': '...', 'count': int}].",
                    ),
                ),
                ("created_by", models.CharField(blank=True, default="", max_length=255)),
                (
                    "account_manager",
                    models.ForeignKey(
                        blank=True,
                        help_text="Account Manager managing this recruiter.",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="managed_recruiters",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "user",
                    models.OneToOneField(
                        blank=True,
                        help_text="Linked User account with recruiter_freelancer role.",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="recruiter_profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Recruiter",
                "verbose_name_plural": "Recruiters",
                "db_table": "marketplace_recruiters",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="recruiter",
            index=models.Index(
                fields=["status", "type"], name="marketplace_status_9f481a_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="recruiter",
            index=models.Index(
                fields=["account_manager", "status"],
                name="marketplace_account_28cd9a_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="recruiter",
            index=models.Index(fields=["slug"], name="marketplace_slug_7d3b91_idx"),
        ),
        migrations.AddIndex(
            model_name="recruiter",
            index=models.Index(fields=["email"], name="marketplace_email_501a3e_idx"),
        ),
    ]
