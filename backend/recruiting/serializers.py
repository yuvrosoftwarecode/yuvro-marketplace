from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import serializers

from marketplace.models import Company, Job
from recruiting.models import (
    ApplicationStatus,
    Candidate,
    CandidateSubmission,
    RecruiterJobApplication,
    SubmissionStatus,
)
from recruiting.services import apply_to_job, submit_candidate
from recruiting.validators import validate_and_snapshot_answers, validate_why_fit_text

User = get_user_model()


class RecruiterUserSummarySerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    recruiter_profile_id = serializers.SerializerMethodField()
    slug = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "name", "email", "role", "recruiter_profile_id", "slug"]
        read_only_fields = fields

    def get_name(self, obj):
        if getattr(obj, "full_name", None):
            return obj.full_name
        first_last = f"{getattr(obj, 'first_name', '')} {getattr(obj, 'last_name', '')}".strip()
        if first_last:
            return first_last
        if hasattr(obj, "recruiter_profile") and obj.recruiter_profile and obj.recruiter_profile.name:
            return obj.recruiter_profile.name
        if getattr(obj, "username", None):
            return obj.username
        if getattr(obj, "email", None):
            return obj.email.split("@")[0]
        return "Recruiter"

    def get_recruiter_profile_id(self, obj):
        if hasattr(obj, "recruiter_profile") and obj.recruiter_profile:
            return str(obj.recruiter_profile.id)
        return None

    def get_slug(self, obj):
        if hasattr(obj, "recruiter_profile") and obj.recruiter_profile:
            return obj.recruiter_profile.slug or ""
        return ""


class JobCompanySummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ["id", "name", "slug", "logo_url", "industry"]
        read_only_fields = fields


class ApplicationJobSummarySerializer(serializers.ModelSerializer):
    company = JobCompanySummarySerializer(read_only=True)

    class Meta:
        model = Job
        fields = [
            "id",
            "title",
            "slug",
            "status",
            "location",
            "employment_type",
            "work_model",
            "salary_min",
            "salary_max",
            "salary_currency",
            "company",
            "candidate_questions",
            "hiring_process",
        ]
        read_only_fields = fields


