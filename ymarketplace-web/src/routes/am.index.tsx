import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, Plus } from "lucide-react";
import { AmPageHeader, AmShell } from "@/components/am/am-shell";
import { useAm } from "@/components/am/am-store";
import {
  Btn,
  JobStatusPill,
  Kpi,
  KpiGrid,
  StagePill,
  TableShell,
  TD,
  TH,
  THead,
  TR,
  TimelineList,
} from "@/components/am/am-ui";
import { jobStatusLabel, money, type AmAttention } from "@/lib/am-data";
import { useAuth, getUserFirstName } from "@/lib/auth";
import { pickSearch } from "@/lib/am-nav";

export const Route = createFileRoute("/am/")({
  head: () => ({
    meta: [
      { title: "Operations Overview — Account Manager | Yuvro" },
      {
        name: "description",
        content:
          "Account Manager overview: recruiter requests awaiting approval, submissions pending review, interviews today, offers, hires and payout status across every managed job.",
      },
      { property: "og:title", content: "Operations Overview — Account Manager | Yuvro" },
      {
        property: "og:description",
        content: "One screen for everything that needs an Account Manager decision today.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AmOverviewPage,
});

function AmOverviewPage() {
  const { kpis, attention, state, jobStats, companyOfJob, candidate, recruiter } = useAm();
  const { user } = useAuth();
  const navigate = useNavigate();

  const firstName = getUserFirstName(user, "there");

  const openLink = (link: AmAttention["link"]) => {
    if (link.jobId) {
      navigate({
        to: "/am/jobs/$jobId",
        params: { jobId: link.jobId },
        search: pickSearch({ tab: link.tab, focus: link.focus }),
      });
      return;
    }
    navigate({ to: "/am/jobs" });
  };

  const interviewsToday = state.events.filter((e) => e.type === "Interview" && e.date === "Today");
  const activeJobs = state.jobs
    .filter((j) => j.status === "hiring" || j.status === "active")
    .slice(0, 6)
    .map((j) => ({ job: j, stats: jobStats(j.id), company: companyOfJob(j.id) }));

  return (
    <AmShell>
      <AmPageHeader
        title={`Good morning, ${firstName}`}
        description={`${state.jobs.length} jobs across ${state.companies.length} companies. Everything below is waiting on you or moving today.`}
        actions={
          <>
            <Btn onClick={() => navigate({ to: "/am/jobs" })}>
              All jobs <ArrowRight className="size-3.5" />
            </Btn>
            <Btn variant="primary" onClick={() => navigate({ to: "/am/jobs/new" })}>
              <Plus className="size-4" /> Create job
            </Btn>
          </>
        }
      />

      <KpiGrid>
        <Kpi label="Active jobs" value={kpis.activeJobs} hint="Hiring or active" to="/am/jobs" />
        <Kpi
          label="Recruiter requests"
          value={kpis.pendingRequests}
          hint="Awaiting approval"
          tone={kpis.pendingRequests ? "warning" : "default"}
        />
        <Kpi
          label="Submissions to review"
          value={kpis.pendingSubmissions}
          hint="Before company sees them"
          tone={kpis.pendingSubmissions ? "warning" : "default"}
        />
        <Kpi label="Candidates in process" value={kpis.inProcess} hint="Company review → offer" />
        <Kpi
          label="Feedback overdue"
          value={kpis.feedbackPending}
          hint="Chase the company"
          tone={kpis.feedbackPending ? "danger" : "default"}
        />
      </KpiGrid>
      <KpiGrid className="border-t-0">
        <Kpi
          label="Interviews today"
          value={kpis.interviewsToday}
          hint="Across all desks"
          to="/am/calendar"
        />
        <Kpi label="Open offers" value={kpis.offers} tone="success" hint="Awaiting decision" />
        <Kpi
          label="Hires this quarter"
          value={kpis.hires}
          tone="success"
          hint="Placed and confirmed"
        />
        <Kpi
          label="Payouts pending"
          value={money(kpis.pendingPayouts)}
          hint="Recruiter bounties"
          to="/am/payouts"
          tone={kpis.pendingPayouts ? "warning" : "default"}
        />
        <Kpi
          label="Companies managed"
          value={state.companies.length}
          to="/am/companies"
          hint="Active accounts"
        />
      </KpiGrid>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <section className="border-b border-border lg:border-b-0 lg:border-r">
          <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6">
            <div>
              <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
                Needs your attention
              </h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Ordered by blast radius — recruiter access, then submissions, then stalled feedback.
              </p>
            </div>
            <span className="num rounded bg-brand-soft px-1.5 py-0.5 text-[11px] font-semibold text-brand">
              {attention.length}
            </span>
          </header>
          <ul className="divide-y divide-border bg-surface">
            {attention.length === 0 ? (
              <li className="px-4 py-10 text-center text-[13px] text-muted-foreground sm:px-6">
                Nothing is blocked. Every request, submission and feedback loop is up to date.
              </li>
            ) : null}
            {attention.map((a) => (
              <li
                key={a.id}
                className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-foreground">{a.headline}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{a.context}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{a.meta}</p>
                </div>
                <Btn
                  size="sm"
                  onClick={() => openLink(a.link)}
                  className="justify-self-start sm:justify-self-end"
                >
                  {a.cta} <ArrowRight className="size-3.5" />
                </Btn>
              </li>
            ))}
          </ul>
        </section>

        <aside className="bg-surface">
          <header className="border-b border-border px-4 py-3 sm:px-6">
            <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
              Today’s interviews
            </h2>
          </header>
          <ul className="divide-y divide-border">
            {interviewsToday.length === 0 ? (
              <li className="px-4 py-6 text-[13px] text-muted-foreground sm:px-6">
                No interviews scheduled today.
              </li>
            ) : null}
            {interviewsToday.map((e) => {
              const cand = e.candidateId ? candidate(e.candidateId) : undefined;
              return (
                <li key={e.id} className="flex items-start gap-3 px-4 py-3 sm:px-6">
                  <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {cand?.name ?? e.title} · <span className="num">{e.time}</span>
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {e.title} · {e.stage ?? e.type}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <header className="border-y border-border px-4 py-3 sm:px-6">
            <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
              Recent activity
            </h2>
          </header>
          <div className="px-4 py-4 sm:px-6">
            <TimelineList
              items={state.activity.slice(0, 7).map((a) => ({
                label: `${a.action} ${a.object}`,
                at: a.at,
                by: a.actor,
                ...(a.from && a.to ? { note: `${a.from} → ${a.to}` } : {}),
              }))}
            />
          </div>
        </aside>
      </div>

      <section className="border-t border-border bg-surface">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
            Live job load
          </h2>
          <Btn size="sm" variant="ghost" onClick={() => navigate({ to: "/am/jobs" })}>
            Open jobs workspace <ArrowRight className="size-3.5" />
          </Btn>
        </header>
        <TableShell>
          <THead>
            <TH>Job</TH>
            <TH>Company</TH>
            <TH>Status</TH>
            <TH align="right">Recruiters</TH>
            <TH align="right">To review</TH>
            <TH align="right">In process</TH>
            <TH>Furthest stage</TH>
            <TH align="right">Bounty</TH>
          </THead>
          <tbody>
            {activeJobs.map(({ job, stats, company }) => {
              const subs = (state.submissions || []).filter((s) => s.jobId === job.id);
              const furthest =
                subs.find((s) => s.stage === "offer") ??
                subs.find((s) => s.stage === "interview") ??
                subs[0];
              const topRecruiter = recruiter(subs[0]?.recruiterId ?? null);
              return (
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
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {job.location || "Remote"} · {job.workModel || "Remote"}
                      {topRecruiter ? ` · lead: ${topRecruiter.name}` : ""}
                    </span>
                  </TD>
                  <TD>{company?.name || "—"}</TD>
                  <TD>
                    <JobStatusPill status={job.status} />
                  </TD>
                  <TD align="right" mono>
                    {stats?.approvedRecruiters ?? 0}
                  </TD>
                  <TD align="right" mono className={stats?.pendingSubmissions ? "text-warning" : ""}>
                    {stats?.pendingSubmissions ?? 0}
                  </TD>
                  <TD align="right" mono>
                    {stats?.activeCandidates ?? 0}
                  </TD>
                  <TD>
                    {furthest ? (
                      <StagePill stage={furthest.stage} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TD>
                  <TD align="right" mono>
                    {money(job.bountyMin)}–{money(job.bountyMax)}
                  </TD>
                </TR>
              );
            })}
          </tbody>
        </TableShell>
        <p className="border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground sm:px-6">
          Showing {activeJobs.length} of {state.jobs?.length || 0} jobs ·{" "}
          {Object.entries(
            (state.jobs || []).reduce<Record<string, number>>((acc, j) => {
              if (j?.status) {
                acc[j.status] = (acc[j.status] ?? 0) + 1;
              }
              return acc;
            }, {}),
          )
            .map(([s, n]) => `${jobStatusLabel[s as keyof typeof jobStatusLabel] || s} ${n}`)
            .join(" · ")}
        </p>
      </section>
    </AmShell>
  );
}
