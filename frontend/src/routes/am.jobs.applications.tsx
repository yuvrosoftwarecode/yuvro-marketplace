import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  DollarSign,
  ExternalLink,
  Layers,
  Loader2,
  Percent,
  Search,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AmPageHeader, AmShell } from "@/components/am/am-shell";
import { useAm } from "@/components/am/am-store";
import { Btn, Kpi, KpiGrid, Segmented, inputCls } from "@/components/am/am-ui";
import { api } from "@/lib/api";
import { moneyExact } from "@/lib/am-data";

export const Route = createFileRoute("/am/jobs/applications")({
  head: () => ({
    meta: [
      { title: "Job Applications — Account Manager | Yuvro" },
      {
        name: "description",
        content: "Review company job applications, set recruiter commissions and publish roles to the marketplace.",
      },
    ],
  }),
  component: AmJobApplicationsPage,
});

export type JobApplicationRecord = {
  id: string;
  title: string;
  slug?: string;
  status: string;
  location: string;
  work_model: string;
  employment_type: string;
  experience?: string;
  open_roles: number;
  recruiter_slots: number;
  salary_min: number | string;
  salary_max: number | string;
  salary_currency: string;
  equity?: number | string;
  company_to_yuvro_percentage: number | string;
  yuvro_commission_percentage: number | string;
  recruiter_percentage?: number | string;
  recruiter_bounty_min?: number | string;
  recruiter_bounty_max?: number | string;
  payout_terms?: number[];
  must_haves?: string[];
  hiring_process?: string[];
  target_companies?: string[];
  candidate_questions?: { question: string; type?: string; required?: boolean }[];
  job_description?: string;
  benefits_and_perks?: string;
  signals?: { green?: string[]; red?: string[]; rejection_reason?: string };
  created_at: string;
  created_by?: string;
  created_by_detail?: {
    id: string;
    email: string;
    name: string;
    role?: string;
    is_company_manager?: boolean;
    is_account_manager?: boolean;
  } | null;
  company?: {
    id: string;
    name: string;
    logo_url?: string;
    logo?: string;
    industry?: string;
    slug?: string;
  };
};

function formatWorkModel(wm?: string): string {
  const s = String(wm || "").toLowerCase();
  if (s.includes("remote")) return "Remote";
  if (s.includes("site")) return "On-site";
  return "Hybrid";
}

