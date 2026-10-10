import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Banknote,
  Bell,
  BarChart4,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronLeft,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  Search,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  useAuth,
  getUserDisplayName,
  getUserFirstName,
  getUserInitials,
  getUserRoleTitle,
} from "@/lib/auth";
import { useAm } from "./am-store";
import { GlobalSearch } from "./am-global-search";

type NavItem = { label: string; to: string; icon: typeof Users; badge?: number };

function useNav() {
  const { kpis, unreadMessages, unreadNotifications } = useAm();
  const pendingJobsCount = kpis.pendingSubmissions + kpis.pendingRequests;

  return useMemo(
    () => ({
      main: [
        { label: "Overview", to: "/am", icon: LayoutDashboard },
        {
          label: "Jobs",
          to: "/am/jobs",
          icon: Briefcase,
          badge: pendingJobsCount > 0 ? pendingJobsCount : undefined,
        },
        { label: "Recruiters", to: "/am/recruiters", icon: Users },
        { label: "Companies", to: "/am/companies", icon: Building2 },
        {
          label: "Messages",
          to: "/am/messages",
          icon: MessagesSquare,
          badge: unreadMessages > 0 ? unreadMessages : undefined,
        },
        { label: "Calendar", to: "/am/calendar", icon: CalendarDays },
      ] as NavItem[],
      finance: [{ label: "Bounties & Payouts", to: "/am/payouts", icon: Banknote }] as NavItem[],
      analytics: [{ label: "Reports", to: "/am/reports", icon: BarChart4 }] as NavItem[],
      account: [
        {
          label: "Notifications",
          to: "/am/notifications",
          icon: Bell,
          badge: unreadNotifications > 0 ? unreadNotifications : undefined,
        },
        { label: "Settings", to: "/am/settings", icon: Settings },
      ] as NavItem[],
    }),
    [pendingJobsCount, unreadMessages, unreadNotifications],
  );
}

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}

