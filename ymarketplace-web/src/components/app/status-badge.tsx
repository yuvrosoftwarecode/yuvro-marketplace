import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-5 tracking-tight",
  {
    variants: {
      tone: {
        neutral: "border-border bg-surface-sunken text-muted-foreground",
        success: "border-success/25 bg-success-soft text-success",
        warning: "border-warning/25 bg-warning-soft text-warning",
        danger: "border-destructive/25 bg-danger-soft text-destructive",
        info: "border-info/25 bg-info-soft text-info",
        brand: "border-brand/25 bg-brand-soft text-brand",
        solid: "border-transparent bg-foreground text-background",
      },
      dot: { true: "", false: "" },
    },
    defaultVariants: { tone: "neutral", dot: false },
  },
);

export type Tone = NonNullable<VariantProps<typeof badge>["tone"]>;

const dotTone: Record<string, string> = {
  neutral: "bg-muted-foreground",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
  brand: "bg-brand",
  solid: "bg-background",
};

export function StatusBadge({
  children,
  tone = "neutral",
  dot = false,
  className,
}: {
  children: React.ReactNode;
  tone?: Tone | undefined;
  dot?: boolean | undefined;
  className?: string | undefined;
}) {
  return (
    <span className={cn(badge({ tone }), className)}>
      {dot ? <span className={cn("size-1.5 rounded-full", dotTone[tone])} /> : null}
      {children}
    </span>
  );
}

export const clientStatusTone: Record<string, Tone> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
  paused: "info",
  archived: "neutral",
};

export const stageTone: Record<string, Tone> = {
  am_review: "warning",
  "am review": "warning",
  pending: "warning",
  review: "info",
  prescreen: "info",
  screening: "info",
  technical_interview: "brand",
  "technical interview": "brand",
  hiring_manager: "brand",
  "hiring manager": "brand",
  team: "brand",
  panel: "brand",
  final: "brand",
  final_interview: "brand",
  "final interview": "brand",
  offer: "success",
  hired: "success",
  rejected: "danger",
};

export function getStageTone(stage: string): Tone {
  if (!stage) return "neutral";
  const normalized = stage.toLowerCase().trim();
  if (stageTone[normalized]) return stageTone[normalized];
  if (stageTone[stage]) return stageTone[stage];
  if (normalized.includes("review")) return "warning";
  if (normalized.includes("screen")) return "info";
  if (normalized.includes("interview")) return "brand";
  if (normalized.includes("offer") || normalized.includes("hire")) return "success";
  return "info";
}
