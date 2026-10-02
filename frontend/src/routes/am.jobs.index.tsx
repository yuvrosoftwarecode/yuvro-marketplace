import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { AmPageHeader, AmShell } from "@/components/am/am-shell";
import { useAm } from "@/components/am/am-store";
import { api } from "@/lib/api";
import {
  Btn,
  CountLink,
  JobStatusPill,
  Segmented,
  TableShell,
  TD,
  TH,
  THead,
  TR,
  inputCls,
} from "@/components/am/am-ui";
import { jobStatusLabel, money, salaryRange, type AmJobStatus } from "@/lib/am-data";
import { strParam } from "@/lib/am-nav";

type JobsSearch = { status?: string; company?: string; q?: string };

export const Route = createFileRoute("/am/jobs/")({
  validateSearch: (raw: Record<string, unknown>): JobsSearch => {
    const out: JobsSearch = {};
    const status = strParam(raw["status"]);
    const company = strParam(raw["company"]);
    const q = strParam(raw["q"]);
    if (status) out.status = status;
    if (company) out.company = company;
    if (q) out.q = q;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Jobs Workspace — Account Manager | Yuvro" },
      {
        name: "description",
        content:
          "Every managed job in one dense table: status, approved recruiters, submissions pending review, candidates in process, interviews, offers, bounty and deadline.",
      },
      { property: "og:title", content: "Jobs Workspace — Account Manager | Yuvro" },
      {
        property: "og:description",
        content: "The primary operational workspace for Account Managers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AmJobsPage,
});

const statusFilters: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "hiring", label: jobStatusLabel.hiring },
  { id: "active", label: jobStatusLabel.active },
  { id: "pending", label: jobStatusLabel.pending },
  { id: "draft", label: jobStatusLabel.draft },
  { id: "paused", label: jobStatusLabel.paused },
  { id: "filled", label: jobStatusLabel.filled },
  { id: "closed", label: jobStatusLabel.closed },
];

function AmJobsPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const { state, jobStats, companyOfJob, refreshJobs, refreshCompanies, refreshRecruiters } =
    useAm();
  const [q, setQ] = useState(searchParams.q ?? "");
  const status = searchParams.status ?? "all";
  const company = searchParams.company ?? "all";
  const [sort, setSort] = useState<"activity" | "review" | "deadline">("review");
  const [pendingJobsCount, setPendingJobsCount] = useState<number>(0);

  useEffect(() => {
    refreshJobs();
    refreshCompanies();
    refreshRecruiters();
    api.get<any>("/api/marketplace/jobs/?status=pending_approval")
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || res?.results || [];
        setPendingJobsCount(list.length);
      })
      .catch(() => {});
  }, [refreshJobs, refreshCompanies, refreshRecruiters]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = (state.jobs || [])
      .map((job) => ({ job, stats: jobStats(job.id), company: companyOfJob(job.id) }))
      .filter((r) => (status === "all" ? true : r.job?.status === status))
      .filter((r) =>
        company === "all"
          ? true
          : r.company?.id === company ||
            (r.company?.slug && r.company.slug === company) ||
            r.job?.companyId === company,
      )
      .filter((r) =>
        term
          ? `${r.job?.title || ""} ${r.company?.name || ""} ${r.job?.location || ""} ${r.job?.id || ""}`
              .toLowerCase()
              .includes(term)
          : true,
      );
    if (sort === "review")
      list.sort(
        (a, b) =>
          (b.stats?.pendingSubmissions ?? 0) +
          (b.stats?.pendingRequests ?? 0) -
          ((a.stats?.pendingSubmissions ?? 0) + (a.stats?.pendingRequests ?? 0)),
      );
    if (sort === "deadline")
      list.sort((a, b) =>
        String(a.job?.deadline || "").localeCompare(String(b.job?.deadline || "")),
      );
    return list;
  }, [state.jobs, jobStats, companyOfJob, status, company, q, sort]);

  const setFilter = (patch: JobsSearch) =>
    navigate({
      to: "/am/jobs",
      search: (prev) => {
        const next = { ...prev, ...patch } as JobsSearch;
        (Object.keys(next) as (keyof JobsSearch)[]).forEach((k) => {
          if (!next[k] || next[k] === "all") delete next[k];
        });
        return next;
      },
    });

  const counts = (state.jobs || []).reduce<Record<string, number>>((acc, j) => {
    if (j?.status) {
      acc[j.status] = (acc[j.status] ?? 0) + 1;
    }
    return acc;
  }, {});

  const totalPending =
    pendingJobsCount ||
    (state.jobs || []).filter(
      (j) => j?.status === "pending_approval" || j?.status === "pending",
    ).length;

  return (
    <AmShell>
      <AmPageHeader
        title="Jobs"
        description="Primary operational workspace. Click any row to open the job with recruiters, submissions, candidates, feedback and messages in context."
        actions={
          <Btn variant="primary" onClick={() => navigate({ to: "/am/jobs/new" })}>
            <Plus className="size-4" /> Create job
          </Btn>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex border-b border-border/80">
            <div className="border-b-2 border-brand px-4 py-2.5 text-sm font-semibold text-foreground">
              Jobs
            </div>
            <Link
              to="/am/jobs/applications"
              className="flex items-center gap-1.5 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Job Applications
              {totalPending > 0 && (
                <span className="grid size-4 place-items-center rounded bg-brand-soft text-[10px] font-bold text-brand">
                  {totalPending}
                </span>
              )}
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              options={statusFilters.map((f) => ({
                id: f.id,
                label: f.label,
                count: f.id === "all" ? (state.jobs?.length || 0) : (counts[f.id] ?? 0),
              }))}
              value={status}
              onChange={(id) => setFilter({ status: id })}
            />
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Job title, company, location, job ID"
                className={`${inputCls} pl-8`}
              />
            </div>
          <select
            value={company}
            onChange={(e) => setFilter({ company: e.target.value })}
            className={`${inputCls} w-auto min-w-[170px]`}
          >
            <option value="all">All companies</option>
            {(state.companies || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className={`${inputCls} w-auto min-w-[170px]`}
          >
            <option value="review">Sort: needs review</option>
            <option value="activity">Sort: recent activity</option>
            <option value="deadline">Sort: deadline</option>
          </select>
        </div>
      </div>
      </AmPageHeader>

      <TableShell className="bg-surface">
        <THead>
          <TH>Job</TH>
          <TH>Company</TH>
          <TH>Status</TH>
          <TH align="right">Recruiters</TH>
          <TH align="right">Requests</TH>
          <TH align="right">Submissions</TH>
          <TH align="right">To review</TH>
          <TH align="right">In process</TH>
          <TH align="right">Interviews</TH>
          <TH align="right">Offers</TH>
          <TH align="right">Hires</TH>
          <TH align="right">Salary</TH>
          <TH align="right">Bounty</TH>
          <TH>Deadline</TH>
          <TH>Last activity</TH>
        </THead>
        <tbody>
          {rows.map(({ job, stats, company: co }) => (
            <TR
              key={job.id}
              onClick={() =>
                navigate({
                  to: "/am/jobs/$jobId",
                  params: { jobId: job.slug || job.id },
                  search: { tab: "overview" },
                })
              }
            >
              <TD>
                <span className="block truncate font-medium">{job.title || "Untitled Job"}</span>
                <span className="num block truncate text-[11px] text-muted-foreground">
                  {job.location || "Remote"} · {job.workModel || "Remote"} · {job.openings || 1} opening
                  {(job.openings || 1) > 1 ? "s" : ""}
                </span>
                {job.createdBy && (
                  <span className="block truncate text-[10px] text-muted-foreground font-medium">
                    Added by: <strong className="text-foreground">{job.createdBy.name}</strong>
                    {job.createdBy.is_company_manager
                      ? " (Company)"
                      : job.createdBy.is_account_manager
                        ? " (AM)"
                        : ""}
                  </span>
                )}
              </TD>
              <TD>{co?.name || "—"}</TD>
              <TD>
                <JobStatusPill status={(job.status as AmJobStatus) || "active"} />
              </TD>
              <TD align="right" mono>
                {stats?.approvedRecruiters ?? 0}/{state.recruiters?.length ?? 0}
              </TD>
              <TD align="right">
                {stats?.pendingRequests ? (
                  <CountLink
                    to="/am/jobs/$jobId"
                    params={{ jobId: job.slug || job.id }}
                    search={{ tab: "requests" }}
                  >
                    {stats.pendingRequests}
                  </CountLink>
                ) : (
                  <span className="num text-muted-foreground">0</span>
                )}
              </TD>
              <TD align="right" mono>
                {stats?.submissions ?? 0}
              </TD>
              <TD align="right">
                {stats?.pendingSubmissions ? (
                  <CountLink
                    to="/am/jobs/$jobId"
                    params={{ jobId: job.slug || job.id }}
                    search={{ tab: "submissions" }}
                  >
                    {stats.pendingSubmissions}
                  </CountLink>
                ) : (
                  <span className="num text-muted-foreground">0</span>
                )}
              </TD>
              <TD align="right">
                <CountLink
                  muted
                  to="/am/jobs/$jobId"
                  params={{ jobId: job.slug || job.id }}
                  search={{ tab: "candidates" }}
                >
                  {stats?.activeCandidates ?? 0}
                </CountLink>
              </TD>
              <TD align="right" mono>
                {stats?.interviews ?? 0}
              </TD>
              <TD align="right" mono className={stats?.offers ? "text-success" : ""}>
                {stats?.offers ?? 0}
              </TD>
              <TD align="right" mono>
                {stats?.hires ?? 0}
              </TD>
              <TD align="right" mono>
                {salaryRange(job)}
              </TD>
              <TD align="right" mono>
                {money(job.bountyMin)}–{money(job.bountyMax)}
              </TD>
              <TD>{job.deadline || "—"}</TD>
              <TD className="text-muted-foreground">{job.lastActivity || "—"}</TD>
            </TR>
          ))}
        </tbody>
      </TableShell>
      <p className="border-t border-border bg-surface px-4 py-2.5 text-[11px] text-muted-foreground sm:px-6">
        {rows.length} job{rows.length === 1 ? "" : "s"} shown
        {status !== "all" ? ` · status ${jobStatusLabel[status as AmJobStatus]}` : ""}
        {q ? ` · matching “${q}”` : ""}
      </p>
    </AmShell>
  );
}
