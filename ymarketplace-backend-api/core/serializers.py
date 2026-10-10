from django.utils import timezone
from rest_framework import serializers

from core.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    at = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "title",
            "body",
            "category",
            "notification_type",
            "link",
            "data",
            "read",
            "created_at",
            "at",
        ]
        read_only_fields = fields

    def get_at(self, obj) -> str:
        if not obj.created_at:
            return "Just now"

        now = timezone.now()
        diff = now - obj.created_at
        seconds = int(diff.total_seconds())

        if seconds < 60:
            return "Just now"
        if seconds < 3600:
            mins = seconds // 60
            return f"{mins}m ago"
        if seconds < 86400:
            hours = seconds // 3600
            return f"{hours}h ago"
        if seconds < 172800:
            return "Yesterday"
        if seconds < 604800:
            days = seconds // 86400
            return f"{days}d ago"

        return obj.created_at.strftime("%b %d")
