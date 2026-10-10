import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  Building2,
  CalendarCheck,
  Bell,
  ChevronLeft,
  CircleSlash,
  CreditCard,
  FilePlus2,
  LayoutDashboard,
  LogOut,
  Menu,
  Plug,
  Settings,
  Sparkles,
  Users,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Tone = "brand" | "info" | "success" | "warning" | "danger";

type Item = { label: string; to: string; icon: typeof Users; tone?: Tone; count?: number };

type Group = { label?: string; items: Item[] };

const groups: Group[] = [
  {
    items: [
      { label: "Overview", to: "/company", icon: LayoutDashboard, tone: "brand" },
      { label: "Notifications", to: "/company/notifications", icon: Bell, tone: "warning" },
    ],
  },
  {
    label: "Job post setup",
    items: [
      { label: "About company", to: "/company/about", icon: Building2, tone: "info" },
      { label: "Create a job", to: "/company/jobs/new", icon: FilePlus2, tone: "brand" },
    ],
  },
  {
    label: "Candidates",
    items: [
      { label: "Review", to: "/company/candidates/review", icon: Sparkles, tone: "warning" },
      { label: "Active pipeline", to: "/company/candidates/active", icon: Users, tone: "info" },
      { label: "Rejected", to: "/company/candidates/rejected", icon: CircleSlash, tone: "danger" },
      { label: "Offer", to: "/company/candidates/offer", icon: CalendarCheck, tone: "success" },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Settings", to: "/company/settings", icon: Settings },
      { label: "Billing", to: "/company/billing", icon: CreditCard, tone: "success" },
      { label: "Team", to: "/company/team", icon: UsersRound, tone: "info" },
      { label: "Integrations", to: "/company/integrations", icon: Plug, tone: "brand" },
    ],
  },
];

const toneIcon: Record<Tone, string> = {
  brand: "text-brand",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};

const toneChip: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-destructive",
};

function NavRow({ item, collapsed }: { item: Item; collapsed: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = item.to === "/company" ? pathname === "/company" : pathname.startsWith(item.to);
  const Icon = item.icon;
  const tone = item.tone ?? "brand";

  const row = (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={item.to as any}
      className={cn(
        "group relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-all duration-200",
        active
          ? "bg-sidebar-accent text-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-1.5 h-6 w-[2px] rounded-full transition-opacity duration-200",
          active ? "bg-brand opacity-100" : "opacity-0",
        )}
        aria-hidden
      />
      <Icon
        className={cn(
          "size-4 shrink-0 transition-colors",
          active ? toneIcon[tone] : "text-muted-foreground group-hover:" + toneIcon[tone],
        )}
      />
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {item.count ? (
            <span className={cn("num rounded px-1.5 py-0.5 text-[11px] font-semibold", toneChip[tone])}>
              {item.count}
            </span>
          ) : null}
        </>
      ) : item.count ? (
        <span className={cn("absolute right-1.5 top-1.5 size-1.5 rounded-full", toneChip[tone])} aria-hidden />
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

function CompanySidebar({
  collapsed,
  onToggle,
  onSignOut,
  className,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onSignOut?: () => void;
  className?: string;
}) {
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    const fetchUnread = () => {
      api
        .get<{ unread_count: number }>("/api/notifications/unread-count/")
        .then((res) => {
          if (mounted && typeof res?.unread_count === "number") {
            setUnreadCount(res.unread_count);
          }
        })
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    window.addEventListener("notifications-updated", fetchUnread);
    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener("notifications-updated", fetchUnread);
    };
  }, []);

  const navGroups = useMemo(() => {
    return groups.map((g) => ({
      ...g,
      items: g.items.map((item) => {
        if (item.to === "/company/notifications") {
          return {
            ...item,
            count: unreadCount > 0 ? unreadCount : undefined,
          };
        }
        return item;
      }),
    }));
  }, [unreadCount]);

  return (
    <nav
      aria-label="Company navigation"
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-out",
        collapsed ? "w-[60px]" : "w-[236px]",
        className,
      )}
    >
      <div className={cn("flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-3", collapsed && "justify-center px-0")}>
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-foreground text-[11px] font-semibold text-background">
          YV
        </span>
        {!collapsed ? (
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[13px] font-semibold tracking-tight text-foreground">Company Portal</span>
            <span className="truncate text-[11px] text-muted-foreground">Hiring workspace</span>
          </span>
        ) : null}
      </div>

      <div className={cn("scroll-slim flex-1 overflow-y-auto overscroll-contain px-3 py-3", collapsed && "px-2")}>
        {navGroups.map((g, gi) => (
          <div key={g.label ?? gi} className="mt-4 first:mt-0">
            {g.label ? (
              collapsed ? (
                <div className="mx-auto mb-2 h-px w-6 bg-border" />
              ) : (
                <p className="label-caps px-2.5 pb-1.5">{g.label}</p>
              )
            ) : null}
            <div className="space-y-0.5">
              {g.items.map((i) => (
                <NavRow key={i.to} item={i} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-sidebar-border p-3 shrink-0 space-y-1">
        {onSignOut ? (
          collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onSignOut}
                  aria-label="Sign out"
                  className="flex h-9 w-full items-center justify-center rounded-md text-[13px] font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="size-4 shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign out</TooltipContent>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={onSignOut}
              className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="size-4 shrink-0" />
              <span>Sign out</span>
            </button>
          )
        ) : null}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          <ChevronLeft className={cn("size-4 shrink-0 transition-transform duration-300", collapsed && "rotate-180")} />
          {!collapsed ? "Collapse sidebar" : null}
        </button>
      </div>
    </nav>
  );
}

export function CompanyShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const { isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/company/login" });
    }
  }, [isLoading, isAuthenticated, navigate]);

  const handleSignOut = () => {
    logout("/company/login");
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <div className="hidden h-full shrink-0 lg:block">
        <CompanySidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} onSignOut={handleSignOut} />
      </div>

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="sticky top-0 z-20 border-b border-border bg-surface/95 px-4 pb-4 pt-4 backdrop-blur sm:px-6">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Open navigation"
              className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-sunken hover:text-foreground lg:hidden"
            >
              <Menu className="size-4" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">{title}</h1>
              {description ? (
                <p className="mt-1 max-w-3xl text-[13px] leading-5 text-muted-foreground">{description}</p>
              ) : null}
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        </div>
        <div className="flex-1 px-4 py-5 sm:px-6">{children}</div>
      </main>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-[252px] p-0">
          <SheetTitle className="sr-only">Company navigation</SheetTitle>
          <CompanySidebar collapsed={false} onToggle={() => setNavOpen(false)} onSignOut={handleSignOut} className="w-full border-r-0" />
        </SheetContent>
      </Sheet>
    </div>
  );
}


export function CompanySection({
  title,
  meta,
  children,
  className,
}: {
  title: string;
  meta?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-md border border-border bg-surface shadow-panel", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <h2 className="text-[13px] font-semibold tracking-tight text-foreground">{title}</h2>
        {meta ? (
          typeof meta === "string" ? (
            <span className="num text-[11px] text-muted-foreground">{meta}</span>
          ) : (
            meta
          )
        ) : null}
      </header>
      <div className="px-4 py-4 text-[13px] leading-5 text-muted-foreground">{children}</div>
    </section>
  );
}
