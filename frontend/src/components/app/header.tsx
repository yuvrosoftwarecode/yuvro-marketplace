import { useEffect, useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, ChevronDown, LogOut, Menu, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, getUserDisplayName, getUserInitials, getUserRoleTitle } from "@/lib/auth";
import { setJobOrigin, useJobOrigin } from "@/lib/job-origin";
import { useNotifications } from "@/lib/notifications";

const leftNav = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Browse Jobs", to: "/jobs" },
  { label: "Your Jobs", to: "/clients" },
];

function AppLogo() {
  return (
    <Link to="/jobs" className="flex shrink-0 items-center gap-2.5 pr-1">
      <img
        src="/knowledge-tree.png"
        alt="Knowledge Tree Logo"
        className="size-7 object-contain"
      />
      <span className="hidden flex-col leading-tight sm:flex">
        <span className="text-[13px] font-semibold tracking-tight text-foreground">
          Yuvro Marketplace
        </span>
        <span className="text-[11px] text-muted-foreground">Recruiter</span>
      </span>
    </Link>
  );
}

export function Header({ onOpenMobileNav }: { onOpenMobileNav?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const origin = useJobOrigin();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications({ pollInterval: 20000 });

  useEffect(() => {
    if (pathname === "/jobs" || pathname === "/jobs/") setJobOrigin("jobs");
    else if (pathname.startsWith("/clients")) setJobOrigin("clients");
  }, [pathname]);

  const displayName = getUserDisplayName(user, "Recruiter");
  const initials = useMemo(() => {
    const name = (user ? getUserDisplayName(user, "") : "").trim();
    if (name) {
      const parts = name.split(/\s+/);
      if (parts.length >= 2 && parts[0] && parts[1]) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (user?.email) return user.email.slice(0, 2).toUpperCase();
    return "R";
  }, [user]);
  const subtitle = user?.email || "Recruiter";
  const roleTitle = getUserRoleTitle(user, "Recruiter Freelancer");

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-sunken lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-4" />
        </button>

        <AppLogo />

        <div className="h-4 w-px bg-border/60 hidden sm:block shrink-0" />

        <nav className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {leftNav.map((n) => {
            const onJob = pathname.startsWith("/jobs/");
            const active = onJob
              ? n.to === (origin === "clients" ? "/clients" : "/jobs")
              : pathname === n.to || pathname.startsWith(n.to + "/");
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[13px] font-medium transition-all",
                  active
                    ? "bg-surface-sunken font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-surface-sunken/60 hover:text-foreground",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <Link
          to="/notifications"
          className="relative grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-sunken hover:text-foreground"
          aria-label={`Notifications, ${unreadCount} unread`}
        >
          <Bell className="size-4" />
          {unreadCount > 0 ? (
            <span className="num absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md p-1 pr-1.5 transition-colors hover:bg-surface-sunken"
            >
              {user?.profile_image ? (
                <img
                  src={user.profile_image}
                  alt={displayName}
                  className="size-7 rounded-full object-cover"
                />
              ) : (
                <span
                  suppressHydrationWarning
                  key={initials}
                  className="grid size-7 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background"
                >
                  {initials}
                </span>
              )}
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="space-y-0.5">
              <p suppressHydrationWarning className="text-[13px] font-semibold truncate">{displayName}</p>
              <p suppressHydrationWarning className="text-xs font-normal text-muted-foreground truncate">{subtitle}</p>
              {roleTitle && roleTitle !== "Recruiter Freelancer" && (
                <p suppressHydrationWarning className="text-[10px] font-normal text-muted-foreground">{roleTitle}</p>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile">
                <User className="size-4" /> Recruiter profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/help">
                <Settings className="size-4" /> Preferences
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-[13px] text-destructive focus:text-destructive cursor-pointer"
              onSelect={() => {
                logout();
              }}
            >
              <LogOut className="size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
