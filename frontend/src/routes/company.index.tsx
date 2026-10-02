import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  LogOut,
  Sparkles,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { CompanyShell } from "@/components/company/company-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { getStageLabel } from "@/lib/am-data";
import { authService } from "@/services/authService";

export const Route = createFileRoute("/company/")({
  head: () => ({
    meta: [
      { title: "Company Workspace — Yuvro Marketplace" },
      {
        name: "description",
        content: "Your hiring workspace: open roles, vetted submissions awaiting review and upcoming interviews.",
      },
      { property: "og:title", content: "Company Workspace — Yuvro Marketplace" },
      {
        property: "og:description",
        content: "Review approved submissions, share feedback and track interviews for your open roles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompanyHomePage,
});

interface CompanyJob {
  id: string;
  title: string;
  department?: string;
  location?: string;
  status: string;
  work_model?: string;
  employment_type?: string;
  hiring_process?: string[] | string;
  created_at?: string;
}

interface OverviewCandidateItem {
  id: string;
  submissionId: string;
  name: string;
  role: string;
  jobTitle: string;
  jobId: string;
  stage: string;
  status: string;
  match: number;
  initials: string;
  dateStr?: string;
  timingStr?: string;
  updatedAt?: string;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "Recently";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return "Recent";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Recent";
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CompanyHomePage() {
  const navigate = useNavigate();
  const [company, setCompany] = useState<any>(null);
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadOverview() {
      setIsLoading(true);
      try {
        let companyData: any = null;
        try {
          companyData = await api.get<any>("/api/marketplace/companies/my/");
          if (companyData && isMounted) {
            setCompany(companyData);
          }
        } catch (e) {
          console.warn("Could not fetch my company:", e);
        }

        const companyId = companyData?.id;
        const jobsUrl = companyId ? `/api/marketplace/jobs/?company=${companyId}` : "/api/marketplace/jobs/";

        const [jobsRes, subsRes] = await Promise.allSettled([
          api.get<any>(jobsUrl),
          api.get<any>("/api/recruiting/submissions/"),
        ]);

        const rawJobs: CompanyJob[] =
          jobsRes.status === "fulfilled"
            ? Array.isArray(jobsRes.value)
              ? jobsRes.value
              : jobsRes.value?.results || []
            : [];

        const rawSubs: any[] =
          subsRes.status === "fulfilled"
            ? Array.isArray(subsRes.value)
              ? subsRes.value
              : subsRes.value?.results || []
            : [];

        if (isMounted) {
          setJobs(rawJobs);
          setSubmissions(rawSubs);
        }
      } catch (err) {
        console.error("Failed to load company overview data:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOverview();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSignOut = () => {
    authService.logout();
    navigate({ to: "/company/login" });
  };

  const openJobs = useMemo(
    () => jobs.filter((job) => job.status === "active" || job.status === "hiring"),
    [jobs]
  );

  const departmentsCount = useMemo(() => {
    const deps = new Set(openJobs.map((j) => j.department || "Engineering").filter(Boolean));
    return deps.size || 1;
  }, [openJobs]);

  // Partition candidates into: Needs Review, Active Interviews, Upcoming Joiners
  const { reviewItems, interviewItems, joinerItems } = useMemo(() => {
    const reviewList: OverviewCandidateItem[] = [];
    const interviewList: OverviewCandidateItem[] = [];
    const joinerList: OverviewCandidateItem[] = [];

    const amReviewStages = ["am_review", "submitted", "pending", ""];

    for (const sub of submissions) {
      const status = (sub.status || "").toLowerCase();
      const rawStage = (sub.stage || "").toLowerCase();

      // Filter out AM review and pending candidates
      if (amReviewStages.includes(rawStage) || !rawStage) continue;
      // Filter out rejected candidates
      if (
        status === "rejected" ||
        rawStage === "rejected" ||
        status === "company_rejected" ||
        status === "am_rejected"
      ) {
        continue;
      }

      const cand = sub.candidate || {};
      const jobData = sub.application?.job || {};
      const candName =
        cand.full_name ||
        `${cand.first_name || ""} ${cand.last_name || ""}`.trim() ||
        "Candidate";

      const initials =
        candName
          .split(" ")
          .map((part: string) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() || "CD";

      let matchScore = 90;
      if (typeof sub.match === "number") matchScore = sub.match;
      else if (typeof sub.match_score === "number") matchScore = sub.match_score;
      else if (sub.ai?.score) matchScore = sub.ai.score;

      const item: OverviewCandidateItem = {
        id: cand.id || sub.id,
        submissionId: sub.id,
        name: candName,
        role: cand.current_title || jobData.title || "Candidate",
        jobTitle: jobData.title || "Job Post",
        jobId: jobData.id || "",
        stage: sub.stage || "company_review",
        status: sub.status || "under_review",
        match: matchScore,
        initials,
        dateStr: formatDate(cand.earliest_start_date || sub.updated_at || sub.submitted_at),
        timingStr: cand.notice_period || cand.availability || "Offer stage",
        updatedAt: sub.updated_at || sub.submitted_at,
      };

      // 1. Offer / Hired -> joiners
      if (rawStage === "offer" || rawStage === "hired" || status === "hired") {
        joinerList.push(item);
      }
      // 2. Interview stages -> interviews
      else if (
        rawStage === "interview" ||
        rawStage.includes("interview") ||
        rawStage === "technical_loop" ||
        rawStage === "hiring_manager" ||
        rawStage === "team" ||
        rawStage === "final"
      ) {
        interviewList.push(item);
      }
      // 3. Initial company review stages -> needs review
      else {
        reviewList.push(item);
      }
    }

    return {
      reviewItems: reviewList,
      interviewItems: interviewList,
      joinerItems: joinerList,
    };
  }, [submissions]);

  const metrics = [
    {
      label: "Open roles",
      value: openJobs.length,
      note: `Across ${departmentsCount} team${departmentsCount > 1 ? "s" : ""}`,
      icon: BriefcaseBusiness,
      tone: "brand" as const,
      link: "/company/candidates/review",
    },
    {
      label: "Needs review",
      value: reviewItems.length,
      note: reviewItems.length > 0 ? "Action required" : "All caught up",
      icon: Sparkles,
      tone: "warning" as const,
      link: "/company/candidates/review",
    },
    {
      label: "Interviews",
      value: interviewItems.length,
      note: interviewItems.length > 0 ? `${interviewItems.length} in active loops` : "No active interviews",
      icon: CalendarClock,
      tone: "info" as const,
      link: "/company/candidates/active",
    },
    {
      label: "Upcoming joiners",
      value: joinerItems.length,
      note: joinerItems.length > 0 ? "Offers & hires" : "Next 30 days",
      icon: UserRoundCheck,
      tone: "success" as const,
      link: "/company/candidates/offer",
    },
  ];

  return (
    <CompanyShell
      title="Overview"
      description={
        company?.name
          ? `Hiring workspace for ${company.name} · decisions, interviews and open roles.`
          : "A clear view of hiring activity, decisions, interviews and upcoming starts."
      }
      actions={
        <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-1.5 text-xs">
          <LogOut className="size-3.5" /> Sign out
        </Button>
      }
    >
      <div className="mx-auto w-full max-w-[1440px] space-y-5">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center rounded-lg border border-border bg-surface shadow-panel">
            <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-brand" />
              <span>Loading workspace activity...</span>
            </div>
          </div>
        ) : null}

        {/* 4 Metric Cards */}
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Link
                key={metric.label}
                to={metric.link as any}
                className="group relative overflow-hidden rounded-lg border border-border bg-surface px-4 py-4 shadow-panel transition-colors hover:border-brand/40 hover:bg-surface-sunken/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">{metric.label}</dt>
                    <dd className="num mt-2 text-3xl font-semibold leading-none text-foreground">
                      {metric.value}
                    </dd>
                  </div>
                  <span
                    className={cn("grid size-9 place-items-center rounded-md transition-transform group-hover:scale-105", {
                      "bg-brand-soft text-brand": metric.tone === "brand",
                      "bg-warning-soft text-warning": metric.tone === "warning",
                      "bg-info-soft text-info": metric.tone === "info",
                      "bg-success-soft text-success": metric.tone === "success",
                    })}
                  >
                    <Icon className="size-4" />
                  </span>
                </div>
                <dd className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span
                    className={cn("size-1.5 rounded-full", {
                      "bg-brand": metric.tone === "brand",
                      "bg-warning": metric.tone === "warning",
                      "bg-info": metric.tone === "info",
                      "bg-success": metric.tone === "success",
                    })}
                  />
                  {metric.note}
                </dd>
              </Link>
            );
          })}
        </dl>

        {/* Two Columns: Needs Your Review & Upcoming Joiners */}
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
          {/* Needs your review */}
          <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-panel">
            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Needs your review</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Candidates waiting for your decision</p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/company/candidates/review">
                  View all <ArrowRight className="size-3.5 ml-1" />
                </Link>
              </Button>
            </header>

            {reviewItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-center">
                <CheckCircle2 className="size-8 text-success/70 mb-2" />
                <p className="text-xs font-semibold text-foreground">All caught up!</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  No candidates currently waiting for your review.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {reviewItems.map((item) => (
                  <Link
                    key={item.submissionId}
                    to="/company/candidates/$submissionId"
                    params={{ submissionId: item.submissionId }}
                    className="group grid gap-3 px-4 py-3.5 transition-colors hover:bg-surface-sunken sm:grid-cols-[minmax(0,1fr)_110px_auto] sm:items-center sm:px-5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-brand-soft text-xs font-semibold text-brand">
                          {item.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-foreground group-hover:text-brand">
                          {item.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{item.jobTitle}</p>
                      </div>
                    </div>
                    <div>
                      <p className="num text-[13px] font-semibold text-foreground">{item.match}% match</p>
                      <div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-surface-sunken">
                        <div
                          className="h-full rounded-full bg-success"
                          style={{ width: `${item.match}%` }}
                        />
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
                      Review <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Upcoming joiners */}
          <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-panel">
            <header className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-5">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Upcoming joiners</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Accepted offers starting soon</p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/company/candidates/offer">
                  View all <ArrowRight className="size-3.5 ml-1" />
                </Link>
              </Button>
            </header>

            {joinerItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-center">
                <UserRoundCheck className="size-8 text-muted-foreground/50 mb-2" />
                <p className="text-xs font-semibold text-foreground">No upcoming joiners yet</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Accepted offers and starting candidates will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {joinerItems.map((joiner) => (
                  <Link
                    key={joiner.submissionId}
                    to="/company/candidates/$submissionId"
                    params={{ submissionId: joiner.submissionId }}
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:px-5 hover:bg-surface-sunken transition-colors"
                  >
                    <Avatar className="size-10">
                      <AvatarFallback className="bg-success-soft text-xs font-semibold text-success">
                        {joiner.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-foreground">{joiner.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{joiner.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="num text-[11px] font-medium text-foreground">{joiner.dateStr}</p>
                      <p className="mt-0.5 text-[11px] text-success">{joiner.timingStr}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Bottom Section: Active Interviews & Conversations */}
        <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-panel">
          <header className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Active interview loops</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Candidates in interview and technical stages</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="num rounded-md bg-info-soft px-2 py-1 text-[11px] font-semibold text-info">
                {interviewItems.length} active
              </span>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/company/candidates/active">
                  Pipeline board <ArrowRight className="size-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </header>

          {interviewItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-center">
              <CalendarClock className="size-8 text-muted-foreground/50 mb-2" />
              <p className="text-xs font-semibold text-foreground">No active interviews</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Candidates moved to interview loops will appear here.
              </p>
            </div>
          ) : (
            <div className="grid divide-y divide-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              {interviewItems.map((item) => (
                <Link
                  key={item.submissionId}
                  to="/company/candidates/$submissionId"
                  params={{ submissionId: item.submissionId }}
                  className="flex items-center gap-3 px-4 py-4 sm:px-5 hover:bg-surface-sunken transition-colors group"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-info-soft text-info">
                    <CalendarClock className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-foreground group-hover:text-brand">
                      {item.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{getStageLabel(item.stage)}</span> · {item.jobTitle}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="num text-[11px] font-semibold text-foreground">
                      {formatRelativeTime(item.updatedAt)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-brand flex items-center justify-end gap-1">
                      <span>View details</span>
                      <ArrowRight className="size-3" />
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </CompanyShell>
  );
}
