import django_filters

from marketplace.models import Company, Job, Recruiter


class CompanyFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(lookup_expr="icontains")
    industry = django_filters.CharFilter(lookup_expr="icontains")
    headquarters = django_filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = Company
        fields = ["industry", "account_manager"]


class JobFilter(django_filters.FilterSet):
    title = django_filters.CharFilter(lookup_expr="icontains")
    location = django_filters.CharFilter(lookup_expr="icontains")
    industry = django_filters.CharFilter(
        field_name="company__industry", lookup_expr="icontains"
    )
    min_salary = django_filters.NumberFilter(field_name="salary_min", lookup_expr="gte")
    max_salary = django_filters.NumberFilter(field_name="salary_max", lookup_expr="lte")
    experience = django_filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = Job
        fields = [
            "company",
            "status",
            "work_model",
            "employment_type",
            "salary_currency",
        ]


class RecruiterFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(lookup_expr="icontains")
    email = django_filters.CharFilter(lookup_expr="icontains")
    agency = django_filters.CharFilter(lookup_expr="icontains")
    location = django_filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = Recruiter
        fields = [
            "status",
            "type",
            "account_manager",
        ]
