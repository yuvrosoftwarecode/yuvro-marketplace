import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AuthDivider, AuthLayout, SocialAuthButtons } from "@/components/auth/auth-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth";
import authService from "@/services/authService";
import { restApiAuthUtil } from "@/utils/RestApiAuthUtil";
import { api } from "@/lib/api";
import { extractLinkedInHandle } from "@/lib/recruiter-application";


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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Field states for real-time validation
  const [linkedinVal, setLinkedinVal] = useState("");
  const [linkedinError, setLinkedinError] = useState<string | null>(null);
  const [linkedinChecking, setLinkedinChecking] = useState(false);
  const [linkedinValid, setLinkedinValid] = useState(false);

  // Real-time LinkedIn verification function
  const checkLinkedinLive = async (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      setLinkedinError(null);
      setLinkedinValid(false);
      setLinkedinChecking(false);
      return;
    }

    const handle = extractLinkedInHandle(trimmed);
    if (!handle) {
      setLinkedinError("Enter a valid LinkedIn profile URL (e.g. https://www.linkedin.com/in/username).");
      setLinkedinValid(false);
      setLinkedinChecking(false);
      return;
    }

    setLinkedinChecking(true);
    setLinkedinError(null);
    try {
      const check = await api.get<{ is_duplicate?: boolean; message?: string }>(
        `/api/marketplace/recruiter-applications/check-linkedin/?linkedin=${encodeURIComponent(trimmed)}`
      );
      if (check?.is_duplicate) {
        setLinkedinError(check.message || "A recruiter with this LinkedIn profile already exists.");
        setLinkedinValid(false);
      } else {
        setLinkedinError(null);
        setLinkedinValid(true);
      }
    } catch {
      // Network issue: do not block entry prematurely
      setLinkedinError(null);
    } finally {
      setLinkedinChecking(false);
    }
  };

  // Real-time debounced check as soon as user types or pastes
  useEffect(() => {
    const trimmed = linkedinVal.trim();
    if (!trimmed) {
      setLinkedinError(null);
      setLinkedinValid(false);
      setLinkedinChecking(false);
      return;
    }

    const timer = setTimeout(() => {
      checkLinkedinLive(trimmed);
    }, 450);

    return () => clearTimeout(timer);
  }, [linkedinVal]);

  const handleLinkedinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLinkedinVal(val);
    setLinkedinValid(false);
    if (linkedinError) setLinkedinError(null);
    if (error) setError(null);
  };

  const handleLinkedinBlur = () => {
    if (linkedinVal.trim()) {
      checkLinkedinLive(linkedinVal);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const data = new FormData(e.currentTarget);
    const firstName = String(data.get("firstName") || "").trim();
    const lastName = String(data.get("lastName") || "").trim();
    const email = String(data.get("email") || "").trim();
    const linkedin = linkedinVal.trim();
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

    if (!linkedin) {
      setLinkedinError("Enter your LinkedIn profile URL.");
      return;
    }

    if (!extractLinkedInHandle(linkedin)) {
      setLinkedinError("Please enter a valid LinkedIn profile URL (e.g. https://www.linkedin.com/in/username).");
      return;
    }

    if (linkedinError) {
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

    // Final sanity check before submission
    try {
      const check = await api.get<{ is_duplicate?: boolean; message?: string }>(
        `/api/marketplace/recruiter-applications/check-linkedin/?linkedin=${encodeURIComponent(linkedin)}`
      );
      if (check?.is_duplicate) {
        setLinkedinError(check.message || "A recruiter with this LinkedIn profile already exists.");
        setPending(false);
        return;
      }
    } catch {
      // Continue to register if check endpoint has network issue
    }

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
          <div className="flex items-center justify-between">
            <Label htmlFor="linkedin" className="text-xs font-medium text-muted-foreground">
              LinkedIn profile URL *
            </Label>
            {linkedinChecking ? (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Checking...
              </span>
            ) : null}
          </div>
          <div className="relative">
            <Input
              id="linkedin"
              name="linkedin"
              type="url"
              value={linkedinVal}
              onChange={handleLinkedinChange}
              onBlur={handleLinkedinBlur}
              placeholder="https://www.linkedin.com/in/your-profile"
              className={`h-10 pr-9 ${
                linkedinError
                  ? "border-destructive focus-visible:ring-destructive/30"
                  : linkedinValid
                  ? "border-emerald-500 focus-visible:ring-emerald-500/30"
                  : ""
              }`}
              required
            />
            {linkedinChecking ? (
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : linkedinValid ? (
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-emerald-600">
                <svg className="size-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            ) : null}
          </div>
          {linkedinError ? (
            <p className="text-[12px] font-medium text-destructive">
              {linkedinError}
            </p>
          ) : (
            <p className="text-[11px] leading-4 text-muted-foreground">
              We check for existing recruiter registrations with this profile.
            </p>
          )}
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

        <p className="border-t border-border pt-3 text-[12px] leading-relaxed text-muted-foreground">
          By creating an account, you agree to the{" "}
          <span className="font-semibold text-foreground">Marketplace Terms</span> and{" "}
          <span className="font-semibold text-foreground">Privacy Policy</span>.
        </p>

        {error ? (
          <p className="rounded-md border border-destructive/25 bg-danger-soft px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || Boolean(linkedinError) || linkedinChecking}
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
