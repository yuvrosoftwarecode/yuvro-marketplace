from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from marketplace.models import Recruiter

User = get_user_model()


class Command(BaseCommand):
    help = "Cleans up dummy placeholder users (user_*@yuvro.ai) and their Recruiter profiles"

    def handle(self, *args, **options):
        dummy_users = User.objects.filter(email__startswith="user_", email__endswith="@yuvro.ai")
        user_count = dummy_users.count()
        if user_count == 0:
            self.stdout.write(self.style.SUCCESS("No dummy placeholder users found."))
            return

        self.stdout.write(f"Found {user_count} dummy user(s) to delete.")
        for u in dummy_users:
            rec_count, _ = Recruiter.objects.filter(email=u.email).delete()
            self.stdout.write(f"Deleted Recruiter profile for {u.email} (count: {rec_count})")
            u.delete()
            self.stdout.write(f"Deleted User {u.email}")

        self.stdout.write(self.style.SUCCESS(f"Successfully cleaned up {user_count} dummy placeholder user(s)."))
