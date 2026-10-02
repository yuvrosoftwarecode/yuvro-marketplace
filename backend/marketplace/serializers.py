import uuid
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from marketplace.models import (
    Company,
    CompanyUserProfile,
    EmploymentType,
    Job,
    JobStatus,
    Recruiter,
    RecruiterApplication,
    RecruiterStatus,
    RecruiterType,
    WorkModel,
)

User = get_user_model()


class CompanySummarySerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for nested company representations in Job APIs.
    """

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "slug",
            "logo_url",
            "website",
            "industry",
            "company_size",
            "funding_stage",
            "founded_year",
            "headquarters",
            "overview",
            "why_company",
            "why_role",
            "leadership",
        ]
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        from core.storage import build_public_url

        if instance.logo and hasattr(instance.logo, "name") and instance.logo.name:
            url = build_public_url(instance.logo.name)
            if url:
                data["logo_url"] = url
        elif data.get("logo_url"):
            data["logo_url"] = build_public_url(data["logo_url"])
        return data


class CompanySerializer(serializers.ModelSerializer):
    """
    Full serializer for Company CRUD.
    """

    website = serializers.CharField(required=False, allow_blank=True, default="")
    logo_url = serializers.CharField(required=False, allow_blank=True, default="")
    logo = serializers.ImageField(required=False, allow_null=True)
    account_manager_email = serializers.EmailField(
        source="account_manager.email", read_only=True
    )
    company_manager = serializers.PrimaryKeyRelatedField(read_only=True)
    company_manager_detail = serializers.SerializerMethodField()
    manager_name = serializers.CharField(write_only=True, required=False, allow_blank=True, default="")
    manager_designation = serializers.CharField(write_only=True, required=False, allow_blank=True, default="")
    manager_email = serializers.EmailField(write_only=True, required=False, allow_blank=True, default="")
    manager_mobile = serializers.CharField(write_only=True, required=False, allow_blank=True, default="")
    jobs_count = serializers.SerializerMethodField()
    open_jobs_count = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "slug",
            "logo",
            "logo_url",
            "website",
            "company_size",
            "funding_stage",
            "founded_year",
            "industry",
            "headquarters",
            "overview",
            "why_company",
            "why_role",
            "leadership",
            "account_manager",
            "account_manager_email",
            "company_manager",
            "company_manager_detail",
            "manager_name",
            "manager_designation",
            "manager_email",
            "manager_mobile",
            "jobs_count",
            "open_jobs_count",
            "created_at",
            "updated_at",
            "is_active",
        ]
        read_only_fields = [
            "id",
            "slug",
            "account_manager",
            "account_manager_email",
            "company_manager",
            "company_manager_detail",
            "jobs_count",
            "open_jobs_count",
            "created_at",
            "updated_at",
        ]

    def get_company_manager_detail(self, obj):
        manager = obj.company_manager
        if not manager:
            return None
        profile = getattr(manager, "company_profile", None)
        return {
            "id": str(manager.id),
            "email": manager.email,
            "name": manager.full_name or f"{manager.first_name} {manager.last_name}".strip() or manager.email,
            "designation": profile.designation if profile else "",
            "mobile": manager.phone_number or (profile.phone_number if profile else ""),
        }

    def to_internal_value(self, data):
        # Support multipart form-data sending JSON string for structured fields
        if hasattr(data, "copy"):
            data = data.copy()
        for field in ("why_company", "leadership"):
            val = data.get(field)
            if isinstance(val, str) and val.strip().startswith(("[", "{")):
                try:
                    import json

                    data[field] = json.loads(val)
                except Exception:
                    pass
        return super().to_internal_value(data)

    def create(self, validated_data):
        validated_data.pop("manager_name", None)
        validated_data.pop("manager_designation", None)
        validated_data.pop("manager_email", None)
        validated_data.pop("manager_mobile", None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("manager_name", None)
        validated_data.pop("manager_designation", None)
        validated_data.pop("manager_email", None)
        validated_data.pop("manager_mobile", None)
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        from core.storage import build_public_url

        if instance.logo and hasattr(instance.logo, "name") and instance.logo.name:
            url = build_public_url(instance.logo.name)
            if url:
                data["logo_url"] = url
                data["logo"] = url
        elif data.get("logo_url"):
            data["logo_url"] = build_public_url(data["logo_url"])
        return data

    def get_jobs_count(self, obj) -> int:
        request = self.context.get("request")
        user = getattr(request, "user", None)
        is_am_or_admin = (
            user
            and user.is_authenticated
            and (
                user.is_staff
                or getattr(user, "is_admin_user", False)
                or getattr(user, "is_account_manager", False)
                or getattr(user, "role", "") in ["admin", "recruiter_account_manager"]
            )
        )
        if not is_am_or_admin:
            return obj.jobs.exclude(status=JobStatus.DRAFT).count()
        return obj.jobs.count()

    def get_open_jobs_count(self, obj) -> int:
        return obj.jobs.filter(status__in=[JobStatus.ACTIVE, JobStatus.HIRING]).count()

    def validate_website(self, value):
        if not value:
            return ""
        val = value.strip()
        if val and not (val.startswith("http://") or val.startswith("https://")):
            val = f"https://{val}"
        from django.core.exceptions import ValidationError as DjangoValidationError
        from django.core.validators import URLValidator

        validator = URLValidator()
        try:
            validator(val)
        except DjangoValidationError:
            raise serializers.ValidationError("Enter a valid URL.")
        return val

    def validate_logo_url(self, value):
        if not value:
            return ""
        val = value.strip()
        if val and not (
            val.startswith("http://")
            or val.startswith("https://")
            or val.startswith("/")
            or val.startswith("data:")
        ):
            val = f"https://{val}"
        return val

    def validate_founded_year(self, value):
        if value is not None:
            current_year = timezone.now().year
            if value < 1800 or value > current_year + 1:
                raise serializers.ValidationError(
                    f"Founded year must be between 1800 and {current_year + 1}."
                )
        return value

    def validate_why_company(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError(
                "why_company must be a list of highlight items."
            )
        for idx, item in enumerate(value):
            if not isinstance(item, dict):
                raise serializers.ValidationError(
                    f"Item at index {idx} in why_company must be an object with 'title' and 'description'."
                )
            if "title" not in item:
                raise serializers.ValidationError(
                    f"Item at index {idx} in why_company is missing 'title'."
                )
        return value

    def validate_leadership(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError(
                "leadership must be a list of leader items."
            )
        for idx, item in enumerate(value):
            if not isinstance(item, dict):
                raise serializers.ValidationError(
                    f"Item at index {idx} in leadership must be an object with 'name' and 'title'."
                )
            if "name" not in item or "title" not in item:
                raise serializers.ValidationError(
                    f"Item at index {idx} in leadership is missing 'name' or 'title'."
                )
            if "linkedin_url" in item and item["linkedin_url"]:
                l_url = str(item["linkedin_url"]).strip()
                if l_url and not (
                    l_url.startswith("http://") or l_url.startswith("https://")
                ):
                    item["linkedin_url"] = f"https://{l_url}"
        return value


class CompanyUserProfileSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    user_id = serializers.UUIDField(source="user.id", read_only=True)

    class Meta:
        model = CompanyUserProfile
        fields = [
            "id",
            "user_id",
            "user_email",
            "user_name",
            "company",
            "designation",
            "department",
            "phone_number",
            "is_primary_contact",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class JobSerializer(serializers.ModelSerializer):
    """
    Main serializer for Job CRUD with nested company details and calculated bounty blocks.
    """

    company_id = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(), source="company", write_only=True
    )
    company = CompanySummarySerializer(read_only=True)

    # Calculated read-only properties
    recruiter_percentage = serializers.DecimalField(
        max_digits=5, decimal_places=2, read_only=True
    )
    recruiter_bounty_min = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    recruiter_bounty_max = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    created_by_detail = serializers.SerializerMethodField(read_only=True)

    def get_created_by_detail(self, obj):
        user = obj.created_by
        if not user:
            # Fallback if created_by wasn't set on legacy jobs
            if obj.company and obj.company.company_manager:
                user = obj.company.company_manager
            elif obj.company and obj.company.account_manager:
                user = obj.company.account_manager
        if not user:
            return None
        full_name = (
            getattr(user, "full_name", "")
            or f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
            or getattr(user, "username", "")
            or user.email
        )
        role = getattr(user, "role", "")
        return {
            "id": str(user.id),
            "email": user.email,
            "name": full_name,
            "role": role,
            "is_company_manager": role == "recruiter_company_manager" or hasattr(user, "company_profile"),
            "is_account_manager": role in ["recruiter_account_manager", "admin"] or getattr(user, "is_staff", False),
        }

    class Meta:
        model = Job
        fields = [
            "id",
            "company",
            "company_id",
            "created_by",
            "created_by_detail",
            "title",
            "slug",
            "status",
            "location",
            "employment_type",
            "work_model",
            "experience",
            "open_roles",
            "recruiter_slots",
            "posted_at",
            "job_description",
            "salary_min",
            "salary_max",
            "salary_currency",
            "equity_min",
            "equity_max",
            "visa_sponsorship",
            "benefits_and_perks",
            "company_to_yuvro_percentage",
            "yuvro_commission_percentage",
            "recruiter_percentage",
            "recruiter_bounty_min",
            "recruiter_bounty_max",
            "payout_terms",
            "candidate_questions",
            "must_haves",
            "signals",
            "hiring_process",
            "target_companies",
            "created_at",
            "updated_at",
            "is_active",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "created_by_detail",
            "slug",
            "posted_at",
            "recruiter_percentage",
            "recruiter_bounty_min",
            "recruiter_bounty_max",
            "created_at",
            "updated_at",
        ]

    def validate_target_companies(self, value):
        if value is None:
            return []
        if isinstance(value, str):
            return [c.strip() for c in value.split(",") if c.strip()]
        if not isinstance(value, list):
            raise serializers.ValidationError(
                "target_companies must be a list of company names."
            )
        return [str(c).strip() for c in value if str(c).strip()]

    def validate_salary_min(self, value):
        if value is not None and value < Decimal("0.00"):
            raise serializers.ValidationError("salary_min cannot be negative.")
        return value

    def validate_salary_max(self, value):
        if value is not None and value < Decimal("0.00"):
            raise serializers.ValidationError("salary_max cannot be negative.")
        return value

    def validate_company_to_yuvro_percentage(self, value):
        if value is not None and value < Decimal("0.00"):
            raise serializers.ValidationError(
                "company_to_yuvro_percentage cannot be negative."
            )
        return value

    def validate_yuvro_commission_percentage(self, value):
        if value is not None and value < Decimal("0.00"):
            raise serializers.ValidationError(
                "yuvro_commission_percentage cannot be negative."
            )
        return value

    def validate_payout_terms(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError(
                "payout_terms must be a list of integers (e.g. [30, 60, 90])."
            )
        if not all(isinstance(x, int) and not isinstance(x, bool) for x in value):
            raise serializers.ValidationError(
                "All items in payout_terms must be integers."
            )
        if any(x <= 0 for x in value):
            raise serializers.ValidationError(
                "All payout terms milestones must be positive integers."
            )
        # Validate strictly ascending order without duplicates
        if value != sorted(set(value)):
            raise serializers.ValidationError(
                "payout_terms must be strictly ascending with no duplicate milestones (e.g. [30, 60, 90])."
            )
        return value

    def validate_candidate_questions(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError(
                "candidate_questions must be a list of question definitions."
            )
        for idx, item in enumerate(value):
            if not isinstance(item, dict):
                raise serializers.ValidationError(
                    f"Question at index {idx} must be a dictionary object."
                )
            if "question" not in item and "q" not in item:
                raise serializers.ValidationError(
                    f"Question at index {idx} must have a 'question' or 'q' field."
                )
            if "required" in item and not isinstance(item["required"], bool):
                raise serializers.ValidationError(
                    f"'required' flag at index {idx} must be a boolean."
                )
        return value

    def validate_must_haves(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError(
                "must_haves must be a list of requirement strings."
            )
        if not all(isinstance(x, str) for x in value):
            raise serializers.ValidationError(
                "All items in must_haves must be strings."
            )
        return value

    def validate_signals(self, value):
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("signals must be an object.")
        # Ensure values for keys like green/green_flags and red/red_flags are lists
        for k, v in value.items():
            if not isinstance(v, list):
                raise serializers.ValidationError(
                    f"Signal category '{k}' must contain a list of strings."
                )
            if not all(isinstance(s, str) for s in v):
                raise serializers.ValidationError(
                    f"All items under signal category '{k}' must be strings."
                )
        return value

    def validate(self, attrs):
        # Salary Range Check
        sal_min = attrs.get(
            "salary_min", getattr(self.instance, "salary_min", Decimal("0.00"))
        )
        sal_max = attrs.get(
            "salary_max", getattr(self.instance, "salary_max", Decimal("0.00"))
        )
        if sal_min is not None and sal_max is not None and sal_min > sal_max:
            raise serializers.ValidationError(
                {"salary_min": "salary_min cannot be greater than salary_max."}
            )

        # Bounty Percentage Check
        comp_pct = attrs.get(
            "company_to_yuvro_percentage",
            getattr(self.instance, "company_to_yuvro_percentage", Decimal("0.00")),
        )
        yuvro_pct = attrs.get(
            "yuvro_commission_percentage",
            getattr(self.instance, "yuvro_commission_percentage", Decimal("0.00")),
        )
        if comp_pct is not None and yuvro_pct is not None and yuvro_pct > comp_pct:
            raise serializers.ValidationError(
                {
                    "yuvro_commission_percentage": (
                        "Yuvro commission percentage cannot exceed company fee percentage."
                    )
                }
            )

        # Equity Range Check if supplied
        eq_min = attrs.get("equity_min", getattr(self.instance, "equity_min", None))
        eq_max = attrs.get("equity_max", getattr(self.instance, "equity_max", None))
        if eq_min is not None and eq_max is not None and eq_min > eq_max:
            raise serializers.ValidationError(
                {"equity_min": "equity_min cannot be greater than equity_max."}
            )

        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Expose structured salary and bounty helper blocks for convenience
        data["salary"] = {
            "min": (
                float(instance.salary_min) if instance.salary_min is not None else 0.0
            ),
            "max": (
                float(instance.salary_max) if instance.salary_max is not None else 0.0
            ),
            "currency": instance.salary_currency,
        }
        data["bounty"] = {
            "company_to_yuvro_percentage": float(instance.company_to_yuvro_percentage),
            "yuvro_commission_percentage": float(instance.yuvro_commission_percentage),
            "recruiter_percentage": float(instance.recruiter_percentage),
            "min": float(instance.recruiter_bounty_min),
            "max": float(instance.recruiter_bounty_max),
            "currency": instance.salary_currency,
        }

        # Recruiter application relationship
        request = self.context.get("request")
        if request and getattr(request, "user", None) and request.user.is_authenticated:
            try:
                from recruiting.models import RecruiterJobApplication

                app = getattr(instance, "_user_recruiter_app", None)
                if app is None:
                    app = (
                        RecruiterJobApplication.objects.filter(
                            recruiter=request.user, job=instance
                        )
                        .only(
                            "id",
                            "status",
                            "why_fit",
                            "rejection_reason",
                            "reviewed_at",
                        )
                        .first()
                    )

                if app:
                    data["recruiter_application"] = {
                        "applied": True,
                        "status": app.status,
                        "application_id": str(app.id),
                        "rejection_reason": app.rejection_reason or None,
                        "why_fit": app.why_fit,
                        "reviewed_at": (
                            app.reviewed_at.isoformat() if app.reviewed_at else None
                        ),
                    }
                else:
                    data["recruiter_application"] = {
                        "applied": False,
                        "status": None,
                        "application_id": None,
                        "rejection_reason": None,
                    }
            except Exception:
                data["recruiter_application"] = {
                    "applied": False,
                    "status": None,
                    "application_id": None,
                    "rejection_reason": None,
                }

        return data


class RecruiterSummarySerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for nested recruiter representations.
    """

    class Meta:
        model = Recruiter
        fields = [
            "id",
            "name",
            "slug",
            "email",
            "type",
            "agency",
            "location",
            "status",
            "quality_score",
            "response_rate",
        ]
        read_only_fields = fields


