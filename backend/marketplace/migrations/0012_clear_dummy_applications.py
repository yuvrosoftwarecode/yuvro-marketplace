from django.db import migrations


def purge_dummy_records(apps, schema_editor):
    try:
        RecruiterApplication = apps.get_model("marketplace", "RecruiterApplication")
        User = apps.get_model("authentication", "User")
        dummy_emails = [
            "meera@talentloop.in",
            "dan@brookssearch.com",
            "siddharth@nexushire.io",
            "priya.patel@scouttalent.com",
            "priya@pateltalent.com",
            "marcus@vancesearch.co.uk",
            "elena@rostovatalent.eu",
        ]
        RecruiterApplication.objects.filter(email__in=dummy_emails).delete()
        User.objects.filter(email__in=dummy_emails).delete()
    except Exception:
        pass


class Migration(migrations.Migration):

    dependencies = [
        ("marketplace", "0011_rename_marketplace_status_936fa1_idx_marketplace_status_7dd1f7_idx_and_more"),
    ]

    operations = [
        migrations.RunPython(purge_dummy_records, reverse_code=migrations.RunPython.noop),
    ]
