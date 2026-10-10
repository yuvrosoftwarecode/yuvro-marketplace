# Generated for recruiter_slots on Job model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("marketplace", "0003_recruiter"),
    ]

    operations = [
        migrations.AddField(
            model_name="job",
            name="recruiter_slots",
            field=models.PositiveIntegerField(
                default=6,
                help_text="Maximum number of recruiters who may work this job simultaneously.",
            ),
        ),
    ]
