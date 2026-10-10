from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("marketplace", "0007_remove_company_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="job",
            name="target_companies",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="List of target companies to source candidates from (e.g. ['Google', 'Meta', 'Stripe']).",
            ),
        ),
    ]
