import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { activity, candidates, getJob, jobs, messages, stages, type StageId } from "./data";

export type NotifCategory = "Jobs" | "Applications" | "Candidates" | "Messages" | "Payments";
export type NotifBucket = "today" | "yesterday" | "earlier";

export type NotifKind =
  | "job-new"
  | "job-updated"
  | "job-paused"
  | "job-closed"
  | "access-approved"
  | "access-rejected"
  | "submission-approved"
  | "submission-rejected"
  | "details-requested"
  | "shortlisted"
  | "interview-stage"
  | "interview-scheduled"
  | "interview-feedback"
  | "candidate-rejected"
  | "offer"
  | "hired"
  | "message"
  | "payment";

export type Notification = {
  id: string;
  category: NotifCategory;
  kind: NotifKind;
  title: string;
  context: string;
  time: string;
  bucket: NotifBucket;
  /** relative order inside a bucket, smaller = newer */
  rank: number;
  jobId?: string;
  candidate?: string;
  company?: string;
  amount?: string;
  to: { path: "job" | "candidates" | "messages" | "earnings"; jobId?: string };
  link?: string;
  backendId?: string;
  read?: boolean;
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  category: "Recruiters" | "Submissions" | "Jobs" | "Pipeline" | "Company" | "General" | string;
  notification_type: string;
  link: string;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
  at: string;
};

export type NotificationResponse = {
  count: number;
  unread_count: number;
  results: AppNotification[];
};

export const notifCategories: ("All" | NotifCategory)[] = [
  "All",
  "Jobs",
  "Applications",
  "Candidates",
  "Messages",
  "Payments",
];

export const bucketLabel: Record<NotifBucket, string> = {
  today: "Today",
  yesterday: "Yesterday",
  earlier: "Earlier",
};

export const emptyCopy: Record<"All" | NotifCategory, { title: string; description: string }> = {
  All: { title: "No notifications yet", description: "Your recruiter activity will appear here." },
  Jobs: { title: "No job updates", description: "You're all caught up." },
  Applications: { title: "No application updates", description: "You're all caught up." },
  Candidates: { title: "No candidate updates", description: "You're all caught up." },
  Messages: { title: "No new messages", description: "You're all caught up." },
  Payments: { title: "No payment updates", description: "You're all caught up." },
};

const stageLabel = (s: StageId) => stages.find((x) => x.id === s)?.label ?? s;

