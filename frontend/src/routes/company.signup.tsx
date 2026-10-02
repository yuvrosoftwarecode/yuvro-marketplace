import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Field } from "./signup";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth";
import authService from "@/services/authService";

export const Route = createFileRoute("/company/signup")({
  head: () => ({
    meta: [
      { title: "Create Company Account — Yuvro Marketplace" },
      { name: "description", content: "Create a Yuvro company account to post roles and review recruiter-submitted candidates." },
      { property: "og:title", content: "Create Company Account — Yuvro Marketplace" },
      { property: "og:description", content: "Hire through the Yuvro recruiter marketplace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompanySignUp,
});

function CompanySignUp() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [terms, setTerms] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const companyName = String(data.get("companyName") ?? "").trim();
    const firstName = String(data.get("firstName") ?? "").trim();
    const lastName = String(data.get("lastName") ?? "").trim();

    if (!email.includes("@")) {
      setError("Enter a valid work email address.");
      return;
    }
    if (!terms) {
      setError("Accept the Terms to continue.");
      return;
    }

    setError(null);
    setPending(true);

    try {
      const response = await authService.register({
        email,
        password: password || "Password123!",
        first_name: firstName,
        last_name: lastName,
        role: "recruiter_company_manager",
        roles: { company_name: companyName },
      } as any);

      login(response.user, response.access);
      navigate({ to: "/company" as any });
    } catch {
      // Mock / prototype fallback matching reference UI
      const mockCompanyUser = {
        id: "comp-" + Date.now(),
        email,
        username: email.split("@")[0],
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim() || companyName || "Hiring Manager",
        role: "recruiter_company_manager",
        roles: { marketplace: "recruiter_company_manager", company_name: companyName },
        is_active: true,
      };
      login(mockCompanyUser as any, "mock-company-token");
      navigate({ to: "/company" as any });
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthLayout
      title="Create your company account"
      description="An Account Manager will reach out to set up your first role."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/company/login" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field id="companyName" label="Company name" autoComplete="organization" />
        <div className="grid grid-cols-2 gap-3">
          <Field id="firstName" label="First name" autoComplete="given-name" />
          <Field id="lastName" label="Last name" autoComplete="family-name" />
        </div>
        <Field id="email" label="Work email" type="email" autoComplete="email" />
        <Field id="password" label="Password" type="password" autoComplete="new-password" hint="At least 10 characters." />
        <label className="flex items-start gap-2.5 border-t border-border pt-4 text-[13px] leading-5 text-muted-foreground">
          <Checkbox checked={terms} onCheckedChange={(v) => setTerms(Boolean(v))} className="mt-0.5" />
          <span>I agree to the Marketplace Terms and Privacy Policy.</span>
        </label>
        {error ? (
          <p className="rounded-md border border-destructive/25 bg-danger-soft px-3 py-2 text-xs text-destructive">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand text-[13px] font-semibold text-brand-foreground transition-colors hover:bg-brand/90 disabled:opacity-70"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Create company account
        </button>
      </form>
    </AuthLayout>
  );
}