class RecruiterSerializer(serializers.ModelSerializer):
    """
    Full serializer for Recruiter CRUD.
    """

    account_manager_email = serializers.EmailField(
        source="account_manager.email", read_only=True
    )
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    verified_count = serializers.SerializerMethodField()

    class Meta:
        model = Recruiter
        fields = [
            "id",
            "name",
            "slug",
            "email",
            "phone",
            "location",
            "linkedin",
            "website",
            "type",
            "agency",
            "experience",
            "status",
            "specializations",
            "markets",
            "response_rate",
            "quality_score",
            "verification",
            "interview_stats",
            "am_rejection_reasons",
            "company_rejection_reasons",
            "created_by",
            "account_manager",
            "account_manager_email",
            "user",
            "user_id",
            "verified_count",
            "created_at",
            "updated_at",
            "is_active",
        ]
        read_only_fields = [
            "id",
            "slug",
            "account_manager",
            "account_manager_email",
            "user",
            "user_id",
            "verified_count",
            "created_at",
            "updated_at",
        ]

    def get_verified_count(self, obj) -> int:
        if isinstance(obj.verification, dict):
            return sum(1 for v in obj.verification.values() if v is True)
        return 0

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Recruiter name is required.")
        return value.strip()

    def validate_email(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Recruiter email is required.")
        return value.strip().lower()

    def validate_specializations(self, value):
        if value is None:
            return []
        if isinstance(value, str):
            return [s.strip() for s in value.split(",") if s.strip()]
        if not isinstance(value, list):
            raise serializers.ValidationError("Specializations must be a list of tags.")
        return [str(s).strip() for s in value if str(s).strip()]

    def validate_markets(self, value):
        if value is None:
            return []
        if isinstance(value, str):
            return [m.strip() for m in value.split(",") if m.strip()]
        if not isinstance(value, list):
            raise serializers.ValidationError(
                "Markets must be a list of region strings."
            )
        return [str(m).strip() for m in value if str(m).strip()]

    def validate_verification(self, value):
        default_v = {
            "identity": False,
            "agency": False,
            "payment": False,
            "tax": False,
            "agreement": False,
        }
        if not value or not isinstance(value, dict):
            return default_v
        for k in default_v:
            if k in value:
                default_v[k] = bool(value[k])
        return default_v

    def validate_interview_stats(self, value):
        default_stats = {
            "scheduled": 0,
            "completed": 0,
            "technical": 0,
            "hiringManager": 0,
            "final": 0,
            "noShows": 0,
            "cancelled": 0,
            "rescheduled": 0,
        }
        if not value or not isinstance(value, dict):
            return default_stats
        for k in default_stats:
            if k in value:
                try:
                    default_stats[k] = int(value[k])
                except (ValueError, TypeError):
                    default_stats[k] = 0
        return default_stats

    def create(self, validated_data):
        email = validated_data.get("email", "").strip().lower()
        name = validated_data.get("name", "").strip()
        password = self.initial_data.get("password") or validated_data.pop("password", None)

        # Link or create recruiter_freelancer User
        user = validated_data.get("user")
        if not user and email:
            existing_user = User.objects.filter(email__iexact=email).first()
            if existing_user:
                if (
                    existing_user.role != User.Role.RECRUITER_FREELANCER
                    and not existing_user.is_staff
                ):
                    existing_user.role = User.Role.RECRUITER_FREELANCER
                    existing_user.save(update_fields=["role"])
                if password:
                    existing_user.set_password(password)
                    existing_user.save()
                user = existing_user
            else:
                user = User.objects.create_user(
                    email=email,
                    full_name=name,
                    role=User.Role.RECRUITER_FREELANCER,
                    is_active=True,
                )
                if password:
                    user.set_password(password)
                    user.save()
            validated_data["user"] = user

        # Check if Recruiter profile already exists for user or email (e.g. created by post_save signal or pre-existing)
        existing_recruiter = None
        if user:
            existing_recruiter = Recruiter.objects.filter(user=user).first()
        if not existing_recruiter and email:
            existing_recruiter = Recruiter.objects.filter(email__iexact=email).first()

        if existing_recruiter:
            return super().update(existing_recruiter, validated_data)

        return super().create(validated_data)


class RecruiterApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecruiterApplication
        fields = [
            "id",
            "user",
            "name",
            "email",
            "phone",
            "linkedin",
            "experience_years",
            "top_roles",
            "early_stage_startup_hiring",
            "startup_hiring_detail",
            "hiring_geography",
            "sourcing_tools",
            "hiring_references",
            "status",
            "decision_notes",
            "reviewed_by",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "reviewed_by",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]

    def validate_hiring_references(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Hiring references must be a list of LinkedIn URLs.")

        import re

        linkedin_pattern = re.compile(
            r"^(?:https?:\/\/)?(?:[a-z]{2,3}\.)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_\-%]+)",
            re.IGNORECASE,
        )

        cleaned_refs = []
        seen_handles = {}

        for idx, ref in enumerate(value):
            if not isinstance(ref, str):
                continue
            trimmed = ref.strip()
            if not trimmed:
                continue

            match = linkedin_pattern.match(trimmed)
            if not match:
                raise serializers.ValidationError(
                    f"'{trimmed}' is not a valid LinkedIn profile URL. Only LinkedIn profile links (e.g. https://www.linkedin.com/in/username) are accepted."
                )

            handle = match.group(1).lower().rstrip("/")
            if handle in seen_handles:
                raise serializers.ValidationError(
                    f"Duplicate references are not allowed: candidate profile '{trimmed}' was already entered as Candidate {seen_handles[handle] + 1}."
                )

            seen_handles[handle] = idx
            cleaned_refs.append(trimmed)

        if len(cleaned_refs) < 2:
            raise serializers.ValidationError(
                "At least 2 distinct candidate LinkedIn references are required."
            )

        return cleaned_refs

    def validate(self, attrs):
        attrs = super().validate(attrs)
        recruiter_linkedin = attrs.get("linkedin") or ""
        hiring_refs = attrs.get("hiring_references") or []

        if recruiter_linkedin and hiring_refs:
            import re

            linkedin_pattern = re.compile(
                r"^(?:https?:\/\/)?(?:[a-z]{2,3}\.)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_\-%]+)",
                re.IGNORECASE,
            )
            rec_match = linkedin_pattern.match(recruiter_linkedin.strip())
            if rec_match:
                rec_handle = rec_match.group(1).lower().rstrip("/")
                for ref in hiring_refs:
                    ref_match = linkedin_pattern.match(ref.strip())
                    if ref_match and ref_match.group(1).lower().rstrip("/") == rec_handle:
                        raise serializers.ValidationError(
                            {
                                "hiring_references": "A candidate reference cannot be your own LinkedIn profile. Please provide profiles of candidates you helped hire."
                            }
                        )

        return attrs