function AmJobApplicationsPage() {
  const am = useAm();
  const navigate = useNavigate();

  const [applications, setApplications] = useState<JobApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");
  const [q, setQ] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [actingId, setActingId] = useState<string | null>(null);

  // Editable commission inputs per job
  // Key: jobId -> { recruiterPct: number, recruiterSlots: number, rejectionReason: string }
  const [commissionDrafts, setCommissionDrafts] = useState<
    Record<string, { recruiterPct: number; recruiterSlots: number; rejectionReason?: string }>
  >({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>("/api/marketplace/jobs/");
      const list: JobApplicationRecord[] = Array.isArray(res)
        ? res
        : res?.data || res?.results || [];

      // Sort by status: pending_approval first, then created_at desc
      list.sort((a, b) => {
        const aPending = a.status === "pending_approval" || a.status === "pending";
        const bPending = b.status === "pending_approval" || b.status === "pending";
        if (aPending && !bPending) return -1;
        if (!aPending && bPending) return 1;
        return new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime();
      });

      setApplications(list);

      // Initialize commission drafts for each pending job
      const drafts: Record<string, { recruiterPct: number; recruiterSlots: number }> = {};
      list.forEach((job) => {
        const companyFee = Number(job.company_to_yuvro_percentage) || 20;
        // Default recruiter commission to company fee minus 5% platform margin, minimum 5%
        const existingRecruiterPct = Number(job.recruiter_percentage);
        const defaultRecruiterPct =
          existingRecruiterPct > 0
            ? existingRecruiterPct
            : Math.max(5, companyFee - 5);

        drafts[job.id] = {
          recruiterPct: defaultRecruiterPct,
          recruiterSlots: Number(job.recruiter_slots) || 6,
        };
      });
      setCommissionDrafts((prev) => ({ ...drafts, ...prev }));

      // Expand all pending applications by default
      const pendingIds = list
        .filter((a) => a.status === "pending_approval" || a.status === "pending")
        .map((a) => a.id);
      if (pendingIds.length > 0) {
        setExpandedIds(new Set(pendingIds));
      } else if (list.length > 0) {
        setExpandedIds(new Set([list[0].id]));
      }
    } catch (err) {
      console.warn("Could not load job applications:", err);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRecruiterPctChange = (id: string, val: number) => {
    setCommissionDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { recruiterSlots: 6 }),
        recruiterPct: val,
      },
    }));
  };

  const handleRecruiterSlotsChange = (id: string, val: number) => {
    setCommissionDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { recruiterPct: 15 }),
        recruiterSlots: val,
      },
    }));
  };

  const handleApprove = async (job: JobApplicationRecord) => {
    const draft = commissionDrafts[job.id] || {
      recruiterPct: 15,
      recruiterSlots: 6,
    };
    const companyFee = Number(job.company_to_yuvro_percentage) || 20;

    if (draft.recruiterPct <= 0 || draft.recruiterPct > companyFee) {
      toast.error(
        `Recruiter commission must be between 1% and the total company fee of ${companyFee}%.`,
      );
      return;
    }

    try {
      setActingId(job.id);
      const res = await api.post<any>(`/api/marketplace/jobs/${job.id}/approve/`, {
        recruiter_percentage: draft.recruiterPct,
        recruiter_slots: draft.recruiterSlots,
      });

      toast.success(
        `Job "${job.title}" approved! Recruiter commission set to ${draft.recruiterPct}%.`,
      );

      // Update in state
      setApplications((prev) =>
        prev.map((j) =>
          j.id === job.id
            ? {
                ...j,
                status: "active",
                recruiter_percentage: draft.recruiterPct,
                yuvro_commission_percentage: Math.max(0, companyFee - draft.recruiterPct),
                recruiter_slots: draft.recruiterSlots,
                recruiter_bounty_min:
                  (Number(job.salary_min || 0) * draft.recruiterPct) / 100,
                recruiter_bounty_max:
                  (Number(job.salary_max || 0) * draft.recruiterPct) / 100,
              }
            : j,
        ),
      );

      am.refreshJobs?.();
    } catch (err: any) {
      console.error("Approve job failed:", err);
      toast.error(err?.message || "Failed to approve job.");
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (job: JobApplicationRecord) => {
    const reason = commissionDrafts[job.id]?.rejectionReason?.trim() || "";
    try {
      setActingId(job.id);
      await api.post(`/api/marketplace/jobs/${job.id}/reject/`, {
        reason,
      });

      toast.error(`Job "${job.title}" application rejected.`);
      setApplications((prev) =>
        prev.map((j) =>
          j.id === job.id
            ? {
                ...j,
                status: "closed",
                signals: {
                  ...j.signals,
                  rejection_reason: reason,
                },
              }
            : j,
        ),
      );
      setRejectingId(null);
      am.refreshJobs?.();
    } catch (err: any) {
      console.error("Reject job failed:", err);
      toast.error(err?.message || "Failed to reject job.");
    } finally {
      setActingId(null);
    }
  };

  // Metrics
  const totalCount = applications.length;
  const pendingCount = applications.filter(
    (a) => a.status === "pending_approval" || a.status === "pending",
  ).length;
  const activeCount = applications.filter(
    (a) => a.status === "active" || a.status === "hiring",
  ).length;
  const closedCount = applications.filter(
    (a) => a.status === "closed" || a.status === "draft",
  ).length;

  const filtered = useMemo(() => {
    return applications
      .filter((a) => {
        if (filter === "all") return true;
        if (filter === "pending")
          return a.status === "pending_approval" || a.status === "pending";
        if (filter === "active")
          return a.status === "active" || a.status === "hiring";
        if (filter === "closed")
          return a.status === "closed" || a.status === "draft";
        return a.status === filter;
      })
      .filter((a) => {
        if (!q.trim()) return true;
        const query = q.toLowerCase();
        return (
          a.title.toLowerCase().includes(query) ||
          (a.company?.name || "").toLowerCase().includes(query) ||
          a.location.toLowerCase().includes(query) ||
          (Array.isArray(a.must_haves) ? a.must_haves.join(" ").toLowerCase() : "").includes(query)
        );
      });
  }, [applications, filter, q]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Recently";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <AmShell>
      <AmPageHeader
        title="Jobs"
        description="Review job applications submitted by companies, configure recruiter commission rates, and publish roles to the marketplace."
        actions={
          <Btn variant="primary" onClick={() => navigate({ to: "/am/jobs/new" })}>
            <Sparkles className="size-4" /> Create job as AM
          </Btn>
        }
      >
        <div className="flex flex-col gap-4">
          {/* Top navigation tabs */}
          <div className="flex border-b border-border/80">
            <Link
              to="/am/jobs"
              className="flex items-center gap-1.5 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Jobs
            </Link>
            <div className="flex items-center gap-2 border-b-2 border-brand px-4 py-2.5 text-sm font-semibold text-foreground">
              Job Applications
              {pendingCount > 0 && (
                <span className="grid size-4 place-items-center rounded bg-brand-soft text-[10px] font-bold text-brand">
                  {pendingCount}
                </span>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              options={[
                { id: "pending", label: "Pending review", count: pendingCount },
                { id: "active", label: "Approved / Active", count: activeCount },
                { id: "closed", label: "Closed / Draft", count: closedCount },
                { id: "all", label: "All applications", count: totalCount },
              ]}
              value={filter}
              onChange={setFilter}
            />

            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Role title, company, skills, location..."
                className={`${inputCls} pl-8`}
              />
            </div>
          </div>
        </div>
      </AmPageHeader>

      {/* KPI Cards */}
      <KpiGrid cols={4} className="mb-6">
        <Kpi
          label="Total Applications"
          value={totalCount}
          hint="All time job submissions"
          variant="default"
        />
        <Kpi
          label="Pending Review"
          value={pendingCount}
          hint="Awaiting recruiter commission & approval"
          variant={pendingCount > 0 ? "warning" : "default"}
        />
        <Kpi
          label="Active on Marketplace"
          value={activeCount}
          hint="Open for recruiter sourcing"
          variant="success"
        />
        <Kpi
          label="Closed / Archived"
          value={closedCount}
          hint="Filled or rejected roles"
          variant="neutral"
        />
      </KpiGrid>

      {/* Applications List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-surface py-20 text-center">
          <Loader2 className="size-8 animate-spin text-brand" />
          <p className="mt-3 text-sm font-medium text-foreground">Loading job applications...</p>
          <p className="text-xs text-muted-foreground">Retrieving pending roles and terms from backend</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 py-16 text-center">
          <Briefcase className="size-10 text-muted-foreground/60" />
          <h3 className="mt-3 text-base font-semibold text-foreground">No job applications found</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {filter === "pending"
              ? "All company jobs have been reviewed! New submissions will appear here."
              : "Try switching filters or clearing your search term."}
          </p>
          <div className="mt-4 flex gap-2">
            <Btn variant="secondary" onClick={() => setFilter("all")}>
              View all roles
            </Btn>
            <Btn variant="primary" onClick={() => navigate({ to: "/am/jobs/new" })}>
              Create job manually
            </Btn>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((job) => {
            const isExpanded = expandedIds.has(job.id);
            const isPending =
              job.status === "pending_approval" || job.status === "pending";
            const isActive =
              job.status === "active" || job.status === "hiring";
            const isClosed = job.status === "closed";

            const currency = (job.salary_currency || "USD") as "USD" | "GBP" | "EUR";
            const salaryMin = Number(job.salary_min) || 0;
            const salaryMax = Number(job.salary_max) || 0;
            const companyFeePct = Number(job.company_to_yuvro_percentage) || 20;

            const draft = commissionDrafts[job.id] || {
              recruiterPct: isPending ? Math.max(5, companyFeePct - 5) : Number(job.recruiter_percentage) || 15,
              recruiterSlots: Number(job.recruiter_slots) || 6,
            };

            const recruiterPct = draft.recruiterPct;
            const yuvroMarginPct = Math.max(0, companyFeePct - recruiterPct);

            // Financial Calculations
            const companyFeeMin = (salaryMin * companyFeePct) / 100;
            const companyFeeMax = (salaryMax * companyFeePct) / 100;

            const recruiterBountyMin = (salaryMin * recruiterPct) / 100;
            const recruiterBountyMax = (salaryMax * recruiterPct) / 100;

            const yuvroMarginMin = (salaryMin * yuvroMarginPct) / 100;
            const yuvroMarginMax = (salaryMax * yuvroMarginPct) / 100;

            const isActing = actingId === job.id;
            const isRejecting = rejectingId === job.id;

            return (
              <div
                key={job.id}
                className={`overflow-hidden rounded-xl border bg-surface transition-all ${
                  isPending
                    ? "border-amber-500/40 shadow-sm shadow-amber-500/5 ring-1 ring-amber-500/20"
                    : "border-border/70"
                }`}
              >
                {/* Header Row */}
                <div
                  onClick={() => toggleExpand(job.id)}
                  className="flex cursor-pointer flex-col gap-3 p-4 hover:bg-surface-raised/40 transition-colors sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Company Logo / Initial */}
                    <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-raised font-bold text-foreground">
                      {job.company?.logo_url || job.company?.logo ? (
                        <img
                          src={job.company.logo_url || job.company.logo}
                          alt={job.company.name}
                          className="size-full object-contain p-1.5"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <Building2 className="size-6 text-muted-foreground" />
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-semibold text-foreground tracking-tight">
                          {job.title}
                        </h4>
                        <span className="text-xs text-muted-foreground font-medium">
                          at {job.company?.name || "Company"}
                        </span>
                        {isPending && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="size-3" /> Needs Review & Bounty
                          </span>
                        )}
                        {isActive && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <Check className="size-3" /> Live on Marketplace
                          </span>
                        )}
                        {isClosed && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/10 px-2 py-0.5 text-xs font-medium text-zinc-500 border border-zinc-500/20">
                            Closed / Rejected
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="size-3" />
                          {job.location} · {formatWorkModel(job.work_model)}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{job.employment_type?.replace("_", " ") || "Full-time"}</span>
                        <span>•</span>
                        <span>{job.open_roles || 1} open role{(job.open_roles || 1) > 1 ? "s" : ""}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3" />
                          Submitted {formatDate(job.created_at)}
                        </span>
                        {job.created_by_detail && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 font-medium text-foreground">
                              <User className="size-3 text-brand" />
                              Added by <strong className="text-foreground">{job.created_by_detail.name}</strong>
                              <span className="text-[10px] text-muted-foreground">
                                ({job.created_by_detail.is_company_manager
                                  ? "Company Manager"
                                  : job.created_by_detail.is_account_manager
                                    ? "Account Manager"
                                    : job.created_by_detail.role?.replace(/_/g, " ") || "Member"})
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side summary & toggle button */}
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <div className="text-xs font-medium text-muted-foreground">Base Salary Range</div>
                      <div className="text-sm font-semibold text-foreground">
                        {moneyExact(salaryMin, currency)} – {moneyExact(salaryMax, currency)}
                      </div>
                      <div className="text-[11px] font-medium text-brand">
                        Company fee: {companyFeePct}%
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-label="Toggle details"
                      className="rounded-lg border border-border/80 p-2 text-muted-foreground hover:bg-surface-raised hover:text-foreground"
                    >
                      {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="border-t border-border/60 bg-surface-raised/20 p-5 space-y-6">
                    {/* Must Haves and Process Quick Badges */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Must Haves */}
                      <div className="rounded-lg border border-border/60 bg-surface p-3.5">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Layers className="size-3.5 text-brand" /> Must Have Qualifications
                        </div>
                        {Array.isArray(job.must_haves) && job.must_haves.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {job.must_haves.map((mh, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded-md bg-surface-raised px-2.5 py-1 text-xs font-medium text-foreground border border-border/60"
                              >
                                {mh}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">None specified</p>
                        )}
                      </div>

                      {/* Hiring Process */}
                      <div className="rounded-lg border border-border/60 bg-surface p-3.5">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <ArrowRight className="size-3.5 text-emerald-600" /> Hiring Process Pipeline
                        </div>
                        {Array.isArray(job.hiring_process) && job.hiring_process.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
                            {job.hiring_process.map((stage, idx) => (
                              <div key={idx} className="flex items-center gap-1">
                                <span className="rounded bg-brand/10 text-brand px-2 py-0.5 font-semibold text-[11px]">
                                  {idx + 1}. {stage}
                                </span>
                                {idx < (job.hiring_process?.length || 0) - 1 && (
                                  <span className="text-muted-foreground">→</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            Default: HR Screening → Technical Interview → Final Offer
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Job Description preview if present */}
                    {job.job_description && (
                      <div className="rounded-lg border border-border/60 bg-surface p-3.5">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                          Job Description
                        </div>
                        <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line line-clamp-4">
                          {job.job_description}
                        </p>
                      </div>
                    )}

                    {/* Screening Questions if present */}
                    {Array.isArray(job.candidate_questions) && job.candidate_questions.length > 0 && (
                      <div className="rounded-lg border border-border/60 bg-surface p-3.5">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Screening Questions ({job.candidate_questions.length})
                        </div>
                        <ul className="space-y-1.5 text-xs text-foreground/90">
                          {job.candidate_questions.map((q, qIdx) => (
                            <li key={qIdx} className="flex items-start gap-2">
                              <span className="font-semibold text-brand">•</span>
                              <span>
                                {q.question}
                                {q.required && (
                                  <span className="ml-1 text-[10px] text-amber-500 font-semibold">(Required)</span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Financial Terms & Recruiter Bounty Configuration Block */}
                    <div className="rounded-xl border border-brand/30 bg-gradient-to-br from-surface to-brand-soft/20 p-5 shadow-sm">
                      <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
                        <div className="flex items-center gap-2">
                          <Coins className="size-5 text-brand" />
                          <h5 className="text-sm font-bold text-foreground">
                            Placement Economics & Recruiter Bounty Calculation
                          </h5>
                        </div>
                        <span className="text-xs font-semibold text-brand bg-brand-soft px-2.5 py-1 rounded-md">
                          Base Currency: {currency}
                        </span>
                      </div>

                      {/* Interactive Configuration Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        {/* Company Fee (Fixed by Company) */}
                        <div className="rounded-lg border border-border/80 bg-surface p-3">
                          <label className="text-xs font-semibold text-muted-foreground block mb-1">
                            Company Placement Fee
                          </label>
                          <div className="text-xl font-bold text-foreground">
                            {companyFeePct}%
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Agreed fee paid by {job.company?.name || "company"} to Yuvro
                          </p>
                        </div>

                        {/* Recruiter Commission % (Editable by AM) */}
                        <div className="rounded-lg border-2 border-brand/50 bg-surface p-3">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-bold text-brand flex items-center gap-1">
                              <Percent className="size-3.5" /> Recruiter Commission (%) *
                            </label>
                            <span className="text-[11px] text-muted-foreground">AM Configured</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              max={companyFeePct}
                              step={0.5}
                              value={recruiterPct}
                              onChange={(e) =>
                                handleRecruiterPctChange(job.id, parseFloat(e.target.value) || 0)
                              }
                              disabled={!isPending || isActing}
                              className="w-full rounded-md border border-brand/40 bg-surface-raised px-3 py-1.5 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                            />
                            <span className="text-sm font-bold text-muted-foreground">%</span>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Paid to the recruiter who places this candidate
                          </p>
                        </div>

                        {/* Recruiter Slots (Editable by AM) */}
                        <div className="rounded-lg border border-border/80 bg-surface p-3">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                              <Users className="size-3.5 text-muted-foreground" /> Sourcing Slots
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={draft.recruiterSlots}
                              onChange={(e) =>
                                handleRecruiterSlotsChange(job.id, parseInt(e.target.value, 10) || 1)
                              }
                              disabled={!isPending || isActing}
                              className="w-full rounded-md border border-border bg-surface-raised px-3 py-1.5 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                            />
                            <span className="text-xs text-muted-foreground">slots</span>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Max recruiters working this job concurrently
                          </p>
                        </div>
                      </div>

                      {/* Live Calculation Output Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border border-border/60 bg-surface p-3.5 text-xs">
                        {/* Company Total Payout */}
                        <div className="space-y-1">
                          <div className="text-[11px] font-medium text-muted-foreground">
                            1. Company Total Placement Fee
                          </div>
                          <div className="text-sm font-bold text-foreground">
                            {moneyExact(companyFeeMin, currency)} – {moneyExact(companyFeeMax, currency)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {companyFeePct}% of base salary on hire
                          </div>
                        </div>

                        {/* Recruiter Bounty */}
                        <div className="space-y-1 border-y sm:border-y-0 sm:border-x border-border/60 py-2 sm:py-0 sm:px-3">
                          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            2. Recruiter Payout Bounty
                          </div>
                          <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                            {moneyExact(recruiterBountyMin, currency)} – {moneyExact(recruiterBountyMax, currency)}
                          </div>
                          <div className="text-[10px] text-emerald-600/80 font-medium">
                            {recruiterPct}% bounty per successful hire
                          </div>
                        </div>

                        {/* Yuvro Platform Margin */}
                        <div className="space-y-1 sm:pl-3">
                          <div className="text-[11px] font-bold text-brand">
                            3. Yuvro Platform Commission
                          </div>
                          <div className="text-sm font-extrabold text-brand">
                            {moneyExact(yuvroMarginMin, currency)} – {moneyExact(yuvroMarginMax, currency)}
                          </div>
                          <div className="text-[10px] text-brand/80 font-medium">
                            {yuvroMarginPct.toFixed(1)}% retained platform fee
                          </div>
                        </div>
                      </div>

                      {/* Payout Milestone Schedule */}
                      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Clock className="size-3.5 text-muted-foreground" />
                        <span>
                          Payout Terms: <strong>Net 30, 60, 90 days</strong> (e.g. 30% at 30 days, 30% at 60 days, 40% at 90 days).
                        </span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                      <div className="text-xs text-muted-foreground">
                        {isPending ? (
                          <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                            <AlertCircle className="size-4" />
                            Approving will publish this role directly to verified recruiters on the marketplace.
                          </span>
                        ) : isActive ? (
                          <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                            <Check className="size-4" />
                            Role is currently live on marketplace. Recruiters can request access and submit candidates.
                          </span>
                        ) : (
                          <span>Status: {job.status}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                        {isPending && (
                          <>
                            {isRejecting ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Reason for rejection (optional)"
                                  value={commissionDrafts[job.id]?.rejectionReason || ""}
                                  onChange={(e) =>
                                    setCommissionDrafts((prev) => ({
                                      ...prev,
                                      [job.id]: {
                                        ...(prev[job.id] || { recruiterPct: 15, recruiterSlots: 6 }),
                                        rejectionReason: e.target.value,
                                      },
                                    }))
                                  }
                                  className={`${inputCls} text-xs py-1.5`}
                                />
                                <Btn
                                  variant="danger"
                                  onClick={() => handleReject(job)}
                                  disabled={isActing}
                                >
                                  {isActing ? <Loader2 className="size-3.5 animate-spin" /> : "Confirm Reject"}
                                </Btn>
                                <Btn variant="ghost" onClick={() => setRejectingId(null)}>
                                  Cancel
                                </Btn>
                              </div>
                            ) : (
                              <Btn
                                variant="secondary"
                                onClick={() => setRejectingId(job.id)}
                                disabled={isActing}
                                className="text-rose-600 hover:text-rose-700"
                              >
                                Reject role
                              </Btn>
                            )}

                            <Btn
                              variant="primary"
                              onClick={() => handleApprove(job)}
                              disabled={isActing || isRejecting}
                              className="gap-1.5 font-semibold"
                            >
                              {isActing ? (
                                <>
                                  <Loader2 className="size-4 animate-spin" /> Approving...
                                </>
                              ) : (
                                <>
                                  <Check className="size-4" /> Approve & Publish to Marketplace
                                </>
                              )}
                            </Btn>
                          </>
                        )}

                        {isActive && (
                          <Link
                            to="/am/jobs"
                            search={{ q: job.title }}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                          >
                            Manage in Jobs Workspace <ExternalLink className="size-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AmShell>
  );
}
