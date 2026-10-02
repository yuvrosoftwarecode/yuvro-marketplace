import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Briefcase,
  CheckCheck,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { AppNotification, useNotifications } from "@/lib/notifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function getNotificationStyle(item: AppNotification) {
  const type = (item.notification_type || "").toLowerCase();
  const category = (item.category || "").toLowerCase();
  const title = (item.title || "").toLowerCase();
  const isRejected = type.includes("reject") || title.includes("reject");

  if (isRejected) {
    return {
      label: "Rejected",
      icon: XCircle,
      iconWrapper:
        "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40",
      badgeClass:
        "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/40",
    };
  }

  if (category.includes("job") || type.includes("job")) {
    return {
      label: "Job Assignment",
      icon: Briefcase,
      iconWrapper:
        "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40",
      badgeClass:
        "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/40",
    };
  }

  if (category.includes("pipeline") || type.includes("pipeline")) {
    return {
      label: "Pipeline",
      icon: TrendingUp,
      iconWrapper:
        "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/40",
      badgeClass:
        "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200/40",
    };
  }

  if (type.includes("approve") || title.includes("approved")) {
    return {
      label: "Approved",
      icon: CheckCircle2,
      iconWrapper:
        "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40",
      badgeClass:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/40",
    };
  }

  if (category.includes("submi") || type.includes("submi")) {
    return {
      label: "Submission",
      icon: UserCheck,
      iconWrapper:
        "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40",
      badgeClass:
        "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/40",
    };
  }

  return {
    label: item.category || "Network",
    icon: Users,
    iconWrapper:
      "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40",
    badgeClass:
      "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/40",
  };
}

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications({
    pollInterval: 25000,
  });

  const handleItemClick = (item: AppNotification) => {
    if (!item.read) {
      markAsRead(item.id);
    }
    setOpen(false);
    if (item.link) {
      let targetLink = item.link;
      if (targetLink.startsWith("/clients/")) {
        const id = targetLink.replace("/clients/", "");
        targetLink = `/jobs/${id}/pipeline`;
      }
      navigate({ to: targetLink as any });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative grid size-9 place-items-center rounded-lg text-muted-foreground transition-all hover:bg-surface-sunken hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring active:scale-95"
          aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        >
          <Bell className="size-4" />
          {unreadCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-brand-foreground shadow-xs animate-in fade-in zoom-in">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[380px] p-0 sm:w-[420px] bg-surface border border-border shadow-2xl rounded-2xl overflow-hidden focus:outline-none focus:ring-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface-sunken/40 px-4 py-3 select-none">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-semibold tracking-tight text-foreground">
              Notifications
            </h3>
            {unreadCount > 0 ? (
              <span className="inline-flex items-center rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                {unreadCount} unread
              </span>
            ) : null}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                markAllAsRead();
              }}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-surface-sunken hover:text-foreground active:scale-[0.98] transition-all outline-none focus:outline-none focus-visible:ring-0"
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* List Content */}
        <div className="max-h-[380px] divide-y divide-border/50 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="grid size-12 place-items-center rounded-full bg-surface-sunken text-muted-foreground/80">
                <Bell className="size-5" />
              </div>
              <p className="mt-3.5 text-[13px] font-semibold text-foreground">
                No notifications yet
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground max-w-[280px]">
                You'll receive updates here when your application is reviewed, roles are assigned,
                or candidate pipelines advance.
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const style = getNotificationStyle(item);
              const Icon = style.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "group relative flex cursor-pointer items-start gap-3.5 px-4 py-3.5 text-left transition-colors",
                    "hover:bg-surface-sunken/70",
                    !item.read
                      ? "bg-brand/[0.04] dark:bg-brand/[0.08]"
                      : "opacity-75 hover:opacity-100",
                  )}
                >
                  {/* Icon Column */}
                  <div className="shrink-0 pt-0.5">
                    <div
                      className={cn(
                        "grid size-8 place-items-center rounded-lg shadow-2xs",
                        style.iconWrapper,
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                  </div>

                  {/* Body Column */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                          style.badgeClass,
                        )}
                      >
                        {style.label}
                      </span>
                      <span className="text-[11px] font-normal text-muted-foreground shrink-0">
                        {item.at}
                      </span>
                    </div>

                    <p
                      className={cn(
                        "text-[13px] leading-snug text-foreground",
                        !item.read ? "font-semibold" : "font-medium text-foreground/90",
                      )}
                    >
                      {item.title}
                    </p>

                    <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground line-clamp-2">
                      {item.body}
                    </p>
                  </div>

                  {/* Unread Indicator */}
                  {!item.read && (
                    <div className="shrink-0 pt-1.5 pl-1">
                      <span
                        className="block size-2 rounded-full bg-brand ring-2 ring-brand/20 animate-pulse"
                        aria-label="Unread notification"
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-border/50 bg-surface-sunken/20 px-4 py-2.5 text-center">
            <p className="text-[11px] text-muted-foreground">
              Click any notification to open its details
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
