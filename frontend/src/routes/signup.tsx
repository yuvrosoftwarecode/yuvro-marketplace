import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AuthDivider, AuthLayout, SocialAuthButtons } from "@/components/auth/auth-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth";
import authService from "@/services/authService";
import { restApiAuthUtil } from "@/utils/RestApiAuthUtil";


export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create Recruiter Account — Recruiter OS" },
      {
        name: "description",
        content:
          "Create a recruiter account to browse marketplace roles, submit candidates and earn published placement bounties.",
      },
      { property: "og:title", content: "Create Recruiter Account — Recruiter OS" },
      {
        property: "og:description",
        content:
          "Join the recruiter marketplace: approved roles, transparent bounties, live pipelines.",
      },
    ],
  }),
  component: SignUpPage,
});

export function Field({
  id,
  label,
  type = "text",
  autoComplete,
  hint,
  required = false,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="h-10"
      />
      {hint ? <p className="text-[11px] leading-4 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SignUpPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!terms || !privacy) {
      setError("Accept the Terms and Privacy Policy to continue.");
      return;
    }

    const data = new FormData(e.currentTarget);
    const firstName = String(data.get("firstName") || "").trim();
    const lastName = String(data.get("lastName") || "").trim();
    const email = String(data.get("email") || "").trim();
    const linkedin = String(data.get("linkedin") || "").trim();
    const password = String(data.get("password") || "");
    const confirmPassword = String(data.get("confirmPassword") || "");

    if (!firstName || !lastName) {
      setError("Enter your first and last name.");
      return;
    }

    if (!email || !email.includes("@")) {
      setError("Enter a valid work email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setPending(true);

    try {
      const response = await authService.register({
        email,
        password,
        password_confirm: confirmPassword,
        first_name: firstName,
        last_name: lastName,
        role: "recruiter_freelancer",
        roles: { linkedin },
      } as any);

      // Recruiter account is strictly inactive and not applied until application is reviewed & approved
      const recruiterUser = {
        ...response.user,
        role: "recruiter_freelancer",
        is_active: false,
        is_applied: false,
      };

      login(recruiterUser, response.access);

      if (linkedin) {
        try {
          sessionStorage.setItem("signup_linkedin", linkedin);
        } catch {}
      }

      // Always route to application form
      navigate({ to: "/application" as any });

    } catch (err: any) {
      let msg = err?.message || "Registration failed. Please check your information.";
      if (
        msg.toLowerCase().includes("username already exists") ||
        msg.toLowerCase().includes("email already exists")
      ) {
        msg = "An account with this email address already exists. Please sign in instead.";
      }
      setError(msg);
    } finally {
      setPending(false);
    }
  };


  return (
    <AuthLayout
      title="Create your Yuvro account"
      description="Start with your basics — you'll submit your recruiter application after signing in."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <Field id="firstName" label="First name *" autoComplete="given-name" required />
          <Field id="lastName" label="Last name *" autoComplete="family-name" required />
        </div>
        <Field id="email" label="Email address *" type="email" autoComplete="email" required />
        <div className="space-y-1.5">
          <Label htmlFor="linkedin" className="text-xs font-medium text-muted-foreground">
            LinkedIn profile URL
          </Label>
          <Input
            id="linkedin"
            name="linkedin"
            type="url"
            placeholder="https://www.linkedin.com/in/your-profile"
            className="h-10"
          />
        </div>
        <Field
          id="password"
          label="Password *"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          required
        />
        <Field
          id="confirmPassword"
          label="Confirm password *"
          type="password"
          autoComplete="new-password"
          required
        />

        <div className="space-y-2 border-t border-border pt-4">
          <label className="flex items-start gap-2.5 text-[13px] leading-5 text-muted-foreground">
            <Checkbox
              checked={terms}
              onCheckedChange={(v) => setTerms(Boolean(v))}
              className="mt-0.5"
            />
            <span>
              I agree to the <span className="font-semibold text-foreground">Marketplace Terms</span>, including
              placement fee and payout conditions.
            </span>
          </label>
          <label className="flex items-start gap-2.5 text-[13px] leading-5 text-muted-foreground">
            <Checkbox
              checked={privacy}
              onCheckedChange={(v) => setPrivacy(Boolean(v))}
              className="mt-0.5"
            />
            <span>
              I agree to the <span className="font-semibold text-foreground">Privacy Policy</span>{" "}
              and candidate data handling requirements.
            </span>
          </label>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/25 bg-danger-soft px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand text-[13px] font-semibold text-brand-foreground transition-colors hover:bg-brand/90 disabled:opacity-70"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Create Account
        </button>
      </form>

      <AuthDivider />
      <SocialAuthButtons verb="Sign up" />
    </AuthLayout>
  );
}
