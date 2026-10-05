import { Link } from "@tanstack/react-router";
import { ChevronRight, Clock, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel, PanelHeader, CompanyMark } from "./primitives";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { approvedJobs, candidates, candidatesForJob, type Job } from "@/lib/data";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });

const parseMoney = (s: string) => Number(s.replace(/[^0-9.]/g, "")) || 0;

const activeStages = ["review", "prescreen", "team", "final", "offer"] as const;

function ValueRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/70 py-2 last:border-0">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className={cn("num text-[13px] font-semibold", accent ? "text-brand" : "text-foreground")}>
        {value}
      </span>
    </div>
  );
}

export function MonthlyPerformancePanel() {
  const submissions = candidates.filter((c) =>
    (activeStages as readonly string[]).includes(c.stage),
  ).length;
  const firstRound = candidates.filter((c) => c.stage === "team").length;
  const finalRound = candidates.filter((c) => c.stage === "final").length;
  const offer = candidates.filter((c) => c.stage === "offer").length;

  return (
    <Panel className="flex flex-col">
      <PanelHeader title="Monthly performance" meta="This month" />
      <div className="px-4 py-2">
        <ValueRow label="Submissions" value={submissions} />
        <ValueRow label="First round" value={firstRound} />
        <ValueRow label="Final round" value={finalRound} />
        <ValueRow label="Offer" value={offer} accent />
      </div>
    </Panel>
  );
}

type Track = {
  id: string;
  label: string;
  amount: string;
  need: string;
  tooltip: string;
  current: number;
  target: number;
};

function bonusTracks(): Track[] {
  const amounts = approvedJobs()
    .flatMap((j) => j.bonuses)
    .map((b) => b.amount);

  if (amounts.length === 0) return [];

  const interviews = candidates.filter(
    (c) => c.stage === "team" || c.stage === "final",
  ).length;
  const submissions = candidates.filter((c) =>
    (activeStages as readonly string[]).includes(c.stage),
  ).length;
  const onsite = candidates.filter(
    (c) => c.stage === "final" || c.stage === "offer",
  ).length;

  return [
    {
      id: "first-round",
      label: "First round",
      amount: amounts[0] || "$250",
      need: "10 interviews needed",
      tooltip:
        "Paid once 10 of your candidates reach a first-round interview in a calendar month.",
      current: interviews,
      target: 10,
    },
    {
      id: "volume",
      label: "Volume",
      amount: amounts[1] || "$100",
      need: "6 submissions needed",
      tooltip:
        "Paid once you submit 6 on-brief candidates in a calendar month.",
      current: submissions,
      target: 6,
    },
    {
      id: "on-site",
      label: "On-site",
      amount: amounts[2] || "$500",
      need: "1 on-site needed",
      tooltip:
        "Paid the first time a candidate of yours reaches an on-site or final loop this month.",
      current: onsite,
      target: 1,
    },
  ];
}

function BonusTrack({ track }: { track: Track }) {
  const pct = Math.min(100, Math.round((track.current / track.target) * 100));
  return (
    <div className="border-r border-border p-4 last:border-r-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold text-foreground">
            {track.label}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`${track.label} bonus details`}
                className="text-muted-foreground"
              >
                <Info className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[240px]">{track.tooltip}</TooltipContent>
          </Tooltip>
        </div>
        <span className="num shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">
          {track.amount}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{track.need}</p>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="num text-[11px] text-muted-foreground">
          {track.current} of {track.target}
        </span>
        <span className="num text-[11px] text-muted-foreground">{pct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
        <div
          className="h-full rounded-full bg-brand transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ActiveBonusesPanel() {
  const tracks = bonusTracks();
  return (
    <Panel>
      <PanelHeader
        title="Active bonuses"
        meta="Progress against this month's bonus tracks"
      />
      {tracks.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">
          No active bonus tracks from approved roles.
        </p>
      ) : (
        <TooltipProvider delayDuration={150}>
          <div className="grid grid-cols-3">
            {tracks.map((t) => (
              <BonusTrack key={t.id} track={t} />
            ))}
          </div>
        </TooltipProvider>
      )}
    </Panel>
  );
}

function RoleRow({ job }: { job: Job }) {
  const list = candidatesForJob(job.id);
  const active = list.filter((c) =>
    (activeStages as readonly string[]).includes(c.stage),
  );
  const firstRound = list.filter((c) => c.stage === "team").length;

  return (
    <Link
      to="/jobs/$jobId"
      params={{ jobId: job.id }}
      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 px-4 py-3.5 transition-colors hover:bg-surface-sunken"
    >
      <CompanyMark short={job.companyShort} tone={job.logoTone} logoUrl={job.logoUrl} />
      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold leading-5 text-foreground">
          {job.title}
        </p>
        <p className="mt-0.5 truncate text-[12.5px] leading-5 text-muted-foreground">
          {job.company} <span className="px-1 text-border">•</span> {job.salary}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-success-soft px-2 py-0.5 text-[11.5px] font-medium text-success">
            {job.reward} bounty
          </span>
          {firstRound > 0 ? (
            <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[11.5px] font-medium text-brand">
              {firstRound} in first round
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex h-full flex-col items-end justify-between gap-2">
        <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">
            {active.length}
          </span>
          {active.length === 1 ? "candidate" : "candidates"}
          <ChevronRight className="size-4" />
        </span>
        <span className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
          <Clock className="size-3" /> {list[0]?.updated ?? "—"}
        </span>
      </div>
    </Link>
  );
}

export function TopActiveRolesPanel() {
  const roles = approvedJobs()
    .slice()
    .sort(
      (a, b) =>
        candidatesForJob(b.id).filter((c) =>
          (activeStages as readonly string[]).includes(c.stage),
        ).length -
        candidatesForJob(a.id).filter((c) =>
          (activeStages as readonly string[]).includes(c.stage),
        ).length,
    )
    .slice(0, 4);

  return (
    <Panel>
      <PanelHeader
        title="Top active roles"
        meta="Roles where you have the most candidates in pipeline."
        actions={
          <Link to="/jobs" className="text-xs font-semibold text-brand hover:underline">
            Browse jobs
          </Link>
        }
      />
      <div className="divide-y divide-border">
        {roles.length > 0 ? (
          roles.map((j) => <RoleRow key={j.id} job={j} />)
        ) : (
          <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
            No approved roles with active candidates yet.
          </p>
        )}
      </div>
    </Panel>
  );
}
