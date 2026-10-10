import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BellRing,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Inbox,
  Loader2,
  ReceiptText,
  UserRoundCheck,
} from "lucide-react";
import { CompanyShell } from "@/components/company/company-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/company/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Company Portal | Yuvro" },
      { name: "description", content: "Company hiring and billing updates in one focused inbox." },
      { property: "og:title", content: "Notifications — Company Portal | Yuvro" },
      { property: "og:description", content: "Review job activity, candidate reviews, and hiring updates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompanyNotificationsPage,
});

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  category: string;
  notification_type: string;
  link: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
  at: string;
}

function getNotificationMeta(notif: NotificationItem) {
  const type = notif.notification_type || "";
  const title = (notif.title || "").toLowerCase();

  if (type === "company_job_approved" || title.includes("approved")) {
    return { icon: BriefcaseBusiness, tone: "brand" as const };
  }
  if (
    type === "company_candidate_ready_for_review" ||
    title.includes("candidate") ||
    title.includes("review")
  ) {
    return { icon: UserRoundCheck, tone: "success" as const };
  }
  if (title.includes("interview")) {
    return { icon: CalendarClock, tone: "info" as const };
  }
  if (title.includes("offer")) {
    return { icon: CheckCircle2, tone: "success" as const };
  }
  return { icon: BriefcaseBusiness, tone: "brand" as const };
}

function NotificationsList({
  items,
  loading,
  onMarkRead,
}: {
  items: NotificationItem[];
  loading: boolean;
  onMarkRead: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-border bg-surface shadow-panel">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface px-6 py-12 text-center shadow-panel">
        <div className="grid size-12 place-items-center rounded-full bg-muted/60 text-muted-foreground">
          <Inbox className="size-6" />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-foreground">No notifications yet</h3>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          When an Account Manager approves your job post or moves a candidate to review, updates will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-panel">
      <div className="hidden grid-cols-[minmax(0,1fr)_100px_90px] border-b border-border bg-surface-sunken px-5 py-2.5 sm:grid">
        <span className="label-caps">Update</span>
        <span className="label-caps">Received</span>
        <span />
      </div>
      <ul className="divide-y divide-border">
        {items.map((item) => {
          const { icon: Icon, tone } = getNotificationMeta(item);
          const to = item.link || "/company/candidates/review";

          return (
            <li
              key={item.id}
              className={cn(
                "grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_100px_90px] sm:items-center sm:px-5 transition-colors",
                !item.read && "bg-brand-soft/25",
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-md", {
                    "bg-brand-soft text-brand": tone === "brand",
                    "bg-success-soft text-success": tone === "success",
                    "bg-info-soft text-info": tone === "info",
                    "bg-warning-soft text-warning": tone === "warning",
                  })}
                >
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-semibold text-foreground">{item.title}</p>
                    {!item.read ? (
                      <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-label="Unread" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.body}</p>
                </div>
              </div>
              <span className="num text-[11px] text-muted-foreground">{item.at || "Recently"}</span>
              <div className="flex justify-end sm:justify-start">
                <Button variant="ghost" size="sm" asChild>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Link to={to as any} onClick={() => !item.read && onMarkRead(item.id)}>
                    Open
                  </Link>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CompanyNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await api.get<any>("/api/notifications/");
      const items: NotificationItem[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.results)
          ? res.results
          : [];
      setNotifications(items);
      const unread =
        typeof res?.unread_count === "number"
          ? res.unread_count
          : items.filter((n) => !n.read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkOneRead = async (id: string) => {
    try {
      await api.post(`/api/notifications/${id}/read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      window.dispatchEvent(new CustomEvent("notifications-updated"));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleMarkAllRead = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await api.post("/api/notifications/mark-all-read/");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      window.dispatchEvent(new CustomEvent("notifications-updated"));
    } catch (err) {
      console.error("Failed to mark all as read", err);
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <CompanyShell
      title="Notifications"
      description="Job activity and candidate updates that need your attention."
    >
      <div className="mx-auto w-full max-w-5xl">
        <Tabs defaultValue="jobs">
          <div className="mb-4 flex items-center justify-between gap-4">
            <TabsList className="h-9 rounded-md bg-surface-sunken p-1">
              <TabsTrigger value="jobs" className="h-7 rounded px-3 text-xs">
                Job updates
                {unreadCount > 0 ? (
                  <span className="num ml-1 rounded-full bg-brand-soft px-1.5 py-0.2 text-[10px] font-semibold text-brand">
                    {unreadCount}
                  </span>
                ) : (
                  <span className="num ml-1 text-[10px] text-muted-foreground">0</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="billing" className="h-7 rounded px-3 text-xs">
                Billing updates <span className="num ml-1 text-[10px] text-muted-foreground">0</span>
              </TabsTrigger>
            </TabsList>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markingAll || unreadCount === 0}
            >
              <CheckCircle2 className="size-4" />
              {markingAll ? "Marking..." : "Mark all read"}
            </Button>
          </div>
          <TabsContent value="jobs" className="mt-0">
            <NotificationsList
              items={notifications}
              loading={loading}
              onMarkRead={handleMarkOneRead}
            />
          </TabsContent>
          <TabsContent value="billing" className="mt-0">
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface px-6 py-12 text-center shadow-panel">
              <div className="grid size-12 place-items-center rounded-full bg-muted/60 text-muted-foreground">
                <ReceiptText className="size-6" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">No billing updates</h3>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Invoices, receipts, and payment method updates will appear here.
              </p>
            </div>
          </TabsContent>
        </Tabs>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <BellRing className="size-3.5" /> New updates remain highlighted until read.
        </div>
      </div>
    </CompanyShell>
  );
}