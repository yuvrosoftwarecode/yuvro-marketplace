import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeft,
  Banknote,
  BriefcaseBusiness,
  Download,
  Clock3,
  FileText,
  Globe,
  MapPin,
  MessageSquare,
  MessageSquareQuote,
  Send,
  Users,
  Workflow,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { CompanyMark } from "@/components/app/primitives";
import { StatusBadge, clientStatusTone } from "@/components/app/status-badge";
import { getJob, statusLabel, type Job } from "@/lib/data";
import { cn } from "@/lib/utils";
import { downloadJobPdf } from "@/lib/job-pdf";
import { useJobOrigin } from "@/lib/job-origin";
import { useEffect, useState } from "react";
import { fetchRecruiterJobById } from "@/lib/recruiter-jobs";
import { useJobContext } from "@/components/app/job-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api } from "@/lib/api";

export const Route = createFileRoute("/jobs/$jobId")({
  loader: ({ params }) => {
    const job = getJob(params.jobId);
    return { job: job || null, jobId: params.jobId };
  },
  component: JobWorkspaceLayout,
});

export const jobWorkspaceTabs = [
  { to: "/jobs/$jobId" as const, label: "Job Details", icon: FileText, exact: true },
  { to: "/jobs/$jobId/submit" as const, label: "Submit Candidate", icon: Send, exact: false },
  { to: "/jobs/$jobId/pipeline" as const, label: "Pipeline", icon: Workflow, exact: false },
  { to: "/jobs/$jobId/messages" as const, label: "Messages", icon: MessageSquare, exact: false },
  { to: "/jobs/$jobId/feedback" as const, label: "Feedback", icon: MessageSquareQuote, exact: false },
];

export function jobLifecycle(job: Job) {
  if (job.status === "approved" || job.status === "pending") {
    return {
      label: job.status === "approved" ? "Active" : statusLabel[job.status] || "Pending",
      tone: clientStatusTone[job.status] || ("neutral" as const),
    };
  }
  if (job.status === "paused") return { label: "Paused", tone: "info" as const };
  if (job.status === "archived") return { label: "Closed", tone: "neutral" as const };
  return {
    label: statusLabel[job.status] || job.status,
    tone: clientStatusTone[job.status] || ("neutral" as const),
  };
}

function Fact({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string | undefined;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 bg-surface px-4 py-3.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand-soft text-brand">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm font-semibold leading-5 text-foreground" title={value}>
          {value || "Not specified"}
        </p>
        {sub ? <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{sub}</p> : null}
      </div>
    </div>
  );
}

export function rewardRange(job: Job) {
  if (job.reward && job.reward.includes("–")) {
    return job.reward;
  }
  const digits = (job.reward || "").replace(/[^\d]/g, "");
  const symbol = (job.reward || "").replace(/[\d,.\s]/g, "") || "$";
  const base = Number(digits);
  if (!base) return job.reward || "—";
  const fmt = (n: number) => `${symbol}${n.toLocaleString("en-US")}`;
  const max = base * Math.max(job.openings || 1, 1);
  return base === max ? fmt(base) : `${fmt(base)} – ${fmt(max)}`;
}

function HeaderBounty({ job }: { job: Job }) {
  return (
    <div className="inline-flex shrink-0 items-center gap-2.5 self-start rounded-md bg-brand-deep px-3 py-1.5 text-[12px] text-on-deep lg:self-center">
      <span className="font-semibold opacity-70">Bounty</span>
      <span className="num font-semibold">{rewardRange(job)}</span>
      <span className="opacity-40">·</span>
      <span className="font-medium">{job.rewardPct}</span>
      <span className="opacity-40">·</span>
      <span className="font-medium">30-60-90</span>
    </div>
  );
}

