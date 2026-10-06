import logging
import os
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.utils import timezone

logger = logging.getLogger(__name__)

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from marketplace.filters import CompanyFilter, JobFilter, RecruiterFilter
from marketplace.models import (
    Company,
    CompanyUserProfile,
    Job,
    JobStatus,
    Recruiter,
    RecruiterApplication,
    RecruiterStatus,
    RecruiterType,
)
from marketplace.permissions import (
    IsAccountManagerOrReadOnly,
    IsCompanyOwnerOrAdmin,
    IsJobOwnerOrAdmin,
)
from marketplace.serializers import (
    CompanySerializer,
    JobSerializer,
    RecruiterApplicationSerializer,
    RecruiterSerializer,
)


class CompanyViewSet(viewsets.ModelViewSet):
    """
    CRUD viewset for Companies in Yuvro Marketplace.
    """

    queryset = (
        Company.objects.select_related("account_manager").prefetch_related("jobs").all()
    )
    serializer_class = CompanySerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [IsAccountManagerOrReadOnly, IsCompanyOwnerOrAdmin]
    filterset_class = CompanyFilter
    search_fields = ["name", "industry", "headquarters"]
    ordering_fields = ["name", "created_at", "updated_at", "status"]
    ordering = ["-created_at"]

    def get_object(self):
        lookup_val = self.kwargs.get(self.lookup_field or "pk")
        try:
            import uuid

            uuid.UUID(str(lookup_val))
            return super().get_object()
        except (ValueError, TypeError, AttributeError):
            from django.db.models import Q
            from django.http import Http404

            obj = (
                self.get_queryset()
                .filter(Q(slug__iexact=lookup_val) | Q(name__iexact=lookup_val))
                .first()
            )
            if obj is None and "-" in str(lookup_val):
                suffix = str(lookup_val).rsplit("-", 1)[-1]
                if len(suffix) >= 4:
                    obj = self.get_queryset().filter(id__istartswith=suffix).first()
            if obj is None:
                raise Http404("No Company matches the given query.")
            self.check_object_permissions(self.request, obj)
            return obj

    def perform_create(self, serializer):
        user = self.request.user
        extra_kwargs = {}
        if user and user.is_authenticated:
            extra_kwargs["account_manager"] = user
        if "logo" in self.request.FILES:
            extra_kwargs["logo"] = self.request.FILES["logo"]
        company = serializer.save(**extra_kwargs)

        # Onboard Company Manager if manager details are provided
        manager_name = (
            self.request.data.get("manager_name")
            or self.request.data.get("managerName")
            or ""
        ).strip()
        manager_designation = (
            self.request.data.get("manager_designation")
            or self.request.data.get("managerDesignation")
            or ""
        ).strip()
        manager_email = (
            self.request.data.get("manager_email")
            or self.request.data.get("managerEmail")
            or ""
        ).strip().lower()
        manager_mobile = (
            self.request.data.get("manager_mobile")
            or self.request.data.get("managerMobile")
            or self.request.data.get("managerPhone")
            or ""
        ).strip()

        if manager_email:
            import secrets
            import string
            from django.conf import settings
            import requests

            alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
            temp_pw = (
                secrets.choice(string.ascii_uppercase)
                + secrets.choice(string.ascii_lowercase)
                + secrets.choice(string.digits)
                + secrets.choice("!@#$%^&*")
                + "".join(secrets.choice(alphabet) for _ in range(6))
            )

            # Compute candidate username
            User = get_user_model()
            manager_user = User.objects.filter(email__iexact=manager_email).first()
            first_name = manager_name.split()[0] if manager_name else ""
            last_name = (
                " ".join(manager_name.split()[1:])
                if len(manager_name.split()) > 1
                else ""
            )

            if manager_user:
                candidate_username = manager_user.username
            else:
                base_username = manager_email.split("@")[0][:100]
                candidate_username = base_username
                counter = 1
                while User.objects.filter(username__iexact=candidate_username).exists():
                    candidate_username = f"{base_username}_{counter}"
                    counter += 1

            # Register on YHub
            yhub_base_url = getattr(
                settings,
                "YHUB_BACKEND_API_BASE_URL",
                "https://backend-hub-dev.yuvro.ai/api",
            ).rstrip("/")
            yhub_user_id = None
            try:
                yhub_payload = {
                    "username": candidate_username,
                    "email": manager_email,
                    "password": temp_pw,
                    "password_confirm": temp_pw,
                    "first_name": first_name,
                    "last_name": last_name,
                    "role": "recruiter_company_manager",
                    "roles": {
                        "marketplace": "recruiter_company_manager",
                        "company_name": company.name,
                    },
                }
                res = requests.post(
                    f"{yhub_base_url}/auth/register/?product=marketplace",
                    json=yhub_payload,
                    timeout=8,
                )
                if res.status_code in (200, 201):
                    res_data = res.json() if res.content else {}
                    yhub_user_id = res_data.get("user", {}).get("id")
                else:
                    logger.warning(
                        f"[CompanyViewSet] YHub registration returned {res.status_code}: {res.text}"
                    )
            except Exception as yhub_exc:
                logger.warning(
                    f"[CompanyViewSet] Could not register manager {manager_email} on YHub: {yhub_exc}"
                )

            # Provision / Update local User
            if not manager_user:
                manager_user = User.objects.create_user(
                    email=manager_email,
                    username=candidate_username,
                    password=temp_pw,
                    first_name=first_name,
                    last_name=last_name,
                    full_name=manager_name,
                    role=User.Role.RECRUITER_COMPANY_MANAGER,
                    phone_number=manager_mobile,
                    is_active=True,
                    is_temp_pw=True,
                )
            else:
                manager_user.role = User.Role.RECRUITER_COMPANY_MANAGER
                manager_user.set_password(temp_pw)
                manager_user.is_temp_pw = True
                if manager_name:
                    manager_user.full_name = manager_name
                    manager_user.first_name = first_name
                    manager_user.last_name = last_name
                if manager_mobile:
                    manager_user.phone_number = manager_mobile
                manager_user.save()

            # Create / Update CompanyUserProfile
            from marketplace.models import CompanyUserProfile

            profile, _ = CompanyUserProfile.objects.get_or_create(
                user=manager_user,
                defaults={
                    "company": company,
                    "designation": manager_designation,
                    "phone_number": manager_mobile,
                    "is_primary_contact": True,
                },
            )
            profile.company = company
            profile.designation = manager_designation
            profile.phone_number = manager_mobile
            profile.is_primary_contact = True
            profile.save()

            # Link company manager
            company.company_manager = manager_user
            company.save(update_fields=["company_manager"])

            # Send welcome email with temp password and login link
            try:
                from core.emails import send_company_manager_welcome_email

                send_company_manager_welcome_email(
                    email=manager_email,
                    name=manager_name,
                    temp_password=temp_pw,
                    company_name=company.name,
                    designation=manager_designation,
                )
            except Exception as mail_exc:
                logger.exception(
                    f"[CompanyViewSet] Failed to send welcome email to {manager_email}: {mail_exc}"
                )

    def perform_update(self, serializer):
        company = serializer.save()
        manager_name = (
            self.request.data.get("manager_name")
            or self.request.data.get("managerName")
        )
        manager_designation = (
            self.request.data.get("manager_designation")
            or self.request.data.get("managerDesignation")
        )
        manager_mobile = (
            self.request.data.get("manager_mobile")
            or self.request.data.get("managerMobile")
            or self.request.data.get("managerPhone")
        )
        manager = company.company_manager
        if manager and (manager_name or manager_designation or manager_mobile):
            profile, _ = CompanyUserProfile.objects.get_or_create(
                user=manager,
                defaults={"company": company, "is_primary_contact": True},
            )
            if manager_designation is not None:
                profile.designation = manager_designation
            if manager_mobile is not None:
                profile.phone_number = manager_mobile
                manager.phone_number = manager_mobile
            profile.save()

            if manager_name:
                manager.full_name = manager_name
                parts = manager_name.strip().split(None, 1)
                manager.first_name = parts[0]
                manager.last_name = parts[1] if len(parts) > 1 else ""
            manager.save()

    @action(
        detail=False,
        methods=["get", "put", "patch"],
        url_path="my",
        permission_classes=[permissions.IsAuthenticated],
    )
    def my_company(self, request):
        user = request.user
        company = None

        # 1. Linked via CompanyUserProfile
        if hasattr(user, "company_profile") and user.company_profile.company:
            company = user.company_profile.company

        # 2. Managed company accounts
        if not company:
            company = Company.objects.filter(company_manager=user).first()

        # 3. User roles company_name
        if not company and user.roles and isinstance(user.roles, dict):
            comp_name = user.roles.get("company_name")
            if comp_name:
                company = Company.objects.filter(name__iexact=comp_name).first()

        # 4. If account manager or admin, allow query param company_id
        if not company and (user.is_staff or getattr(user, "is_admin_user", False) or getattr(user, "role", "") in ["admin", "recruiter_account_manager"]):
            company_id = request.query_params.get("company_id")
            if company_id:
                company = Company.objects.filter(id=company_id).first()
            if not company:
                company = Company.objects.first()

        # 5. Fallback
        if not company:
            company = Company.objects.first()

        if not company:
            return Response(
                {"error": "No company associated with this account."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.method == "GET":
            serializer = self.get_serializer(company)
            return Response(serializer.data)

        # PUT or PATCH
        partial = (request.method == "PATCH")
        serializer = self.get_serializer(company, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated_company = serializer.save()

        # Also update manager fields if provided
        mgr_data = request.data.get("company_manager_detail") or {}
        mgr_name = request.data.get("manager_name") or mgr_data.get("name")
        mgr_designation = request.data.get("manager_designation") or mgr_data.get("designation")
        mgr_mobile = request.data.get("manager_mobile") or mgr_data.get("mobile")

        manager = updated_company.company_manager or (getattr(user, "company_profile", None) and user)
        if manager and (mgr_name or mgr_designation or mgr_mobile):
            profile, _ = CompanyUserProfile.objects.get_or_create(
                user=manager,
                defaults={"company": updated_company, "is_primary_contact": True},
            )
            if mgr_designation is not None:
                profile.designation = mgr_designation
            if mgr_mobile is not None:
                profile.phone_number = mgr_mobile
                manager.phone_number = mgr_mobile
            profile.save()

            if mgr_name:
                manager.full_name = mgr_name
                parts = mgr_name.strip().split(None, 1)
                manager.first_name = parts[0]
                manager.last_name = parts[1] if len(parts) > 1 else ""
            manager.save()

        return Response(self.get_serializer(updated_company).data)

    @action(
        detail=False,
        methods=["post"],
        url_path="upload-logo",
        parser_classes=[MultiPartParser, FormParser],
        permission_classes=[IsAccountManagerOrReadOnly],
    )
    def upload_logo(self, request):
        logo_file = (
            request.FILES.get("logo")
            or request.FILES.get("file")
            or request.FILES.get("image")
        )
        if not logo_file:
            return Response(
                {"error": "No image file provided in request. Use 'logo' or 'file' key."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        max_size = 5 * 1024 * 1024
        if logo_file.size > max_size:
            return Response(
                {"error": "File size exceeds 5MB limit."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_extensions = {".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"}
        name, raw_ext = os.path.splitext(logo_file.name)
        ext = raw_ext.lower()
        if ext not in allowed_extensions:
            return Response(
                {
                    "error": f"Unsupported file type '{raw_ext}'. Allowed types: {', '.join(allowed_extensions)}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        import uuid
        from django.utils.text import slugify
        from core.storage import upload_image, build_public_url

        safe_name = slugify(name)[:50] or "logo"
        storage_key = f"companies/logos/{uuid.uuid4().hex[:12]}_{safe_name}{ext}"

        saved_name = upload_image(key=storage_key, file_obj=logo_file)
        public_url = build_public_url(saved_name)

        return Response(
            {
                "url": public_url,
                "key": saved_name,
                "filename": logo_file.name,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="upload-logo",
        parser_classes=[MultiPartParser, FormParser],
        permission_classes=[IsAccountManagerOrReadOnly, IsCompanyOwnerOrAdmin],
    )
    def upload_company_logo(self, request, pk=None):
        company = self.get_object()
        logo_file = (
            request.FILES.get("logo")
            or request.FILES.get("file")
            or request.FILES.get("image")
        )
        if not logo_file:
            return Response(
                {"error": "No image file provided in request. Use 'logo' or 'file' key."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        max_size = 5 * 1024 * 1024
        if logo_file.size > max_size:
            return Response(
                {"error": "File size exceeds 5MB limit."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_extensions = {".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"}
        name, raw_ext = os.path.splitext(logo_file.name)
        ext = raw_ext.lower()
        if ext not in allowed_extensions:
            return Response(
                {
                    "error": f"Unsupported file type '{raw_ext}'. Allowed types: {', '.join(allowed_extensions)}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        company.logo = logo_file
        company.save()
        from core.storage import build_public_url

        public_url = build_public_url(company.logo.name)

        return Response(
            {
                "url": public_url,
                "key": company.logo.name,
                "company_id": str(company.id),
            },
            status=status.HTTP_200_OK,
        )


class JobViewSet(viewsets.ModelViewSet):
    """
    CRUD viewset for Jobs in Yuvro Marketplace.
    """

    queryset = Job.objects.select_related("company", "company__account_manager", "created_by").all()
    serializer_class = JobSerializer
    permission_classes = [IsAccountManagerOrReadOnly, IsJobOwnerOrAdmin]
    filterset_class = JobFilter
    search_fields = ["title", "job_description", "location", "company__name"]
    ordering_fields = [
        "created_at",
        "updated_at",
        "posted_at",
        "salary_min",
        "salary_max",
        "title",
    ]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = Job.objects.select_related("company", "company__account_manager").all()

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

        is_company_user = (
            user
            and user.is_authenticated
            and (
                hasattr(user, "company_profile")
                or Company.objects.filter(company_manager=user).exists()
                or getattr(user, "role", "") == "recruiter_company_manager"
            )
        )

        if is_company_user and not is_am_or_admin:
            company_ids = []
            if hasattr(user, "company_profile") and user.company_profile:
                company_ids.append(user.company_profile.company_id)
            comp_managed = Company.objects.filter(company_manager=user).values_list(
                "id", flat=True
            )
            company_ids.extend(list(comp_managed))
            qs = qs.filter(company_id__in=company_ids)

        if not is_am_or_admin and not is_company_user:
            qs = qs.exclude(status__in=[JobStatus.DRAFT, JobStatus.PENDING_APPROVAL])

        return qs

    def get_object(self):
        lookup_val = self.kwargs.get(self.lookup_field or "pk")
        try:
            import uuid

            uuid.UUID(str(lookup_val))
            return super().get_object()
        except (ValueError, TypeError, AttributeError):
            from django.db.models import Q
            from django.http import Http404

            obj = (
                self.get_queryset()
                .filter(Q(slug__iexact=lookup_val) | Q(title__iexact=lookup_val))
                .first()
            )
            if obj is None and "-" in str(lookup_val):
                suffix = str(lookup_val).rsplit("-", 1)[-1]
                if len(suffix) >= 4:
                    obj = self.get_queryset().filter(id__istartswith=suffix).first()

            if obj is None and "-" in str(lookup_val):
                prefix = str(lookup_val).rsplit("-", 1)[0].replace("-", " ")
                obj = self.get_queryset().filter(title__iexact=prefix).first()

            if obj is None:
                raise Http404("No Job matches the given query.")
            self.check_object_permissions(self.request, obj)
            return obj

    def perform_create(self, serializer):
        company = serializer.validated_data.get("company")
        user = self.request.user

        is_company_manager = (
            company
            and (
                company.company_manager == user
                or (hasattr(user, "company_profile") and user.company_profile.company_id == company.id)
            )
        )

        # Prevent Account Manager from creating jobs under companies they do not manage (unless admin or company manager)
        if not is_company_manager and company and company.account_manager and company.account_manager != user:
            if not (user.is_staff or getattr(user, "is_admin_user", False)):
                raise PermissionDenied(
                    "You can only create jobs for companies you manage."
                )

        if is_company_manager:
            req_status = serializer.validated_data.get("status")
            if req_status != JobStatus.DRAFT:
                serializer.validated_data["status"] = JobStatus.PENDING_APPROVAL

        if user and user.is_authenticated:
            job = serializer.save(created_by=user)
        else:
            job = serializer.save()

        # Trigger in-app notification and emails to all AMs and rohith@yuvro.ai
        is_am_user = (
            user
            and user.is_authenticated
            and (
                user.is_staff
                or getattr(user, "is_admin_user", False)
                or getattr(user, "is_account_manager", False)
                or getattr(user, "role", "") in ["admin", "recruiter_account_manager"]
            )
        )
        is_company_added = (
            is_company_manager
            or (
                user
                and user.is_authenticated
                and (
                    hasattr(user, "company_profile")
                    or getattr(user, "role", "") == "recruiter_company_manager"
                    or (company and company.company_manager == user)
                )
            )
            or not is_am_user
        )

        if is_company_added:
            try:
                from core.notifications import notify_ams_company_job_added
                from core.emails import send_company_job_added_email

                notify_ams_company_job_added(job)
                send_company_job_added_email(job)
            except Exception as e:
                logger.warning(f"Failed to dispatch company job added notifications: {e}")

    def perform_update(self, serializer):
        old_status = self.get_object().status
        job = serializer.save()
        new_status = job.status
        user = self.request.user

        is_am_user = (
            user
            and user.is_authenticated
            and (
                user.is_staff
                or getattr(user, "is_admin_user", False)
                or getattr(user, "is_account_manager", False)
                or getattr(user, "role", "") in ["admin", "recruiter_account_manager"]
            )
        )
        # If draft job transitions to pending_approval or active by company user
        if not is_am_user and old_status == JobStatus.DRAFT and new_status != JobStatus.DRAFT:
            try:
                from core.notifications import notify_ams_company_job_added
                from core.emails import send_company_job_added_email

                notify_ams_company_job_added(job)
                send_company_job_added_email(job)
            except Exception as e:
                logger.warning(f"Failed to dispatch company job added notifications on update: {e}")

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        job = self.get_object()
        user = request.user
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
            return Response(
                {"error": "Only Account Managers or Admins can approve jobs."},
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data or {}
        recruiter_percentage = data.get("recruiter_percentage")
        yuvro_commission_percentage = data.get("yuvro_commission_percentage")
        company_to_yuvro_percentage = data.get("company_to_yuvro_percentage")
        recruiter_slots = data.get("recruiter_slots")

        if company_to_yuvro_percentage is not None:
            try:
                job.company_to_yuvro_percentage = Decimal(str(company_to_yuvro_percentage))
            except Exception:
                pass

        if recruiter_percentage is not None:
            try:
                rec_pct = Decimal(str(recruiter_percentage))
                # yuvro_commission = max(0, company_fee - recruiter_percentage)
                job.yuvro_commission_percentage = max(
                    Decimal("0.00"), job.company_to_yuvro_percentage - rec_pct
                )
            except Exception:
                pass
        elif yuvro_commission_percentage is not None:
            try:
                job.yuvro_commission_percentage = Decimal(str(yuvro_commission_percentage))
            except Exception:
                pass

        if recruiter_slots is not None:
            try:
                job.recruiter_slots = int(recruiter_slots)
            except Exception:
                pass

        job.status = JobStatus.ACTIVE
        job.posted_at = timezone.now()
        job.save()

        try:
            from core.notifications import notify_company_job_approved
            notify_company_job_approved(job)
        except Exception as e:
            logger.warning(f"Failed to dispatch company job approved notification: {e}")

        return Response(self.get_serializer(job).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        job = self.get_object()
        user = request.user
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
            return Response(
                {"error": "Only Account Managers or Admins can reject jobs."},
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data or {}
        reason = data.get("reason", "").strip()

        job.status = JobStatus.CLOSED
        if reason:
            if not isinstance(job.signals, dict):
                job.signals = {}
            job.signals["rejection_reason"] = reason
        job.save()

        return Response(self.get_serializer(job).data, status=status.HTTP_200_OK)


DUMMY_RECRUITER_EMAILS = [
    "meera@talentloop.in",
    "dan@brookssearch.com",
    "siddharth@nexushire.io",
    "priya.patel@scouttalent.com",
    "priya@pateltalent.com",
    "marcus@vancesearch.co.uk",
    "elena@rostovatalent.eu",
    "diego@northpeaksearch.com",
    "hana@satotalent.jp",
    "omar@haddadpartners.com",
]


class RecruiterViewSet(viewsets.ModelViewSet):
    """
    CRUD viewset for Recruiters / Agencies in Yuvro Marketplace.
    """

    serializer_class = RecruiterSerializer
    permission_classes = [IsAccountManagerOrReadOnly]
    filterset_class = RecruiterFilter
    search_fields = ["name", "email", "agency", "location", "experience"]
    ordering_fields = [
        "name",
        "created_at",
        "updated_at",
        "status",
        "quality_score",
        "response_rate",
    ]
    ordering = ["-created_at"]

    def get_queryset(self):
        User = get_user_model()
        try:
            Recruiter.objects.filter(email__in=DUMMY_RECRUITER_EMAILS).delete()
            Recruiter.objects.filter(email__startswith="user_", email__endswith="@yuvro.ai").delete()
        except Exception:
            pass

        freelancers = (
            User.objects.filter(role=User.Role.RECRUITER_FREELANCER)
            .exclude(email__in=DUMMY_RECRUITER_EMAILS)
            .exclude(email__startswith="user_", email__endswith="@yuvro.ai")
        )
        for u in freelancers:
            rec = Recruiter.objects.filter(email__iexact=u.email).first()
            display_name = (
                u.full_name.strip()
                if u.full_name
                else (u.username or u.email.split("@")[0])
            )
            if rec:
                updated = False
                if rec.user != u:
                    rec.user = u
                    updated = True
                if not rec.name and display_name:
                    rec.name = display_name
                    updated = True
                if updated:
                    rec.save()
            else:
                Recruiter.objects.create(
                    user=u,
                    email=u.email,
                    name=display_name,
                    phone=u.phone_number or "",
                    status=(
                        RecruiterStatus.ACTIVE
                        if u.is_active
                        else RecruiterStatus.INACTIVE
                    ),
                    type=RecruiterType.INDEPENDENT,
                    created_by="Self registered",
                )
        return (
            Recruiter.objects.select_related("account_manager", "user")
            .exclude(email__in=DUMMY_RECRUITER_EMAILS)
            .exclude(email__startswith="user_", email__endswith="@yuvro.ai")
            .all()
        )

    def get_object(self):
        lookup_val = self.kwargs.get(self.lookup_field or "pk")
        try:
            import uuid

            uuid.UUID(str(lookup_val))
            return super().get_object()
        except (ValueError, TypeError, AttributeError):
            from django.db.models import Q
            from django.http import Http404

            obj = (
                self.get_queryset()
                .filter(
                    Q(slug=lookup_val)
                    | Q(email__iexact=lookup_val)
                    | Q(name__iexact=lookup_val)
                )
                .first()
            )
            if obj is None:
                raise Http404("No Recruiter matches the given query.")
            self.check_object_permissions(self.request, obj)
            return obj

    def perform_create(self, serializer):
        user = self.request.user
        created_by_name = ""
        if user and user.is_authenticated:
            created_by_name = getattr(user, "full_name", "") or user.email
            serializer.save(
                account_manager=user,
                created_by=serializer.validated_data.get("created_by")
                or created_by_name,
            )
        else:
            serializer.save()


class RecruiterApplicationViewSet(viewsets.ModelViewSet):
    """
    CRUD and review actions for Recruiter Network Applications.
    """

    queryset = RecruiterApplication.objects.select_related("user", "reviewed_by").all()
    serializer_class = RecruiterApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ["check_linkedin"]:
            return [permissions.AllowAny()]
        return super().get_permissions()

    @action(
        detail=False,
        methods=["get", "post"],
        url_path="check-linkedin",
        permission_classes=[permissions.AllowAny],
    )
    def check_linkedin(self, request):
        import re

        raw_url = (
            request.data.get("linkedin")
            if request.method == "POST"
            else request.query_params.get("linkedin")
        ) or ""
        trimmed = str(raw_url).strip()
        if not trimmed:
            return Response(
                {"is_duplicate": False, "exists": False, "message": ""},
                status=status.HTTP_200_OK,
            )

        pattern = re.compile(
            r"^(?:https?:\/\/)?(?:[a-z]{2,3}\.)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_\-%]+)",
            re.IGNORECASE,
        )
        match = pattern.match(trimmed)
        if not match:
            return Response(
                {
                    "is_duplicate": False,
                    "exists": False,
                    "is_valid": False,
                    "message": "Please enter a valid LinkedIn profile URL (e.g. https://www.linkedin.com/in/username).",
                },
                status=status.HTTP_200_OK,
            )

        handle = match.group(1).lower().rstrip("/")
        user = request.user if request.user and request.user.is_authenticated else None

        from recruiting.services import normalize_linkedin_url
        norm_input = normalize_linkedin_url(trimmed)

        recruiter_qs = Recruiter.objects.exclude(linkedin__isnull=True).exclude(linkedin="")
        app_qs = RecruiterApplication.objects.exclude(linkedin__isnull=True).exclude(linkedin="")

        if user:
            recruiter_qs = recruiter_qs.exclude(user=user).exclude(email__iexact=user.email)
            app_qs = app_qs.exclude(user=user).exclude(email__iexact=user.email)

        exists = False
        for rec in recruiter_qs.only("linkedin"):
            if normalize_linkedin_url(rec.linkedin) == norm_input:
                exists = True
                break

        if not exists:
            for app in app_qs.only("linkedin"):
                if normalize_linkedin_url(app.linkedin) == norm_input:
                    exists = True
                    break

        return Response(
            {
                "is_duplicate": exists,
                "exists": exists,
                "is_valid": True,
                "handle": handle,
                "message": (
                    "A recruiter with this LinkedIn profile already exists."
                    if exists
                    else ""
                ),
            },
            status=status.HTTP_200_OK,
        )

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        status_param = self.request.query_params.get("status")
        q = self.request.query_params.get("q")

        # Ensure dummy applications are never shown
        try:
            RecruiterApplication.objects.filter(email__in=DUMMY_RECRUITER_EMAILS).delete()
            RecruiterApplication.objects.filter(email__startswith="user_", email__endswith="@yuvro.ai").delete()
        except Exception:
            pass
        qs = qs.exclude(email__in=DUMMY_RECRUITER_EMAILS).exclude(email__startswith="user_", email__endswith="@yuvro.ai")

        if not (
            user.is_staff
            or getattr(user, "is_admin_user", False)
            or getattr(user, "is_account_manager", False)
        ):
            # Non-AM recruiters only see their own application
            qs = qs.filter(user=user)
        else:
            # AM can filter by status
            if status_param and status_param != "all":
                qs = qs.filter(status__iexact=status_param)
            if q:
                from django.db.models import Q

                qs = qs.filter(
                    Q(name__icontains=q)
                    | Q(email__icontains=q)
                    | Q(hiring_geography__icontains=q)
                    | Q(top_roles__icontains=q)
                    | Q(phone__icontains=q)
                )
        return qs

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        email = serializer.validated_data.get("email") or (user.email if user else "")
        name = serializer.validated_data.get("name") or (user.full_name if user else "")

        # Check if application already exists
        existing = None
        if user:
            existing = RecruiterApplication.objects.filter(user=user).first()
        if not existing and email:
            existing = RecruiterApplication.objects.filter(email__iexact=email).first()

        if existing:
            instance = serializer.update(existing, serializer.validated_data)
        else:
            instance = serializer.save(
                user=user, email=email, name=name, status=RecruiterApplication.ApplicationStatus.PENDING
            )

        if user:
            user.is_applied = True
            user.save(update_fields=["is_applied"])

            # Ensure Recruiter profile exists in pending state
            recruiter, _ = Recruiter.objects.get_or_create(
                email__iexact=user.email,
                defaults={
                    "name": name,
                    "user": user,
                    "phone": instance.phone,
                    "linkedin": instance.linkedin,
                    "experience": instance.experience_years,
                    "status": RecruiterStatus.PENDING,
                },
            )
            if recruiter.status != RecruiterStatus.ACTIVE:
                recruiter.status = RecruiterStatus.PENDING
                recruiter.save(update_fields=["status"])

        try:
            from core.emails import send_recruiter_profile_submitted_email
            send_recruiter_profile_submitted_email(instance)
        except Exception as e:
            logger.warning(f"Failed to dispatch recruiter profile submitted email: {e}")

        try:
            from core.notifications import notify_am_recruiter_application_received
            notify_am_recruiter_application_received(instance)
        except Exception as e:
            logger.warning(f"Failed to dispatch AM recruiter application notification: {e}")

        return instance


    @action(
        detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated]
    )
    def me(self, request):
        app = RecruiterApplication.objects.filter(user=request.user).first()
        if not app:
            app = RecruiterApplication.objects.filter(
                email__iexact=request.user.email
            ).first()
        if not app:
            return Response({"applied": False, "application": None})
        return Response(
            {
                "applied": True,
                "application": RecruiterApplicationSerializer(app).data,
            }
        )

    @action(
        detail=True, methods=["post"], permission_classes=[IsAccountManagerOrReadOnly]
    )
    def approve(self, request, pk=None):
        app = self.get_object()
        app.status = RecruiterApplication.ApplicationStatus.ACTIVE
        app.reviewed_by = request.user
        app.reviewed_at = timezone.now()
        app.save()

        # Activate the associated user
        if app.user:
            app.user.is_active = True
            app.user.is_applied = True
            app.user.save(update_fields=["is_active", "is_applied"])

        # Activate or update the Recruiter profile
        recruiter = Recruiter.objects.filter(email__iexact=app.email).first()
        if not recruiter and app.user:
            recruiter = Recruiter.objects.filter(user=app.user).first()
        if not recruiter:
            recruiter = Recruiter.objects.create(
                user=app.user,
                name=app.name,
                email=app.email,
                phone=app.phone,
                linkedin=app.linkedin,
                experience=app.experience_years,
                status=RecruiterStatus.ACTIVE,
                account_manager=request.user,
            )
        else:
            recruiter.status = RecruiterStatus.ACTIVE
            if not recruiter.user and app.user:
                recruiter.user = app.user
            if not recruiter.account_manager:
                recruiter.account_manager = request.user
            recruiter.save(update_fields=["status", "user", "account_manager"])

        try:
            from core.emails import send_recruiter_profile_approved_email
            send_recruiter_profile_approved_email(app)
        except Exception as e:
            logger.warning(f"Failed to dispatch recruiter profile approved email: {e}")

        try:
            from core.notifications import notify_recruiter_application_approved
            notify_recruiter_application_approved(app)
        except Exception as e:
            logger.warning(f"Failed to dispatch recruiter application approved notification: {e}")

        return Response(

            {
                "message": f"Application for {app.name} approved.",
                "application": RecruiterApplicationSerializer(app).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(
        detail=True, methods=["post"], permission_classes=[IsAccountManagerOrReadOnly]
    )
    def reject(self, request, pk=None):
        app = self.get_object()
        app.status = RecruiterApplication.ApplicationStatus.REJECTED
        app.reviewed_by = request.user
        app.reviewed_at = timezone.now()
        decision_notes = request.data.get("reason") or request.data.get("notes") or ""
        if decision_notes:
            app.decision_notes = decision_notes
        app.save()

        if app.user:
            app.user.is_active = False
            app.user.is_applied = True
            app.user.save(update_fields=["is_active", "is_applied"])

        recruiter = Recruiter.objects.filter(email__iexact=app.email).first()
        if recruiter:
            recruiter.status = RecruiterStatus.INACTIVE
            recruiter.save(update_fields=["status"])

        return Response(
            {
                "message": f"Application for {app.name} rejected.",
                "application": RecruiterApplicationSerializer(app).data,
            },
            status=status.HTTP_200_OK,
        )

