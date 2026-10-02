# Generated manually for company logo support
from django.db import migrations, models
import marketplace.models


class Migration(migrations.Migration):

    dependencies = [
        ("marketplace", "0014_purge_all_dummy_data"),
    ]

    operations = [
        migrations.AddField(
            model_name="company",
            name="logo",
            field=models.ImageField(
                blank=True,
                help_text="Uploaded company logo file.",
                null=True,
                upload_to=marketplace.models.company_logo_path,
            ),
        ),
    ]
