from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Notification
from core.serializers import NotificationSerializer


class PingView(APIView):
    def get(self, request):
        return Response({"message": "pong", "status": "ok"})


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for listing and managing in-app notifications.
    """

    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Notification.objects.none()

        qs = Notification.objects.filter(recipient=user).order_by("-created_at")

        category = self.request.query_params.get("category")
        if category and category.lower() != "all":
            qs = qs.filter(category__iexact=category.strip())

        read_param = self.request.query_params.get("read")
        if read_param is not None:
            if read_param.lower() in ["true", "1"]:
                qs = qs.filter(read=True)
            elif read_param.lower() in ["false", "0"]:
                qs = qs.filter(read=False)

        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        total_count = queryset.count()
        unread_count = Notification.objects.filter(recipient=request.user, read=False).count()

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data["unread_count"] = unread_count
            return response

        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "count": total_count,
                "unread_count": unread_count,
                "results": serializer.data,
            }
        )

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        updated = Notification.objects.filter(recipient=request.user, read=False).update(read=True)
        return Response({"success": True, "marked_count": updated, "unread_count": 0})

    @action(detail=True, methods=["post"], url_path="read")
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        if not notif.read:
            notif.read = True
            notif.save(update_fields=["read", "updated_at"])

        unread_count = Notification.objects.filter(recipient=request.user, read=False).count()
        return Response({"success": True, "id": str(notif.id), "read": True, "unread_count": unread_count})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        count = Notification.objects.filter(recipient=request.user, read=False).count()
        return Response({"unread_count": count})
