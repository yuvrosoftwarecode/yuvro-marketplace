import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Camera, Check } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAuth, getUserDisplayName } from "@/lib/auth";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Recruiter Profile Setup — Recruiter OS" },
      {
        name: "description",
        content:
          "Set your specialties, experience, time zone and notification preferences to start working roles.",
      },
      { property: "og:title", content: "Recruiter Profile Setup — Recruiter OS" },
      {
        property: "og:description",
        content: "Lightweight setup: specialties, experience, time zone, notifications.",
      },
    ],
  }),
  component: OnboardingPage,
});

const specialties = [
  "Engineering",
  "AI / ML",
  "Product",
  "Design",
  "Go-to-market",
  "Finance",
  "Clinical",
  "Executive",
];

function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const recruiterName = getUserDisplayName(user, "Alex Morgan");
  const [picked, setPicked] = useState<string[]>(["Engineering", "AI / ML"]);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyStage, setNotifyStage] = useState(true);
  const [notifyDigest, setNotifyDigest] = useState(false);

  return (
    <AuthLayout
      aside={false}
      title="Finish your recruiter profile"
      description="Four fields now — everything else can wait until you are working a role."
    >
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ to: "/dashboard" });
        }}
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="grid size-16 shrink-0 place-items-center rounded-full border border-dashed border-border-strong bg-surface text-muted-foreground transition-colors hover:bg-surface-sunken"
            aria-label="Upload profile photo"
          >
            <Camera className="size-5" />
          </button>
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">
              Recruiter name
            </Label>
            <Input id="name" defaultValue={recruiterName} key={recruiterName} className="h-10" />
          </div>
        </div>

        <div>
          <p className="label-caps">Recruiting specialties</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {specialties.map((s) => {
              const on = picked.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPicked((p) => (on ? p.filter((x) => x !== s) : [...p, s]))}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] font-medium transition-colors",
                    on
                      ? "border-brand/30 bg-brand-soft text-brand"
                      : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground",
                  )}
                >
                  {on ? <Check className="size-3.5" /> : null}
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="years" className="text-xs font-medium text-muted-foreground">
              Years of experience
            </Label>
            <select
              id="years"
              defaultValue="8–12 years"
              className="h-10 w-full rounded-md border border-input bg-surface px-3 text-[13px] outline-none focus-visible:ring-[3px] focus-visible:ring-brand/20"
            >
              {["0–2 years", "3–5 years", "6–7 years", "8–12 years", "12+ years"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tz" className="text-xs font-medium text-muted-foreground">
              Time zone
            </Label>
            <select
              id="tz"
              defaultValue="America/Los_Angeles (PT)"
              className="h-10 w-full rounded-md border border-input bg-surface px-3 text-[13px] outline-none focus-visible:ring-[3px] focus-visible:ring-brand/20"
            >
              {[
                "America/Los_Angeles (PT)",
                "America/New_York (ET)",
                "Europe/London (GMT)",
                "Asia/Kolkata (IST)",
                "Asia/Singapore (SGT)",
              ].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="agency" className="text-xs font-medium text-muted-foreground">
            Agency <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input id="agency" placeholder="Morgan Talent Partners" className="h-10" />
        </div>

        <div className="rounded-md border border-border bg-surface">
          <p className="label-caps border-b border-border px-4 py-2.5">Notification preferences</p>
          {[
            {
              label: "Client messages",
              desc: "Email me when a client replies",
              v: notifyEmail,
              set: setNotifyEmail,
            },
            {
              label: "Stage changes",
              desc: "Notify me when a candidate advances or is rejected",
              v: notifyStage,
              set: setNotifyStage,
            },
            {
              label: "Weekly digest",
              desc: "New marketplace roles matching my specialties",
              v: notifyDigest,
              set: setNotifyDigest,
            },
          ].map((n) => (
            <label
              key={n.label}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-4 py-3 last:border-0"
            >
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-foreground">{n.label}</span>
                <span className="block text-xs text-muted-foreground">{n.desc}</span>
              </span>
              <Switch checked={n.v} onCheckedChange={n.set} />
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="h-10 flex-1 rounded-md bg-brand text-[13px] font-semibold text-brand-foreground hover:bg-brand/90"
          >
            Finish setup
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            className="h-10 rounded-md border border-border px-4 text-[13px] font-semibold text-foreground hover:bg-surface-sunken"
          >
            Skip for now
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
