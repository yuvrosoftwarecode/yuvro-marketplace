import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AmPageHeader, AmShell } from "@/components/am/am-shell";
import { useAm } from "@/components/am/am-store";
import { Bar, FunnelRow, Kpi, KpiGrid, TableShell, TD, TH, THead, TR } from "@/components/am/am-ui";
import { candidateStageLabel, money } from "@/lib/am-data";

export const Route = createFileRoute("/am/reports")({
  head: () => ({
    meta: [
      { title: "Recruitment Reports — Account Manager | Yuvro" },
      {
        name: "description",
        content:
          "Pipeline funnel, recruiter performance, company conversion and rejection reason analysis across all Account Manager jobs.",
      },
      { property: "og:title", content: "Recruitment Reports — Account Manager | Yuvro" },
      {
        property: "og:description",
        content: "Funnel, recruiter quality and company conversion analytics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AmReportsPage,
});

function AmReportsPage() {
  const { state, recruiter, companyOfJob } = useAm();
  const navigate = useNavigate();

  const subs = state.submissions;
  const stageCount = (stages: string[]) => subs.filter((s) => stages.includes(s.stage)).length;
  const funnel = [
    { label: "Submitted", value: subs.length },
    {
      label: "AM approved",
      value: subs.filter((s) => s.status !== "am_review" && s.status !== "am_rejected").length,
    },
    {
      label: candidateStageLabel.company_review,
      value: stageCount(["company_review", "interview", "final", "offer", "hired"]),
    },
    {
      label: candidateStageLabel.interview,
      value: stageCount(["interview", "final", "offer", "hired"]),
    },
    { label: candidateStageLabel.offer, value: stageCount(["offer", "hired"]) },
    { label: candidateStageLabel.hired, value: stageCount(["hired"]) },
  ];

  const recruiterRows = state.recruiters
    .map((r) => {
      const mine = subs.filter((s) => s.recruiterId === r.id);
      const hires = mine.filter((s) => s.stage === "hired").length;
      const rejected = mine.filter(
        (s) => s.status === "am_rejected" || s.status === "company_rejected",
      ).length;
      const interviews = mine.filter((s) =>
        ["interview", "final", "offer", "hired"].includes(s.stage),
      ).length;
      const payouts = state.payouts
        .filter((p) => p.recruiterId === r.id)
        .reduce((a, p) => a + p.recruiterShare, 0);
      return { r, submitted: mine.length, interviews, hires, rejected, payouts };
    })
    .sort((a, b) => b.hires - a.hires || b.interviews - a.interviews);

  const companyRows = state.companies.map((c) => {
    const jobs = state.jobs.filter((j) => j.companyId === c.id);
    const ids = jobs.map((j) => j.id);
    const mine = subs.filter((s) => ids.includes(s.jobId));
    return {
      c,
      jobs: jobs.length,
      submissions: mine.length,
      interviews: mine.filter((s) => ["interview", "final", "offer", "hired"].includes(s.stage))
        .length,
      hires: mine.filter((s) => s.stage === "hired").length,
      rejected: mine.filter((s) => s.status === "company_rejected").length,
    };
  });

  const reasons = state.recruiters
    .flatMap((r) => [...r.amRejectionReasons, ...r.companyRejectionReasons])
    .reduce<Record<string, number>>((acc, x) => {
      acc[x.reason] = (acc[x.reason] ?? 0) + x.count;
      return acc;
    }, {});
  const reasonRows = Object.entries(reasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const reasonMax = reasonRows[0]?.[1] ?? 1;

  const hires = subs.filter((s) => s.stage === "hired").length;

  return (
    <AmShell>
      <AmPageHeader
        title="Reports"
        description="Conversion across the marketplace: what recruiters send, what survives review, and where candidates are lost."
      />

      <KpiGrid>
        <Kpi label="Submissions" value={subs.length} hint="All time" />
        <Kpi
          label="AM approval rate"
          value={`${Math.round((subs.filter((s) => s.status !== "am_rejected").length / Math.max(1, subs.length)) * 100)}%`}
          hint="Passed AM review"
        />
        <Kpi
          label="Interview rate"
          value={`${Math.round((stageCount(["interview", "final", "offer", "hired"]) / Math.max(1, subs.length)) * 100)}%`}
          hint="Of all submissions"
        />
        <Kpi label="Hires" value={hires} tone="success" hint="Confirmed placements" />
        <Kpi
          label="Bounty value placed"
          value={money(state.payouts.reduce((a, p) => a + p.bounty, 0))}
          hint="Across all hires"
        />
      </KpiGrid>

      <div className="grid lg:grid-cols-2">
        <section className="border-b border-border bg-surface px-4 py-5 sm:px-6 lg:border-r">
          <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
            Pipeline funnel
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Conversion measured against total submissions.
          </p>
          <div className="mt-3">
            {funnel.map((f) => (
              <FunnelRow key={f.label} label={f.label} value={f.value} max={subs.length} />
            ))}
          </div>
        </section>

        <section className="border-b border-border bg-surface px-4 py-5 sm:px-6">
          <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
            Top rejection reasons
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Combined AM and company rejections.
          </p>
          <ul className="mt-3 space-y-3">
            {reasonRows.map(([reason, count]) => (
              <li key={reason}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[13px] text-foreground">{reason}</span>
                  <span className="num text-[13px] font-semibold text-foreground">{count}</span>
                </div>
                <div className="mt-1.5">
                  <Bar value={count} max={reasonMax} tone="warning" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="bg-surface">
        <header className="border-b border-border px-4 py-3 sm:px-6">
          <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
            Recruiter performance
          </h2>
        </header>
        <TableShell>
          <THead>
            <TH>Recruiter</TH>
            <TH>Type</TH>
            <TH align="right">Submitted</TH>
            <TH align="right">Interviews</TH>
            <TH align="right">Hires</TH>
            <TH align="right">Rejected</TH>
            <TH align="right">Quality</TH>
            <TH align="right">Response rate</TH>
            <TH align="right">Paid out</TH>
          </THead>
          <tbody>
            {recruiterRows.map((row) => (
              <TR
                key={row.r.id}
                onClick={() =>
                  navigate({ to: "/am/recruiters/$recruiterId", params: { recruiterId: row.r.id } })
                }
              >
                <TD>
                  <span className="block truncate font-medium">{row.r.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {row.r.type === "Agency" ? row.r.agency : "Independent"} · {row.r.location}
                  </span>
                </TD>
                <TD>{row.r.type}</TD>
                <TD align="right" mono>
                  {row.submitted}
                </TD>
                <TD align="right" mono>
                  {row.interviews}
                </TD>
                <TD align="right" mono className={row.hires ? "text-success" : ""}>
                  {row.hires}
                </TD>
                <TD align="right" mono>
                  {row.rejected}
                </TD>
                <TD align="right" mono>
                  {row.r.qualityScore}
                </TD>
                <TD align="right" mono>
                  {row.r.responseRate}%
                </TD>
                <TD align="right" mono>
                  {money(row.payouts)}
                </TD>
              </TR>
            ))}
          </tbody>
        </TableShell>
      </section>

      <section className="border-t border-border bg-surface">
        <header className="border-b border-border px-4 py-3 sm:px-6">
          <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
            Company conversion
          </h2>
        </header>
        <TableShell>
          <THead>
            <TH>Company</TH>
            <TH align="right">Jobs</TH>
            <TH align="right">Submissions</TH>
            <TH align="right">Interviews</TH>
            <TH align="right">Hires</TH>
            <TH align="right">Company rejections</TH>
            <TH align="right">Total paid</TH>
          </THead>
          <tbody>
            {companyRows.map((row) => (
              <TR
                key={row.c.id}
                onClick={() =>
                  navigate({ to: "/am/companies/$companyId", params: { companyId: row.c.id } })
                }
              >
                <TD>
                  <span className="block truncate font-medium">{row.c.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {row.c.industry}
                  </span>
                </TD>
                <TD align="right" mono>
                  {row.jobs}
                </TD>
                <TD align="right" mono>
                  {row.submissions}
                </TD>
                <TD align="right" mono>
                  {row.interviews}
                </TD>
                <TD align="right" mono className={row.hires ? "text-success" : ""}>
                  {row.hires}
                </TD>
                <TD align="right" mono>
                  {row.rejected}
                </TD>
                <TD align="right" mono>
                  {money(row.c.totalPaid)}
                </TD>
              </TR>
            ))}
          </tbody>
        </TableShell>
        <p className="border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground sm:px-6">
          {companyOfJob(state.jobs[0]?.id ?? "").name} is your largest account by placed bounty
          value.
        </p>
      </section>
    </AmShell>
  );
}
