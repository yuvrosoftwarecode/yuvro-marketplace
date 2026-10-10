import { useMemo } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  CircleSlash,
  Gift,
  HelpCircle,
  LifeBuoy,
  MessagesSquare,
  Plus,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useJobContext } from "./job-context";

type Item = { label: string; icon: typeof Users; to: string; count?: number };

const primaryNavBase: Omit<Item, "count">[] = [
  { label: "Pipeline", icon: Users, to: "/pipeline" },
  { label: "Overview", icon: BarChart3, to: "/dashboard" },
  { label: "Calendar", icon: CalendarDays, to: "/calendar" },
  { label: "Client Messages", icon: MessagesSquare, to: "/messages" },
  { label: "Cross List", icon: Share2, to: "/cross-list" },
  { label: "AI Matchmaker", icon: Sparkles, to: "/matchmaker" },
];

const stageNav: Item[] = [
  { label: "Active", icon: Users, to: "/candidates/active" },
  { label: "Rejected", icon: CircleSlash, to: "/candidates/rejected" },
];

const secondaryNav: Item[] = [{ label: "Referrals & Promotions", icon: Gift, to: "/referrals" }];

function NavRow({ item, collapsed }: { item: Item; collapsed: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = pathname === item.to || pathname.startsWith(item.to + "/");
  const Icon = item.icon;

  const row = (
    <Link
      to={item.to}
      className={cn(
        "group relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      {active ? (
        <span className="absolute left-0 top-1.5 h-6 w-[2px] rounded-full bg-brand" aria-hidden />
      ) : null}
      <Icon className={cn("size-4 shrink-0", active ? "text-brand" : "text-muted-foreground")} />
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {item.count ? (
            <span className="num text-[11px] text-muted-foreground">{item.count}</span>
          ) : null}
        </>
      ) : null}
    </Link>
  );

  if (!collapsed) return row;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{row}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({ className }: { className?: string }) {
  const { sidebarCollapsed, toggleSidebar } = useJobContext();
  const collapsed = sidebarCollapsed;

  const primaryNav = primaryNavBase;

  return (
    <nav
      aria-label="Recruiter navigation"
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
        collapsed ? "w-[60px]" : "w-[232px]",
        className,
      )}
    >
      <div className={cn("px-3 py-3", collapsed && "px-2")}>
        <Link
          to="/submit-candidate"
          className={cn(
            "flex h-9 items-center justify-center gap-2 rounded-md bg-brand text-[13px] font-semibold text-brand-foreground shadow-panel transition-colors hover:bg-brand/90",
            collapsed ? "w-full" : "w-full px-3",
          )}
        >
          <Plus className="size-4 shrink-0" />
          {!collapsed ? "Submit Candidate" : null}
        </Link>
      </div>

      <div className="scroll-slim flex-1 overflow-y-auto overscroll-contain px-3 pb-2 pt-1">
        <div className="space-y-0.5">
          {primaryNav.map((i) => (
            <NavRow key={i.to} item={i} collapsed={collapsed} />
          ))}
        </div>

        <div className="mt-5">
          {!collapsed ? (
            <p className="label-caps px-2.5 pb-1.5">Candidate stages</p>
          ) : (
            <div className="mx-auto mb-2 h-px w-6 bg-border" />
          )}
          <div className="space-y-0.5">
            {stageNav.map((i) => (
              <NavRow key={i.to} item={i} collapsed={collapsed} />
            ))}
          </div>
        </div>

        <div className="mt-5 border-t border-sidebar-border pt-3">
          <div className="space-y-0.5">
            {secondaryNav.map((i) => (
              <NavRow key={i.to} item={i} collapsed={collapsed} />
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-sidebar-border p-3">
        <div className="space-y-0.5">
          <NavRow
            item={{ label: "Help & Resources", icon: LifeBuoy, to: "/help" }}
            collapsed={collapsed}
          />
          <button
            type="button"
            onClick={toggleSidebar}
            className={cn(
              "flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/70 hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? <HelpCircle className="hidden" /> : null}
            <ChevronLeft
              className={cn("size-4 shrink-0 transition-transform", collapsed && "rotate-180")}
            />
            {!collapsed ? "Collapse sidebar" : null}
          </button>
        </div>
      </div>
    </nav>
  );
}
