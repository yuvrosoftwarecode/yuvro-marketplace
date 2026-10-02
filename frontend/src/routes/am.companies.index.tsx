import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { AmPageHeader, AmShell } from "@/components/am/am-shell";
import { useAm } from "@/components/am/am-store";
import { Btn, Kpi, KpiGrid, TableShell, TD, TH, THead, TR, inputCls } from "@/components/am/am-ui";
import { StatusBadge } from "@/components/app/status-badge";
import { money } from "@/lib/am-data";

export const Route = createFileRoute("/am/companies/")({
  head: () => ({
    meta: [
      { title: "Companies — Account Manager | Yuvro" },
      {
        name: "description",
        content:
          "Managed company accounts with open jobs, submissions in review, interviews, hires, response speed and total marketplace spend.",
      },
      { property: "og:title", content: "Companies — Account Manager | Yuvro" },
      {
        property: "og:description",
        content: "Account portfolio with hiring throughput and spend.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AmCompaniesPage,
});

const tone = {
  active: "success",
  onboarding: "info",
  paused: "warning",
  inactive: "neutral",
} as const;

function AmCompaniesPage() {
  const am = useAm();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  useEffect(() => {
    am.refreshCompanies();
  }, []);

  const rows = am.state.companies
    .filter((c) =>
      q ? `${c.name} ${c.industry} ${c.hq}`.toLowerCase().includes(q.toLowerCase()) : true,
    )
    .map((c) => {
      const jobs = am.state.jobs.filter((j) => j.companyId === c.id);
      const ids = jobs.map((j) => j.id);
      const subs = am.state.submissions.filter((s) => ids.includes(s.jobId));
      return {
        c,
        jobs: jobs.length,
        openJobs: jobs.filter((j) => j.status === "hiring" || j.status === "active").length,
        pending: subs.filter((s) => s.status === "am_review").length,
        interviews: subs.filter((s) => ["interview", "final"].includes(s.stage)).length,
        offers: subs.filter((s) => s.stage === "offer").length,
        hires: subs.filter((s) => s.stage === "hired").length,
      };
    });

  return (
    <AmShell>
      <AmPageHeader
        title="Companies"
        description="Every account you mediate. Open a company for jobs, contacts, hiring history and spend."
        actions={
          <Btn variant="primary" onClick={() => navigate({ to: "/am/companies/new" })}>
            <Plus className="size-4" /> Add company
          </Btn>
        }
      >
        <div className="relative max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Company, industry, location"
            className={`${inputCls} pl-8`}
          />
        </div>
      </AmPageHeader>

      <KpiGrid>
        <Kpi label="Companies" value={am.state.companies.length} hint="Managed accounts" />
        <Kpi
          label="Open jobs"
          value={rows.reduce((a, r) => a + r.openJobs, 0)}
          hint="Hiring or active"
        />
        <Kpi
          label="In review"
          value={rows.reduce((a, r) => a + r.pending, 0)}
          tone="warning"
          hint="Awaiting AM review"
        />
        <Kpi
          label="Hires"
          value={rows.reduce((a, r) => a + r.hires, 0)}
          tone="success"
          hint="All accounts"
        />
        <Kpi
          label="Marketplace spend"
          value={money(am.state.companies.reduce((a, c) => a + c.totalPaid, 0))}
          hint="Paid to date"
        />
      </KpiGrid>

      <TableShell className="bg-surface">
        <THead>
          <TH>Company</TH>
          <TH>Industry</TH>
          <TH>HQ</TH>
          <TH align="right">Jobs</TH>
          <TH align="right">Open</TH>
          <TH align="right">In review</TH>
          <TH align="right">Interviews</TH>
          <TH align="right">Offers</TH>
          <TH align="right">Hires</TH>
          <TH align="right">Paid</TH>
        </THead>
        <tbody>
          {rows.map(({ c, ...m }) => (
            <TR
              key={c.id}
              onClick={() =>
                navigate({
                  to: "/am/companies/$companyId",
                  params: {
                    companyId: c.slug || c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || c.id,
                  },
                })
              }
            >
              <TD>
                <span className="block truncate font-medium">{c.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {c.size} · {c.fundingStage} · {c.website}
                </span>
              </TD>
              <TD>{c.industry}</TD>
              <TD>{c.hq}</TD>
              <TD align="right" mono>
                {m.jobs}
              </TD>
              <TD align="right" mono>
                {m.openJobs}
              </TD>
              <TD align="right" mono className={m.pending ? "text-warning" : ""}>
                {m.pending}
              </TD>
              <TD align="right" mono>
                {m.interviews}
              </TD>
              <TD align="right" mono>
                {m.offers}
              </TD>
              <TD align="right" mono className={m.hires ? "text-success" : ""}>
                {m.hires}
              </TD>
              <TD align="right" mono>
                {money(c.totalPaid)}
              </TD>
            </TR>
          ))}
        </tbody>
      </TableShell>
    </AmShell>
  );
}
