import time

from django.conf import settings


class TracingMiddleware:
    """
    TracingMiddleware — records request execution time and exposes metrics.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self._otel_enabled = getattr(settings, "OTEL_ENABLED", False)

    def __call__(self, request):
        if not self._otel_enabled:
            return self.get_response(request)

        from core.observability import ACTIVE_REQUESTS, REQUEST_COUNT, REQUEST_DURATION

        method = request.method
        path = self._normalize_path(request.path)
        start = time.perf_counter()
        ACTIVE_REQUESTS.inc()

        try:
            response = self.get_response(request)
        finally:
            duration = time.perf_counter() - start
            ACTIVE_REQUESTS.dec()

        status_code = str(response.status_code)
        REQUEST_COUNT.labels(
            method=method, endpoint=path, status_code=status_code
        ).inc()
        REQUEST_DURATION.labels(method=method, endpoint=path).observe(duration)

        return response

    @staticmethod
    def _normalize_path(path: str) -> str:
        import re

        path = re.sub(
            r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
            "{uuid}",
            path,
        )
        path = re.sub(r"/\d+(/|$)", r"/{id}\1", path)
        return path
