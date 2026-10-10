from django.db import migrations


def set_unapproved_recruiters_inactive(apps, schema_editor):
    try:
        User = apps.get_model("authentication", "User")
        RecruiterApplication = apps.get_model("marketplace", "RecruiterApplication")

        approved_emails = set(
            RecruiterApplication.objects.filter(status="active").values_list("email", flat=True)
        )
        applied_emails = set(
            RecruiterApplication.objects.values_list("email", flat=True)
        )

        for u in User.objects.filter(role="recruiter_freelancer", is_staff=False, is_superuser=False):
            email_lower = u.email.lower()
            u.is_active = email_lower in approved_emails
            u.is_applied = email_lower in applied_emails
            u.save(update_fields=["is_active", "is_applied"])
    except Exception:
        pass


class Migration(migrations.Migration):

    dependencies = [
        ("marketplace", "0012_clear_dummy_applications"),
    ]

    operations = [
        migrations.RunPython(
            set_unapproved_recruiters_inactive,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
