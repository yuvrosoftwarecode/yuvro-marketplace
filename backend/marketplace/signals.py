from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from marketplace.models import Recruiter, RecruiterStatus, RecruiterType

User = get_user_model()


@receiver(post_save, sender=User)
def sync_recruiter_profile(sender, instance, created, **kwargs):
    """
    Automatically creates or links a Recruiter profile when a User with
    the role 'recruiter_freelancer' is saved.
    """
    if instance.role == User.Role.RECRUITER_FREELANCER:
        rec = Recruiter.objects.filter(email__iexact=instance.email).first()
        display_name = (
            instance.full_name.strip()
            if instance.full_name
            else (instance.username or instance.email.split("@")[0])
        )
        if rec:
            updated = False
            if rec.user != instance:
                rec.user = instance
                updated = True
            if not rec.name and display_name:
                rec.name = display_name
                updated = True
            if updated:
                rec.save()
        else:
            Recruiter.objects.create(
                user=instance,
                email=instance.email,
                name=display_name,
                phone=instance.phone_number or "",
                status=(
                    RecruiterStatus.ACTIVE
                    if instance.is_active
                    else RecruiterStatus.INACTIVE
                ),
                type=RecruiterType.INDEPENDENT,
                created_by="Self registered",
            )