class RecruiterJobApplicationSerializer(serializers.ModelSerializer):
    """
    Serializer for RecruiterJobApplication CRUD & display.
    """

    job_id = serializers.PrimaryKeyRelatedField(
        queryset=Job.objects.all(), source="job", write_only=True
    )
    job = ApplicationJobSummarySerializer(read_only=True)
    recruiter = RecruiterUserSummarySerializer(read_only=True)
    reviewed_by = RecruiterUserSummarySerializer(read_only=True)

    class Meta:
        model = RecruiterJobApplication
        fields = [
            "id",
            "recruiter",
            "job",
            "job_id",
            "why_fit",
            "status",
            "reviewed_by",
            "reviewed_at",
            "rejection_reason",
            "created_at",
            "updated_at",
            "is_active",
        ]
        read_only_fields = [
            "id",
            "recruiter",
            "status",
            "reviewed_by",
            "reviewed_at",
            "rejection_reason",
            "created_at",
            "updated_at",
            "is_active",
        ]

    def validate_why_fit(self, value):
        return validate_why_fit_text(value)

    def create(self, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        job = validated_data["job"]
        why_fit = validated_data.get("why_fit", "")
        return apply_to_job(user=user, job=job, why_fit=why_fit)


class ApplicationRejectSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField(
        required=True,
        allow_blank=False,
        error_messages={"blank": "Rejection reason is required and cannot be empty."},
    )

    def validate_rejection_reason(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Rejection reason is required.")
        return str(value).strip()


class CandidateSerializer(serializers.ModelSerializer):
    """
    Serializer for Candidate profiles.
    """

    recruiter = RecruiterUserSummarySerializer(read_only=True)
    full_name = serializers.CharField(read_only=True)
    resume_url = serializers.SerializerMethodField()
    visa = serializers.CharField(source="work_authorization_status", read_only=True)
    visa_status = serializers.CharField(source="work_authorization_status", read_only=True)
    current_salary = serializers.CharField(read_only=True)
    expected_salary = serializers.CharField(read_only=True)

    class Meta:
        model = Candidate
        fields = [
            "id",
            "recruiter",
            "first_name",
            "last_name",
            "full_name",
            "current_title",
            "current_company",
            "email",
            "phone",
            "linkedin_url",
            "github_url",
            "portfolio_url",
            "current_location",
            "work_authorization_status",
            "visa",
            "visa_status",
            "open_to_relocation",
            "base_compensation_expectation",
            "compensation",
            "current_compensation",
            "current_salary",
            "expected_salary",
            "compensation_currency",
            "earliest_start_date",
            "availability",
            "notice_period",
            "resume",
            "resume_url",
            "notes",
            "created_at",
            "updated_at",
            "is_active",
        ]
        read_only_fields = [
            "id",
            "recruiter",
            "full_name",
            "created_at",
            "updated_at",
            "is_active",
        ]

    def get_resume_url(self, obj):
        from core.storage import build_public_url

        if obj.resume and hasattr(obj.resume, "name") and obj.resume.name:
            return build_public_url(obj.resume.name) or ""
        if obj.resume_url:
            return build_public_url(obj.resume_url) or ""
        return ""

    def validate_first_name(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("First name is required.")
        return str(value).strip()

    def validate_last_name(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Last name is required.")
        return str(value).strip()

    def validate_base_compensation_expectation(self, value):
        if value is not None and value < Decimal("0.00"):
            raise serializers.ValidationError(
                "Base compensation expectation cannot be negative."
            )
        return value

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["recruiter"] = request.user
        return super().create(validated_data)


class CandidateSubmissionSerializer(serializers.ModelSerializer):
    """
    Detailed representation serializer for CandidateSubmission.
    """

    application = RecruiterJobApplicationSerializer(read_only=True)
    candidate = CandidateSerializer(read_only=True)

    class Meta:
        model = CandidateSubmission
        fields = [
            "id",
            "application",
            "candidate",
            "answers",
            "recruiter_notes",
            "status",
            "stage",
            "rejection_reason",
            "decision_note",
            "submitted_at",
            "updated_at",
            "is_active",
        ]
        read_only_fields = [
            "id",
            "application",
            "candidate",
            "answers",
            "submitted_at",
            "updated_at",
            "is_active",
        ]

    def validate(self, attrs):
        stage = attrs.get("stage")
        status_val = attrs.get("status")
        # Check if updating to rejected status or stage
        is_rejecting = stage == "rejected" or status_val == "rejected"
        if is_rejecting:
            note = (attrs.get("rejection_reason") or attrs.get("decision_note") or "").strip()
            if not note and self.instance:
                note = (self.instance.rejection_reason or self.instance.decision_note or "").strip()
            if not note:
                raise serializers.ValidationError(
                    {"decision_note": "A decision note / rejection reason is mandatory when rejecting a candidate."}
                )

        # Synchronize rejection_reason and decision_note if one is provided
        if attrs.get("rejection_reason") and not attrs.get("decision_note"):
            attrs["decision_note"] = attrs["rejection_reason"]
        elif attrs.get("decision_note") and not attrs.get("rejection_reason"):
            attrs["rejection_reason"] = attrs["decision_note"]

        return attrs


class CandidateSubmissionCreateSerializer(serializers.Serializer):
    """
    Serializer for candidate submission requests.
    Supports application ID, job_id, existing candidate ID, or nested/top-level candidate payload.
    """

    application = serializers.PrimaryKeyRelatedField(
        queryset=RecruiterJobApplication.objects.all(),
        required=False,
        allow_null=True,
    )
    job_id = serializers.CharField(required=False, allow_blank=True)
    candidate_id = serializers.PrimaryKeyRelatedField(
        queryset=Candidate.objects.all(),
        source="candidate",
        required=False,
        allow_null=True,
    )
    candidate = serializers.DictField(required=False, write_only=True)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    current_title = serializers.CharField(required=False, allow_blank=True)
    current_company = serializers.CharField(required=False, allow_blank=True)
    current_location = serializers.CharField(required=False, allow_blank=True)
    linkedin_url = serializers.CharField(required=False, allow_blank=True)
    github_url = serializers.CharField(required=False, allow_blank=True)
    github = serializers.CharField(required=False, allow_blank=True)
    portfolio_url = serializers.CharField(required=False, allow_blank=True)
    portfolio = serializers.CharField(required=False, allow_blank=True)
    work_authorization_status = serializers.CharField(required=False, allow_blank=True)
    visa_status = serializers.CharField(required=False, allow_blank=True)
    visa = serializers.CharField(required=False, allow_blank=True)
    base_compensation_expectation = serializers.CharField(required=False, allow_blank=True)
    compensation = serializers.CharField(required=False, allow_blank=True)
    expected_salary = serializers.CharField(required=False, allow_blank=True)
    current_salary = serializers.CharField(required=False, allow_blank=True)
    earliest_start_date = serializers.CharField(required=False, allow_blank=True)
    availability = serializers.CharField(required=False, allow_blank=True)
    notice_period = serializers.CharField(required=False, allow_blank=True)
    answers = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
    )
    resume = serializers.FileField(required=False, allow_null=True)
    recruiter_notes = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
    notes = serializers.CharField(
        required=False, allow_blank=True, default=""
    )

    def to_internal_value(self, data):
        if hasattr(data, "dict"):
            data = data.dict()
        elif hasattr(data, "copy"):
            data = data.copy()
        elif isinstance(data, dict):
            data = dict(data)

        if isinstance(data, dict):
            answers_raw = data.get("answers")
            if isinstance(answers_raw, str) and answers_raw.strip():
                try:
                    import json
                    data["answers"] = json.loads(answers_raw)
                except Exception:
                    pass

        return super().to_internal_value(data)

    def validate(self, attrs):
        application = attrs.get("application")
        job_id = attrs.get("job_id") or self.initial_data.get("job_id")

        if not application and not job_id:
            raise serializers.ValidationError(
                {"application": "Either application ID or job_id is required."}
            )

        cand_obj = attrs.get("candidate")
        cand_dict = self.initial_data.get("candidate")
        email = attrs.get("email") or self.initial_data.get("email")

        if not cand_obj and not (cand_dict and isinstance(cand_dict, dict)) and not email:
            raise serializers.ValidationError(
                {
                    "candidate": "Either a candidate ID, candidate profile dictionary, or candidate email is required."
                }
            )

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        application = validated_data.get("application")
        job_id = validated_data.get("job_id") or self.initial_data.get("job_id")

        if not application and job_id:
            from marketplace.models import Job
            import uuid
            job = None
            try:
                job_uuid = uuid.UUID(str(job_id))
                job = Job.objects.filter(id=job_uuid).first()
            except (ValueError, TypeError):
                job = Job.objects.filter(slug__iexact=str(job_id)).first() or Job.objects.filter(title__icontains=str(job_id)).first()

            if not job:
                job = Job.objects.filter(is_active=True).first()

            if not job:
                raise serializers.ValidationError({"job_id": "Target job not found."})

            application, _ = RecruiterJobApplication.objects.get_or_create(
                job=job,
                recruiter=user,
                defaults={
                    "status": ApplicationStatus.APPROVED,
                    "why_fit": "Direct candidate submission",
                },
            )
            if application.status != ApplicationStatus.APPROVED:
                application.status = ApplicationStatus.APPROVED
                application.save(update_fields=["status"])

        cand_obj = validated_data.get("candidate")
        cand_dict = self.initial_data.get("candidate")

        github_val = (
            validated_data.get("github_url")
            or self.initial_data.get("github_url")
            or validated_data.get("github")
            or self.initial_data.get("github")
            or ""
        )
        portfolio_val = (
            validated_data.get("portfolio_url")
            or self.initial_data.get("portfolio_url")
            or validated_data.get("portfolio")
            or self.initial_data.get("portfolio")
            or ""
        )
        visa_val = (
            validated_data.get("work_authorization_status")
            or self.initial_data.get("work_authorization_status")
            or validated_data.get("visa_status")
            or self.initial_data.get("visa_status")
            or validated_data.get("visa")
            or self.initial_data.get("visa")
            or "—"
        )
        curr_comp_val = (
            validated_data.get("current_salary")
            or self.initial_data.get("current_salary")
            or validated_data.get("current_compensation")
            or self.initial_data.get("current_compensation")
            or ""
        )
        comp_val = (
            validated_data.get("expected_salary")
            or self.initial_data.get("expected_salary")
            or validated_data.get("compensation")
            or self.initial_data.get("compensation")
            or validated_data.get("base_compensation_expectation")
            or self.initial_data.get("base_compensation_expectation")
            or curr_comp_val
            or ""
        )
        avail_val = (
            validated_data.get("availability")
            or self.initial_data.get("availability")
            or validated_data.get("notice_period")
            or self.initial_data.get("notice_period")
            or validated_data.get("earliest_start_date")
            or self.initial_data.get("earliest_start_date")
            or ""
        )

        if not cand_dict or not isinstance(cand_dict, dict):
            cand_dict = {
                "first_name": validated_data.get("first_name") or self.initial_data.get("first_name", "Candidate"),
                "last_name": validated_data.get("last_name") or self.initial_data.get("last_name", ""),
                "email": validated_data.get("email") or self.initial_data.get("email", ""),
                "phone": validated_data.get("phone") or self.initial_data.get("phone", ""),
                "current_title": validated_data.get("current_title") or self.initial_data.get("current_title", "—"),
                "current_company": validated_data.get("current_company") or self.initial_data.get("current_company", "—"),
                "current_location": validated_data.get("current_location") or self.initial_data.get("current_location", "—"),
                "linkedin_url": validated_data.get("linkedin_url") or self.initial_data.get("linkedin_url", ""),
                "github_url": github_val,
                "portfolio_url": portfolio_val,
                "work_authorization_status": visa_val,
                "compensation": comp_val,
                "current_compensation": curr_comp_val,
                "availability": avail_val,
                "notice_period": avail_val,
            }
        else:
            if github_val and not cand_dict.get("github_url"):
                cand_dict["github_url"] = github_val
            if portfolio_val and not cand_dict.get("portfolio_url"):
                cand_dict["portfolio_url"] = portfolio_val
            if visa_val and not cand_dict.get("work_authorization_status"):
                cand_dict["work_authorization_status"] = visa_val
            if comp_val and not cand_dict.get("compensation"):
                cand_dict["compensation"] = comp_val
            if curr_comp_val and not cand_dict.get("current_compensation"):
                cand_dict["current_compensation"] = curr_comp_val
            if avail_val and not cand_dict.get("availability"):
                cand_dict["availability"] = avail_val
                cand_dict["notice_period"] = avail_val

        if not isinstance(cand_obj, Candidate):
            candidate_email = cand_dict.get("email")
            existing_candidate = None
            if candidate_email:
                existing_candidate = Candidate.objects.filter(email__iexact=candidate_email).first()
            if existing_candidate:
                for k, v in cand_dict.items():
                    if v and hasattr(existing_candidate, k):
                        setattr(existing_candidate, k, v)
                existing_candidate.save()
                candidate = existing_candidate
            else:
                cand_serializer = CandidateSerializer(
                    data=cand_dict, context={"request": request}
                )
                cand_serializer.is_valid(raise_exception=True)
                candidate = cand_serializer.save(recruiter=user)
        else:
            candidate = cand_obj
            for k, v in cand_dict.items():
                if v and hasattr(candidate, k) and not getattr(candidate, k, None):
                    setattr(candidate, k, v)
            candidate.save()

        # Handle uploaded resume file
        resume_file = validated_data.get("resume")
        if not resume_file and request and hasattr(request, "FILES"):
            resume_file = (
                request.FILES.get("resume")
                or request.FILES.get("resumeFile")
                or request.FILES.get("file")
            )
        if resume_file:
            candidate.resume = resume_file
            candidate.save(update_fields=["resume"])

        answers = validated_data.get("answers", [])
        recruiter_notes = validated_data.get("recruiter_notes") or validated_data.get("notes") or self.initial_data.get("notes", "")

        return submit_candidate(
            application=application,
            candidate=candidate,
            answers=answers,
            recruiter_notes=recruiter_notes,
            user=user,
        )

    def to_representation(self, instance):
        return CandidateSubmissionSerializer(instance, context=self.context).data
