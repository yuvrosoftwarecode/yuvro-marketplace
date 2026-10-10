import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Briefcase, Inbox, Loader2, Sparkles } from "lucide-react";
import { CompanyShell } from "@/components/company/company-shell";
import { stageToneOf } from "@/components/company/review-bits";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, SearchBar } from "@/components/app/primitives";
import { cn } from "@/lib/utils";
import { type CandidateStage } from "@/lib/am-data";
import {
  reviewRowsForJob,
  stageCounts,
  stageLabel,
  type ReviewRow,
} from "@/lib/company-review";
import { formatLogTime, useReviewStore } from "@/lib/company-review-store";
import { api } from "@/lib/api";

export const Route = createFileRoute("/company/jobs/$jobId")({
  head: () => ({
    meta: [
      { title: "Job candidates — Company Portal" },
      {
        name: "description",
        content:
          "Vetted submissions waiting for your decision, with match evidence, resumes and stage moves.",
      },
      { property: "og:title", content: "Candidates to Review — Company Portal" },
      {
        property: "og:description",
        content:
          "Review candidates, inspect evidence and move them forward in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JobCandidatesPage,
});

interface JobData {
  id: string;
  title: string;
  location: string;
  department: string;
  work_model: string;
  employment_type: string;
  status: string;
}

function formatWorkModel(wm?: string): string {
  const s = String(wm || "").toLowerCase();
  if (s.includes("remote")) return "Remote";
  if (s.includes("site")) return "On-site";
  return "Hybrid";
}

function JobCandidatesPage() {
  const { jobId } = Route.useParams();
  const [job, setJob] = useState<JobData | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const { stages, log } = useReviewStore();

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    async function loadJobAndSubmissions() {
      try {
        const [jobRes, subsRes] = await Promise.allSettled([
          api.get<any>(`/api/marketplace/jobs/${jobId}/`),
          api.get<any>(`/api/recruiting/submissions/?application__job=${jobId}`),
        ]);

        if (!isMounted) return;

        if (jobRes.status === "fulfilled" && jobRes.value) {
          const j = jobRes.value;
          setJob({
            id: j.id,
            title: j.title || "Job Post",
            location: j.location || "Remote",
            department: j.department || "General",
            work_model: formatWorkModel(j.work_model),
            employment_type: j.employment_type || "Full-time",
            status: (j.status || "active").toLowerCase(),
          });
        }

        if (subsRes.status === "fulfilled") {
          const rawSubs = Array.isArray(subsRes.value)
            ? subsRes.value
            : subsRes.value?.results || [];
          setSubmissions(rawSubs);
        }
      } catch (err) {
        console.error("Failed to load job details:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadJobAndSubmissions();

    return () => {
      isMounted = false;
    };
  }, [jobId]);

  // Map real submissions to ReviewRow
  const rows: ReviewRow[] = useMemo(() => {
    if (!job) return [];
    if (!submissions || submissions.length === 0) {
      // If no real submissions, check if mock store has anything
      const mockRows = reviewRowsForJob(jobId, stages);
      if (mockRows.length > 0) return mockRows;
      return [];
    }

    return submissions
      .filter((s) => {
        const rawStage = (s.stage || "").toLowerCase();
        // Hide submissions still in AM review
        return (
          rawStage !== "am_review" &&
          rawStage !== "submitted" &&
          rawStage !== "pending" &&
          Boolean(rawStage)
        );
      })
      .map((s) => {
      const cand = s.candidate || {};
      const app = s.application || {};
      const candName =
        cand.full_name ||
        `${cand.first_name || ""} ${cand.last_name || ""}`.trim() ||
        "Candidate";

      let stageVal: CandidateStage = "company_review";
      const rawStage = (s.stage || "").toLowerCase();
      if (
        rawStage === "company_review" ||
        rawStage === "interview" ||
        rawStage === "final" ||
        rawStage === "offer" ||
        rawStage === "hired" ||
        rawStage === "rejected"
      ) {
        stageVal = rawStage as CandidateStage;
      }

      const dateStr = s.updated_at || s.submitted_at;
      const formattedDate = dateStr
        ? new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "Recent";

      return {
        submission: {
          id: s.id,
          jobId: job.id,
          candidateId: cand.id || s.id,
          recruiterId: app.recruiter?.id || "",
          status: s.status || "submitted",
          stage: stageVal,
          match: 92,
          lastActivity: formattedDate,
          submittedAt: formattedDate,
          answers: s.answers || [],
          evaluations: [],
          notes: [],
          timeline: [],
        } as any,
        candidate: {
          id: cand.id || s.id,
          name: candName,
          email: cand.email || "",
          phone: cand.phone || "",
          currentRole: cand.current_title || "Candidate",
          currentCompany: cand.current_company || "Available",
          location: cand.current_location || "Remote",
          yearsExperience: 5,
          skills: [],
          noticePeriod: cand.notice_period || cand.availability || "Immediate",
          expectedSalary:
            cand.compensation ||
            (cand.base_compensation_expectation
              ? `$${cand.base_compensation_expectation}`
              : "Competitive"),
          linkedin: cand.linkedin_url,
          github: cand.github_url,
          portfolio: cand.portfolio_url,
          resumeUrl: cand.resume_url || cand.resume,
        } as any,
        job: {
          id: job.id,
          companyId: "",
          title: job.title,
          department: job.department,
          location: job.location,
          workModel: job.work_model,
          employmentType: job.employment_type,
          status: job.status,
          candidatesCount: submissions.length,
          activeCount: submissions.length,
          lastActivity: "Recent",
        } as any,
        recruiter: app.recruiter
          ? ({
              id: app.recruiter.id,
              name: app.recruiter.full_name || app.recruiter.email,
              email: app.recruiter.email,
              agency: "Independent",
              status: "active",
            } as any)
          : null,
        stage: stageVal,
      };
    });
  }, [job, submissions, jobId, stages]);

  const counts = useMemo(() => stageCounts(rows), [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (stageFilter !== "all" && r.stage !== stageFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return [
        r.candidate.name,
        r.candidate.currentRole,
        r.candidate.currentCompany,
        r.recruiter?.name ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, stageFilter, query]);

  const jobLog = log
    .filter((l) => rows.some((r) => r.submission.id === l.submissionId))
    .slice(0, 8);

  if (isLoading) {
    return (
      <CompanyShell title="Job candidates" description="Loading job details...">
        <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-surface">
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-brand" />
            <span>Loading candidates...</span>
          </div>
        </div>
      </CompanyShell>
    );
  }

  if (!job) {
    return (
      <CompanyShell title="Job not found">
        <EmptyState
          icon={<Briefcase className="size-5" />}
          title="Job not found"
          description="This job no longer exists or you do not have permission to view it."
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/company/candidates/review">Back to Review</Link>
            </Button>
          }
        />
      </CompanyShell>
    );
  }

  return (
    <CompanyShell
      title={job.title}
      description={`${job.department} · ${job.location} · ${job.work_model}${
        (job as any).created_by_detail?.name
          ? ` · Added by ${(job as any).created_by_detail.name}`
          : ""
      }`}
    >
      <div className="space-y-4">
        <Link
          to="/company/candidates/review"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to jobs
        </Link>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-2 sm:flex-row sm:items-center">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search candidates or recruiters"
            className="sm:max-w-xs"
          />
          <div className="scroll-slim flex items-center gap-1 overflow-x-auto rounded-md bg-surface-sunken p-1 sm:ml-auto">
            <StageTab
              label="All"
              count={rows.length}
              active={stageFilter === "all"}
              onClick={() => setStageFilter("all")}
            />
            {counts
              .filter((c) => c.count > 0)
              .map((c) => (
                <StageTab
                  key={c.stage}
                  label={stageLabel(c.stage)}
                  count={c.count}
                  active={stageFilter === c.stage}
                  onClick={() => setStageFilter(c.stage)}
                />
              ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-panel">
          <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_140px_160px_90px] gap-4 border-b border-border bg-surface-sunken px-4 py-2.5 md:grid">
            <span className="label-caps">Candidate</span>
            <span className="label-caps">Submitted by</span>
            <span className="label-caps">Stage</span>
            <span className="label-caps">AI match</span>
            <span />
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Inbox className="size-5" />}
              title={query ? "No candidates found" : "You're all caught up"}
              description={
                query
                  ? "Try a different search keyword."
                  : "No vetted candidates currently waiting for review for this role."
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((r) => (
                <CandidateRow key={r.submission.id} row={r} />
              ))}
            </ul>
          )}
        </div>

        {jobLog.length ? (
          <div className="rounded-lg border border-border bg-surface shadow-panel">
            <p className="label-caps border-b border-border px-4 py-2.5">
              Your recent decisions
            </p>
            <ul className="divide-y divide-border">
              {jobLog.map((l) => (
                <li key={l.id} className="px-4 py-2.5 text-[13px]">
                  <span className="font-medium text-foreground">
                    {l.candidate}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {stageLabel(l.from)} → {stageLabel(l.to)}
                    {l.reason ? ` · ${l.reason}` : ""}
                  </span>
                  <p className="num mt-0.5 text-xs text-muted-foreground">
                    {formatLogTime(l.at)} · {l.by}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </CompanyShell>
  );
}

function StageTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded px-3 text-[13px] font-medium transition-all",
        active
          ? "bg-surface text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
      <span
        className={cn(
          "num rounded-full px-1.5 text-[11px]",
          active
            ? "bg-brand text-brand-foreground"
            : "bg-border text-muted-foreground"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function CandidateRow({ row }: { row: ReviewRow }) {
  const { candidate, submission, recruiter, stage } = row;
  const initials = (candidate.name || "C")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const m = submission.match || 90;

  return (
    <li>
      <Link
        to="/company/candidates/$submissionId"
        params={{ submissionId: submission.id }}
        className="group grid items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-sunken md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_140px_160px_90px] md:gap-4"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-deep text-xs font-semibold text-on-deep">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-foreground">
              {candidate.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {candidate.currentRole} · {candidate.currentCompany} ·{" "}
              {candidate.location}
            </p>
          </div>
        </div>
        <div className="min-w-0 text-xs text-muted-foreground">
          <p className="truncate text-[13px] text-foreground">
            {recruiter ? recruiter.name : "Yuvro sourcing"}
          </p>
          <p className="num">{submission.submittedAt}</p>
        </div>
        <div>
          <StatusBadge tone={stageToneOf(stage)} dot>
            {stageLabel(stage)}
          </StatusBadge>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 shrink-0 text-brand" />
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${m}%` }}
            />
          </div>
          <span className="num w-9 text-right text-xs font-semibold text-foreground">
            {m}%
          </span>
        </div>
        <span className="inline-flex items-center justify-end gap-1 text-xs font-semibold text-brand">
          Review{" "}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </li>
  );
}
