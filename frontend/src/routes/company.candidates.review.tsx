import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Briefcase, Loader2, Plus } from "lucide-react";
import { CompanyShell } from "@/components/company/company-shell";
import { EmptyState, SearchBar } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

export const Route = createFileRoute("/company/candidates/review")({
  head: () => ({
    meta: [
      { title: "Candidates to Review — Company Portal" },
      {
        name: "description",
        content:
          "All your jobs with candidates waiting for review. Open a job to see its candidates.",
      },
      { property: "og:title", content: "Candidates to Review — Company Portal" },
      {
        property: "og:description",
        content: "Pick a job and review its vetted candidates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReviewPage,
});

export interface ReviewJobItem {
  id: string;
  title: string;
  department?: string;
  employment_type?: string;
  employmentType?: string;
  location?: string;
  work_model?: string;
  workModel?: string;
  status: string;
  candidatesCount: number;
  toReviewCount: number;
  lastActivity: string;
}

type TabId = "active" | "paused" | "closed" | "all";
const tabs: { id: TabId; label: string; match: (j: ReviewJobItem) => boolean }[] = [
  {
    id: "active",
    label: "Active",
    match: (j) => j.status === "active" || j.status === "hiring",
  },
  {
    id: "paused",
    label: "Paused",
    match: (j) =>
      j.status === "paused" ||
      j.status === "pending" ||
      j.status === "draft" ||
      j.status === "pending_approval",
  },
  {
    id: "closed",
    label: "Closed",
    match: (j) =>
      ["filled", "closed", "cancelled", "archived"].includes(j.status),
  },
  { id: "all", label: "All", match: () => true },
];

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return "Recently";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Recently";
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays} d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ReviewPage() {
  const [tab, setTab] = useState<TabId>("active");
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<ReviewJobItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        let companyId = "";
        try {
          const compRes = await api.get<{ id: string; name: string }>(
            "/api/marketplace/companies/my/"
          );
          if (compRes?.id) {
            companyId = compRes.id;
          }
        } catch {
          // ignore
        }

        const jobsUrl = companyId
          ? `/api/marketplace/jobs/?company=${companyId}`
          : "/api/marketplace/jobs/";

        // Fetch company jobs and submissions concurrently
        const [jobsRes, submissionsRes] = await Promise.allSettled([
          api.get<any>(jobsUrl),
          api.get<any>("/api/recruiting/submissions/"),
        ]);

        const rawJobs: any[] =
          jobsRes.status === "fulfilled"
            ? Array.isArray(jobsRes.value)
              ? jobsRes.value
              : jobsRes.value?.results || []
            : [];

        const rawSubmissions: any[] =
          submissionsRes.status === "fulfilled"
            ? Array.isArray(submissionsRes.value)
              ? submissionsRes.value
              : submissionsRes.value?.results || []
            : [];

        if (!isMounted) return;

        // Group submissions by job ID
        const submissionsByJob = new Map<string, any[]>();
        for (const sub of rawSubmissions) {
          const jId = sub.application?.job?.id || sub.job_id || sub.job;
          if (jId) {
            const list = submissionsByJob.get(jId) || [];
            list.push(sub);
            submissionsByJob.set(jId, list);
          }
        }

        // Map to ReviewJobItem
        const formattedJobs: ReviewJobItem[] = rawJobs.map((j) => {
          const jobSubs = submissionsByJob.get(j.id) || [];
          const toReview = jobSubs.filter((s) => {
            const status = (s.status || "").toLowerCase();
            const stage = (s.stage || "").toLowerCase();
            if (
              status === "rejected" ||
              stage === "rejected" ||
              status === "company_rejected" ||
              status === "am_rejected"
            )
              return false;
            // Only count if candidate was moved past AM review to company
            if (
              stage === "am_review" ||
              stage === "submitted" ||
              stage === "pending" ||
              !stage
            ) {
              return false;
            }
            return stage === "company_review" || stage === "screening";
          }).length;

          // Find latest date among submissions and job
          let latestDate = j.updated_at || j.created_at || j.posted_at;
          for (const s of jobSubs) {
            const sDate = s.updated_at || s.submitted_at;
            if (sDate && (!latestDate || new Date(sDate) > new Date(latestDate))) {
              latestDate = sDate;
            }
          }

          const empType =
            j.employment_type || j.employmentType || "Full-time";
          const rawWm = String(j.work_model || j.workModel || "Remote").toLowerCase();
          const workModel = rawWm.includes("remote") ? "Remote" : rawWm.includes("site") ? "On-site" : "Hybrid";

          return {
            id: j.id,
            title: j.title || "Untitled Job",
            department: j.department || "General",
            employment_type: empType,
            location: j.location || "Remote",
            work_model: workModel,
            status: (j.status || "active").toLowerCase(),
            candidatesCount: jobSubs.length,
            toReviewCount: toReview,
            lastActivity: formatRelativeTime(latestDate),
          };
        });

        setJobs(formattedJobs);
      } catch (err) {
        console.error("Failed to load review jobs data:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const current = tabs.find((t) => t.id === tab)!;
  const list = useMemo(() => {
    return jobs
      .filter(current.match)
      .filter((j) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return `${j.title} ${j.department} ${j.location}`
          .toLowerCase()
          .includes(q);
      });
  }, [jobs, current, query]);

  return (
    <CompanyShell
      title="Review"
      description="Choose a job to review the candidates your Account Manager has cleared."
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="scroll-slim flex gap-5 overflow-x-auto border-b border-border">
            {tabs.map((t) => {
              const n = jobs.filter(t.match).length;
              const on = t.id === tab;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-0.5 pb-2.5 text-[13.5px] font-medium transition-colors",
                    on
                      ? "border-brand text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                  <span
                    className={cn(
                      "num rounded-full px-1.5 text-[11px]",
                      on
                        ? "bg-brand text-brand-foreground"
                        : "bg-surface-sunken"
                    )}
                  >
                    {n}
                  </span>
                </button>
              );
            })}
          </div>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search jobs"
            className="sm:max-w-xs"
          />
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-panel">
          <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_110px_110px_130px_80px] gap-4 border-b border-border bg-surface-sunken px-4 py-2.5 md:grid">
            <span className="label-caps">Job</span>
            <span className="label-caps">Location</span>
            <span className="label-caps text-right">Candidates</span>
            <span className="label-caps text-right">To review</span>
            <span className="label-caps">Last activity</span>
            <span />
          </div>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-brand" />
                <span>Loading company jobs...</span>
              </div>
            </div>
          ) : list.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Briefcase className="size-5" />}
                title={
                  jobs.length === 0 ? "No jobs posted yet" : "No jobs here"
                }
                description={
                  jobs.length === 0
                    ? "Post your first role to start receiving candidates for review."
                    : "Jobs in this status will appear here."
                }
                action={
                  jobs.length === 0 ? (
                    <Button asChild size="sm" className="mt-2 gap-1.5">
                      <Link to="/company/jobs/new">
                        <Plus className="size-3.5" />
                        Create a job
                      </Link>
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {list.map((j) => {
                return (
                  <li key={j.id}>
                    <Link
                      to="/company/jobs/$jobId"
                      params={{ jobId: j.id }}
                      className="group grid items-center gap-2 px-4 py-3.5 transition-colors hover:bg-surface-sunken md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_110px_110px_130px_80px] md:gap-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-brand-soft text-brand">
                          <Briefcase className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-foreground">
                            {j.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {j.department} · {j.employment_type}
                          </p>
                        </div>
                      </div>
                      <p className="truncate text-[13px] text-muted-foreground">
                        {j.location} · {j.work_model}
                      </p>
                      <p className="num text-[13px] font-medium text-foreground md:text-right">
                        {j.candidatesCount}
                      </p>
                      <div className="md:text-right">
                        {j.toReviewCount > 0 ? (
                          <span className="num rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning">
                            {j.toReviewCount} waiting
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {j.lastActivity}
                      </p>
                      <span className="inline-flex items-center justify-end gap-1 text-xs font-semibold text-brand">
                        Open{" "}
                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </CompanyShell>
  );
}
