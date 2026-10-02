from django.contrib import admin

from marketplace.models import (
    Company,
    CompanyUserProfile,
    Job,
    Recruiter,
    RecruiterApplication,
)


@admin.register(CompanyUserProfile)
class CompanyUserProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "company",
        "designation",
        "phone_number",
        "is_primary_contact",
        "created_at",
    )
    list_filter = ("company", "is_primary_contact", "created_at")
    search_fields = ("user__email", "user__full_name", "company__name", "designation", "phone_number")
    ordering = ("-created_at",)


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "industry",
        "account_manager",
        "company_manager",
        "company_size",
        "funding_stage",
        "created_at",
    )
    list_filter = ("industry", "funding_stage", "created_at")
    search_fields = ("name", "industry", "headquarters", "website")
    ordering = ("-created_at",)
    readonly_fields = ("id", "created_at", "updated_at")
    fieldsets = (
        (
            "Basic Information",
            {
                "fields": (
                    "id",
                    "name",
                    "account_manager",
                    "company_manager",
                    "industry",
                    "headquarters",
                    "website",
                    "logo_url",
                )
            },
        ),
        (
            "Company Profile",
            {
                "fields": (
                    "company_size",
                    "funding_stage",
                    "founded_year",
                    "why_company",
                    "leadership",
                )
            },
        ),
        (
            "Timestamps",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "company",
        "status",
        "location",
        "work_model",
        "employment_type",
        "salary_range_display",
        "recruiter_percentage_display",
        "recruiter_bounty_range_display",
        "created_at",
    )
    list_filter = (
        "status",
        "work_model",
        "employment_type",
        "salary_currency",
        "created_at",
    )
    search_fields = (
        "title",
        "company__name",
        "location",
        "job_description",
    )
    ordering = ("-created_at",)
    autocomplete_fields = ("company",)
    readonly_fields = (
        "id",
        "slug",
        "recruiter_percentage_display",
        "recruiter_bounty_range_display",
        "created_at",
        "updated_at",
    )
    fieldsets = (
        (
            "Role & Company",
            {
                "fields": (
                    "id",
                    "company",
                    "title",
                    "slug",
                    "status",
                    "open_roles",
                    "posted_at",
                )
            },
        ),
        (
            "Work & Location",
            {
                "fields": (
                    "location",
                    "employment_type",
                    "work_model",
                    "experience",
                    "visa_sponsorship",
                )
            },
        ),
        (
            "Compensation",
            {
                "fields": (
                    "salary_min",
                    "salary_max",
                    "salary_currency",
                    "equity_min",
                    "equity_max",
                )
            },
        ),
        (
            "Bounty & Commission",
            {
                "fields": (
                    "company_to_yuvro_percentage",
                    "yuvro_commission_percentage",
                    "recruiter_percentage_display",
                    "recruiter_bounty_range_display",
                    "payout_terms",
                )
            },
        ),
        (
            "Descriptions & Qualifications",
            {
                "fields": (
                    "job_description",
                    "benefits_and_perks",
                    "must_haves",
                    "signals",
                    "candidate_questions",
                    "target_companies",
                )
            },
        ),
        (
            "Timestamps",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    @admin.display(description="Salary Range")
    def salary_range_display(self, obj):
        return f"{obj.salary_currency} {obj.salary_min:,.0f} - {obj.salary_max:,.0f}"

    @admin.display(description="Recruiter %")
    def recruiter_percentage_display(self, obj):
        return f"{obj.recruiter_percentage}%"

    @admin.display(description="Recruiter Bounty Range")
    def recruiter_bounty_range_display(self, obj):
        return f"{obj.salary_currency} {obj.recruiter_bounty_min:,.0f} - {obj.recruiter_bounty_max:,.0f}"


@admin.register(Recruiter)
class RecruiterAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "email",
        "type",
        "agency",
        "status",
        "location",
        "quality_score",
        "response_rate",
        "account_manager",
        "created_at",
    )
    list_filter = ("status", "type", "created_at")
    search_fields = ("name", "email", "agency", "location", "experience")
    ordering = ("-created_at",)
    readonly_fields = ("id", "slug", "created_at", "updated_at")
    fieldsets = (
        (
            "Basic Info",
            {
                "fields": (
                    "id",
                    "user",
                    "account_manager",
                    "name",
                    "slug",
                    "email",
                    "phone",
                    "location",
                    "linkedin",
                    "website",
                )
            },
        ),
        (
            "Recruiter Profile",
            {
                "fields": (
                    "type",
                    "agency",
                    "experience",
                    "status",
                    "specializations",
                    "markets",
                    "quality_score",
                    "response_rate",
                    "created_by",
                )
            },
        ),
        (
            "Verification & Interview Stats",
            {
                "fields": (
                    "verification",
                    "interview_stats",
                    "am_rejection_reasons",
                    "company_rejection_reasons",
                )
            },
        ),
        (
            "Timestamps",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )


@admin.register(RecruiterApplication)
class RecruiterApplicationAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "email",
        "phone",
        "experience_years",
        "status",
        "created_at",
    )
    list_filter = ("status", "early_stage_startup_hiring", "created_at")
    search_fields = ("name", "email", "phone", "linkedin", "hiring_geography")
    ordering = ("-created_at",)
    readonly_fields = ("id", "created_at", "updated_at")

