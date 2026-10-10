import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AmPageHeader, AmShell } from "@/components/am/am-shell";
import { useAm } from "@/components/am/am-store";
import {
  Btn,
  CountLink,
  Kpi,
  KpiGrid,
  PayoutStatusPill,
  Segmented,
  TableShell,
  TD,
  TH,
  THead,
  TR,
} from "@/components/am/am-ui";
import { money, moneyExact, payoutStatusLabel, type PayoutStatus } from "@/lib/am-data";

export const Route = createFileRoute("/am/payouts")({
  head: () => ({
    meta: [
      { title: "Bounties & Payouts — Account Manager | Yuvro" },
      {
        name: "description",
        content:
          "Track bounty value per hire, recruiter share, company payment and payout status from pending through processing to paid.",
      },
      { property: "og:title", content: "Bounties & Payouts — Account Manager | Yuvro" },
      {
        property: "og:description",
        content: "Finance view of every hire, bounty and recruiter payout.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AmPayoutsPage,
});

const filters: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: payoutStatusLabel.pending },
  { id: "approved", label: payoutStatusLabel.approved },
  { id: "processing", label: payoutStatusLabel.processing },
  { id: "paid", label: payoutStatusLabel.paid },
  { id: "disputed", label: payoutStatusLabel.disputed },
];

const nextStatus: Partial<Record<PayoutStatus, PayoutStatus>> = {
  pending: "approved",
  approved: "processing",
  processing: "paid",
};

function AmPayoutsPage() {
  const { state, setPayoutStatus, candidate, recruiter, job, companyOfJob } = useAm();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");

  const rows = state.payouts.filter((p) => (filter === "all" ? true : p.status === filter));
  const sum = (pred: (s: PayoutStatus) => boolean) =>
    state.payouts.filter((p) => pred(p.status)).reduce((a, p) => a + p.recruiterShare, 0);

  return (
    <AmShell>
      <AmPageHeader
        title="Bounties & payouts"
        description="Every confirmed hire, its bounty value, the recruiter share and where the money currently sits."
      />

      <KpiGrid>
        <Kpi
          label="Total bounty value"
          value={money(state.payouts.reduce((a, p) => a + p.bounty, 0))}
          hint="All hires"
        />
        <Kpi
          label="Pending recruiter payouts"
          value={money(sum((s) => s === "pending"))}
          tone="warning"
          hint="Awaiting approval"
        />
        <Kpi
          label="In processing"
          value={money(sum((s) => s === "approved" || s === "processing"))}
          hint="Released to finance"
        />
        <Kpi
          label="Paid out"
          value={money(sum((s) => s === "paid"))}
          tone="success"
          hint="Settled"
        />
        <Kpi
          label="Company invoiced"
          value={money(state.payouts.reduce((a, p) => a + p.companyPayment, 0))}
          hint="Gross marketplace fee"
        />
      </KpiGrid>

      <div className="border-b border-border bg-surface px-4 py-3 sm:px-6">
        <Segmented
          options={filters.map((f) => ({
            id: f.id,
            label: f.label,
            count:
              f.id === "all"
                ? state.payouts.length
                : state.payouts.filter((p) => p.status === f.id).length,
          }))}
          value={filter}
          onChange={setFilter}
        />
      </div>

      <TableShell className="bg-surface">
        <THead>
          <TH>Candidate</TH>
          <TH>Job</TH>
          <TH>Company</TH>
          <TH>Recruiter</TH>
          <TH>Hire date</TH>
          <TH align="right">Bounty</TH>
          <TH align="right">Recruiter share</TH>
          <TH align="right">Company payment</TH>
          <TH>Status</TH>
          <TH align="right">Action</TH>
        </THead>
        <tbody>
          {rows.map((p) => {
            const cand = candidate(p.candidateId);
            const j = job(p.jobId);
            const rec = recruiter(p.recruiterId);
            const next = nextStatus[p.status];
            return (
              <TR key={p.id}>
                <TD>
                  <span className="block truncate font-medium">{cand?.name ?? p.candidateId}</span>
                  <span className="num block text-[11px] text-muted-foreground">{p.id}</span>
                </TD>
                <TD>
                  {j ? (
                    <CountLink
                      to="/am/jobs/$jobId"
                      params={{ jobId: j.id }}
                      search={{ tab: "candidates" }}
                    >
                      {j.title}
                    </CountLink>
                  ) : (
                    p.jobId
                  )}
                </TD>
                <TD>{j ? companyOfJob(j.id).name : "—"}</TD>
                <TD>
                  {rec ? (
                    <button
                      type="button"
                      className="text-brand underline-offset-4 hover:underline"
                      onClick={() =>
                        navigate({
                          to: "/am/recruiters/$recruiterId",
                          params: { recruiterId: rec.id },
                        })
                      }
                    >
                      {rec.name}
                    </button>
                  ) : (
                    "Account Manager"
                  )}
                </TD>
                <TD>{p.hireDate}</TD>
                <TD align="right" mono>
                  {moneyExact(p.bounty)}
                </TD>
                <TD align="right" mono>
                  {moneyExact(p.recruiterShare)}
                </TD>
                <TD align="right" mono>
                  {moneyExact(p.companyPayment)}
                </TD>
                <TD>
                  <PayoutStatusPill status={p.status} />
                </TD>
                <TD align="right">
                  {next ? (
                    <Btn
                      size="sm"
                      variant={next === "paid" ? "primary" : "default"}
                      onClick={() => {
                        setPayoutStatus(p.id, next);
                        toast.success(
                          `${cand?.name ?? "Payout"} marked ${payoutStatusLabel[next].toLowerCase()}`,
                        );
                      }}
                    >
                      Mark {payoutStatusLabel[next].toLowerCase()}
                    </Btn>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">No action</span>
                  )}
                </TD>
              </TR>
            );
          })}
        </tbody>
      </TableShell>
      <p className="border-t border-border bg-surface px-4 py-2.5 text-[11px] text-muted-foreground sm:px-6">
        {rows.length} payout record{rows.length === 1 ? "" : "s"} · payouts follow the job payment
        rules agreed with each company.
      </p>
    </AmShell>
  );
}