function NavRow({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = item.to === "/am" ? pathname === "/am" : pathname.startsWith(item.to);
  const Icon = item.icon;
  const mounted = useMounted();
  const badgeVal = mounted ? item.badge : undefined;

  const row = (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={item.to as any}
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
          {badgeVal ? (
            <span className="num rounded bg-brand-soft px-1.5 py-0.5 text-[11px] font-semibold text-brand">
              {badgeVal}
            </span>
          ) : null}
        </>
      ) : badgeVal ? (
        <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-brand" aria-hidden />
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

function Group({
  label,
  items,
  collapsed,
}: {
  label?: string;
  items: NavItem[];
  collapsed: boolean;
}) {
  return (
    <div className="mt-4 first:mt-0">
      {label ? (
        collapsed ? (
          <div className="mx-auto mb-2 h-px w-6 bg-border" />
        ) : (
          <p className="label-caps px-2.5 pb-1.5">{label}</p>
        )
      ) : null}
      <div className="space-y-0.5">
        {items.map((i) => (
          <NavRow key={i.to} item={i} collapsed={collapsed} />
        ))}
      </div>
    </div>
  );
}

function AmSidebar({
  collapsed,
  onToggle,
  className,
}: {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const nav = useNav();
  return (
    <nav
      aria-label="Account Manager navigation"
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
        collapsed ? "w-[60px]" : "w-[236px]",
        className,
      )}
    >
      <div className={cn("scroll-slim flex-1 overflow-y-auto overscroll-contain px-3 py-3", collapsed && "px-2")}>
        <Group items={nav.main} collapsed={collapsed} />
        <Group label="Finance" items={nav.finance} collapsed={collapsed} />
        <Group label="Analytics" items={nav.analytics} collapsed={collapsed} />
        <Group label="Account" items={nav.account} collapsed={collapsed} />
      </div>
      <div className="border-t border-sidebar-border p-3">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/70 hover:text-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          <ChevronLeft
            className={cn("size-4 shrink-0 transition-transform", collapsed && "rotate-180")}
          />
          {!collapsed ? "Collapse sidebar" : null}
        </button>
      </div>
    </nav>
  );
}

function AmHeader({
  onOpenNav,
  onOpenSearch,
}: {
  onOpenNav: () => void;
  onOpenSearch: () => void;
}) {
  const { unreadNotifications, signOut } = useAm();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const displayName = getUserDisplayName(user, "Account Manager");
  const firstName = getUserFirstName(user, "Account Manager");
  const initials = getUserInitials(user, "AM");
  const title = getUserRoleTitle(user, "Account Manager");

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/95 px-3 backdrop-blur sm:px-4">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-sunken hover:text-foreground lg:hidden"
      >
        <Menu className="size-4" />
      </button>

      <Link to="/am" className="flex shrink-0 items-center gap-2.5">
        <img
          src="/knowledge-tree.png"
          alt="Knowledge Tree Logo"
          className="h-7 w-auto max-w-[140px] object-contain"
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src.endsWith("/knowledge-tree.png")) {
              target.src = "/yuvro-logo.png";
            } else {
              target.style.display = "none";
            }
          }}
        />
        <span className="hidden flex-col leading-tight sm:flex">
          <span className="text-[13px] font-semibold tracking-tight text-foreground">
            Yuvro Marketplace
          </span>
          <span className="text-[11px] text-muted-foreground">Account Manager</span>
        </span>
      </Link>

      <button
        type="button"
        onClick={onOpenSearch}
        className="ml-1 flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-surface-sunken/60 px-2.5 text-left text-[13px] text-muted-foreground transition-colors hover:border-border-strong sm:max-w-xl"
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">Search companies, jobs, recruiters, candidates…</span>
        <kbd className="num ml-auto hidden shrink-0 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">
          ⌘K
        </kbd>
      </button>

      <Link
        to="/am/notifications"
        aria-label={unreadNotifications > 0 ? `Notifications (${unreadNotifications} unread)` : "Notifications"}
        className="relative grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-sunken hover:text-foreground"
      >
        <Bell className="size-4" />
        {unreadNotifications > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-brand-foreground shadow-sm animate-in fade-in zoom-in">
            {unreadNotifications > 9 ? "9+" : unreadNotifications}
          </span>
        ) : null}
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-9 shrink-0 items-center gap-2 rounded-md border border-border bg-surface px-2 text-[13px] font-medium text-foreground transition-colors hover:bg-surface-sunken"
          >
            {user?.profile_image ? (
              <img
                src={user.profile_image}
                alt={displayName}
                className="size-6 rounded-full object-cover"
              />
            ) : (
              <span
                suppressHydrationWarning
                className="grid size-6 place-items-center rounded bg-brand text-[10px] font-semibold text-brand-foreground"
              >
                {initials}
              </span>
            )}
            <span suppressHydrationWarning className="hidden sm:block">
              {firstName}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel suppressHydrationWarning className="text-xs">
            {displayName}
            <span suppressHydrationWarning className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
              {title}
            </span>
            {user?.email && (
              <span suppressHydrationWarning className="mt-0.5 block text-[10px] font-normal text-muted-foreground truncate">
                {user.email}
              </span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/am/settings" className="text-[13px]">
              <UserRound className="size-4" /> Profile & settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-[13px] text-destructive focus:text-destructive"
            onSelect={() => {
              signOut();
              logout();
              navigate({ to: "/am/login" });
            }}
          >
            <LogOut className="size-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

export function AmShell({ children }: { children: ReactNode }) {
  const { signedIn } = useAm();
  const { isAuthenticated, isLoading, isAccountManager } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !isAccountManager) {
        navigate({ to: "/am/login" });
      }
    }
  }, [isAuthenticated, isLoading, isAccountManager, navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <AmHeader onOpenNav={() => setNavOpen(true)} onOpenSearch={() => setSearchOpen(true)} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="hidden h-full shrink-0 lg:block">
          <AmSidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
        </div>
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-[252px] p-0">
          <SheetTitle className="sr-only">Account Manager navigation</SheetTitle>
          <AmSidebar
            collapsed={false}
            onToggle={() => setNavOpen(false)}
            className="w-full border-r-0"
          />
        </SheetContent>
      </Sheet>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

export function AmPageHeader({
  breadcrumb,
  title,
  description,
  actions,
  children,
}: {
  breadcrumb?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-border bg-surface px-4 pb-4 pt-5 sm:px-6">
      {breadcrumb ? (
        <div className="mb-2 text-[11px] text-muted-foreground">{breadcrumb}</div>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 max-w-3xl text-[13px] leading-5 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
