"""
WSGI config for yuvro-marketplace backend.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ymarketplace-backend-api.settings")

application = get_wsgi_application()
