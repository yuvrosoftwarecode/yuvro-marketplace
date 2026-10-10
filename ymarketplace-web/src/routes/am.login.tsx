import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";
import { Btn, Field, inputCls } from "@/components/am/am-ui";
import { useAm } from "@/components/am/am-store";
import { BrandLockup } from "@/components/auth/auth-layout";
import { Checkbox } from "@/components/ui/checkbox";
import { RoleMismatchBanner } from "@/components/auth/role-mismatch-banner";
import { useAuth, isUserAccountManager } from "@/lib/auth";
import authService from "@/services/authService";

export const Route = createFileRoute("/am/login")({
  head: () => ({
    meta: [
      { title: "Account Manager Portal — Yuvro Marketplace" },
      {
        name: "description",
        content:
          "Sign in to the Yuvro Account Manager portal to manage companies, jobs, recruiter requests, submissions and payouts.",
      },
      { property: "og:title", content: "Account Manager Portal — Yuvro Marketplace" },
      {
        property: "og:description",
        content:
          "Operational control layer for recruitment marketplace jobs, recruiters, companies and bounties.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AmLoginPage,
});

function AmLoginPage() {
  const { signIn } = useAm();
  const { login, isAuthenticated, isLoading, isAccountManager } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated && isAccountManager) {
      navigate({ to: "/am" });
    }
  }, [isAuthenticated, isLoading, isAccountManager, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");

    if (!email || !email.includes("@")) {
      setError("Enter the work email linked to your Account Manager profile.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }

    setError(null);
    setPending(true);

    try {
      const response = await authService.login(email, password, "recruiter_account_manager");
      if (!isUserAccountManager(response.user)) {
        authService.clearTokens();
        setError("Access denied.");
        return;
      }
      login(response.user, response.access);
      signIn(email);
      navigate({ to: "/am" });
    } catch (err: any) {
      setError(err?.message || "Invalid credentials. Please check your email and password.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_460px]">
      <aside className="hidden flex-col justify-between border-r border-border bg-surface px-10 py-8 lg:flex">
        <div className="flex items-center gap-2.5">
          <BrandLockup />
          <span className="text-[13px] font-semibold tracking-tight text-foreground">
            Yuvro Marketplace
          </span>
        </div>

        <div className="max-w-lg">
          <p className="label-caps">Account Manager</p>
          <h2 className="mt-2 text-2xl font-semibold leading-9 tracking-tight text-foreground">
            The operational layer between companies, recruiters and candidates.
          </h2>
          <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
            Approve recruiter access, review every submission before it reaches a company, track
            interviews, offers, hires and recruiter payouts — with job context preserved end to end.
          </p>
          <dl className="mt-8 grid grid-cols-3 gap-6 border-t border-border pt-6">
            {[
              ["412", "Jobs managed"],
              ["1,286", "Submissions reviewed"],
              ["$3.9M", "Bounties administered"],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="num text-lg font-semibold text-foreground">{v}</dt>
                <dd className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{l}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Recruitment operations · Terms · Privacy · Support
        </p>
      </aside>

      <main className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-[368px]">
          <div className="mb-7 flex items-center gap-2.5 lg:hidden">
            <BrandLockup />
            <span className="text-[13px] font-semibold tracking-tight text-foreground">
              Yuvro Marketplace
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-sunken px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            <ShieldCheck className="size-3.5" /> Account Manager Portal
          </span>
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
            Sign in to operations
          </h1>
          <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">
            Restricted access. Account Managers only.
          </p>

          <RoleMismatchBanner portal="am" className="mt-4" />

          <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
            <Field label="Work email">
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                required
                className={inputCls}
              />
            </Field>
            <Field label="Password">
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={inputCls}
              />
            </Field>

            {error ? (
              <p className="rounded-md border border-destructive/25 bg-danger-soft px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Checkbox defaultChecked /> Remember me
              </label>
              <Link
                to="/forgot-password"
                search={{ from: "/am/login" }}
                className="text-xs font-semibold text-brand hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Btn type="submit" variant="primary" disabled={pending} className="h-10 w-full">
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Sign In
            </Btn>
          </form>
        </div>
      </main>
    </div>
  );
}
