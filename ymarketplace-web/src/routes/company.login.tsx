import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RoleMismatchBanner } from "@/components/auth/role-mismatch-banner";
import { useAuth, isUserCompany } from "@/lib/auth";
import authService from "@/services/authService";
import { ForceChangePasswordDialog } from "@/components/auth/force-change-password-dialog";

export const Route = createFileRoute("/company/login")({
  head: () => ({
    meta: [
      { title: "Company Sign In — Yuvro Marketplace" },
      {
        name: "description",
        content:
          "Sign in to the Yuvro company portal to review shortlisted candidates, track interviews and manage your open roles.",
      },
      { property: "og:title", content: "Company Sign In — Yuvro Marketplace" },
      {
        property: "og:description",
        content: "Hiring team access to approved roles, vetted submissions and interview scheduling.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompanyLoginPage,
});

function CompanyLoginPage() {
  const navigate = useNavigate();
  const { login, user, isAuthenticated, isLoading } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForceChangePassword, setShowForceChangePassword] = useState(false);

  const isTempPasswordRequired = Boolean(
    showForceChangePassword || (isAuthenticated && user?.is_temp_pw)
  );

  useEffect(() => {
    if (!isLoading && isAuthenticated && user && isUserCompany(user) && !user.is_temp_pw) {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      if (redirect && redirect.startsWith("/")) {
        navigate({ to: redirect as any });
      } else {
        navigate({ to: "/company" as any });
      }
    }
  }, [isAuthenticated, isLoading, navigate, user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    if (!email.includes("@")) {
      setError("Enter the work email linked to your company account.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }

    setError(null);
    setPending(true);

    try {
      const response = await authService.login(email, password, "recruiter_company_manager");
      login(response.user, response.access);

      if (response.user.is_temp_pw) {
        setShowForceChangePassword(true);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      if (redirect && redirect.startsWith("/")) {
        navigate({ to: redirect as any });
      } else {
        navigate({ to: "/company" as any });
      }
    } catch (err: any) {
      setError(err?.message || "Invalid credentials. Please check your email and password.");
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in to your hiring account"
      description="Use the work email your Account Manager invited."
    >
      <RoleMismatchBanner portal="company" />
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
            Work email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            required
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
              Password
            </Label>
            <Link
              to="/forgot-password"
              search={{ from: "/company/login" }}
              className="text-xs font-semibold text-brand hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            required
            className="h-10"
          />
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/25 bg-danger-soft px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}

        <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Checkbox defaultChecked /> Keep me signed in on this device
        </label>

        <button
          type="submit"
          disabled={pending}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand text-[13px] font-semibold text-brand-foreground transition-colors hover:bg-brand/90 disabled:opacity-70"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Sign In
        </button>
      </form>

      <ForceChangePasswordDialog
        open={isTempPasswordRequired}
        onSuccess={() => {
          setShowForceChangePassword(false);
          const params = new URLSearchParams(window.location.search);
          const redirect = params.get("redirect");
          if (redirect && redirect.startsWith("/")) {
            navigate({ to: redirect as any });
          } else {
            navigate({ to: "/company" as any });
          }
        }}
      />
    </AuthLayout>
  );
}
