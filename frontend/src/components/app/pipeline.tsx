import { useState } from "react";
import { Clock, MapPin, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getPipelineStagesForJob,
  normalizeStageId,
  stages as defaultStages,
  type Candidate,
  type Job,
  type PipelineStage,
} from "@/lib/data";
import { StatusBadge, getStageTone } from "./status-badge";
import { EmptyState } from "./primitives";

function Initials({ name }: { name: string }) {
  const i = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-sunken text-[10px] font-semibold text-muted-foreground">
      {i}
    </span>
  );
}

export function CandidateRow({
  candidate,
  showStage = false,
  job,
}: {
  candidate: Candidate;
  showStage?: boolean;
  job?: Job | { process?: string[]; hiringProcess?: string[]; hiring_process?: string[] };
}) {
  const activeStages = getPipelineStagesForJob(job);
  const matchedStage = activeStages.find(
    (s) =>
      s.id === normalizeStageId(candidate.stage) ||
      s.label.toLowerCase() === candidate.stage?.toLowerCase(),
  );
  const displayLabel = matchedStage?.label || candidate.stage || "Submitted";

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-3 py-2.5 transition-colors last:border-0 hover:bg-surface-sunken">
      <Initials name={candidate.name} />
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-foreground">{candidate.name}</p>
        <p className="truncate text-xs text-muted-foreground">{candidate.title}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {showStage ? (
          <StatusBadge tone={getStageTone(candidate.stage)}>
            {displayLabel}
          </StatusBadge>
        ) : null}
        <span className="num hidden text-[11px] text-muted-foreground sm:inline">
          {candidate.updated}
        </span>
        <button
          type="button"
          aria-label={`Actions for ${candidate.name}`}
          className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function CandidateCard({ candidate }: { candidate: Candidate }) {
  return (
    <article className="rounded-md border border-border bg-surface p-2.5 transition-colors hover:border-border-strong">
      <div className="flex items-start gap-2.5">
        <Initials name={candidate.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-5 text-foreground">
            {candidate.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">{candidate.title}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-1">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">{candidate.location}</span>
        </span>
        <span className="num inline-flex shrink-0 items-center gap-1">
          <Clock className="size-3" />
          {candidate.updated}
        </span>
      </div>
      {candidate.note && (candidate.stage === "rejected" || candidate.status === "rejected") && !candidate.note.toLowerCase().includes("recruiter desk") ? (
        <p className="mt-2 rounded border border-destructive/20 bg-danger-soft px-2 py-1 text-[11px] text-destructive">
          {candidate.note}
        </p>
      ) : null}
    </article>
  );
}

export function PipelineColumn({
  label,
  items,
  compact = false,
  fullWidth = true,
}: {
  label: string;
  items: Candidate[];
  compact?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col border-r border-border last:border-r-0",
        fullWidth ? "flex-1 min-w-[200px]" : "w-[248px] shrink-0",
      )}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-surface-sunken px-3 py-2">
        <span className="truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </span>
        {items.length > 0 ? (
          <span className="num rounded border border-border bg-surface px-1.5 text-[11px] font-semibold text-foreground">
            {items.length}
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          "scroll-slim space-y-2 overflow-y-auto p-2",
          compact ? "max-h-[260px]" : "max-h-[calc(100vh-18rem)] min-h-[320px]",
        )}
      >
        {items.map((c) => (
          <CandidateCard key={c.id} candidate={c} />
        ))}
      </div>
    </div>
  );
}

export function PipelineBoard({
  candidates,
  job,
  stages: customStages,
  compact = false,
  fullWidth = true,
}: {
  candidates: Candidate[];
  job?: Job | { process?: string[]; hiringProcess?: string[]; hiring_process?: string[] };
  stages?: PipelineStage[];
  compact?: boolean;
  fullWidth?: boolean;
}) {
  const activeStages = customStages || getPipelineStagesForJob(job);

  return (
    <div className="scroll-slim flex w-full overflow-x-auto scroll-smooth">
      {activeStages.map((s, idx) => {
        const isFirstStage = idx === 0;
        const columnItems = candidates.filter((c) => {
          const normCandidateStage = normalizeStageId(c.stage);
          if (
            normCandidateStage === "rejected" ||
            c.stage === "rejected" ||
            c.stage === "am_rejected" ||
            c.stage === "company_rejected"
          ) {
            return false;
          }
          return (
            normCandidateStage === s.id ||
            c.stage?.toLowerCase() === s.label.toLowerCase() ||
            (isFirstStage &&
              (c.stage === "pending" ||
                c.stage === "submitted" ||
                c.stage === "am_review" ||
                normCandidateStage === "pending" ||
                normCandidateStage === "am_review" ||
                !c.stage))
          );
        });

        return (
          <PipelineColumn
            key={s.id}
            label={s.label}
            items={columnItems}
            compact={compact}
            fullWidth={fullWidth}
          />
        );
      })}
    </div>
  );
}

export function PipelineViewToggle({
  value,
  onChange,
}: {
  value: "compact" | "open";
  onChange: (v: "compact" | "open") => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border p-0.5">
      {(["compact", "open"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "rounded px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors",
            value === v
              ? "bg-surface-sunken text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {v} view
        </button>
      ))}
    </div>
  );
}

export function usePipelineView() {
  return useState<"compact" | "open">("compact");
}