function JobWorkspaceLayout() {
  const loaderData = Route.useLoaderData();
  const { jobId } = Route.useParams();
  const [job, setJob] = useState<Job | null>(loaderData?.job || getJob(jobId) || null);
  const { setJobId } = useJobContext();
  const navigate = useNavigate();

  const [applyOpen, setApplyOpen] = useState(false);
  const [whyFit, setWhyFit] = useState(job?.whyFit || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loading, setLoading] = useState(!job);

  useEffect(() => {
    let active = true;
    if (jobId) {
      setJobId(jobId);
      setLoading(true);
      fetchRecruiterJobById(jobId).then((fetched) => {
        if (active) {
          if (fetched && String(fetched.rawStatus || "").toLowerCase() !== "draft") {
            setJob(fetched);
            if (fetched.whyFit) setWhyFit(fetched.whyFit);
          } else {
            setJob(null);
          }
          setLoading(false);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [jobId, setJobId]);

  const lifecycle = job ? jobLifecycle(job) : { label: "Active", tone: "success" as const };
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const origin = useJobOrigin();
  const onDetails = job ? pathname.replace(/\/$/, "") === `/jobs/${job.id}` : false;
  const isApproved = job?.status === "approved";

  // If role is not approved and user attempts to view a child workspace tab (like /submit or /pipeline), route back to details
  useEffect(() => {
    if (job && !isApproved) {
      const path = pathname.replace(/\/$/, "");
      const basePath = `/jobs/${job.id}`;
      if (path.startsWith(basePath + "/")) {
        navigate({ to: "/jobs/$jobId", params: { jobId: job.id } });
      }
    }
  }, [job, isApproved, pathname, navigate]);

  if (!job) {
    if (loading) {
      return (
        <AppShell>
          <div className="p-8 text-center text-sm text-muted-foreground">
            Loading job details…
          </div>
        </AppShell>
      );
    }
    return (
      <AppShell>
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
          <p className="text-base font-semibold text-foreground">Job not found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This job is not available on the marketplace or has not yet been published.
          </p>
          <Link
            to="/jobs"
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
          >
            Browse all jobs
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Job header */}
      <div className="border-b border-border bg-surface">
        <div className="px-4 pt-4 sm:px-6">
          <Link
            to={origin === "clients" ? "/clients" : "/jobs"}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> {origin === "clients" ? "Back to Your Jobs" : "Back to Jobs"}
          </Link>
        </div>

        <div className="flex flex-col gap-3 px-4 pb-3 pt-3 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3">
            <CompanyMark short={job.companyShort} tone={job.logoTone} size="lg" />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-foreground">
                {job.company}
                {job.formerly ? (
                  <span className="font-normal text-muted-foreground">(formerly {job.formerly})</span>
                ) : null}
                <StatusBadge tone={lifecycle.tone} dot={job.status !== "not_applied"}>
                  {lifecycle.label}
                </StatusBadge>
              </p>
              <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">{job.title}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {isApproved ? null : job.status === "pending" ? (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-warning/30 bg-warning-soft px-3 py-1.5 text-[12px] font-semibold text-warning">
                Application pending
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setApplyOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3.5 py-1.5 text-[12px] font-semibold text-brand-foreground transition-colors hover:bg-brand/90 shadow-sm"
              >
                Apply for this role
              </button>
            )}
            <button
              type="button"
              onClick={() => downloadJobPdf(job)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-surface-sunken"
            >
              <Download className="size-3.5" /> Download JD
            </button>
            <HeaderBounty job={job} />
          </div>
        </div>

        {/* Workspace tabs — ONLY shown when role is approved */}
        {isApproved ? (
          <nav className="scroll-slim flex gap-1 overflow-x-auto px-4 sm:px-6">
            {jobWorkspaceTabs.map((t) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  params={{ jobId: job.id }}
                  activeOptions={{ exact: t.exact }}
                  className={cn(
                    "-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition-colors",
                    "border-transparent text-muted-foreground hover:text-foreground",
                    "data-[status=active]:border-brand data-[status=active]:text-brand",
                  )}
                >
                  <Icon className="size-3.5" /> {t.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>

      {/* Summary strip — visible on details tab or whenever secondary nav is hidden */}
      <div className={cn("border-b border-border bg-surface-sunken/60 px-4 py-4 sm:px-6", isApproved && !onDetails && "hidden")}>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Fact icon={<MapPin className="size-4" />} label="Work type" value={job.workModel} sub={job.location} />
          <Fact icon={<BriefcaseBusiness className="size-4" />} label="Employment" value={job.employmentType} />
          <Fact
            icon={<Users className="size-4" />}
            label="Head count"
            value={`${job.openings} ${job.openings === 1 ? "role" : "roles"}`}
            sub="Open positions"
          />
          <Fact icon={<Clock3 className="size-4" />} label="Experience" value={job.experience} />
          <Fact
            icon={<Banknote className="size-4" />}
            label="Salary"
            value={job.salary}
            sub={job.equity ? `+ equity ${job.equity}` : undefined}
          />
          <Fact icon={<Globe className="size-4" />} label="Visa sponsorship" value={job.visaSponsorship} />
        </div>
      </div>

      {/* Application status strip */}
      {job.status !== "approved" ? (
        <div className="border-b border-border bg-surface-sunken px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
            {job.status === "pending" ? (
              <>
                <StatusBadge tone="warning" dot>
                  Pending client approval
                </StatusBadge>
                <span className="text-muted-foreground">
                  {job.appliedOn ? `Applied ${job.appliedOn} · ` : ""}Next step: client recruiting ops review (typically 2 business days)
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    if (job.applicationId) {
                      try {
                        await api.post(`/api/recruiting/applications/${job.applicationId}/withdraw/`);
                        setJob((prev) => (prev ? { ...prev, status: "not_applied", applicationId: undefined } : null));
                        toast.success("Application withdrawn", { description: `${job.company} — ${job.title}` });
                      } catch (err: any) {
                        toast.error(err?.data?.detail || err?.message || "Failed to withdraw application.");
                      }
                    } else {
                      setJob((prev) => (prev ? { ...prev, status: "not_applied" } : null));
                      toast.success("Application withdrawn");
                    }
                  }}
                  className="font-semibold text-destructive hover:underline"
                >
                  Withdraw application
                </button>
              </>
            ) : null}
            {job.status === "rejected" ? (
              <>
                <StatusBadge tone="danger" dot>
                  Application rejected
                </StatusBadge>
                <span className="text-muted-foreground">
                  {job.rejectedOn ? `Rejected ${job.rejectedOn}` : ""}
                  {job.rejectionReason ? ` · ${job.rejectionReason}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => setApplyOpen(true)}
                  className="font-semibold text-brand hover:underline"
                >
                  Re-apply for this role
                </button>
              </>
            ) : null}
            {job.status === "not_applied" ? (
              <div className="flex w-full items-center justify-between">
                <span className="text-muted-foreground">
                  Apply to get client approval and start submitting candidates for this role.
                </span>
                <button
                  type="button"
                  onClick={() => setApplyOpen(true)}
                  className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                >
                  Apply for this role →
                </button>
              </div>
            ) : null}
            {job.status === "paused" ? (
              <>
                <StatusBadge tone="info" dot>
                  Hiring paused
                </StatusBadge>
                <span className="text-muted-foreground">{job.pauseReason || "Hiring is currently paused for this position."}</span>
              </>
            ) : null}
            {job.status === "archived" ? (
              <>
                <StatusBadge tone="neutral" dot>
                  Closed
                </StatusBadge>
                <span className="text-muted-foreground">Historical record only — submissions are closed.</span>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <Outlet context={{ job }} />

      {/* Apply for role modal */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const trimmed = whyFit.trim();
              if (trimmed.length < 300 || trimmed.length > 500) {
                toast.error(
                  `Your pitch must be strictly between 300 and 500 characters. Current length: ${trimmed.length} characters.`
                );
                return;
              }
              setIsSubmitting(true);
              try {
                const targetJobId = job.backendId || job.id;
                const res = await api.post<{ id?: string; status?: string }>(
                  "/api/recruiting/applications/",
                  {
                    job_id: targetJobId,
                    why_fit: trimmed,
                  },
                );
                setJob((prev) =>
                  prev
                    ? {
                        ...prev,
                        status: "pending",
                        applicationId: res?.id ? String(res.id) : prev.applicationId,
                        appliedOn: "Just now",
                      }
                    : null,
                );
                setApplyOpen(false);
                toast.success("Application submitted", {
                  description: `${job.company} will review within 2 business days.`,
                });
              } catch (err: any) {
                const msg =
                  err?.data?.detail || err?.message || "Failed to submit application.";
                toast.error(msg);
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>Apply to recruit for this role</DialogTitle>
              <DialogDescription>
                {job.company} reviews recruiter applications before granting candidate submission
                access. Reward terms: {job.reward} ({job.rewardPct}), {job.payoutTerms}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="rounded-md border border-border bg-surface-sunken p-3 text-[13px] leading-5 text-muted-foreground">
                <Banknote className="mb-1.5 size-4 text-muted-foreground" />
                By applying you confirm you can source candidates matching the requirements for this position.
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="why-fit" className="text-xs font-medium text-foreground">
                    Why are you a good fit to recruit for this role? <span className="text-destructive">*</span>
                  </Label>
                  <span
                    className={cn(
                      "num text-[11px] font-medium",
                      whyFit.trim().length < 300
                        ? "text-amber-600 dark:text-amber-400"
                        : whyFit.trim().length > 500
                          ? "text-destructive"
                          : "text-emerald-600 dark:text-emerald-400",
                    )}
                  >
                    {whyFit.trim().length} / 500 chars (min 300)
                  </span>
                </div>
                <Textarea
                  id="why-fit"
                  required
                  rows={5}
                  maxLength={500}
                  value={whyFit}
                  onChange={(e) => setWhyFit(e.target.value)}
                  placeholder="Describe your candidate network, domain specialization, relevant placements, or sourcing strategy for this position (must be strictly between 300 and 500 characters)..."
                  className="text-[13px]"
                />
              </div>
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setApplyOpen(false)}
                className="h-9 rounded-md border border-border px-3 text-[13px] font-semibold text-foreground hover:bg-surface-sunken"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || whyFit.trim().length < 300 || whyFit.trim().length > 500}
                className="h-9 rounded-md bg-brand px-3.5 text-[13px] font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Submit application"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
