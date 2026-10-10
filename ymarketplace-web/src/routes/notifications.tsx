import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Ban,
  BriefcaseBusiness,
  CalendarClock,
  CheckCheck,
  Filter,
  Handshake,
  MessagesSquare,
  PencilLine,
  Star,
  Wallet,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { EmptyState, SearchBar } from "@/components/app/primitives";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  bucketLabel,
  defaultUnread,
  emptyCopy,
  mapBackendNotification,
  notifCategories,
  notifications as defaultFeed,
  useNotifications,
  type NotifBucket,
  type NotifCategory,
  type NotifKind,
  type Notification,
} from "@/lib/notifications";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Yuvro Recruiter" },
      {
        name: "description",
        content:
          "One inbox for recruiter marketplace activity: job updates, access requests, candidate submissions, interview progress, messages and bounty payments.",
      },
      { property: "og:title", content: "Notifications — Yuvro Recruiter" },
      {
        property: "og:description",
        content: "Stay updated on your jobs, candidates, and marketplace activity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

const iconFor: Record<NotifKind, typeof Star> = {
  "job-new": BriefcaseBusiness,
  "job-updated": PencilLine,
  "job-paused": CalendarClock,
  "job-closed": Ban,
  "access-approved": BadgeCheck,
  "access-rejected": Ban,
  "submission-approved": BadgeCheck,
  "submission-rejected": Ban,
  "details-requested": PencilLine,
  shortlisted: Star,
  "interview-stage": CalendarClock,
  "interview-scheduled": CalendarClock,
  "interview-feedback": MessagesSquare,
  "candidate-rejected": Ban,
  offer: Handshake,
  hired: BadgeCheck,
  message: MessagesSquare,
  payment: Wallet,
};

const toneFor = (kind: NotifKind) => {
  if (
    kind === "access-rejected" ||
    kind === "submission-rejected" ||
    kind === "candidate-rejected" ||
    kind === "job-closed"
  )
    return "text-destructive";
  if (kind === "access-approved" || kind === "submission-approved" || kind === "hired" || kind === "payment")
    return "text-success";
  if (kind === "job-paused" || kind === "details-requested") return "text-warning";
  if (kind === "message" || kind === "offer" || kind === "shortlisted") return "text-brand";
  return "text-muted-foreground";
};

const STORE = "yuvro.recruiter.notifications.read";

function NotificationRow({
  item,
  unread,
  onOpen,
}: {
  item: Notification;
  unread: boolean;
  onOpen: () => void;
}) {
  const Icon = iconFor[item.kind] || BriefcaseBusiness;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "grid w-full grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 px-3 py-3.5 text-left transition-colors hover:bg-surface-sunken sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-4 sm:px-4",
          unread ? "bg-brand-soft/35" : "",
        )}
      >
        <span
          className={cn(
            "mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border border-border bg-surface",
            toneFor(item.kind),
          )}
        >
          <Icon className="size-3.5" />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "truncate text-[13.5px] tracking-tight",
                unread ? "font-semibold text-foreground" : "font-medium text-foreground/80",
              )}
            >
              {item.title}
            </span>
            {unread ? <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-label="Unread" /> : null}
          </span>
          <span
            className={cn(
              "mt-0.5 block truncate text-xs leading-5",
              unread ? "text-muted-foreground" : "text-muted-foreground/80",
            )}
          >
            {item.context}
          </span>
          <span className="num mt-1 block text-[11px] text-muted-foreground sm:hidden">{item.time}</span>
        </span>
        <span className="num hidden shrink-0 self-start pt-0.5 text-[11px] text-muted-foreground sm:block">
          {item.time}
        </span>
      </button>
    </li>
  );
}

