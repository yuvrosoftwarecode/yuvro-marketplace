from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("authentication", "0002_alter_user_last_login"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="first_name",
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.AddField(
            model_name="user",
            name="last_name",
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.AddField(
            model_name="user",
            name="profile_image",
            field=models.URLField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="username",
            field=models.CharField(blank=True, db_index=True, max_length=150),
        ),
        migrations.AlterField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[
                    ("admin", "Admin"),
                    ("recruiter_account_manager", "Recruiter Account Manager"),
                    ("recruiter_freelancer", "Recruiter Freelancer"),
                    ("user", "User"),
                    ("seller", "Seller"),
                    ("buyer", "Buyer"),
                ],
                default="recruiter_freelancer",
                max_length=40,
            ),
        ),
    ]
