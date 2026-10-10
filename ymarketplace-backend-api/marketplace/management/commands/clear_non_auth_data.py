from django.core.management.base import BaseCommand
from recruiting.models import CandidateSubmission, Candidate, RecruiterJobApplication
from marketplace.models import Job, Recruiter, Company


class Command(BaseCommand):
    help = "Clears all data from database except authentication (User accounts)"

    def handle(self, *args, **options):
        self.stdout.write("Deleting candidate submissions...")
        sub_count, _ = CandidateSubmission.objects.all().delete()
        self.stdout.write(f"Deleted {sub_count} submissions.")

        self.stdout.write("Deleting candidates...")
        cand_count, _ = Candidate.objects.all().delete()
        self.stdout.write(f"Deleted {cand_count} candidates.")

        self.stdout.write("Deleting recruiter job applications...")
        app_count, _ = RecruiterJobApplication.objects.all().delete()
        self.stdout.write(f"Deleted {app_count} applications.")

        self.stdout.write("Deleting jobs...")
        job_count, _ = Job.objects.all().delete()
        self.stdout.write(f"Deleted {job_count} jobs.")

        self.stdout.write("Deleting recruiters...")
        rec_count, _ = Recruiter.objects.all().delete()
        self.stdout.write(f"Deleted {rec_count} recruiters.")

        self.stdout.write("Deleting companies...")
        comp_count, _ = Company.objects.all().delete()
        self.stdout.write(f"Deleted {comp_count} companies.")

        self.stdout.write(self.style.SUCCESS("Successfully cleared all non-auth data while preserving User authentication accounts."))
