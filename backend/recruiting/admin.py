import json

from django.contrib import admin
from django.utils.html import format_html

from recruiting.models import Candidate, CandidateSubmission, RecruiterJobApplication


@admin.register(RecruiterJobApplication)
class RecruiterJobApplicationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "recruiter_display",
        "job_title",
        "company_name",
        "status",
        "reviewed_by_display",
        "reviewed_at",
        "created_at",
    )
    list_filter = ("status", "job__company", "created_at", "reviewed_at")
    search_fields = (
        "recruiter__email",
        "recruiter__full_name",
        "recruiter__username",
        "job__title",
        "job__company__name",
        "why_fit",
    )
    readonly_fields = ("id", "created_at", "updated_at")
    ordering = ("-created_at",)

    @admin.display(description="Recruiter")
    def recruiter_display(self, obj):
        return obj.recruiter.full_name or obj.recruiter.email

    @admin.display(description="Job Title")
    def job_title(self, obj):
        return obj.job.title

    @admin.display(description="Company")
    def company_name(self, obj):
        return obj.job.company.name if obj.job.company else "-"

    @admin.display(description="Reviewed By")
    def reviewed_by_display(self, obj):
        if not obj.reviewed_by:
            return "-"
        return obj.reviewed_by.full_name or obj.reviewed_by.email


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "full_name",
        "email",
        "phone",
        "current_title",
        "current_company",
        "recruiter_display",
        "current_location",
        "created_at",
    )
    list_filter = ("recruiter", "open_to_relocation", "created_at")
    search_fields = (
        "first_name",
        "last_name",
        "email",
        "phone",
        "linkedin_url",
        "current_title",
        "current_company",
    )
    readonly_fields = ("id", "created_at", "updated_at")
    ordering = ("-created_at",)

    @admin.display(description="Recruiter")
    def recruiter_display(self, obj):
        return obj.recruiter.full_name or obj.recruiter.email


@admin.register(CandidateSubmission)
class CandidateSubmissionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "candidate_display",
        "job_title",
        "company_name",
        "recruiter_display",
        "status",
        "submitted_at",
    )
    list_filter = ("status", "submitted_at", "application__job__company")
    search_fields = (
        "candidate__first_name",
        "candidate__last_name",
        "candidate__email",
        "application__recruiter__email",
        "application__recruiter__full_name",
        "application__job__title",
        "application__job__company__name",
    )
    readonly_fields = (
        "id",
        "submitted_at",
        "updated_at",
        "formatted_answers",
    )
    fields = (
        "id",
        "application",
        "candidate",
        "status",
        "recruiter_notes",
        "formatted_answers",
        "submitted_at",
        "updated_at",
    )
    ordering = ("-submitted_at",)

    @admin.display(description="Candidate")
    def candidate_display(self, obj):
        return obj.candidate.full_name

    @admin.display(description="Job Title")
    def job_title(self, obj):
        return obj.application.job.title

    @admin.display(description="Company")
    def company_name(self, obj):
        return obj.application.job.company.name if obj.application.job.company else "-"

    @admin.display(description="Recruiter")
    def recruiter_display(self, obj):
        return obj.application.recruiter.full_name or obj.application.recruiter.email

    @admin.display(description="Submitted Answers")
    def formatted_answers(self, obj):
        if not obj.answers:
            return "No screening answers submitted."
        html_lines = ["<table style='width:100%; border:1px solid #ddd;'>"]
        html_lines.append(
            "<tr style='background:#f5f5f5;'><th>Question ID</th><th>Question</th><th>Answer</th></tr>"
        )
        for item in obj.answers:
            if isinstance(item, dict):
                q_id = item.get("question_id", "-")
                q_text = item.get("question", "-")
                ans = item.get("answer", "-")
                html_lines.append(
                    f"<tr><td style='padding:4px;border:1px solid #ddd;'><b>{q_id}</b></td>"
                    f"<td style='padding:4px;border:1px solid #ddd;'>{q_text}</td>"
                    f"<td style='padding:4px;border:1px solid #ddd;'>{ans}</td></tr>"
                )
        html_lines.append("</table>")
        return format_html("".join(html_lines))
