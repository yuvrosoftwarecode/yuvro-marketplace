"""
ASGI config for yuvro-marketplace backend.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ymarketplace-backend-api.settings")

application = get_asgi_application()