/** Reads like a real feed: every row is derived from existing jobs, candidates, activity and threads. */
export function build(): Notification[] {
  const out: Notification[] = [];
  let n = 0;
  const push = (x: Omit<Notification, "id" | "rank">) => {
    out.push({ ...x, id: `n${++n}`, rank: n });
  };

  // Messages — from existing client threads
  messages.forEach((m) => {
    const job = getJob(m.jobId);
    push({
      category: "Messages",
      kind: "message",
      title: `New message from ${m.company}`,
      context: `${m.from} · ${job?.title ?? "Job"}`,
      time: m.time,
      bucket: m.time.includes("Yesterday") ? "yesterday" : m.time.includes("ago") ? "today" : "earlier",
      jobId: m.jobId,
      company: m.company,
      to: { path: "messages" },
    });
  });

  // Candidate progress — from the live pipeline
  candidates.forEach((c) => {
    const job = getJob(c.jobId);
    if (!job) return;
    const bucket: NotifBucket = c.updated.includes("ago")
      ? c.updated.includes("d ago")
        ? "yesterday"
        : "today"
      : "earlier";
    const base = { time: c.updated, bucket, jobId: c.jobId, candidate: c.name, company: job.company };

    if (c.stage === "hired") {
      push({
        ...base,
        category: "Candidates",
        kind: "hired",
        title: "Candidate hired",
        context: `${c.name} · ${job.title} · ${job.company}`,
        to: { path: "candidates" },
      });
      push({
        ...base,
        category: "Payments",
        kind: "payment",
        title: "Bounty earned",
        context: `${c.name} · ${job.title} · ${job.reward}`,
        amount: job.reward,
        to: { path: "earnings" },
      });
      push({
        ...base,
        category: "Payments",
        kind: "payment",
        title: "Payment completed",
        context: `${job.reward} transferred successfully`,
        amount: job.reward,
        to: { path: "earnings" },
      });
      return;
    }
    if (c.stage === "offer") {
      push({
        ...base,
        category: "Candidates",
        kind: "offer",
        title: "Offer extended",
        context: `${job.title} · ${c.name}`,
        to: { path: "candidates" },
      });
      push({
        ...base,
        category: "Payments",
        kind: "payment",
        title: "Payment pending",
        context: `${job.title} · ${job.reward} on start date`,
        amount: job.reward,
        to: { path: "earnings" },
      });
      return;
    }
    if (c.stage === "rejected") {
      push({
        ...base,
        category: "Candidates",
        kind: "candidate-rejected",
        title: "Candidate rejected",
        context: `${c.name} · ${job.title}${c.note ? ` · ${c.note}` : ""}`,
        to: { path: "candidates" },
      });
      return;
    }
    if (c.stage === "final" || c.stage === "team") {
      push({
        ...base,
        category: "Candidates",
        kind: "interview-scheduled",
        title: "Interview scheduled",
        context: `${c.name} · ${job.title} · ${stageLabel(c.stage)}`,
        to: { path: "candidates" },
      });
      return;
    }
    if (c.stage === "prescreen") {
      push({
        ...base,
        category: "Candidates",
        kind: "shortlisted",
        title: "Candidate shortlisted",
        context: `${c.name} · ${job.title} · ${job.company}`,
        to: { path: "candidates" },
      });
      return;
    }
    if (c.stage === "review") {
      push({
        ...base,
        category: "Applications",
        kind: "submission-approved",
        title: "Candidate submission approved",
        context: `${c.name} · ${job.title} · ${job.company}`,
        to: { path: "candidates" },
      });
      return;
    }
    push({
      ...base,
      category: "Applications",
      kind: "details-requested",
      title: "Candidate details requested",
      context: `${c.name} · ${job.title} · additional information required`,
      to: { path: "candidates" },
    });
  });

  // Job + application state
  jobs.forEach((j) => {
    if (j.status === "approved") {
      push({
        category: "Applications",
        kind: "access-approved",
        title: "Access request approved",
        context: `You can now work on ${j.title} · ${j.company}`,
        time: j.appliedOn ?? j.posted,
        bucket: "earlier",
        jobId: j.id,
        company: j.company,
        to: { path: "job", jobId: j.id },
      });
    }
    if (j.status === "pending") {
      push({
        category: "Jobs",
        kind: "job-new",
        title: "New job matching your profile",
        context: `${j.title} · ${j.company} · ${j.fundingStage}`,
        time: j.posted,
        bucket: "today",
        jobId: j.id,
        company: j.company,
        to: { path: "job", jobId: j.id },
      });
    }
    if (j.status === "rejected") {
      push({
        category: "Applications",
        kind: "access-rejected",
        title: "Access request rejected",
        context: `${j.title} · ${j.rejectionReason ?? "Not approved"}`,
        time: j.rejectedOn ?? j.posted,
        bucket: "earlier",
        jobId: j.id,
        company: j.company,
        to: { path: "job", jobId: j.id },
      });
    }
    if (j.status === "paused") {
      push({
        category: "Jobs",
        kind: "job-paused",
        title: "Job paused",
        context: `${j.title} · ${j.pauseReason ?? "Hiring temporarily paused"}`,
        time: j.posted,
        bucket: "yesterday",
        jobId: j.id,
        company: j.company,
        to: { path: "job", jobId: j.id },
      });
    }
    if (j.status === "archived") {
      push({
        category: "Jobs",
        kind: "job-closed",
        title: "Job closed",
        context: `${j.title} · position filled`,
        time: j.posted,
        bucket: "earlier",
        jobId: j.id,
        company: j.company,
        to: { path: "job", jobId: j.id },
      });
    }
  });

  // Requirement / flag changes on jobs
  activity
    .filter((a) => a.kind === "requirement" || a.kind === "flag")
    .forEach((a) => {
      const job = getJob(a.jobId);
      push({
        category: "Jobs",
        kind: "job-updated",
        title: "Job updated",
        context: `${job?.title ?? a.object} · ${a.event}`,
        time: a.time,
        bucket: a.time.includes("Yesterday") ? "yesterday" : a.time.includes("ago") ? "today" : "earlier",
        jobId: a.jobId,
        company: job?.company ?? "",
        to: { path: "job", jobId: a.jobId },
      });
    });

  activity
    .filter((a) => a.kind === "approve" || a.kind === "advance")
    .forEach((a) => {
      const job = getJob(a.jobId);
      push({
        category: "Candidates",
        kind: "interview-feedback",
        title: a.kind === "approve" ? "Interview feedback received" : "Candidate moved to interview",
        context: `${a.actor} · ${a.object}`,
        time: a.time,
        bucket: a.time.includes("Yesterday") ? "yesterday" : a.time.includes("ago") ? "today" : "earlier",
        jobId: a.jobId,
        candidate: a.object,
        company: job?.company ?? "",
        to: { path: "candidates" },
      });
    });

  return out;
}

export const notifications: Notification[] = build();

/** unread by default: the freshest items in each category */
export const defaultUnread = (list: Notification[]) =>
  list.filter((x) => x.bucket === "today").map((x) => x.id);

