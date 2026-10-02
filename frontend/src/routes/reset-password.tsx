import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, CheckCircle2, Loader2, X } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import authService from "@/services/authService";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: (search.email as string) || "",
    token: (search.token as string) || "",
    uidb64: (search.uidb64 as string) || "",
    otp: (search.otp as string) || "",
    from: (search.from as string) || "/login",
  }),
  head: () => ({
    meta: [
      { title: "Set a New Password — Yuvro Marketplace" },
      {
        name: "description",
        content: "Choose a new password for your Yuvro marketplace account using your OTP verification code.",
      },
      { property: "og:title", content: "Set a New Password — Yuvro Marketplace" },
      {
        property: "og:description",
        content: "Choose a new password for your recruiter marketplace account.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

const rules = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "One number", test: (v: string) => /\d/.test(v) },
  { label: "One symbol", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

function ResetPasswordPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const email = (search.email || "").trim();
  const [otpCode, setOtpCode] = useState(search.otp || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email && !search.token && !search.uidb64) {
      navigate({
        to: "/forgot-password",
        search: { from: search.from || "/login" },
      });
    }
  }, [email, navigate, search.from, search.token, search.uidb64]);

  const valid = rules.every((r) => r.test(password)) && password === confirm;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!valid) return;

    if (!email || !email.includes("@")) {
      setError("Please provide a valid account email address.");
      return;
    }

    // Check if using OTP flow (default)
    const cleanOtp = otpCode.trim();
    if (cleanOtp.length > 0) {
      if (cleanOtp.length !== 6) {
        setError("Verification code must be exactly 6 digits.");
        return;
      }

      setError(null);
      setPending(true);

      try {
        await authService.resetPasswordWithOTP(email, cleanOtp, password);
        setDone(true);
      } catch (err: any) {
        setError(err?.message || "Invalid or expired verification code. Please request a new one.");
      } finally {
        setPending(false);
      }
      return;
    }

    // Fallback: Link-based token flow
    const uidb64 = search.uidb64 || "";
    const token = search.token || "";

    if (!uidb64 || !token) {
      setError("Please enter the 6-digit verification code sent to your email.");
      return;
    }

    setError(null);
    setPending(true);

    try {
      await authService.resetPassword(uidb64, token, password);
      setDone(true);
    } catch (err: any) {
      setError(err?.message || "Failed to reset password. The link or code may be expired.");
    } finally {
      setPending(false);
    }
  };

  if (done) {
    return (
      <AuthLayout
        title="Password updated"
        description="You can now sign in with your new password."
      >
        <div className="rounded-md border border-success/25 bg-success-soft p-4">
          <CheckCircle2 className="size-5 text-success" />
          <p className="mt-3 text-[13px] leading-5 text-foreground">
            Your password was changed successfully.
          </p>
        </div>
        <Link
          to={search.from || "/login"}
          className="mt-4 flex h-10 w-full items-center justify-center rounded-md bg-brand text-[13px] font-semibold text-brand-foreground hover:bg-brand/90"
        >
          Continue to sign in
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set a new password"
      description={
        email
          ? `Enter the 6-digit verification code sent to ${email}.`
          : "Enter your 6-digit verification code and choose a new password."
      }
      footer={
        <div className="flex items-center justify-between text-xs text-muted-foreground w-full">
          <Link
            to="/forgot-password"
            search={{ from: search.from || "/login", email }}
            className="text-brand hover:underline"
          >
            Request new code
          </Link>
          <Link
            to={search.from || "/login"}
            className="text-muted-foreground hover:text-foreground"
          >
            Back to sign in
          </Link>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="otp" className="text-xs font-medium text-muted-foreground">
            6-digit verification code
          </Label>
          <Input
            id="otp"
            type="text"
            required
            autoFocus
            maxLength={6}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
            className="h-10 tracking-[0.3em] font-mono text-center text-base font-semibold"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new" className="text-xs font-medium text-muted-foreground">
            New password
          </Label>
          <Input
            id="new"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm" className="text-xs font-medium text-muted-foreground">
            Confirm password
          </Label>
          <Input
            id="confirm"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="h-10"
          />
        </div>

        <ul className="space-y-1.5 rounded-md border border-border bg-surface p-3">
          {rules.map((r) => {
            const ok = r.test(password);
            return (
              <li key={r.label} className="flex items-center gap-2 text-xs">
                {ok ? (
                  <Check className="size-3.5 text-success" />
                ) : (
                  <X className="size-3.5 text-muted-foreground" />
                )}
                <span className={ok ? "text-foreground" : "text-muted-foreground"}>{r.label}</span>
              </li>
            );
          })}
          <li className="flex items-center gap-2 text-xs">
            {confirm && password === confirm ? (
              <Check className="size-3.5 text-success" />
            ) : (
              <X className="size-3.5 text-muted-foreground" />
            )}
            <span
              className={
                confirm && password === confirm ? "text-foreground" : "text-muted-foreground"
              }
            >
              Passwords match
            </span>
          </li>
        </ul>

        {error ? (
          <p className="rounded-md border border-destructive/25 bg-danger-soft px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!valid || pending}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand text-[13px] font-semibold text-brand-foreground transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Update password
        </button>
      </form>
    </AuthLayout>
  );
}