function NotificationsPage() {
  const navigate = useNavigate();
  const {
    notifications: backendNotifications,
    markAsRead: markBackendAsRead,
    markAllAsRead: markBackendAllAsRead,
  } = useNotifications({ pollInterval: 15000 });

  const [readIds, setReadIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [cat, setCat] = useState<(typeof notifCategories)[number]>("All");
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [when, setWhen] = useState<"any" | NotifBucket>("any");
  const [detail, setDetail] = useState<Notification | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORE);
    if (raw) {
      try {
        setReadIds(JSON.parse(raw) as string[]);
      } catch {
        setReadIds([]);
      }
    } else {
      const unread = new Set(defaultUnread(defaultFeed));
      setReadIds(defaultFeed.filter((n) => !unread.has(n.id)).map((n) => n.id));
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORE, JSON.stringify(readIds));
  }, [readIds, ready]);

  // Merge live backend notifications with derived feed
  const allNotifications = useMemo(() => {
    const mappedBackend = backendNotifications.map((bn, idx) => mapBackendNotification(bn, idx));
    const backendTitles = new Set(mappedBackend.map((b) => b.title.toLowerCase()));

    // Filter out mock duplicates that have a real counterpart
    const filteredDefault = defaultFeed.filter(
      (n) => !backendTitles.has(n.title.toLowerCase())
    );

    return [...mappedBackend, ...filteredDefault];
  }, [backendNotifications]);

  const isRead = (item: Notification) => {
    if (item.backendId) {
      if (item.read || readIds.includes(item.id)) return true;
      return false;
    }
    return readIds.includes(item.id);
  };

  const markRead = (id: string) => {
    const item = allNotifications.find((n) => n.id === id);
    if (item?.backendId) {
      markBackendAsRead(item.backendId);
    }
    setReadIds((r) => (r.includes(id) ? r : [...r, id]));
  };

  const markAll = () => {
    markBackendAllAsRead();
    setReadIds(allNotifications.map((n) => n.id));
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allNotifications
      .filter((n) => (cat === "All" ? true : n.category === cat))
      .filter((n) => (when === "any" ? true : n.bucket === when))
      .filter((n) => (unreadOnly ? !isRead(n) : true))
      .filter((n) =>
        q
          ? [n.title, n.context, n.category, n.candidate, n.company].filter(Boolean).join(" ").toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => a.rank - b.rank);
  }, [allNotifications, cat, when, unreadOnly, query, readIds]);

  const groups: { bucket: NotifBucket; items: Notification[] }[] = (
    ["today", "yesterday", "earlier"] as NotifBucket[]
  )
    .map((bucket) => ({ bucket, items: list.filter((n) => n.bucket === bucket) }))
    .filter((g) => g.items.length > 0);

  const unreadCount = allNotifications.filter((n) => !isRead(n)).length;
  const filtersOn = unreadOnly || when !== "any";

  const go = (n: Notification) => {
    markRead(n.id);
    if (n.link) {
      let target = n.link;
      if (target.startsWith("/clients/")) {
        target = `/jobs/${target.replace("/clients/", "")}/pipeline`;
      }
      navigate({ to: target as any });
      return;
    }
    if (n.to.path === "job" && n.to.jobId) {
      navigate({ to: "/jobs/$jobId", params: { jobId: n.to.jobId } });
    } else if (n.to.path === "candidates") {
      if (n.jobId) {
        navigate({ to: "/jobs/$jobId/pipeline", params: { jobId: n.jobId } });
      } else {
        navigate({ to: "/candidates/active" });
      }
    } else if (n.to.path === "messages") {
      navigate({ to: "/messages" });
    } else if (n.to.path === "earnings") {
      navigate({ to: "/profile" });
    } else {
      navigate({ to: "/candidates/active" });
    }
  };

  const open = (n: Notification) => {
    markRead(n.id);
    setDetail(n);
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">Notifications</h1>
            <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
              Stay updated on your jobs, candidates, and marketplace activity.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Search candidate, job, company"
              className="w-full sm:w-64"
            />
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Filter notifications"
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground",
                    filtersOn && "border-brand/40 bg-brand-soft text-brand",
                  )}
                >
                  <Filter className="size-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-3 shadow-overlay">
                <p className="label-caps pb-2">Filter</p>
                <label className="flex items-center gap-2 py-1 text-[13px]">
                  <input
                    type="checkbox"
                    checked={unreadOnly}
                    onChange={(e) => setUnreadOnly(e.target.checked)}
                    className="size-3.5 accent-[var(--brand)]"
                  />
                  Unread only
                </label>
                <p className="label-caps pb-1 pt-3">Date</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["any", "today", "yesterday", "earlier"] as const).map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setWhen(w)}
                      className={cn(
                        "rounded-md border border-border px-2 py-1 text-xs font-medium capitalize transition-colors",
                        when === w ? "border-brand/40 bg-brand-soft text-brand" : "text-muted-foreground",
                      )}
                    >
                      {w === "any" ? "Any" : bucketLabel[w]}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <button
              type="button"
              onClick={markAll}
              disabled={!unreadCount}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-brand transition-colors hover:bg-brand-soft disabled:pointer-events-none disabled:text-muted-foreground"
            >
              <CheckCheck className="size-4" /> Mark all as read
            </button>
          </div>
        </header>

        <nav className="scroll-slim -mx-4 mt-5 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
          <div className="flex min-w-max items-center gap-1">
            {notifCategories.map((c) => {
              const count =
                c === "All"
                  ? allNotifications.filter((n) => !isRead(n)).length
                  : allNotifications.filter((n) => n.category === c && !isRead(n)).length;
              const active = cat === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  className={cn(
                    "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1 text-[13px] font-medium transition-colors",
                    active
                      ? "border-brand text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c}
                  {count ? <span className="num text-[11px] text-muted-foreground">{count}</span> : null}
                </button>
              );
            })}
          </div>
        </nav>

        {groups.length === 0 ? (
          <EmptyState
            title={query ? "No notifications found" : emptyCopy[cat as "All" | NotifCategory].title}
            description={
              query ? "Try a different candidate, job or company." : emptyCopy[cat as "All" | NotifCategory].description
            }
          />
        ) : (
          <div className="mt-2">
            {groups.map((g) => (
              <section key={g.bucket}>
                <p className="label-caps px-1 pb-1 pt-5">{bucketLabel[g.bucket]}</p>
                <ul className="divide-y divide-border border-y border-border">
                  {g.items.map((n) => (
                    <NotificationRow key={n.id} item={n} unread={!isRead(n)} onOpen={() => open(n)} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
          {detail ? (
            <>
              <SheetHeader className="border-b border-border px-5 py-4 text-left">
                <p className="label-caps">{detail.category}</p>
                <SheetTitle className="text-[15px] tracking-tight">{detail.title}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 px-5 py-5">
                <p className="text-[13px] leading-6 text-muted-foreground">{detail.context}</p>
                <dl className="text-[13px]">
                  {[
                    ["Time", detail.time],
                    ["Company", detail.company],
                    ["Candidate", detail.candidate],
                    ["Amount", detail.amount],
                  ]
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k} className="grid grid-cols-[8rem_minmax(0,1fr)] border-b border-border/70 py-2">
                        <dt className="text-xs font-medium text-muted-foreground">{k}</dt>
                        <dd className="font-medium text-foreground">{v}</dd>
                      </div>
                    ))}
                </dl>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const n = detail;
                      setDetail(null);
                      go(n);
                    }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-3 text-[13px] font-semibold text-brand-foreground transition-opacity hover:opacity-90"
                  >
                    Open details <ArrowRight className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetail(null)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="size-3.5" /> Close
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
