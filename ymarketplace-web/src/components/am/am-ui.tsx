import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { StatusBadge, getStageTone, type Tone } from "@/components/app/status-badge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  candidateStageLabel,
  getStageLabel,
  jobStatusLabel,
  payoutStatusLabel,
  requestStatusLabel,
  submissionStatusLabel,
  type AmJobStatus,
  type CandidateStage,
  type PayoutStatus,
  type RequestStatus,
  type SubmissionStatus,
} from "@/lib/am-data";

/* --------------------------------------------------------------- statuses */

const jobTone: Record<AmJobStatus, Tone> = {
  draft: "neutral",
  pending: "warning",
  active: "info",
  hiring: "success",
  paused: "warning",
  filled: "brand",
  closed: "neutral",
  cancelled: "danger",
  archived: "neutral",
};

const requestTone: Record<RequestStatus, Tone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  withdrawn: "neutral",
  removed: "neutral",
};

const submissionTone: Record<SubmissionStatus, Tone> = {
  submitted: "warning",
  am_review: "warning",
  am_approved: "info",
  am_rejected: "danger",
  forwarded: "info",
  company_reviewing: "info",
  company_rejected: "danger",
  interview: "brand",
  offer: "success",
  hired: "success",
  withdrawn: "neutral",
  on_hold: "neutral",
};

const stageTone: Record<CandidateStage, Tone> = {
  submitted: "warning",
  am_review: "warning",
  company_review: "info",
  interview: "brand",
  final: "brand",
  offer: "success",
  hired: "success",
  rejected: "danger",
};

const payoutTone: Record<PayoutStatus, Tone> = {
  pending: "warning",
  approved: "info",
  processing: "info",
  paid: "success",
  failed: "danger",
  disputed: "danger",
};

export const JobStatusPill = ({ status }: { status: AmJobStatus }) => (
  <StatusBadge tone={jobTone[status]} dot>
    {jobStatusLabel[status]}
  </StatusBadge>
);
export const RequestStatusPill = ({ status }: { status: RequestStatus }) => (
  <StatusBadge tone={requestTone[status]} dot>
    {requestStatusLabel[status]}
  </StatusBadge>
);
export const SubmissionStatusPill = ({ status }: { status: SubmissionStatus }) => (
  <StatusBadge tone={submissionTone[status]} dot>
    {submissionStatusLabel[status]}
  </StatusBadge>
);
export const StagePill = ({ stage }: { stage: string }) => (
  <StatusBadge tone={getStageTone(stage)} dot>
    {getStageLabel(stage)}
  </StatusBadge>
);
export const PayoutStatusPill = ({ status }: { status: PayoutStatus }) => (
  <StatusBadge tone={payoutTone[status]} dot>
    {payoutStatusLabel[status]}
  </StatusBadge>
);

/* ------------------------------------------------------------------ table */

export function TableShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("scroll-slim w-full overflow-x-auto", className)}>
      <table className="w-full min-w-[880px] border-collapse text-left">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="sticky top-0 z-10 bg-surface-sunken/95 backdrop-blur">
      <tr className="border-b border-border">{children}</tr>
    </thead>
  );
}

