from django.db import migrations


def purge_all_dummy_data(apps, schema_editor):
    try:
        User = apps.get_model("authentication", "User")
        Recruiter = apps.get_model("marketplace", "Recruiter")
        RecruiterApplication = apps.get_model("marketplace", "RecruiterApplication")

        dummy_emails = [
            "meera@talentloop.in",
            "dan@brookssearch.com",
            "siddharth@nexushire.io",
            "priya.patel@scouttalent.com",
            "priya@pateltalent.com",
            "marcus@vancesearch.co.uk",
            "elena@rostovatalent.eu",
            "diego@northpeaksearch.com",
            "hana@satotalent.jp",
            "omar@haddadpartners.com",
        ]

        # Delete dummy applications
        RecruiterApplication.objects.filter(email__in=dummy_emails).delete()
        RecruiterApplication.objects.filter(email__startswith="user_", email__endswith="@yuvro.ai").delete()

        # Delete dummy recruiters
        Recruiter.objects.filter(email__in=dummy_emails).delete()
        Recruiter.objects.filter(email__startswith="user_", email__endswith="@yuvro.ai").delete()

        # Delete dummy users
        User.objects.filter(email__in=dummy_emails).delete()
        User.objects.filter(email__startswith="user_", email__endswith="@yuvro.ai").delete()

    except Exception:
        pass


class Migration(migrations.Migration):

    dependencies = [
        ("marketplace", "0013_enforce_recruiter_inactive"),
    ]

    operations = [
        migrations.RunPython(
            purge_all_dummy_data,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
