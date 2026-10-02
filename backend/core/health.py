from django.db import connection
from django.http import JsonResponse


def health_check(request):
    """
    GET /api/health/
    Returns HTTP 200 with service status.
    Performs a lightweight DB connectivity check.
    """
    db_ok = False
    try:
        connection.ensure_connection()
        db_ok = True
    except Exception:
        pass

    status_code = 200 if db_ok else 503
    return JsonResponse(
        {
            "status": "ok" if db_ok else "degraded",
            "database": "connected" if db_ok else "unavailable",
        },
        status=status_code,
    )
