import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import authService from "@/services/authService";

export const Route = createFileRoute("/forgot-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    from: (search.from as string) || "/login",
    email: (search.email as string) || "",
  }),
  head: () => ({
    meta: [
      { title: "Reset Password with OTP — Yuvro Marketplace" },
      {
        name: "description",
        content: "Request a 6-digit verification code to reset your Yuvro marketplace account password.",
      },
      { property: "og:title", content: "Reset Password with OTP — Yuvro Marketplace" },
      {
        property: "og:description",
        content: "Request a 6-digit verification code to reset your account password.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const search = Route.useSearch();
  const from = search.from || "/login";
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState(search.email || "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid work email address.");
      return;
    }

    setError(null);
    setPending(true);

    try {
      await authService.sendResetPasswordOTP(email);
      setSent(true);
    } catch (err: any) {
      setError(err?.message || "Failed to send verification code. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthLayout
      title={sent ? "Check your email" : "Reset your password"}
      description={
        sent
          ? "We sent a 6-digit verification code to your email."
          : "Enter your account email to receive a 6-digit verification code."
      }
      footer={
        <Link to={from || "/login"} className="font-semibold text-brand hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-3">
          <div className="rounded-md border border-border bg-surface p-4 text-[13px] leading-5 text-foreground">
            A 6-digit verification code has been sent to <span className="font-semibold">{email || "your email"}</span>. It is valid for 10 minutes.
          </div>
          <Link
            to="/reset-password"
            search={{ email, from }}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand text-[13px] font-semibold text-brand-foreground hover:bg-brand/90"
          >
            Enter Code & Reset Password &rarr;
          </Link>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="h-10 w-full rounded-md border border-border bg-surface text-[13px] font-semibold text-foreground hover:bg-surface-sunken"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
              Work email
            </Label>

            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="h-10"
            />
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/25 bg-danger-soft px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand text-[13px] font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-70"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Send verification code
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
