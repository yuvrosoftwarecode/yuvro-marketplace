import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { BarChart3, Briefcase, Building2, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth, isUserRecruiterFreelancer } from "@/lib/auth";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

const mobileNav = [
  { label: "Jobs", to: "/jobs", icon: Briefcase },
  { label: "Your Jobs", to: "/clients", icon: Building2 },
  { label: "Pipeline", to: "/pipeline", icon: Users },
  { label: "Overview", to: "/dashboard", icon: BarChart3 },
];

function MobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface/95 backdrop-blur lg:hidden">
      {mobileNav.map((n) => {
        const active = pathname === n.to || pathname.startsWith(n.to + "/");
        const Icon = n.icon;
        return (
          <Link
            key={n.to}
            to={n.to}
            className={cn(
              "flex h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium",
              active ? "text-brand" : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
            {n.label}
          </Link>
        );
      })}
      <Link
        to="/submit-candidate"
        className="flex h-14 flex-col items-center justify-center gap-1 text-[10px] font-semibold text-brand"
      >
        <span className="grid size-6 place-items-center rounded-md bg-brand text-brand-foreground">
          <Plus className="size-4" />
        </span>
        Submit
      </Link>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, isAccountManager, user } = useAuth();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate({ to: "/login" });
      } else if (isAccountManager) {
        navigate({ to: "/am" });
      } else if (!isUserRecruiterFreelancer(user)) {
        navigate({ to: "/login" });
      } else if (user && !user.is_active) {
        navigate({ to: "/application" as any });
      }
    }
  }, [isAuthenticated, isLoading, isAccountManager, user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Header onOpenMobileNav={() => setNavOpen(true)} />
      <div className="flex">
        <main className="min-w-0 flex-1 pb-14 lg:pb-0">{children}</main>
      </div>
      <MobileTabBar />
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-[248px] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar className="w-full border-r-0" />
        </SheetContent>
      </Sheet>
    </div>
  );
}
