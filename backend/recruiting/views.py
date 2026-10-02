import logging
from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

logger = logging.getLogger(__name__)


from recruiting.models import (
    ApplicationStatus,
    Candidate,
    CandidateSubmission,
    RecruiterJobApplication,
    SubmissionStatus,
)
from recruiting.permissions import (
    IsAccountManagerUser,
    IsApplicationOwnerOrJobAM,
    IsCandidateOwner,
    IsRecruiterUser,
    IsSubmissionOwnerOrJobAM,
    is_user_account_manager,
    is_user_admin,
    is_user_company_user,
    is_user_recruiter,
)
from recruiting.serializers import (
    ApplicationRejectSerializer,
    CandidateSerializer,
    CandidateSubmissionCreateSerializer,
    CandidateSubmissionSerializer,
    RecruiterJobApplicationSerializer,
)
from django.contrib.auth import get_user_model
from marketplace.models import Job
from recruiting.services import (
    approve_application,
    assign_recruiter_to_job,
    reject_application,
    withdraw_application,
)


class RecruiterJobApplicationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing recruiter applications to open jobs.
    """

    serializer_class = RecruiterJobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated, IsApplicationOwnerOrJobAM]
    filterset_fields = ["status", "job"]
    search_fields = [
        "job__title",
        "job__company__name",
        "recruiter__email",
        "recruiter__full_name",
    ]
    ordering_fields = ["created_at", "updated_at", "status", "reviewed_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return RecruiterJobApplication.objects.none()

        qs = RecruiterJobApplication.objects.select_related(
            "recruiter",
            "job",
            "job__company",
            "job__company__account_manager",
            "reviewed_by",
        ).all()

        if is_user_admin(user):
            # Admin can filter by recruiter if requested
            recruiter_filter = self.request.query_params.get("recruiter")
            if recruiter_filter:
                qs = qs.filter(
                    Q(recruiter_id=recruiter_filter)
                    | Q(recruiter__email__iexact=recruiter_filter)
                )
            return qs

        if is_user_account_manager(user) and not is_user_recruiter(user):
            # Account Manager sees applications for jobs belonging to companies they manage
            qs = qs.filter(job__company__account_manager=user)
            recruiter_filter = self.request.query_params.get("recruiter")
            if recruiter_filter:
                qs = qs.filter(
                    Q(recruiter_id=recruiter_filter)
                    | Q(recruiter__email__iexact=recruiter_filter)
                )
            return qs

        # Freelance Recruiter only sees their own applications
        return qs.filter(recruiter=user)

    @action(
        detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated]
    )
    def approve(self, request, pk=None):
        """
        Account Manager approves a pending application.
        """
        application = self.get_object()
        updated_app = approve_application(application=application, user=request.user)
        serializer = self.get_serializer(updated_app)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(
        detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated]
    )
    def reject(self, request, pk=None):
        """
        Account Manager rejects a pending application with a required reason.
        """
        application = self.get_object()
        reject_serializer = ApplicationRejectSerializer(data=request.data)
        reject_serializer.is_valid(raise_exception=True)
        rejection_reason = reject_serializer.validated_data["rejection_reason"]

        updated_app = reject_application(
            application=application,
            user=request.user,
            rejection_reason=rejection_reason,
        )
        serializer = self.get_serializer(updated_app)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(
        detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated]
    )
    def withdraw(self, request, pk=None):
        """
        Recruiter withdraws their own pending or approved application.
        """
        application = self.get_object()
        updated_app = withdraw_application(application=application, user=request.user)
        serializer = self.get_serializer(updated_app)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(
        detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated]
    )
    def unassign(self, request, pk=None):
        """
        Recruiter unassigns from an approved job application.
        """
        application = self.get_object()
        updated_app = withdraw_application(application=application, user=request.user)
        serializer = self.get_serializer(updated_app)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(
        detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated]
    )
    def assign(self, request):
        """
        Account Manager or Admin directly assigns a recruiter to a job with APPROVED status.
        """
        job_identifier = request.data.get("job_id")
        recruiter_identifier = request.data.get("recruiter_id")
        note = request.data.get("note") or request.data.get("why_fit") or ""

        if not job_identifier:
            return Response(
                {"job_id": "job_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not recruiter_identifier:
            return Response(
                {"recruiter_id": "recruiter_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Resolve job by UUID or slug
        job = None
        try:
            job = Job.objects.filter(id=job_identifier).first()
        except Exception:
            pass
        if not job:
            job = Job.objects.filter(slug=job_identifier).first()
        if not job:
            return Response(
                {"job_id": "Job not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Resolve recruiter User
        User = get_user_model()
        recruiter_user = None

        # 1. Try by User ID
        try:
            recruiter_user = User.objects.filter(id=recruiter_identifier).first()
        except Exception:
            pass

        # 2. Try by Recruiter profile ID
        if not recruiter_user:
            try:
                from marketplace.models import Recruiter
                rec = Recruiter.objects.filter(id=recruiter_identifier).select_related("user").first()
                if rec:
                    if rec.user:
                        recruiter_user = rec.user
                    else:
                        recruiter_user = User.objects.filter(email__iexact=rec.email).first()
            except Exception:
                pass

        # 3. Try by email
        if not recruiter_user and isinstance(recruiter_identifier, str) and "@" in recruiter_identifier:
            recruiter_user = User.objects.filter(email__iexact=recruiter_identifier.strip()).first()

        if not recruiter_user:
            return Response(
                {"recruiter_id": "Recruiter user not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            app = assign_recruiter_to_job(
                user=request.user,
                job=job,
                recruiter_user=recruiter_user,
                why_fit=note,
            )
        except Exception as e:
            detail = getattr(e, "detail", str(e))
            return Response(
                {"detail": detail},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(app)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CandidateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing candidate profiles owned by recruiters.
    """

    serializer_class = CandidateSerializer
    permission_classes = [permissions.IsAuthenticated, IsCandidateOwner]
    filterset_fields = [
        "email",
        "open_to_relocation",
        "work_authorization_status",
    ]
    search_fields = [
        "first_name",
        "last_name",
        "email",
        "current_title",
        "current_company",
        "current_location",
    ]
    ordering_fields = ["created_at", "updated_at", "last_name", "first_name"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Candidate.objects.none()

        qs = Candidate.objects.select_related("recruiter").all()

        if is_user_admin(user):
            return qs

        if is_user_account_manager(user) and not is_user_recruiter(user):
            # AM can see candidates submitted to their jobs
            return qs.filter(
                submissions__application__job__company__account_manager=user
            ).distinct()

        # Recruiter sees their candidate pool
        return qs.filter(recruiter=user)

    def perform_create(self, serializer):
        serializer.save(recruiter=self.request.user)


class CandidateSubmissionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for candidate submissions against approved job applications.
    """

    permission_classes = [permissions.IsAuthenticated, IsSubmissionOwnerOrJobAM]
    filterset_fields = ["status", "application", "application__job", "candidate"]
    search_fields = [
        "candidate__first_name",
        "candidate__last_name",
        "candidate__email",
        "application__job__title",
        "application__job__company__name",
        "application__recruiter__full_name",
        "application__recruiter__email",
    ]
    ordering_fields = ["submitted_at", "updated_at", "status"]
    ordering = ["-submitted_at"]

    def get_serializer_class(self):
        if self.action == "create":
            return CandidateSubmissionCreateSerializer
        return CandidateSubmissionSerializer

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return CandidateSubmission.objects.none()

        qs = CandidateSubmission.objects.select_related(
            "application",
            "application__recruiter",
            "application__job",
            "application__job__company",
            "application__job__company__account_manager",
            "candidate",
            "candidate__recruiter",
        ).all()

        if is_user_admin(user):
            return qs

        if is_user_recruiter(user):
            return qs.filter(application__recruiter=user)

        if is_user_account_manager(user):
            return qs.filter(
                Q(application__job__company__account_manager=user)
                | Q(application__job__company__account_manager__isnull=True)
            )

        if is_user_company_user(user):
            from marketplace.models import Company

            company_ids = []
            try:
                if getattr(user, "company_profile", None):
                    company_ids.append(user.company_profile.company_id)
            except Exception:
                pass
            comp_managed = Company.objects.filter(company_manager=user).values_list(
                "id", flat=True
            )
            company_ids.extend(list(comp_managed))
            if not company_ids:
                return CandidateSubmission.objects.none()

            # For company users: only show candidates that have been moved past AM review
            am_review_stages = [
                "am_review",
                "submitted",
                "pending",
                "",
                "AM Review",
                "Am Review",
                "Submitted",
            ]
            return qs.filter(
                application__job__company_id__in=company_ids
            ).exclude(
                Q(stage__in=am_review_stages) | Q(stage__isnull=True)
            )

        return qs.filter(application__recruiter=user)

    def perform_update(self, serializer):
        instance = self.get_object()
        old_stage = (instance.stage or "").strip().lower()
        old_status = (instance.status or "").strip().lower()

        updated_instance = serializer.save()

        new_stage = (updated_instance.stage or "").strip().lower()
        new_status = (updated_instance.status or "").strip().lower()

        am_review_stages = {"am_review", "submitted", "pending", ""}

        is_rejected = (new_stage == "rejected" or new_status == "rejected")
        was_in_am_review = old_stage in am_review_stages

        if is_rejected:
            # If rejected while in AM review: NO email should be triggered.
            # If rejected in any other step: trigger email mentioning at what stage it was rejected and reason.
            if not was_in_am_review and old_status != "rejected" and old_stage != "rejected":
                try:
                    from core.emails import send_candidate_rejected_email
                    send_candidate_rejected_email(updated_instance, rejected_at_stage=instance.stage)
                except Exception as e:
                    logger.warning(f"Failed to dispatch candidate rejected email: {e}")

            if old_status != "rejected" and old_stage != "rejected":
                try:
                    from core.notifications import notify_recruiter_pipeline_moved
                    notify_recruiter_pipeline_moved(
                        updated_instance,
                        old_stage=instance.stage,
                        new_stage="rejected",
                        is_rejected=True,
                        rejected_at_stage=instance.stage,
                    )
                except Exception as e:
                    logger.warning(f"Failed to dispatch recruiter pipeline rejected notification: {e}")
        else:
            is_leaving_am_review = (
                was_in_am_review
                and new_stage not in am_review_stages
            )

            is_pipeline_move_past_am_review = (
                not was_in_am_review
                and new_stage not in am_review_stages
                and old_stage != new_stage
            )

            if is_leaving_am_review:
                # Trigger 2: When profile is approved / proceeded from AM review
                try:
                    from core.emails import send_candidate_approved_email
                    send_candidate_approved_email(updated_instance, old_stage=instance.stage)
                except Exception as e:
                    logger.warning(f"Failed to dispatch candidate approved email: {e}")

                try:
                    from core.notifications import notify_recruiter_pipeline_moved
                    notify_recruiter_pipeline_moved(
                        updated_instance,
                        old_stage=instance.stage,
                        new_stage=updated_instance.stage,
                        is_rejected=False,
                    )
                except Exception as e:
                    logger.warning(f"Failed to dispatch recruiter pipeline approved notification: {e}")

                try:
                    from core.notifications import notify_company_candidate_ready_for_review
                    notify_company_candidate_ready_for_review(
                        updated_instance,
                        old_stage=instance.stage,
                        new_stage=updated_instance.stage,
                    )
                except Exception as e:
                    logger.warning(f"Failed to dispatch company candidate ready notification: {e}")
            elif is_pipeline_move_past_am_review:
                # Trigger 4: When pipeline moved ONLY from first round onwards, NOT AM review
                try:
                    from core.emails import send_pipeline_stage_moved_email
                    send_pipeline_stage_moved_email(
                        updated_instance,
                        old_stage=instance.stage,
                        new_stage=updated_instance.stage,
                    )
                except Exception as e:
                    logger.warning(f"Failed to dispatch pipeline stage moved email: {e}")

                try:
                    from core.notifications import notify_recruiter_pipeline_moved
                    notify_recruiter_pipeline_moved(
                        updated_instance,
                        old_stage=instance.stage,
                        new_stage=updated_instance.stage,
                        is_rejected=False,
                    )
                except Exception as e:
                    logger.warning(f"Failed to dispatch recruiter pipeline moved notification: {e}")

    @action(detail=False, methods=["get", "post"], url_path="check-duplicate")

    def check_duplicate(self, request):
        user = request.user
        job_id = request.query_params.get("job_id") or (
            request.data.get("job_id") if isinstance(request.data, dict) else None
        )
        linkedin_url = (
            request.query_params.get("linkedin_url")
            or request.query_params.get("linkedin")
            or (request.data.get("linkedin_url") if isinstance(request.data, dict) else None)
            or (request.data.get("linkedin") if isinstance(request.data, dict) else None)
            or ""
        )
        email = (
            request.query_params.get("email")
            or (request.data.get("email") if isinstance(request.data, dict) else None)
            or ""
        )

        from recruiting.services import normalize_linkedin_url
        norm_linkedin = normalize_linkedin_url(linkedin_url)

        # Check ONLY if candidate with this LinkedIn URL has already been submitted for THIS job
        if norm_linkedin and job_id:
            import uuid
            from marketplace.models import Job
            target_job = None
            try:
                target_job = Job.objects.filter(id=uuid.UUID(str(job_id))).first()
            except (ValueError, TypeError):
                target_job = (
                    Job.objects.filter(slug__iexact=str(job_id)).first()
                    or Job.objects.filter(title__icontains=str(job_id)).first()
                )

            if target_job:
                existing_subs = CandidateSubmission.objects.filter(
                    application__job=target_job
                ).select_related("candidate")
                for sub in existing_subs:
                    if sub.candidate:
                        cand_norm_link = normalize_linkedin_url(getattr(sub.candidate, "linkedin_url", ""))
                        if cand_norm_link and cand_norm_link == norm_linkedin:
                            cand_name = sub.candidate.full_name or "A candidate"
                            return Response({
                                "is_duplicate": True,
                                "reason": "already_submitted_for_job",
                                "candidate_name": cand_name,
                                "message": f"A candidate ({cand_name}) with this LinkedIn profile URL has already been submitted for this job ({target_job.title}).",
                            })

        return Response({"is_duplicate": False})
