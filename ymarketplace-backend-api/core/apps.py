from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"

    def ready(self):
        from django.conf import settings

        if getattr(settings, "PROMETHEUS_METRICS_PORT", None):
            from core.observability import start_metrics_server

            start_metrics_server(port=int(settings.PROMETHEUS_METRICS_PORT))
