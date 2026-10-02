import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BriefcaseBusiness,
  Github,
  Linkedin,
  Loader2,
  Network,
  Plus,
  Sparkles,
} from "lucide-react";
import { CompanyShell } from "@/components/company/company-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { normalizeUrl } from "@/lib/company-review";
import { api } from "@/lib/api";

export const Route = createFileRoute("/company/candidates/active")({
  head: () => ({
    meta: [
      { title: "Active Pipeline — Company Portal" },
      {
        name: "description",
        content:
          "Candidates in interview loops with stage, owner and next scheduled step.",
      },
      { property: "og:title", content: "Active Pipeline — Company Portal" },
      {
        property: "og:description",
        content: "Track interview progress across every open role.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActivePage,
});

export interface CompanyJob {
  id: string;
  title: string;
  location: string;
  department?: string;
  status: string;
  work_model?: string;
  employment_type?: string;
  hiring_process?: string[] | string;
  process?: string[] | string;
  company?: {
    id: string;
    name: string;
  };
}

export type StageTone = "brand" | "info" | "success" | "warning" | "default";

export interface PipelineStageItem {
  id: string;
  label: string;
  tone: string;
  badgeTone: StageTone;
  index: number;
}

const TONES: { column: string; badge: StageTone }[] = [
  { column: "border-t-warning bg-warning-soft/25", badge: "warning" },
  { column: "border-t-info bg-info-soft/25", badge: "info" },
  { column: "border-t-brand bg-brand-soft/25", badge: "brand" },
  { column: "border-t-purple-500 bg-purple-500/10", badge: "default" },
  { column: "border-t-success bg-success-soft/25", badge: "success" },
  { column: "border-t-emerald-500 bg-emerald-500/25", badge: "success" },
];

export function getStagesForJob(job?: CompanyJob | null): PipelineStageItem[] {
  let raw: string[] = [];
  if (Array.isArray(job?.hiring_process) && job.hiring_process.length > 0) {
    raw = job.hiring_process;
  } else if (
    typeof job?.hiring_process === "string" &&
    job.hiring_process.trim()
  ) {
    try {
      const parsed = JSON.parse(job.hiring_process);
      if (Array.isArray(parsed) && parsed.length > 0) raw = parsed;
    } catch {
      raw = job.hiring_process
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  } else if (Array.isArray(job?.process) && job.process.length > 0) {
    raw = job.process;
  }

  // Filter out AM review and rejected stages from company pipeline board
  raw = raw.filter((step) => {
    const lower = step.toLowerCase().trim();
    return (
      lower !== "account manager review" &&
      lower !== "am review" &&
      lower !== "am_review" &&
      lower !== "rejected"
    );
  });

  if (raw.length === 0) {
    raw = ["Company review", "Interview", "Final", "Offer", "Hired"];
  }

  return raw.map((step, idx) => {
    const toneConfig = TONES[idx % TONES.length];
    const cleanId =
      step
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || `step_${idx}`;
    return {
      id: cleanId,
      label: step,
      tone: toneConfig.column,
      badgeTone: toneConfig.badge,
      index: idx,
    };
  });
}

export function findMatchingStage(
  submissionStage: string,
  stages: PipelineStageItem[]
): PipelineStageItem {
  if (!stages.length) {
    return {
      id: "default",
      label: "Review",
      tone: "border-t-warning bg-warning-soft/25",
      badgeTone: "warning",
      index: 0,
    };
  }
  const cleanSubStage = (submissionStage || "").toLowerCase().trim();
  const normalizedSub = cleanSubStage
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  // 1. Direct ID or label match
  const found = stages.find(
    (s) =>
      s.id === normalizedSub ||
      s.label.toLowerCase() === cleanSubStage ||
      cleanSubStage === s.label.toLowerCase() ||
      s.id.includes(normalizedSub) ||
      (normalizedSub && normalizedSub.includes(s.id))
  );
  if (found) return found;

  // 2. Standard review stages -> First stage in the pipeline
  if (
    cleanSubStage === "company_review" ||
    cleanSubStage === "screening"
  ) {
    return stages[0];
  }

  // 3. Interview stage
  if (cleanSubStage === "interview") {
    const interviewStage =
      stages.find((s) => s.label.toLowerCase().includes("interview")) ||
      stages[Math.min(1, stages.length - 1)];
    return interviewStage;
  }

  // 4. Final stage
  if (cleanSubStage === "final") {
    const finalStage =
      stages.find((s) => s.label.toLowerCase().includes("final")) ||
      stages[Math.max(0, stages.length - 2)];
    return finalStage;
  }

  // 5. Offer/Hired stage
  if (cleanSubStage === "offer" || cleanSubStage === "hired") {
    const offerStage =
      stages.find(
        (s) =>
          s.label.toLowerCase().includes("offer") ||
          s.label.toLowerCase().includes("hire")
      ) || stages[stages.length - 1];
    return offerStage;
  }

  // Fallback to first stage
  return stages[0];
}

export type ActiveRow = {
  submission: {
    id: string;
    jobId: string;
    match: number;
    lastActivity: string;
    status: string;
  };
  candidate: {
    id: string;
    name: string;
    currentRole: string;
    currentCompany: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
    email?: string;
  };
  job: {
    id: string;
    title: string;
    location: string;
    department: string;
  };
  stageItem: PipelineStageItem;
};

function ActivePage() {
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [jobId, setJobId] = useState<string>("");
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);

  // 1. Fetch authenticated company and its jobs
  useEffect(() => {
    let isMounted = true;

    async function loadCompanyJobs() {
      setIsLoadingJobs(true);
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
          // If unauthenticated or no company profile, continue
        }

        const endpoint = companyId
          ? `/api/marketplace/jobs/?company=${companyId}`
          : "/api/marketplace/jobs/";

        const res = await api.get<any>(endpoint);
        const jobList: CompanyJob[] = Array.isArray(res)
          ? res
          : res?.results || [];

        if (!isMounted) return;
        setJobs(jobList);
        if (jobList.length > 0) {
          setJobId(jobList[0].id);
        }
      } catch (err) {
        console.error("Failed to load company jobs:", err);
      } finally {
        if (isMounted) setIsLoadingJobs(false);
      }
    }

    loadCompanyJobs();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch candidate submissions whenever selected role changes
  useEffect(() => {
    if (!jobId) {
      setSubmissions([]);
      return;
    }

    let isMounted = true;

    async function loadSubmissions() {
      setIsLoadingSubmissions(true);
      try {
        const res = await api.get<any>(
          `/api/recruiting/submissions/?application__job=${jobId}`
        );
        const list: any[] = Array.isArray(res) ? res : res?.results || [];
        if (!isMounted) return;
        setSubmissions(list);
      } catch (err) {
        console.error("Failed to load candidate submissions:", err);
        if (isMounted) setSubmissions([]);
      } finally {
        if (isMounted) setIsLoadingSubmissions(false);
      }
    }

    loadSubmissions();

    return () => {
      isMounted = false;
    };
  }, [jobId]);

  const selectedJob = jobs.find((j) => j.id === jobId) || jobs[0];
  const stages = useMemo(() => getStagesForJob(selectedJob), [selectedJob]);

  // Map real backend submissions to ActiveRow using job-specific stages
  const rows: ActiveRow[] = useMemo(() => {
    if (!submissions || submissions.length === 0) return [];

    return submissions
      .filter((s) => {
        const status = (s.status || "").toLowerCase();
        const rawStage = (s.stage || "").toLowerCase();

        // 1. First candidate is in AM review. Only show in company pipeline if moved to next stage by AM!
        if (
          rawStage === "am_review" ||
          rawStage === "submitted" ||
          rawStage === "pending" ||
          !rawStage
        ) {
          return false;
        }

        // 2. Hide rejected candidates from active pipeline
        if (
          status === "rejected" ||
          rawStage === "rejected" ||
          status === "company_rejected" ||
          status === "am_rejected"
        ) {
          return false;
        }

        return true;
      })
      .map((s) => {
        const cand = s.candidate || {};
        const app = s.application || {};
        const matchedStage = findMatchingStage(s.stage, stages);

        const candName =
          cand.full_name ||
          `${cand.first_name || ""} ${cand.last_name || ""}`.trim() ||
          "Candidate";

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
            jobId: app.job?.id || jobId,
            match: 92,
            lastActivity: formattedDate,
            status: s.status || "submitted",
          },
          candidate: {
            id: cand.id || s.id,
            name: candName,
            currentRole: cand.current_title || "Candidate",
            currentCompany: cand.current_company || "Available",
            linkedin: cand.linkedin_url,
            github: cand.github_url,
            portfolio: cand.portfolio_url,
            email: cand.email,
          },
          job: {
            id: app.job?.id || selectedJob?.id || jobId,
            title: app.job?.title || selectedJob?.title || "Role",
            location:
              app.job?.location || selectedJob?.location || "Remote",
            department:
              app.job?.department || selectedJob?.department || "General",
          },
          stageItem: matchedStage,
        };
      });
  }, [submissions, jobId, selectedJob, stages]);

  return (
    <CompanyShell
      title="Active pipeline"
      description="Everyone currently moving through your hiring process."
      actions={
        <div className="flex items-center gap-2">
          <span className="label-caps hidden text-[10px] sm:block">Role</span>
          <Select
            value={selectedJob?.id ?? ""}
            onValueChange={setJobId}
            disabled={isLoadingJobs || jobs.length === 0}
          >
            <SelectTrigger
              aria-label="Filter pipeline by role"
              className="h-8 w-[240px] gap-1.5 rounded-md bg-surface px-2.5 text-xs shadow-panel sm:w-[280px]"
            >
              <SelectValue
                placeholder={
                  isLoadingJobs
                    ? "Loading roles..."
                    : jobs.length === 0
                      ? "No roles available"
                      : "Select a role"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {jobs.map((role) => (
                <SelectItem key={role.id} value={role.id} className="text-xs">
                  {role.title} · {role.location || role.work_model || "Remote"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="mx-auto max-w-[1600px] space-y-4">
        {isLoadingJobs ? (
          <div className="flex h-64 items-center justify-center rounded-md border border-border bg-surface shadow-panel">
            <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-brand" />
              <span>Loading company roles...</span>
            </div>
          </div>
        ) : selectedJob ? (
          <section className="overflow-hidden rounded-md border border-border bg-surface shadow-panel">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <BriefcaseBusiness className="size-4 text-brand" />
                  <h2 className="text-[15px] font-semibold text-foreground">
                    {selectedJob.title}
                  </h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedJob.location || selectedJob.work_model || "Remote"}
                  {stages.length > 0
                    ? ` · ${stages.length}-stage hiring process (${stages.map((s) => s.label).join(" → ")})`
                    : selectedJob.department
                      ? ` · ${selectedJob.department} interview plan`
                      : " · Standard interview plan"}
                </p>
              </div>
              <span className="num text-xs text-muted-foreground">
                {rows.length} {rows.length === 1 ? "candidate" : "candidates"}
              </span>
            </header>
            <ActivePipeline
              stages={stages}
              rows={rows}
              isLoading={isLoadingSubmissions}
            />
          </section>
        ) : (
          <div className="rounded-md border border-dashed border-border bg-surface px-6 py-16 text-center">
            <BriefcaseBusiness className="mx-auto size-8 text-muted-foreground/60" />
            <h3 className="mt-3 text-sm font-semibold text-foreground">
              No roles posted yet
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              Your company doesn't have any jobs listed yet. Post a role to start
              receiving vetted candidates into your pipeline.
            </p>
            <Button asChild size="sm" className="mt-4 gap-1.5">
              <Link to="/company/jobs/new">
                <Plus className="size-3.5" />
                Create a job
              </Link>
            </Button>
          </div>
        )}
      </div>
    </CompanyShell>
  );
}

function CandidatePipelineCard({ row }: { row: ActiveRow }) {
  const { candidate, submission, stageItem } = row;
  const initials = (candidate.name || "C")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const links = [
    candidate.linkedin
      ? {
          label: "LinkedIn",
          href: normalizeUrl(candidate.linkedin),
          icon: Linkedin,
        }
      : null,
    candidate.github
      ? { label: "GitHub", href: normalizeUrl(candidate.github), icon: Github }
      : null,
    candidate.portfolio
      ? {
          label: "Portfolio",
          href: normalizeUrl(candidate.portfolio),
          icon: Network,
        }
      : null,
  ].filter(
    (item): item is { label: string; href: string; icon: typeof Linkedin } =>
      item !== null
  );

  return (
    <article className="group relative rounded-md border border-border bg-surface p-3 shadow-panel transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-raised">
      <Link
        to="/company/candidates/$submissionId"
        params={{ submissionId: submission.id }}
        aria-label={`Open ${candidate.name}'s candidate profile`}
        className="absolute inset-0 z-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="pointer-events-none relative z-[1] flex items-start gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-surface-sunken text-[11px] font-semibold text-foreground">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[13px] font-semibold text-foreground">
            {candidate.name}
          </h3>
          <p className="truncate text-xs text-muted-foreground">
            {candidate.currentRole}
          </p>
        </div>
        <span className="num text-[11px] font-semibold text-foreground">
          {submission.match}%
        </span>
      </div>

      {candidate.currentCompany && candidate.currentCompany !== "—" ? (
        <div className="pointer-events-none relative z-[1] mt-2.5 border-t border-border pt-2">
          <p className="truncate text-xs font-medium text-foreground">
            {candidate.currentCompany}
          </p>
        </div>
      ) : null}

      <div className="relative z-10 mt-3 flex min-h-7 flex-wrap items-center gap-1.5 border-t border-border pt-2.5">
        {links.length ? (
          links.map(({ label, href, icon: Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={`${candidate.name} ${label}`}
              title={label}
              className="grid size-7 place-items-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:border-border-strong hover:bg-surface-sunken hover:text-foreground"
            >
              <Icon className="size-3.5" />
            </a>
          ))
        ) : (
          <span className="text-[11px] text-muted-foreground">
            No profile links
          </span>
        )}
        <span className="num ml-auto text-[10px] text-muted-foreground">
          {submission.lastActivity}
        </span>
      </div>
    </article>
  );
}

function ActivePipeline({
  stages,
  rows,
  isLoading,
}: {
  stages: PipelineStageItem[];
  rows: ActiveRow[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center bg-surface-sunken">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-brand" />
          <span>Loading candidates...</span>
        </div>
      </div>
    );
  }

  // Calculate minimum column width based on number of stages
  const minColWidth =
    stages.length <= 3 ? "280px" : stages.length <= 5 ? "220px" : "180px";

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <div className="mx-3 mt-3 flex items-center gap-2.5 rounded-md border border-border bg-surface px-4 py-3 text-xs text-muted-foreground">
          <Sparkles className="size-4 shrink-0 text-brand" />
          <span>
            No candidates currently in the interview pipeline for this role.
            Curated candidate submissions will appear here once submitted and
            vetted.
          </span>
        </div>
      )}
      <div className="scroll-slim overflow-x-auto bg-surface-sunken">
        <div
          className="grid min-w-[760px]"
          style={{
            gridTemplateColumns: `repeat(${stages.length}, minmax(${minColWidth}, 1fr))`,
          }}
        >
          {stages.map((stage) => {
            const items = rows.filter(
              (row) => row.stageItem.id === stage.id
            );
            return (
              <section
                key={stage.id}
                className={cn(
                  "min-h-[520px] border-r border-t-2 border-border last:border-r-0",
                  stage.tone
                )}
              >
                <header className="flex h-12 items-center justify-between border-b border-border bg-surface/90 px-3">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="grid size-4 shrink-0 place-items-center rounded-full bg-surface-sunken text-[10px] font-semibold text-muted-foreground">
                      {stage.index + 1}
                    </span>
                    <h3 className="truncate text-xs font-semibold text-foreground">
                      {stage.label}
                    </h3>
                  </div>
                  <span className="num grid min-w-6 place-items-center rounded border border-border bg-surface-sunken px-1.5 py-0.5 text-[11px] font-semibold text-foreground">
                    {items.length}
                  </span>
                </header>
                <div className="space-y-2.5 p-2.5">
                  {items.length ? (
                    items.map((row) => (
                      <CandidatePipelineCard
                        key={row.submission.id}
                        row={row}
                      />
                    ))
                  ) : (
                    <div className="rounded border border-dashed border-border/60 bg-surface/30 px-2 py-8 text-center text-[11px] text-muted-foreground">
                      No candidates
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
