import { Fragment, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Building2, Check, Info, Pencil, Plus, Search, Send, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { AmPageHeader, AmShell } from "@/components/am/am-shell";
import { useAm, type NewCandidateInput } from "@/components/am/am-store";
import { cn } from "@/lib/utils";
import {
  BulletList,
  Btn,
  DefinitionGrid,
  DrawerBlock,
  DrawerHeader,
  Field,
  FunnelRow,
  JobStatusPill,
  Kpi,
  KpiGrid,
  RequestStatusPill,
  Segmented,
  SideDrawer,
  StagePill,
  SubmissionStatusPill,
  TableShell,
  Tabs as TabsNav,
  TD,
  TH,
  THead,
  TR,
  TimelineList,
  inputCls,
  textareaCls,
} from "@/components/am/am-ui";
import { StatusBadge } from "@/components/app/status-badge";
import { MarkdownContent } from "@/components/common/markdown-content";
import {
  candidateStageLabel,
  candidateStages,
  money,
  moneyExact,
  salaryRange,
  type AmCompany,
  type AmJob,
  type AmJobStatus,
  type AmSubmission,
  type CandidateStage,
} from "@/lib/am-data";
import { strParam } from "@/lib/am-nav";
import { getJobActivityLog } from "@/lib/data";

type JobSearch = { tab?: string; focus?: string };

const tabIds = [
  "overview",
  "requests",
  "submissions",
  "feedback",
  "messages",
  "calendar",
  "activity",
];

export const Route = createFileRoute("/am/jobs/$jobId")({
  validateSearch: (raw: Record<string, unknown>): JobSearch => {
    const out: JobSearch = {};
    const tab = strParam(raw["tab"]);
    const focus = strParam(raw["focus"]);
    if (tab && tabIds.includes(tab)) out.tab = tab;
    if (focus) out.focus = focus;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Job Workspace — Account Manager | Yuvro" },
      {
        name: "description",
        content:
          "Full job context for Account Managers: recruiter requests, submissions awaiting review, candidate pipeline, company feedback, messages, interviews and audit trail.",
      },
      { property: "og:title", content: "Job Workspace — Account Manager | Yuvro" },
      {
        property: "og:description",
        content: "Recruiters, submissions, candidates, feedback and messages in one job.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AmJobWorkspacePage,
});

function AmJobWorkspacePage() {
  const { jobId } = Route.useParams();
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const am = useAm();
  const job = am.job(jobId);

  useEffect(() => {
    if (jobId) {
      am.refreshJobs();
      am.refreshCompanies();
      am.refreshRecruiters();
      am.refreshRequests();
      am.refreshSubmissions();
    }
  }, [jobId]);

  const tab = searchParams.tab ?? "overview";
  const setTab = (id: string) =>
    navigate({ to: "/am/jobs/$jobId", params: { jobId }, search: { tab: id }, replace: true });

  const [addOpen, setAddOpen] = useState(false);
  const [addRecruiterOpen, setAddRecruiterOpen] = useState(false);
  const openSubmission = (id: string) =>
    navigate({ to: "/am/submissions/$submissionId", params: { submissionId: id } });

  const company = job ? am.companyOfJob(job.id) : null;
  const stats = job
    ? am.jobStats(job.id)
    : {
        pendingRequests: 0,
        pendingSubmissions: 0,
        activeCandidates: 0,
        feedbackPending: 0,
        approvedRecruiters: 0,
        submissions: 0,
        interviews: 0,
        bounty: "$0",
      };

  const targetIds = new Set([jobId, job?.id, job?.slug, (job as any)?.backendId].filter(Boolean));
  const isTargetJob = (targetId: string) =>
    !targetId ||
    targetIds.has(targetId) ||
    Boolean(job?.slug && targetId === job.slug) ||
    Boolean(job?.id && targetId === job.id) ||
    Boolean(job?.slug && targetId.toLowerCase().includes(job.slug.toLowerCase())) ||
    Boolean(job?.id && targetId.toLowerCase().includes(job.id.toLowerCase())) ||
    Boolean(job?.title && targetId.toLowerCase() === job.title.toLowerCase()) ||
    Boolean(job?.title && targetId.toLowerCase().includes(job.title.toLowerCase().replace(/\s+/g, "-")));

  const requests = job ? am.state.requests.filter((r) => isTargetJob(r.jobId)) : [];
  const submissions = job ? am.state.submissions.filter((s) => isTargetJob(s.jobId)) : [];
  const feedback = job ? am.state.feedback.filter((f) => isTargetJob(f.jobId)) : [];
  const threads = job ? am.state.threads.filter((t) => isTargetJob(t.jobId)) : [];
  const events = job ? am.state.events.filter((e) => isTargetJob(e.jobId)) : [];
  const dynamicActivity = useMemo(() => {
    if (!job) return [];
    return getJobActivityLog(
      job,
      am.state.requests,
      am.state.submissions,
      am.state.candidates,
    );
  }, [job, am.state.requests, am.state.submissions, am.state.candidates]);

  const seniorityDisplay = useMemo(() => {
    if (!job?.experience && !job?.yearsExperience) return "—";
    if (!job?.yearsExperience || job?.experience === job?.yearsExperience) return job?.experience;
    if (job?.experience?.includes(job?.yearsExperience)) return job?.experience;
    return `${job?.experience} · ${job?.yearsExperience}`;
  }, [job?.experience, job?.yearsExperience]);

  const equityDisplay = useMemo(() => {
    if (job?.equityValue != null) return `${job.equityValue}%`;
    return job?.equity || "—";
  }, [job?.equityValue, job?.equity]);

  const tabs = useMemo(
    () => [
      { id: "overview", label: "Overview" },
      { id: "requests", label: "Recruiter requests", count: stats.pendingRequests },
      { id: "submissions", label: "Submissions", count: stats.pendingSubmissions },
      { id: "feedback", label: "Feedback", count: stats.feedbackPending },
      { id: "messages", label: "Messages", count: threads.reduce((a, t) => a + t.unread, 0) },
      { id: "calendar", label: "Calendar", count: events.length },
      { id: "activity", label: "Activity", count: dynamicActivity.length },
    ],
    [stats, threads, events, dynamicActivity.length]
  );

  if (!job || !company) {
    return (
      <AmShell>
        <AmPageHeader
          title="Job not found"
          description="This job is no longer available on the marketplace."
        />
        <div className="px-4 py-6 sm:px-6">
          <Btn onClick={() => navigate({ to: "/am/jobs" })}>Back to jobs</Btn>
        </div>
      </AmShell>
    );
  }

  return (
    <AmShell>
      <AmPageHeader
        breadcrumb={
          <span>
            <Link to="/am/jobs" className="hover:text-foreground hover:underline">
              Jobs
            </Link>{" "}
            /{" "}
            <Link
              to="/am/companies/$companyId"
              params={{ companyId: company.slug || company.id }}
              className="hover:text-foreground hover:underline"
            >
              {company.name}
            </Link>{" "}
            / {job.title}
          </span>
        }
        title={job.title}
        description={`${company.name} · ${job.location} · ${job.workModel} · ${job.employmentType} · ${job.openings} opening${job.openings > 1 ? "s" : ""} · deadline ${job.deadline}`}
        actions={
          <>
            <JobStatusPill status={job.status} />
            <Btn
              onClick={() =>
                navigate({
                  to: "/am/jobs/$jobId/edit",
                  params: { jobId: job.slug || job.id },
                })
              }
            >
              <Pencil className="size-3.5" /> Edit job
            </Btn>
            <Btn onClick={() => setTab("messages")}>Message company</Btn>
            <Btn onClick={() => setAddRecruiterOpen(true)}>
              <UserPlus className="size-3.5" /> Add recruiter
            </Btn>
            <Btn variant="primary" onClick={() => setAddOpen(true)}>
              <Plus className="size-3.5" /> Add candidate
            </Btn>
          </>
        }
      >
        <TabsNav tabs={tabs} active={tab} onSelect={setTab} />
      </AmPageHeader>

      <KpiGrid>
        <Kpi
          label="Approved recruiters"
          value={`${stats.approvedRecruiters}/${am.state.recruiters.length}`}
          hint="Working this job"
        />
        <Kpi
          label="Submissions"
          value={stats.submissions}
          hint={`${stats.pendingSubmissions} awaiting review`}
          tone={stats.pendingSubmissions > 0 ? "warning" : "default"}
        />
        <Kpi
          label="In process"
          value={stats.activeCandidates}
          hint="Company review → offer"
        />
        <Kpi
          label="Interviews"
          value={stats.interviews}
          hint="Scheduled or completed"
        />
        <Kpi
          label="Bounty"
          value={`${money(job.bountyMin)}–${money(job.bountyMax)}`}
          hint={job.bountyPct}
        />
      </KpiGrid>

      {tab === "overview" ? (
        <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="border-b border-border bg-surface px-4 py-5 sm:px-6 lg:border-b-0 lg:border-r">
            <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
              About the role
            </h2>
            <div className="mt-3 max-w-3xl">
              <MarkdownContent content={job.jd.aboutRole || job.jobDescription} />
            </div>

            {((job.jd.responsibilities && job.jd.responsibilities.length > 0) ||
              (job.mustHave && job.mustHave.length > 0) ||
              (job.jd.requirements && job.jd.requirements.length > 0) ||
              (job.signals?.green && job.signals.green.length > 0) ||
              (job.signals?.red && job.signals.red.length > 0)) ? (
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                {job.jd.responsibilities && job.jd.responsibilities.length > 0 ? (
                  <div>
                    <p className="label-caps">Responsibilities</p>
                    <div className="mt-2">
                      <BulletList items={job.jd.responsibilities} />
                    </div>
                  </div>
                ) : null}
                {((job.mustHave && job.mustHave.length > 0) || (job.jd.requirements && job.jd.requirements.length > 0)) ? (
                  <div>
                    <p className="label-caps">Must have</p>
                    <div className="mt-2">
                      <BulletList
                        items={job.mustHave && job.mustHave.length > 0 ? job.mustHave : job.jd.requirements}
                        tone="success"
                      />
                    </div>
                  </div>
                ) : null}
                {(job.signals?.green && job.signals.green.length > 0) || (job.niceToHave && job.niceToHave.length > 0) ? (
                  <div>
                    <p className="label-caps">Positive signals</p>
                    <div className="mt-2">
                      <BulletList items={job.signals?.green && job.signals.green.length ? job.signals.green : job.niceToHave} />
                    </div>
                  </div>
                ) : null}
                {job.signals?.red && job.signals.red.length ? (
                  <div className="sm:col-span-2">
                    <p className="label-caps">Disqualifiers & red flags</p>
                    <div className="mt-2">
                      <BulletList items={job.signals.red} tone="danger" />
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

              {job.targetCompanies && job.targetCompanies.length > 0 ? (
                <div className="mt-6 rounded-lg border border-border bg-surface-sunken/40 p-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-brand" />
                    <h3 className="text-[13px] font-semibold tracking-tight text-foreground">
                      Target companies
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ideal pedigree & companies to source qualified candidates from:
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {job.targetCompanies.map((tc) => (
                      <span
                        key={tc}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground shadow-2xs"
                      >
                        <Building2 className="size-3 text-brand/80" />
                        {tc}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <h2 className="mt-7 text-[13px] font-semibold tracking-tight text-foreground">
                Hiring process
              </h2>
              <ol className="mt-2 divide-y divide-border border-y border-border">
                {job.process.map((p, i) => (
                  <li key={p} className="flex items-center gap-3 py-2.5">
                    <span className="num grid size-6 shrink-0 place-items-center rounded bg-surface-sunken text-[11px] font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="text-[13px] text-foreground">{p}</span>
                  </li>
                ))}
              </ol>

              <h2 className="mt-7 text-[13px] font-semibold tracking-tight text-foreground">
                Screening questions
              </h2>
              <ul className="mt-2 space-y-2">
                {job.questions.map((q) => (
                  <li
                    key={q.q}
                    className="rounded-md border border-border bg-surface-sunken/50 px-3 py-2"
                  >
                    <p className="text-[13px] text-foreground">{q.q}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {q.type} · {q.required ? "Required" : "Optional"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <aside className="bg-surface px-4 py-5 sm:px-6">
              <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
                Commercials & context
              </h2>
              <div className="mt-3">
                <DefinitionGrid
                  columns={2}
                  items={[
                    { label: "Salary", value: salaryRange(job) },
                    { label: "Equity", value: equityDisplay },
                    {
                      label: "Bounty",
                      value: `${money(job.bountyMin)}–${money(job.bountyMax)} (${job.bountyPct})`,
                    },
                    { label: "Payment rules", value: job.paymentRules },
                    {
                      label: "Approved recruiters",
                      value: `${stats.approvedRecruiters} active`,
                    },
                    { label: "Seniority", value: seniorityDisplay },
                    { label: "Visa", value: job.visa },
                    {
                      label: "Target companies",
                      value: job.targetCompanies?.length ? job.targetCompanies.join(", ") : "Any",
                    },
                    { label: "Hiring manager", value: job.hiringManager },
                    { label: "Company contact", value: job.companyContact },
                    { label: "Created", value: job.createdAt },
                  ]}
                />
              </div>

            <h2 className="mt-6 text-[13px] font-semibold tracking-tight text-foreground">
              Pipeline
            </h2>
            <div className="mt-2">
              {[
                "submitted",
                "am_review",
                "company_review",
                "interview",
                "final",
                "offer",
                "hired",
              ].map((st) => (
                <FunnelRow
                  key={st}
                  label={candidateStageLabel[st as CandidateStage]}
                  value={submissions.filter((s) => s.stage === st).length}
                  max={Math.max(1, submissions.length)}
                />
              ))}
            </div>

            <h2 className="mt-6 text-[13px] font-semibold tracking-tight text-foreground">
              Company
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{company.overview}</p>
            <Btn
              className="mt-3"
              onClick={() =>
                navigate({ to: "/am/companies/$companyId", params: { companyId: company.id } })
              }
            >
              Open company workspace <ArrowRight className="size-3.5" />
            </Btn>
          </aside>
        </div>
      ) : null}

      {tab === "requests" ? (
        <TableShell className="bg-surface">
          <THead>
            <TH>Recruiter</TH>
            <TH>Type</TH>
            <TH align="right">Relevant profiles</TH>
            <TH align="right">Quality</TH>
            <TH>Requested</TH>
            <TH>Status</TH>
            <TH align="right">Decision</TH>
          </THead>
          <tbody>
            {requests.map((r) => {
              const rec =
                am.recruiter(r.recruiterId) ||
                (r.recruiterProfileId ? am.recruiter(r.recruiterProfileId) : undefined);
              const displayName =
                rec?.name || r.recruiterName || r.recruiterEmail || "Recruiter";
              const targetRecruiterId = rec?.id || r.recruiterProfileId || r.recruiterId;
              const recType = rec?.type || "Independent";
              const recSubtext =
                (rec?.type === "Agency" && rec.agency ? rec.agency : "Independent") +
                (rec?.location && rec.location !== "—" ? ` · ${rec.location}` : "");

              return (
                <Fragment key={r.id}>
                  <TR className="border-b-0">
                    <TD>
                      <button
                        type="button"
                        className="block truncate text-left font-medium text-brand underline-offset-4 hover:underline"
                        onClick={() =>
                          navigate({
                            to: "/am/recruiters/$recruiterId",
                            params: { recruiterId: targetRecruiterId },
                          })
                        }
                      >
                        {displayName}
                      </button>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {recSubtext}
                      </span>
                    </TD>
                    <TD>{recType}</TD>
                    <TD align="right" mono>
                      {r.relevantProfiles}
                    </TD>
                    <TD align="right" mono>
                      {rec?.qualityScore ?? "—"}
                    </TD>
                    <TD>{r.requestedAt}</TD>
                    <TD>
                      <RequestStatusPill status={r.status} />
                    </TD>
                    <TD align="right">
                      {r.status === "pending" ? (
                        <span className="flex justify-end gap-1.5">
                          <Btn
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              am.approveRequest(r.id);
                              toast.success(`${displayName} approved for ${job.title}`);
                            }}
                          >
                            <Check className="size-3.5" /> Approve
                          </Btn>
                          <Btn
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              am.rejectRequest(r.id, "Recruiter pool already full for this role");
                              toast.message(`${displayName} rejected`, {
                                description: "Recruiter pool already full for this role",
                              });
                            }}
                          >
                            <X className="size-3.5" /> Reject
                          </Btn>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {r.status === "approved" ? "Approved" : "Rejected"}
                        </span>
                      )}
                    </TD>
                  </TR>
                  <TR className="border-b border-border/70">
                    <TD colSpan={7} className="pt-0 pb-3 max-w-0">
                      <div className="rounded-md bg-surface-sunken/60 px-3 py-2 text-xs text-muted-foreground border border-border/40 w-full min-w-0">
                        <span className="font-semibold text-foreground/80 mr-1.5 shrink-0">Pitch:</span>
                        <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]">{r.pitch || "—"}</span>
                      </div>
                    </TD>
                  </TR>
                </Fragment>
              );
            })}
          </tbody>
        </TableShell>
      ) : null}

      {tab === "submissions" ? (
        <SubmissionsTable
          submissions={submissions}
          onOpen={openSubmission}
          focus={searchParams.focus}
        />
      ) : null}

      {tab === "feedback" ? (
        <ul className="divide-y divide-border bg-surface">
          {feedback.length === 0 ? (
            <li className="px-4 py-10 text-center text-[13px] text-muted-foreground sm:px-6">
              No company feedback recorded on this job yet.
            </li>
          ) : null}
          {feedback.map((f) => {
            const sub = submissions.find((s) => s.id === f.submissionId);
            const cand = sub ? am.candidate(sub.candidateId) : undefined;
            return (
              <li key={f.id} className="px-4 py-4 sm:px-6">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-semibold text-foreground">
                    {cand?.name ?? f.submissionId}
                  </p>
                  <StatusBadge
                    tone={
                      f.state === "action_required"
                        ? "danger"
                        : f.state === "pending"
                          ? "warning"
                          : "success"
                    }
                    dot
                  >
                    {f.state.replace("_", " ")}
                  </StatusBadge>
                  <span className="text-[11px] text-muted-foreground">
                    {f.from} · {f.at}
                  </span>
                </div>
                <p className="mt-1.5 max-w-3xl text-[13px] leading-6 text-foreground">{f.body}</p>
                {f.rejectionReason ? (
                  <p className="mt-1 text-xs text-destructive">
                    Rejection reason: {f.rejectionReason}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {sub ? (
                    <Btn size="sm" onClick={() => openSubmission(sub.id)}>
                      Open candidate
                    </Btn>
                  ) : null}
                  {!f.handled ? (
                    <Btn
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        am.handleFeedback(f.id);
                        toast.success("Feedback marked as handled");
                      }}
                    >
                      Mark handled
                    </Btn>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Handled by you</span>
                  )}
                  <Btn size="sm" onClick={() => setTab("messages")}>
                    Reply to company
                  </Btn>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {tab === "messages" ? <JobMessages jobId={job.id} /> : null}

      {tab === "calendar" ? (
        <ul className="divide-y divide-border bg-surface">
          {events.length === 0 ? (
            <li className="px-4 py-10 text-center text-[13px] text-muted-foreground sm:px-6">
              Nothing scheduled on this job.
            </li>
          ) : null}
          {events.map((e) => {
            const cand = e.candidateId ? am.candidate(e.candidateId) : undefined;
            return (
              <li
                key={e.id}
                className="grid gap-1 px-4 py-3 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-center sm:px-6"
              >
                <span className="num text-[13px] font-semibold text-foreground">
                  {e.date} · {e.time}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-foreground">
                    {cand ? `${cand.name} — ${e.title}` : e.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{e.stage ?? e.type}</p>
                </div>
                <StatusBadge tone={e.type === "Deadline" ? "danger" : "brand"} dot>
                  {e.type}
                </StatusBadge>
              </li>
            );
          })}
        </ul>
      ) : null}

      {tab === "activity" ? (
        <div className="bg-surface px-4 py-5 sm:px-6">
          <TimelineList
            items={dynamicActivity.map((a) => ({
              label: a.event,
              at: a.time,
              by: a.actor,
              ...(a.object && a.object !== job.title ? { note: a.object } : {}),
            }))}
          />
        </div>
      ) : null}

      <AddCandidateDrawer open={addOpen} onOpenChange={setAddOpen} jobId={job.id} />
      <AddRecruiterDrawer
        open={addRecruiterOpen}
        onOpenChange={setAddRecruiterOpen}
        job={job}
      />
    </AmShell>
  );
}

/* ------------------------------------------------------------- submissions */

function SubmissionsTable({
  submissions,
  onOpen,
  focus,
}: {
  submissions: AmSubmission[];
  onOpen: (id: string) => void;
  focus?: string | undefined;
}) {
  const am = useAm();
  const [stage, setStage] = useState("all");
  const rows = submissions.filter((s) => (stage === "all" ? true : s.stage === stage));

  return (
    <>
      <div className="border-b border-border bg-surface px-4 py-3 sm:px-6">
        <Segmented
          options={[
            { id: "all", label: "All", count: submissions.length },
            ...candidateStages.map((st) => ({
              id: st,
              label: candidateStageLabel[st],
              count: submissions.filter((s) => s.stage === st).length,
            })),
          ]}
          value={stage}
          onChange={setStage}
        />
      </div>
      <TableShell className="bg-surface">
        <THead>
          <TH>Candidate</TH>
          <TH>Source</TH>
          <TH>Status</TH>
          <TH>Stage</TH>
          <TH>Submitted</TH>
          <TH>Last activity</TH>
          <TH align="right">Bounty</TH>
          <TH align="right">Review</TH>
        </THead>
        <tbody>
          {rows.length === 0 ? (
            <TR>
              <TD colSpan={8} className="py-8 text-center text-muted-foreground">
                Nothing in this stage.
              </TD>
            </TR>
          ) : null}
          {rows.map((s) => {
            const cand = am.candidate(s.candidateId);
            const rec = am.recruiter(s.recruiterId);
            return (
              <TR key={s.id} onClick={() => onOpen(s.id)} active={focus === s.candidateId}>
                <TD>
                  <span className="block truncate font-medium">{cand?.name ?? s.candidateId}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {cand?.currentRole} at {cand?.currentCompany} · {cand?.location}
                  </span>
                </TD>
                <TD>
                  <span className="block truncate">{rec ? rec.name : "Account Manager"}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {rec ? (rec.type === "Agency" ? rec.agency : "Independent") : "Direct upload"}
                  </span>
                </TD>
                <TD>
                  <SubmissionStatusPill status={s.status} />
                </TD>
                <TD>
                  <StagePill stage={s.stage} />
                </TD>
                <TD>{s.submittedAt}</TD>
                <TD className="text-muted-foreground">{s.lastActivity}</TD>
                <TD align="right" mono>
                  {s.bounty ? moneyExact(s.bounty) : "—"}
                </TD>
                <TD align="right">
                  <Btn size="sm" onClick={() => onOpen(s.id)}>
                    Open
                  </Btn>
                </TD>
              </TR>
            );
          })}
        </tbody>
      </TableShell>
    </>
  );
}

/* ---------------------------------------------------------------- messages */

function JobMessages({ jobId }: { jobId: string }) {
  const am = useAm();
  const threads = am.state.threads.filter((t) => t.jobId === jobId);
  const [activeId, setActiveId] = useState(threads[0]?.id ?? "");
  const [body, setBody] = useState("");
  const active = threads.find((t) => t.id === activeId) ?? threads[0];

  if (!threads.length) {
    return (
      <p className="bg-surface px-4 py-10 text-center text-[13px] text-muted-foreground sm:px-6">
        No conversations on this job yet.
      </p>
    );
  }

  return (
    <div className="grid bg-surface lg:grid-cols-[280px_minmax(0,1fr)]">
      <ul className="divide-y divide-border border-b border-border lg:border-b-0 lg:border-r">
        {threads.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => {
                setActiveId(t.id);
                am.markThreadRead(t.id);
              }}
              className={`block w-full px-4 py-3 text-left transition-colors hover:bg-surface-sunken ${
                active?.id === t.id ? "bg-surface-sunken" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] font-medium text-foreground">
                  {t.participant}
                </span>
                {t.unread ? (
                  <span className="num rounded bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-brand-foreground">
                    {t.unread}
                  </span>
                ) : null}
              </div>
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                {t.participantTitle} · {t.kind}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="flex min-h-[420px] flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-foreground">
              {active?.participant}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">{active?.participantTitle}</p>
          </div>
          {active?.urgent ? (
            <StatusBadge tone="danger" dot>
              Urgent
            </StatusBadge>
          ) : null}
        </header>

        <ul className="scroll-slim flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
          {active?.messages.map((m) => (
            <li
              key={m.id}
              className={`max-w-[560px] rounded-md border px-3 py-2 ${
                m.role === "Account Manager"
                  ? "ml-auto border-brand/25 bg-brand-soft/60"
                  : "border-border bg-surface-sunken/60"
              }`}
            >
              <p className="text-[11px] font-medium text-muted-foreground">
                {m.from} · {m.role} · {m.at}
              </p>
              <p className="mt-1 text-[13px] leading-6 text-foreground">{m.body}</p>
            </li>
          ))}
        </ul>

        <form
          className="flex items-end gap-2 border-t border-border px-4 py-3 sm:px-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!body.trim() || !active) return;
            am.sendMessage(active.id, body.trim());
            setBody("");
          }}
        >
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`Message ${active?.participant ?? ""}`}
            className={`${textareaCls} min-h-[44px]`}
            rows={2}
          />
          <Btn type="submit" variant="primary">
            <Send className="size-4" /> Send
          </Btn>
        </form>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- add recruiter */

function AddRecruiterDrawer({
  open,
  onOpenChange,
  job,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  job: AmJob;
}) {
  const am = useAm();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Target job identifier matching logic
  const targetIds = useMemo(
    () => new Set([job?.id, job?.slug, (job as any)?.backendId].filter(Boolean)),
    [job],
  );
  const isTargetJob = (targetId: string) =>
    !targetId ||
    targetIds.has(targetId) ||
    Boolean(job?.slug && targetId === job.slug) ||
    Boolean(job?.id && targetId === job.id) ||
    Boolean(job?.slug && targetId.toLowerCase().includes(job.slug.toLowerCase())) ||
    Boolean(job?.id && targetId.toLowerCase().includes(job.id.toLowerCase()));

  // Set of already approved recruiter IDs
  const approvedRecruiterIds = useMemo(() => {
    const set = new Set<string>();
    am.state.requests.forEach((r) => {
      if (isTargetJob(r.jobId) && r.status === "approved") {
        if (r.recruiterId) set.add(r.recruiterId);
        if (r.recruiterProfileId) set.add(r.recruiterProfileId);
      }
    });
    return set;
  }, [am.state.requests, job]);

  // Filter recruiters
  const filteredRecruiters = useMemo(() => {
    const q = search.trim().toLowerCase();
    return am.state.recruiters.filter((r) => {
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.agency && r.agency.toLowerCase().includes(q)) ||
        (r.location && r.location.toLowerCase().includes(q)) ||
        r.specializations?.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [am.state.recruiters, search]);

  const selectedRecruiter = useMemo(
    () => am.state.recruiters.find((r) => r.id === selectedId || r.userId === selectedId),
    [am.state.recruiters, selectedId],
  );

  const isAlreadyAssigned = selectedRecruiter
    ? approvedRecruiterIds.has(selectedRecruiter.id) ||
      Boolean(selectedRecruiter.userId && approvedRecruiterIds.has(selectedRecruiter.userId))
    : false;

  const handleAssign = async () => {
    if (!selectedRecruiter) {
      toast.error("Please select a recruiter to assign.");
      return;
    }
    if (isAlreadyAssigned) {
      toast.error("This recruiter is already approved for this role.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await am.assignRecruiter(
        job.id,
        selectedRecruiter.userId || selectedRecruiter.id,
        note,
      );
      if (res.ok) {
        toast.success(res.message || `${selectedRecruiter.name} assigned to ${job.title}`);
        onOpenChange(false);
        setSelectedId("");
        setNote("");
      } else {
        toast.error(res.message || "Failed to assign recruiter");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to assign recruiter");
    } finally {
      setSubmitting(false);
    }
  };

  const company = job ? am.companyOfJob(job.id) : null;

  return (
    <SideDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Add recruiter to job"
      footer={
        <>
          <Btn onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            onClick={handleAssign}
            disabled={!selectedRecruiter || isAlreadyAssigned || submitting}
          >
            <UserPlus className="size-4" />
            {submitting ? "Assigning..." : "Assign to role"}
          </Btn>
        </>
      }
    >
      <DrawerHeader
        eyebrow={`${job.title} · ${company?.name || "Company"}`}
        title="Add recruiter to job"
        subtitle={
          <span className="text-[13px] text-muted-foreground">
            Assign an approved recruiter directly to this role so they can immediately start sourcing candidates.
          </span>
        }
      />

      <div className="mx-4 mt-4 rounded-md border border-border bg-surface-sunken/50 p-3 sm:mx-5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Currently approved on role:</span>
          <span className="font-semibold text-foreground">
            {approvedRecruiterIds.size} recruiter{approvedRecruiterIds.size === 1 ? "" : "s"} active
          </span>
        </div>
      </div>

      <DrawerBlock title="Select recruiter">
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, agency, skill, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputCls} pl-9`}
            />
          </div>

          <div className="max-h-64 overflow-y-auto rounded-md border border-border divide-y divide-border bg-surface">
            {filteredRecruiters.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No recruiters found matching "{search}".
              </div>
            ) : (
              filteredRecruiters.map((r) => {
                const assigned =
                  approvedRecruiterIds.has(r.id) ||
                  Boolean(r.userId && approvedRecruiterIds.has(r.userId));
                const isSelected = selectedId === r.id || Boolean(r.userId && selectedId === r.userId);

                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={cn(
                      "w-full text-left p-3 transition-colors flex items-center justify-between gap-3",
                      isSelected
                        ? "bg-brand/10 border-l-2 border-l-brand"
                        : "hover:bg-surface-sunken/60",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs text-foreground truncate">
                          {r.name}
                        </span>
                        <span className="rounded bg-surface-sunken px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {r.type === "Agency" ? r.agency || "Agency" : "Independent"}
                        </span>
                        {assigned ? (
                          <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium">
                            Approved
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                        <span>{r.email}</span>
                        {r.location && r.location !== "—" ? <span>• {r.location}</span> : null}
                        {r.qualityScore ? <span>• Quality: {r.qualityScore}</span> : null}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => setSelectedId(r.id)}
                        className="size-4 text-brand focus:ring-brand"
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </DrawerBlock>

      {selectedRecruiter ? (
        <DrawerBlock title="Recruiter details">
          <div className="rounded-md border border-border bg-surface-sunken/40 p-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium text-foreground">{selectedRecruiter.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="text-foreground">
                {selectedRecruiter.type} {selectedRecruiter.agency ? `(${selectedRecruiter.agency})` : ""}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quality score:</span>
              <span className="text-foreground font-mono">{selectedRecruiter.qualityScore ?? "—"}</span>
            </div>
            {selectedRecruiter.specializations && selectedRecruiter.specializations.length > 0 ? (
              <div>
                <span className="text-muted-foreground block mb-1">Specializations:</span>
                <div className="flex flex-wrap gap-1">
                  {selectedRecruiter.specializations.map((s) => (
                    <span
                      key={s}
                      className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-foreground border border-border"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {isAlreadyAssigned ? (
              <div className="mt-2 rounded bg-amber-500/10 border border-amber-500/30 p-2 text-amber-700 dark:text-amber-300 text-xs">
                ⚠️ This recruiter is already approved for this role.
              </div>
            ) : null}
          </div>
        </DrawerBlock>
      ) : null}

      <DrawerBlock title="Assignment context & pitch (optional)">
        <Field label="Assignment note">
          <textarea
            rows={3}
            placeholder="e.g. Assigned to prioritize senior backend profiles from high-growth tech companies..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={textareaCls}
          />
        </Field>
      </DrawerBlock>
    </SideDrawer>
  );
}

/* ----------------------------------------------------------- add candidate */

function AddCandidateDrawer({
  open,
  onOpenChange,
  jobId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jobId: string;
}) {
  const am = useAm();
  const job = am.job(jobId);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    linkedin: "",
    github: "",
    portfolio: "",
    location: "",
    visa: "Citizen / no sponsorship",
    compensation: "",
    availability: "2 weeks",
    currentRole: "",
    currentCompany: "",
    resume: "resume.pdf",
    recruiterId: "",
    match: "82",
    recommendation: "",
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const dup = useMemo(
    () => (form.name || form.email ? am.duplicateCheck(jobId, form.name, form.email) : {}),
    [am, jobId, form.name, form.email],
  );

  const submit = () => {
    if (!form.name || !form.email) {
      toast.error("Candidate name and email are required.");
      return;
    }
    const input: NewCandidateInput = {
      jobId,
      name: form.name,
      email: form.email,
      phone: form.phone,
      linkedin: form.linkedin,
      github: form.github,
      portfolio: form.portfolio,
      location: form.location,
      visa: form.visa,
      compensation: form.compensation,
      availability: form.availability,
      currentRole: form.currentRole,
      currentCompany: form.currentCompany,
      resume: form.resume,
      source: form.recruiterId ? "recruiter" : "account_manager",
      recruiterId: form.recruiterId || null,
      match: Number(form.match) || 75,
      recommendation: form.recommendation,
      answers: (job?.questions ?? []).map((q) => ({ q: q.q, a: answers[q.q] ?? "" })),
    };
    const res = am.addCandidate(input);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success(res.message);
    onOpenChange(false);
  };

  return (
    <SideDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Add candidate"
      footer={
        <>
          <Btn onClick={() => onOpenChange(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={submit}>
            <Check className="size-4" /> Add to pipeline
          </Btn>
        </>
      }
    >
      <DrawerHeader
        eyebrow={job ? `${job.title} · ${am.companyOfJob(job.id).name}` : "New candidate"}
        title="Add candidate directly"
        subtitle={
          <span className="text-[13px] text-muted-foreground">
            Uploaded as Account Manager, or attributed to a recruiter for bounty tracking.
          </span>
        }
      />

      {dup.candidate ? (
        <div className="mx-4 mt-4 rounded-md border border-warning/35 bg-warning-soft px-3 py-2.5 sm:mx-5">
          <p className="text-[13px] font-semibold text-foreground">Possible duplicate</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            {dup.candidate.name} already exists in the marketplace
            {dup.submission
              ? " and is already submitted to this job."
              : " on another job. Adding here is allowed."}
          </p>
        </div>
      ) : null}

      <DrawerBlock title="Candidate">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name">
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>
          <Field label="Email">
            <input
              className={inputCls}
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <input
              className={inputCls}
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
          <Field label="Location">
            <input
              className={inputCls}
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
            />
          </Field>
          <Field label="Current role">
            <input
              className={inputCls}
              value={form.currentRole}
              onChange={(e) => set("currentRole", e.target.value)}
            />
          </Field>
          <Field label="Current company">
            <input
              className={inputCls}
              value={form.currentCompany}
              onChange={(e) => set("currentCompany", e.target.value)}
            />
          </Field>
          <Field label="LinkedIn">
            <input
              className={inputCls}
              value={form.linkedin}
              onChange={(e) => set("linkedin", e.target.value)}
            />
          </Field>
          <Field label="GitHub">
            <input
              className={inputCls}
              value={form.github}
              onChange={(e) => set("github", e.target.value)}
            />
          </Field>
          <Field label="Portfolio">
            <input
              className={inputCls}
              value={form.portfolio}
              onChange={(e) => set("portfolio", e.target.value)}
            />
          </Field>
          <Field label="Resume file">
            <input
              className={inputCls}
              value={form.resume}
              onChange={(e) => set("resume", e.target.value)}
            />
          </Field>
          <Field label="Salary expectation">
            <input
              className={inputCls}
              value={form.compensation}
              onChange={(e) => set("compensation", e.target.value)}
            />
          </Field>
          <Field label="Availability">
            <input
              className={inputCls}
              value={form.availability}
              onChange={(e) => set("availability", e.target.value)}
            />
          </Field>
          <Field label="Visa status">
            <input
              className={inputCls}
              value={form.visa}
              onChange={(e) => set("visa", e.target.value)}
            />
          </Field>
          <Field label="Match score">
            <input
              className={inputCls}
              value={form.match}
              onChange={(e) => set("match", e.target.value)}
            />
          </Field>
          <Field
            label="Attribute to recruiter"
            hint="Leave empty to record as an Account Manager upload."
          >
            <select
              className={inputCls}
              value={form.recruiterId}
              onChange={(e) => set("recruiterId", e.target.value)}
            >
              <option value="">Account Manager (no recruiter)</option>
              {am.state.recruiters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </DrawerBlock>

      <DrawerBlock title="Recommendation">
        <textarea
          className={textareaCls}
          value={form.recommendation}
          onChange={(e) => set("recommendation", e.target.value)}
          placeholder="Why this candidate fits the role."
        />
      </DrawerBlock>

      {job?.questions.length ? (
        <DrawerBlock title="Screening answers">
          <ul className="space-y-3">
            {job.questions.map((q) => (
              <li key={q.q}>
                <Field label={q.q}>
                  <textarea
                    className={textareaCls}
                    value={answers[q.q] ?? ""}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.q]: e.target.value }))}
                  />
                </Field>
              </li>
            ))}
          </ul>
        </DrawerBlock>
      ) : null}
    </SideDrawer>
  );
}

