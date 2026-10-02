import { useState, type ReactNode } from "react";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { MarkdownContent } from "@/components/common/markdown-content";

export function Panel({
  children,
  className,
  as: As = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "aside";
}) {
  return <As className={cn("panel shadow-panel", className)}>{children}</As>;
}

export function PanelHeader({
  title,
  meta,
  actions,
  className,
}: {
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="truncate text-[13px] font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {meta ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("label-caps", className)}>{children}</p>;
}

export function MetaRow({
  label,
  value,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-3 border-b border-border/70 py-2.5 last:border-0",
        className,
      )}
    >
      <dt className="shrink-0 text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function InformationSection({
  heading,
  children,
  defaultOpen = false,
}: {
  heading: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-surface-sunken"
      >
        <span className="text-[13px] font-semibold tracking-tight text-foreground">{heading}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="max-w-[72ch] px-4 pb-5 text-[13.5px] leading-6 text-muted-foreground">
          {typeof children === "string" ? <MarkdownContent content={children} /> : children}
        </div>
      ) : null}
    </div>
  );
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 rounded-md border-border bg-surface pl-9 text-[13px] shadow-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-brand/20"
      />
    </div>
  );
}

export function FilterChip({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-[13px] text-foreground transition-colors hover:border-border-strong">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[10rem] cursor-pointer truncate bg-transparent pr-1 text-[13px] font-medium outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterBar({ children, onReset }: { children: ReactNode; onReset?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="hidden items-center gap-1.5 pr-1 text-xs font-medium text-muted-foreground sm:inline-flex">
        <SlidersHorizontal className="size-3.5" /> Filters
      </span>
      {children}
      {onReset ? (
        <button
          type="button"
          onClick={onReset}
          className="h-9 rounded-md px-2 text-xs font-semibold text-brand transition-colors hover:bg-brand-soft"
        >
          Reset
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {icon ? <div className="mb-1 text-muted-foreground">{icon}</div> : null}
      <p className="text-[13px] font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="max-w-sm text-xs leading-5 text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function CompanyMark({
  short,
  tone,
  size = "md",
}: {
  short: string;
  tone: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims =
    size === "sm" ? "size-7 text-[10px]" : size === "lg" ? "size-12 text-sm" : "size-9 text-[11px]";
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-md font-semibold tracking-tight text-white",
        dims,
      )}
      style={{ backgroundColor: tone }}
      aria-hidden
    >
      {short}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-border bg-surface px-4 pb-4 pt-5 sm:px-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-[13px] leading-5 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
