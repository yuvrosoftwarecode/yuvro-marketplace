from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("marketplace", "0006_job_hiring_process"),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name="company",
            name="marketplace_status_3fd9c6_idx",
        ),
        migrations.RemoveIndex(
            model_name="company",
            name="marketplace_account_9af1c9_idx",
        ),
        migrations.RemoveField(
            model_name="company",
            name="status",
        ),
        migrations.AddIndex(
            model_name="company",
            index=models.Index(fields=["industry"], name="marketplace_industry_idx"),
        ),
        migrations.AddIndex(
            model_name="company",
            index=models.Index(fields=["account_manager"], name="marketplace_am_idx"),
        ),
    ]
