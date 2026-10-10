import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AuthDivider, AuthLayout, SocialAuthButtons } from "@/components/auth/auth-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RoleMismatchBanner } from "@/components/auth/role-mismatch-banner";
import { useAuth, isUserAccountManager, isUserRecruiterFreelancer } from "@/lib/auth";
import authService from "@/services/authService";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Recruiter Sign In — Recruiter OS Marketplace" },
      {
        name: "description",
        content:
          "Sign in to Recruiter OS to work approved marketplace roles, track candidate pipelines and manage bounty payouts.",
      },
      { property: "og:title", content: "Recruiter Sign In — Recruiter OS Marketplace" },
      {
        property: "og:description",
        content: "The recruiting operating system for marketplace roles, pipelines and bounty payouts.",
      },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, isAccountManager, user } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (isUserRecruiterFreelancer(user)) {
        navigate({ to: "/dashboard" });
      }
    }
  }, [isAuthenticated, isLoading, navigate, user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");

    if (!email || !email.includes("@")) {
      setError("Enter a valid work email address.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }

    setError(null);
    setPending(true);

    try {
      const response = await authService.login(email, password, "recruiter_freelancer");
      if (!isUserRecruiterFreelancer(response.user)) {
        authService.clearTokens();
        setError("Access denied.");
        return;
      }

      login(response.user, response.access);

      // Verify active status with local marketplace backend
      let isActive = response.user.is_active;
      try {
        const localMe = await restApiAuthUtil.get<any>("/api/auth/me/");
        if (localMe && typeof localMe.is_active === "boolean") {
          isActive = localMe.is_active;
        }
      } catch {}

      if (!isActive) {
        navigate({ to: "/application" as any });
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      if (redirect && redirect.startsWith("/")) {
        navigate({ to: redirect as any });
      } else {
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      setError(err?.message || "Invalid credentials. Please check your email and password.");
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in to your recruiter account"
      description="Use the email connected to your marketplace profile."
    >
      <RoleMismatchBanner portal="recruiter" />
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
              search={{ from: "/login" }}
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
          Continue
        </button>
      </form>

      <AuthDivider />
      <SocialAuthButtons includeLinkedIn={false} />
    </AuthLayout>
  );
}
