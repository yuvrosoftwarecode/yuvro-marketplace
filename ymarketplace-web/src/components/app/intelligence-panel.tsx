import { AlertTriangle, Building2, CheckCircle2, CircleDot, Coins, Flag } from "lucide-react";
import type { Job } from "@/lib/data";
import { Panel, PanelHeader, SectionLabel } from "./primitives";
import { StatusBadge } from "./status-badge";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/70 py-2 last:border-0">
      <span className="min-w-0 truncate text-xs text-muted-foreground">{label}</span>
      <span className="num shrink-0 text-[13px] font-semibold text-foreground">{value}</span>
    </div>
  );
}

export function BountyBreakdown({ job }: { job: Job }) {
  return (
    <Panel>
      <PanelHeader
        title="Bounty breakdown"
        actions={<Coins className="size-4 text-muted-foreground" />}
      />
      <div className="px-4 py-3">
        <p className="num text-2xl font-semibold tracking-tight text-foreground">{job.reward}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Base reward per placement</p>
        <dl className="mt-3">
          <Row label="% of first-year salary" value={job.rewardPct} />
          <Row label="Open roles" value={String(job.openings)} />
          <Row label="Bonus pool" value={job.bonusPool} />
          <Row label="Payout terms" value={job.payoutTerms} />
        </dl>
      </div>
    </Panel>
  );
}

export function BonusesPanel({ job }: { job: Job }) {
  const total = job.bonuses.reduce((sum, b) => sum + Number(b.amount.replace(/[^0-9]/g, "")), 0);
  return (
    <Panel>
      <PanelHeader
        title="Bonuses enabled"
        meta={`Up to $${total.toLocaleString()} additional`}
        actions={
          <StatusBadge tone="success" dot>
            Active
          </StatusBadge>
        }
      />
      <ul className="divide-y divide-border">
        {job.bonuses.length === 0 ? (
          <li className="px-4 py-4 text-xs text-muted-foreground">No bonuses on this role.</li>
        ) : (
          job.bonuses.map((b) => (
            <li key={b.label} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-[13px] font-medium text-foreground">
                  {b.label}
                </p>
                <p className="num shrink-0 text-[13px] font-semibold text-success">{b.amount}</p>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{b.qualification}</p>
            </li>
          ))
        )}
      </ul>
    </Panel>
  );
}

export function RequirementsPanel({ job }: { job: Job }) {
  return (
    <Panel>
      <PanelHeader title="Requirements" meta="Hard screening criteria" />
      <ul className="divide-y divide-border">
        {job.requirements.map((r) => (
          <li
            key={r}
            className="flex items-start gap-2.5 px-4 py-2.5 text-[13px] leading-5 text-foreground"
          >
            <CircleDot className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0">{r}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function TargetCompaniesPanel({ job }: { job: Job }) {
  if (!job.targetCompanies || job.targetCompanies.length === 0) return null;
  return (
    <Panel>
      <PanelHeader
        title="Target companies"
        meta="Ideal companies to source candidates from"
        actions={<Building2 className="size-4 text-muted-foreground" />}
      />
      <div className="p-4">
        <div className="flex flex-wrap gap-1.5">
          {job.targetCompanies.map((co) => (
            <span
              key={co}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground shadow-2xs"
            >
              <Building2 className="size-3 text-brand/80" />
              {co}
            </span>
          ))}
        </div>
      </div>
    </Panel>
  );
}

export function FlagsPanel({ job }: { job: Job }) {
  return (
    <Panel>
      <PanelHeader
        title="Signals"
        meta="What the client rewards and rejects"
        actions={<Flag className="size-4 text-muted-foreground" />}
      />
      <div className="px-4 py-3">
        <SectionLabel>Green flags</SectionLabel>
        <ul className="mt-2 space-y-2">
          {job.greenFlags.map((f) => (
            <li key={f} className="flex items-start gap-2 text-[13px] leading-5 text-foreground">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
              <span className="min-w-0">{f}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-border px-4 py-3">
        <SectionLabel>Red flags — disqualifiers</SectionLabel>
        <ul className="mt-2 space-y-2">
          {job.redFlags.map((f) => (
            <li key={f} className="flex items-start gap-2 text-[13px] leading-5 text-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
              <span className="min-w-0">{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

export function IntelligencePanel({ job }: { job: Job }) {
  return (
    <div className="space-y-4">
      <BountyBreakdown job={job} />
      <RequirementsPanel job={job} />
      <FlagsPanel job={job} />
      <TargetCompaniesPanel job={job} />
    </div>
  );
}
