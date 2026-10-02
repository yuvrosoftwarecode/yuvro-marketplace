import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCheck } from "lucide-react";
import { AmPageHeader, AmShell } from "@/components/am/am-shell";
import { useAm } from "@/components/am/am-store";
import { Btn, Segmented } from "@/components/am/am-ui";
import { pickSearch } from "@/lib/am-nav";
import { cn } from "@/lib/utils";

const categories = [
  "All",
  "Jobs",
  "Recruiters",
  "Submissions",
  "Company",
  "Hiring",
  "Finance",
] as const;

export const Route = createFileRoute("/am/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Account Manager | Yuvro" },
      {
        name: "description",
        content:
          "Grouped Account Manager notifications for new recruiter requests, submissions, company feedback, interviews, offers, hires and payout events.",
      },
      { property: "og:title", content: "Notifications — Account Manager | Yuvro" },
      {
        property: "og:description",
        content: "Every operational event, grouped and linked to the object in context.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AmNotificationsPage,
});

function AmNotificationsPage() {
  const { state, markNotificationsRead, markNotificationRead, unreadNotifications } = useAm();
  const navigate = useNavigate();
  const [cat, setCat] = useState<string>("All");

  const items = state.notifications.filter((n) => cat === "All" || n.category === cat);

  const handleOpen = (n: (typeof state.notifications)[0]) => {
    if (!n.read) {
      markNotificationRead(n.id);
    }
    if (n.link.jobId) {
      navigate({
        to: "/am/jobs/$jobId",
        params: { jobId: n.link.jobId! },
        search: pickSearch({ tab: n.link.tab, focus: n.link.focus }),
      });
    } else if (n.link.to) {
      navigate({ to: n.link.to as any });
    } else {
      navigate({ to: "/am/payouts" });
    }
  };

  return (
    <AmShell>
      <AmPageHeader
        title="Notifications"
        description="Grouped by area. Every notification opens the exact job, submission or payout it refers to."
        actions={
          <Btn onClick={markNotificationsRead} disabled={!unreadNotifications}>
            <CheckCheck className="size-4" /> Mark all read
          </Btn>
        }
      >
        <Segmented
          options={categories.map((c) => ({
            id: c,
            label: c,
            count:
              c === "All"
                ? state.notifications.length
                : state.notifications.filter((n) => n.category === c).length,
          }))}
          value={cat}
          onChange={setCat}
        />
      </AmPageHeader>

      <ul className="divide-y divide-border bg-surface">
        {items.length === 0 ? (
          <li className="px-4 py-10 text-center text-[13px] text-muted-foreground sm:px-6">
            No notifications in this group.
          </li>
        ) : null}
        {items.map((n) => (
          <li
            key={n.id}
            onClick={() => handleOpen(n)}
            className={cn(
              "group relative grid cursor-pointer gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6 transition-colors hover:bg-surface-sunken/60",
              !n.read ? "bg-brand/5 dark:bg-brand/10" : "opacity-85",
            )}
          >
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <p className="label-caps">{n.category}</p>
                {!n.read && (
                  <span className="size-2 rounded-full bg-brand shrink-0" aria-label="Unread" />
                )}
              </div>
              <p className={cn("mt-0.5 text-[13px] leading-5 text-foreground", !n.read && "font-semibold")}>
                {n.body}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{n.at}</p>
            </div>
            <Btn
              size="sm"
              className="justify-self-start sm:justify-self-end"
              onClick={(e) => {
                e.stopPropagation();
                handleOpen(n);
              }}
            >
              Open <ArrowRight className="size-3.5" />
            </Btn>
          </li>
        ))}
      </ul>
    </AmShell>
  );
}
