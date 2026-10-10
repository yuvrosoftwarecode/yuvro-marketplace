import { Fragment, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AmPageHeader, AmShell } from "@/components/am/am-shell";
import { useAm } from "@/components/am/am-store";
import {
  Bar,
  Btn,
  DefinitionGrid,
  Kpi,
  KpiGrid,
  RequestStatusPill,
  StagePill,
  SubmissionStatusPill,
  TableShell,
  Tabs,
  TD,
  TH,
  THead,
  TR,
  TimelineList,
} from "@/components/am/am-ui";
import { StatusBadge } from "@/components/app/status-badge";
import { money, moneyExact } from "@/lib/am-data";

export const Route = createFileRoute("/am/recruiters/$recruiterId")({
  head: () => ({
    meta: [
      { title: "Recruiter 360 — Account Manager | Yuvro" },
      {
        name: "description",
        content:
          "Complete recruiter record: profile, verification, jobs worked, submissions, interview conversion, rejection reasons, payouts and activity.",
      },
      { property: "og:title", content: "Recruiter 360 — Account Manager | Yuvro" },
      {
        property: "og:description",
        content: "Everything an Account Manager needs about one recruiter.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AmRecruiterPage,
});

function AmRecruiterPage() {
  const { recruiterId } = Route.useParams();
  const am = useAm();
  const navigate = useNavigate();
  const [tab, setTab] = useState("profile");

  useEffect(() => {
    am.refreshRecruiters();
    am.refreshRequests();
  }, []);

  const rec = am.recruiter(recruiterId);


  if (!rec) {
    return (
      <AmShell>
        <AmPageHeader
          title="Recruiter not found"
          description="This recruiter is no longer on the marketplace."
        />
        <div className="px-4 py-6 sm:px-6">
          <Btn onClick={() => navigate({ to: "/am/recruiters" })}>Back to recruiters</Btn>
        </div>
      </AmShell>
    );
  }

  const isMatch = (id?: string) =>
    id === rec.id || (Boolean(rec.userId) && id === rec.userId);
  const requests = am.state.requests.filter(
    (r) => isMatch(r.recruiterId) || isMatch(r.recruiterProfileId),
  );
  const subs = am.state.submissions.filter((s) => isMatch(s.recruiterId));
  const payouts = am.state.payouts.filter((p) => isMatch(p.recruiterId));
  const activity = am.state.activity.filter((a) => isMatch(a.recruiterId));
  const hires = subs.filter((s) => s.stage === "hired").length;
  const interviews = subs.filter((s) =>
    ["interview", "final", "offer", "hired"].includes(s.stage),
  ).length;

  return (
    <AmShell>
      <AmPageHeader
        breadcrumb={
          <span>
            <Link to="/am/recruiters" className="hover:text-foreground hover:underline">
              Recruiters
            </Link>{" "}
            / {rec.name}
          </span>
        }
        title={rec.name}
        description={`${rec.type === "Agency" ? rec.agency : "Independent recruiter"} · ${rec.location} · ${rec.experience} · joined ${rec.createdAt} by ${rec.createdBy}`}
        actions={
          <>
            <StatusBadge
              tone={
                rec.status === "active"
                  ? "success"
                  : rec.status === "pending"
                    ? "warning"
                    : "danger"
              }
              dot
            >
              {rec.status}
            </StatusBadge>
            <Btn onClick={() => navigate({ to: "/am/messages" })}>Message recruiter</Btn>
          </>
        }
      >
        <Tabs
          tabs={[
            { id: "profile", label: "Profile" },
            { id: "jobs", label: "Jobs & requests", count: requests.length },
            { id: "submissions", label: "Submissions", count: subs.length },
            { id: "performance", label: "Performance" },
            { id: "payouts", label: "Payouts", count: payouts.length },
            { id: "activity", label: "Activity" },
          ]}
          active={tab}
          onSelect={setTab}
        />
      </AmPageHeader>

      <KpiGrid>
        <Kpi
          label="Active jobs"
          value={requests.filter((r) => r.status === "approved").length}
          hint="Approved access"
        />
        <Kpi label="Submissions" value={subs.length} hint="All time" />
        <Kpi label="Interviews" value={interviews} hint="Reached interview or beyond" />
        <Kpi label="Hires" value={hires} tone="success" hint="Confirmed placements" />
        <Kpi
          label="Paid out"
          value={money(payouts.reduce((a, p) => a + p.recruiterShare, 0))}
          hint="Recruiter share"
        />
      </KpiGrid>

      {tab === "profile" ? (
        <div className="grid lg:grid-cols-2">
          <section className="border-b border-border bg-surface px-4 py-5 sm:px-6 lg:border-b-0 lg:border-r">
            <h2 className="text-[13px] font-semibold tracking-tight text-foreground">Profile</h2>
            <div className="mt-2">
              <DefinitionGrid
                items={[
                  { label: "Email", value: rec.email },
                  { label: "Phone", value: rec.phone },
                  { label: "Location", value: rec.location },
                  { label: "LinkedIn", value: rec.linkedin },
                  { label: "Website", value: rec.website },
                  { label: "Type", value: rec.type },
                  { label: "Agency", value: rec.agency || "—" },
                  { label: "Experience", value: rec.experience },
                  { label: "Specializations", value: rec.specializations.join(", ") },
                  { label: "Markets", value: rec.markets.join(", ") },
                  { label: "Quality score", value: rec.qualityScore },
                  { label: "Response rate", value: `${rec.responseRate}%` },
                ]}
              />
            </div>
          </section>
          <section className="bg-surface px-4 py-5 sm:px-6">
            <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
              Verification
            </h2>
            <ul className="mt-2 divide-y divide-border border-y border-border">
              {Object.entries(rec.verification).map(([k, v]) => (
                <li key={k} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-[13px] capitalize text-foreground">{k} verification</span>
                  <StatusBadge tone={v ? "success" : "warning"} dot>
                    {v ? "Verified" : "Outstanding"}
                  </StatusBadge>
                </li>
              ))}
            </ul>

            <h2 className="mt-6 text-[13px] font-semibold tracking-tight text-foreground">
              Interview reliability
            </h2>
            <div className="mt-2">
              <DefinitionGrid
                items={Object.entries(rec.interviewStats).map(([k, v]) => ({
                  label: k.replace(/([A-Z])/g, " $1").toLowerCase(),
                  value: v,
                }))}
              />
            </div>
          </section>
        </div>
      ) : null}

      {tab === "jobs" ? (
        <TableShell className="bg-surface">
          <THead>
            <TH>Job</TH>
            <TH>Company</TH>
            <TH>Status</TH>
            <TH align="right">Relevant profiles</TH>
            <TH>Requested</TH>
            <TH>Decision</TH>
          </THead>
          <tbody>
            {requests.map((r) => {
              const j = am.job(r.jobId);
              const handleRowClick = () =>
                navigate({
                  to: "/am/jobs/$jobId",
                  params: { jobId: r.jobId },
                  search: { tab: "requests" },
                });
              return (
                <Fragment key={r.id}>
                  <TR className="border-b-0" onClick={handleRowClick}>
                    <TD className="font-medium">{j?.title ?? r.jobId}</TD>
                    <TD>{j ? am.companyOfJob(j.id).name : "—"}</TD>
                    <TD>
                      <RequestStatusPill status={r.status} />
                    </TD>
                    <TD align="right" mono>
                      {r.relevantProfiles}
                    </TD>
                    <TD>{r.requestedAt}</TD>
                    <TD className="text-muted-foreground">
                      {r.decidedAt ? `${r.decidedAt} · ${r.decidedBy}` : "Pending"}
                    </TD>
                  </TR>
                  <TR className="border-b border-border/70" onClick={handleRowClick}>
                    <TD colSpan={6} className="pt-0 pb-3 max-w-0">
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
        <TableShell className="bg-surface">
          <THead>
            <TH>Candidate</TH>
            <TH>Job</TH>
            <TH>Company</TH>
            <TH align="right">Match</TH>
            <TH>Status</TH>
            <TH>Stage</TH>
            <TH>Submitted</TH>
            <TH align="right">Bounty</TH>
          </THead>
          <tbody>
            {subs.map((s) => {
              const cand = am.candidate(s.candidateId);
              const j = am.job(s.jobId);
              return (
                <TR
                  key={s.id}
                  onClick={() =>
                    navigate({
                      to: "/am/jobs/$jobId",
                      params: { jobId: s.jobId },
                      search: { tab: "submissions", focus: s.candidateId },
                    })
                  }
                >
                  <TD className="font-medium">{cand?.name ?? s.candidateId}</TD>
                  <TD>{j?.title ?? s.jobId}</TD>
                  <TD>{j ? am.companyOfJob(j.id).name : "—"}</TD>
                  <TD align="right" mono>
                    {s.match}%
                  </TD>
                  <TD>
                    <SubmissionStatusPill status={s.status} />
                  </TD>
                  <TD>
                    <StagePill stage={s.stage} />
                  </TD>
                  <TD>{s.submittedAt}</TD>
                  <TD align="right" mono>
                    {s.bounty ? moneyExact(s.bounty) : "—"}
                  </TD>
                </TR>
              );
            })}
          </tbody>
        </TableShell>
      ) : null}

      {tab === "performance" ? (
        <div className="grid lg:grid-cols-2">
          <section className="border-b border-border bg-surface px-4 py-5 sm:px-6 lg:border-b-0 lg:border-r">
            <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
              Why AM rejected submissions
            </h2>
            <ul className="mt-3 space-y-3">
              {rec.amRejectionReasons.map((x) => (
                <li key={x.reason}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13px] text-foreground">{x.reason}</span>
                    <span className="num text-[13px] font-semibold">{x.count}</span>
                  </div>
                  <div className="mt-1.5">
                    <Bar
                      value={x.count}
                      max={Math.max(...rec.amRejectionReasons.map((y) => y.count), 1)}
                      tone="warning"
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section className="bg-surface px-4 py-5 sm:px-6">
            <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
              Why companies rejected candidates
            </h2>
            <ul className="mt-3 space-y-3">
              {rec.companyRejectionReasons.map((x) => (
                <li key={x.reason}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13px] text-foreground">{x.reason}</span>
                    <span className="num text-[13px] font-semibold">{x.count}</span>
                  </div>
                  <div className="mt-1.5">
                    <Bar
                      value={x.count}
                      max={Math.max(...rec.companyRejectionReasons.map((y) => y.count), 1)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}

      {tab === "payouts" ? (
        <TableShell className="bg-surface">
          <THead>
            <TH>Candidate</TH>
            <TH>Job</TH>
            <TH>Hire date</TH>
            <TH align="right">Bounty</TH>
            <TH align="right">Recruiter share</TH>
            <TH>Status</TH>
          </THead>
          <tbody>
            {payouts.map((p) => (
              <TR key={p.id} onClick={() => navigate({ to: "/am/payouts" })}>
                <TD className="font-medium">
                  {am.candidate(p.candidateId)?.name ?? p.candidateId}
                </TD>
                <TD>{am.job(p.jobId)?.title ?? p.jobId}</TD>
                <TD>{p.hireDate}</TD>
                <TD align="right" mono>
                  {moneyExact(p.bounty)}
                </TD>
                <TD align="right" mono>
                  {moneyExact(p.recruiterShare)}
                </TD>
                <TD>
                  <StatusBadge tone={p.status === "paid" ? "success" : "warning"} dot>
                    {p.status}
                  </StatusBadge>
                </TD>
              </TR>
            ))}
          </tbody>
        </TableShell>
      ) : null}

      {tab === "activity" ? (
        <div className="bg-surface px-4 py-5 sm:px-6">
          <TimelineList
            items={activity.map((a) => ({
              label: `${a.action} ${a.object}`,
              at: a.at,
              by: a.actor,
              ...(a.from && a.to ? { note: `${a.from} → ${a.to}` } : {}),
            }))}
          />
        </div>
      ) : null}
    </AmShell>
  );
}
