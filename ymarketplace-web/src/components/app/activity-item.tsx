import { Link } from "@tanstack/react-router";
import { ArrowUpRight, CheckCircle2, Flag, PencilLine, XCircle } from "lucide-react";
import type { Activity } from "@/lib/data";

const icons = {
  advance: ArrowUpRight,
  approve: CheckCircle2,
  reject: XCircle,
  requirement: PencilLine,
  flag: Flag,
} as const;

const tones = {
  advance: "text-brand",
  approve: "text-success",
  reject: "text-destructive",
  requirement: "text-muted-foreground",
  flag: "text-warning",
} as const;

export function ActivityItem({ item }: { item: Activity }) {
  const Icon = icons[item.kind];
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 border-b border-border px-4 py-3 last:border-0">
      <Icon className={`mt-0.5 size-4 shrink-0 ${tones[item.kind]}`} />
      <div className="min-w-0">
        <p className="text-[13px] leading-5 text-foreground">{item.event}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {item.actor} ·{" "}
          <Link
            to="/jobs/$jobId"
            params={{ jobId: item.jobId }}
            className="text-brand hover:underline"
          >
            {item.object}
          </Link>
        </p>
      </div>
      <span className="num shrink-0 text-[11px] text-muted-foreground">{item.time}</span>
    </li>
  );
}