export function TH({
  children,
  align = "left",
  className,
}: {
  children?: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TR({
  children,
  onClick,
  active,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <tr
      {...(onClick ? { onClick, tabIndex: 0, role: "button" } : {})}
      className={cn(
        "border-b border-border/70 transition-colors last:border-0",
        onClick && "cursor-pointer hover:bg-surface-sunken",
        active && "bg-brand-soft/60",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function TD({
  children,
  align = "left",
  className,
  mono,
  colSpan,
}: {
  children?: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  mono?: boolean;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "px-3 py-2.5 align-middle text-[13px] text-foreground",
        align === "right" && "text-right",
        align === "center" && "text-center",
        mono && "num",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function CountLink({
  to,
  params,
  search,
  children,
  muted,
}: {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={to as any}
      {...(params ? { params: params as never } : {})}
      {...(search ? { search: search as never } : {})}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "num rounded px-1 py-0.5 text-[13px] font-medium underline-offset-4 transition-colors hover:underline",
        muted ? "text-muted-foreground hover:text-foreground" : "text-brand",
      )}
    >
      {children}
    </Link>
  );
}

/* -------------------------------------------------------------------- kpis */

export function KpiGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 divide-x divide-y divide-border border-y border-border bg-surface sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0 lg:border-y",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Kpi({
  label,
  value,
  hint,
  tone,
  to,
  search,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "warning" | "danger" | "success";
  to?: string;
  search?: Record<string, string>;
}) {
  const body = (
    <div className="min-w-0 px-4 py-3.5">
      <p className="label-caps truncate">{label}</p>
      <p
        className={cn(
          "num mt-1 truncate text-[22px] font-semibold leading-7 tracking-tight",
          tone === "warning" && "text-warning",
          tone === "danger" && "text-destructive",
          tone === "success" && "text-success",
          (!tone || tone === "default") && "text-foreground",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
  if (!to) return body;
  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={to as any}
      {...(search ? { search: search as never } : {})}
      className="min-w-0 block transition-colors hover:bg-surface-sunken"
    >
      {body}
    </Link>
  );
}

/* ------------------------------------------------------------------ drawer */

export function SideDrawer({
  open,
  onOpenChange,
  title,
  children,
  footer,
  width = "wide",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: "wide" | "narrow";
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "flex w-full flex-col gap-0 p-0 sm:max-w-none",
          width === "wide" ? "lg:w-[720px]" : "lg:w-[480px]",
        )}
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <div className="scroll-slim flex-1 overflow-y-auto">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-surface px-4 py-3">
            {footer}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

/* ----------------------------------------------------------------- buttons */

export function Btn({
  children,
  variant = "default",
  size = "md",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "danger" | "ghost";
  size?: "sm" | "md";
}) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-[13px]",
        variant === "primary" && "bg-brand text-brand-foreground hover:bg-brand/90",
        variant === "default" &&
          "border border-border bg-surface text-foreground hover:bg-surface-sunken",
        variant === "danger" &&
          "border border-destructive/30 bg-surface text-destructive hover:bg-danger-soft",
        variant === "ghost" &&
          "text-muted-foreground hover:bg-surface-sunken hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ pieces */

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export const inputCls =
  "h-9 w-full rounded-md border border-border bg-surface px-2.5 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand focus:ring-[3px] focus:ring-brand/15";

export const textareaCls =
  "min-h-[84px] w-full rounded-md border border-border bg-surface px-2.5 py-2 text-[13px] leading-5 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand focus:ring-[3px] focus:ring-brand/15";

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-5 border-b border-border py-6 last:border-0 md:grid-cols-[200px_minmax(0,1fr)] md:gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
      <div className="min-w-0">
        <h2 className="text-[13px] font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="min-w-0 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function DefinitionGrid({
  items,
  columns = 2,
  className,
}: {
  items: { label: string; value: ReactNode }[];
  columns?: 1 | 2;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-0.5",
        columns === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
        className,
      )}
    >
      {items.map((i) => (
        <div
          key={i.label}
          className="flex items-baseline justify-between gap-3 border-b border-border/60 py-2.5"
        >
          <dt className="shrink-0 text-xs font-medium text-muted-foreground">{i.label}</dt>
          <dd className="min-w-0 text-right text-[13px] font-medium text-foreground">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function BulletList({
  items,
  tone,
}: {
  items: string[];
  tone?: "default" | "success" | "danger";
}) {
  if (!items.length) return <p className="text-[13px] text-muted-foreground">None recorded.</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((i) => (
        <li key={i} className="flex gap-2 text-[13px] leading-5 text-foreground">
          <span
            className={cn(
              "mt-[7px] size-1.5 shrink-0 rounded-full",
              tone === "success"
                ? "bg-success"
                : tone === "danger"
                  ? "bg-destructive"
                  : "bg-border-strong",
            )}
          />
          <span className="min-w-0">{i}</span>
        </li>
      ))}
    </ul>
  );
}

export function Bar({
  value,
  max,
  tone,
}: {
  value: number;
  max: number;
  tone?: "brand" | "success" | "warning";
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
      <div
        className={cn(
          "h-full rounded-full",
          tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-brand",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function FunnelRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_3.5rem_3rem] items-center gap-3 border-b border-border/70 py-2.5 last:border-0">
      <span className="truncate text-[13px] font-medium text-foreground">{label}</span>
      <Bar value={value} max={max} />
      <span className="num text-right text-[13px] font-semibold text-foreground">{value}</span>
      <span className="num text-right text-xs text-muted-foreground">{pct}%</span>
    </div>
  );
}

export function Tabs({
  tabs,
  active,
  onSelect,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="scroll-slim -mb-px flex items-center gap-1 overflow-x-auto">
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            className={cn(
              "relative flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap px-3 text-[13px] font-medium transition-colors",
              on ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {typeof t.count === "number" && t.count > 0 ? (
              <span
                className={cn(
                  "num rounded px-1.5 py-0.5 text-[11px]",
                  on ? "bg-brand-soft text-brand" : "bg-surface-sunken text-muted-foreground",
                )}
              >
                {t.count}
              </span>
            ) : null}
            {on ? (
              <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-brand" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="scroll-slim flex items-center gap-1 overflow-x-auto rounded-md border border-border bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded px-2.5 text-xs font-medium transition-colors",
            o.id === value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
          {typeof o.count === "number" ? <span className="num opacity-70">{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function TimelineList({
  items,
}: {
  items: { label: string; at: string; by: string; note?: string }[];
}) {
  return (
    <ol className="relative space-y-3 pl-4">
      <span className="absolute left-[3px] top-1.5 bottom-1.5 w-px bg-border" aria-hidden />
      {items.map((i, idx) => (
        <li key={`${i.label}-${idx}`} className="relative">
          <span
            className={cn(
              "absolute -left-4 top-1.5 size-[7px] rounded-full ring-2 ring-surface",
              idx === items.length - 1 ? "bg-brand" : "bg-border-strong",
            )}
            aria-hidden
          />
          <p className="text-[13px] font-medium text-foreground">{i.label}</p>
          <p className="text-[11px] text-muted-foreground">
            {i.by} · {i.at}
          </p>
          {i.note ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{i.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}

export function DrawerHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="border-b border-border bg-surface px-4 py-4 sm:px-5">
      <p className="label-caps">{eyebrow}</p>
      <div className="mt-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </div>
  );
}

export function DrawerBlock({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="border-b border-border px-4 py-4 last:border-0 sm:px-5">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3 className="label-caps">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}
