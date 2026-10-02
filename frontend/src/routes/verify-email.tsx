import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/verify-email")({
  head: () => ({
    meta: [
      { title: "Verify Your Email — Recruiter OS" },
      {
        name: "description",
        content:
          "Confirm your recruiter email address to activate marketplace access and job applications.",
      },
      { property: "og:title", content: "Verify Your Email — Recruiter OS" },
      {
        property: "og:description",
        content: "Confirm your recruiter email to activate marketplace access.",
      },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const [email, setEmail] = useState("alex@morgantalent.com");
  const [editing, setEditing] = useState(false);
  const [resent, setResent] = useState(false);

  return (
    <AuthLayout title="Verify your email" description="We sent a verification link to your inbox.">
      <div className="rounded-md border border-border bg-surface p-4">
        <MailCheck className="size-5 text-brand" />
        <p className="mt-3 text-[13px] leading-5 text-foreground">
          Verification link sent to <span className="font-semibold">{email}</span>
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          The link expires in 30 minutes. Check spam if it has not arrived within two minutes.
        </p>
      </div>

      {editing ? (
        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            setEditing(false);
            setResent(true);
          }}
        >
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="h-10"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="h-9 flex-1 rounded-md bg-brand text-[13px] font-semibold text-brand-foreground hover:bg-brand/90"
            >
              Save and resend
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="h-9 rounded-md border border-border px-3 text-[13px] font-semibold text-foreground hover:bg-surface-sunken"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => setResent(true)}
            className="h-10 w-full rounded-md border border-border bg-surface text-[13px] font-semibold text-foreground transition-colors hover:bg-surface-sunken"
          >
            Resend verification email
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="h-10 w-full rounded-md text-[13px] font-semibold text-brand transition-colors hover:bg-brand-soft"
          >
            Change email address
          </button>
        </div>
      )}

      {resent ? (
        <p className="mt-3 rounded-md border border-success/25 bg-success-soft px-3 py-2 text-xs text-success">
          Verification email sent. You can request another in 60 seconds.
        </p>
      ) : null}

      <p className="mt-6 text-[13px] text-muted-foreground">
        Already verified?{" "}
        <Link to="/onboarding" className="font-semibold text-brand hover:underline">
          Continue to setup
        </Link>
      </p>
    </AuthLayout>
  );
}