export function mapBackendNotification(bn: AppNotification, rank: number): Notification {
  let category: NotifCategory = "Jobs";
  let kind: NotifKind = "job-new";

  const cat = (bn.category || "").toLowerCase();
  const type = (bn.notification_type || "").toLowerCase();
  const title = (bn.title || "").toLowerCase();

  if (type.includes("reject") || title.includes("reject")) {
    category = "Candidates";
    kind = "candidate-rejected";
  } else if (cat.includes("pipeline") || type.includes("pipeline")) {
    category = "Candidates";
    kind = "interview-stage";
  } else if (cat.includes("submi") || type.includes("submi")) {
    category = "Applications";
    kind = "submission-approved";
  } else if (type.includes("access") || type.includes("approve") || title.includes("approved")) {
    category = "Applications";
    kind = "access-approved";
  } else if (cat.includes("job") || type.includes("job")) {
    category = "Jobs";
    kind = "access-approved";
  } else if (cat.includes("message")) {
    category = "Messages";
    kind = "message";
  }

  // Parse time & bucket
  const time = bn.at || "Just now";
  let bucket: NotifBucket = "today";
  if (time.includes("Yesterday") || time.includes("1d ago")) {
    bucket = "yesterday";
  } else if (time.includes("d ago") || time.includes("month") || time.includes("year")) {
    bucket = "earlier";
  }

  const jobId = bn.data?.jobId;
  let to: Notification["to"] = { path: "job", jobId };
  if (bn.link) {
    if (bn.link.includes("/pipeline")) {
      to = { path: "candidates", jobId };
    } else if (bn.link.includes("/messages")) {
      to = { path: "messages", jobId };
    } else if (bn.link.includes("/profile")) {
      to = { path: "earnings" };
    }
  }

  return {
    id: bn.id,
    backendId: bn.id,
    category,
    kind,
    title: bn.title,
    context: bn.body,
    time,
    bucket,
    rank,
    jobId,
    candidate: bn.data?.candidateName,
    company: bn.data?.companyName,
    amount: bn.data?.bounty,
    to,
    link: bn.link,
    read: bn.read,
  };
}

export async function fetchNotifications(category?: string): Promise<NotificationResponse> {
  const query = category && category !== "All" ? `?category=${encodeURIComponent(category)}` : "";
  try {
    const res = await api.get<NotificationResponse | AppNotification[]>(`/api/notifications/${query}`);
    if (Array.isArray(res)) {
      const unread = res.filter((n) => !n.read).length;
      return { count: res.length, unread_count: unread, results: res };
    }
    return {
      count: res?.count ?? (res?.results?.length || 0),
      unread_count: res?.unread_count ?? (res?.results?.filter((n) => !n.read).length || 0),
      results: res?.results || [],
    };
  } catch (err) {
    console.warn("Failed to fetch notifications:", err);
    return { count: 0, unread_count: 0, results: [] };
  }
}

export async function markNotificationAsRead(id: string): Promise<boolean> {
  try {
    await api.post(`/api/notifications/${id}/read/`, {});
    return true;
  } catch (err) {
    console.warn(`Failed to mark notification ${id} as read:`, err);
    return false;
  }
}

export async function markAllNotificationsAsRead(): Promise<boolean> {
  try {
    await api.post("/api/notifications/mark-all-read/", {});
    return true;
  } catch (err) {
    console.warn("Failed to mark all notifications as read:", err);
    return false;
  }
}

export function useNotifications(options: { pollInterval?: number; enabled?: boolean } = {}) {
  const { pollInterval = 30000, enabled = true } = options;
  const { isAuthenticated } = useAuth();
  const [notificationsList, setNotificationsList] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const load = useCallback(async () => {
    if (!isAuthenticated || !enabled) return;
    try {
      const data = await fetchNotifications();
      setNotificationsList(data.results);
      setUnreadCount(data.unread_count);
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, enabled]);

  useEffect(() => {
    if (!isAuthenticated || !enabled) {
      setNotificationsList([]);
      setUnreadCount(0);
      return;
    }

    setIsLoading(true);
    load();

    if (pollInterval > 0) {
      const timer = setInterval(load, pollInterval);
      return () => clearInterval(timer);
    }
  }, [isAuthenticated, enabled, load, pollInterval]);

  const markAsRead = useCallback(
    async (id: string) => {
      setNotificationsList((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      await markNotificationAsRead(id);
    },
    [],
  );

  const markAllAsRead = useCallback(async () => {
    setNotificationsList((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await markAllNotificationsAsRead();
  }, []);

  return {
    notifications: notificationsList,
    unreadCount,
    isLoading,
    refresh: load,
    markAsRead,
    markAllAsRead,
  };
}
