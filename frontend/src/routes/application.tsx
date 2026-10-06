import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, getUserDisplayName } from "@/lib/auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  countries,
  countryDialCodes,
  emptyDraft,
  extractLinkedInHandle,
  getDraft,
  getStatus,
  isLinkedIn,
  roleOptions,
  saveDraft,
  setStatus,
  clearDraft,
  type ApplicationDraft,
} from "@/lib/recruiter-application";

export const Route = createFileRoute("/application")({
  head: () => ({
    meta: [
      { title: "Recruiter Application — Yuvro" },
      {
        name: "description",
        content:
          "Apply to join the Yuvro recruiter network: experience, specialization and hiring references.",
      },
      { property: "og:title", content: "Recruiter Application — Yuvro" },
      {
        property: "og:description",
        content:
          "Tell us about your recruiting experience and the talent you specialize in.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApplicationPage,
});

const steps = ["Experience", "Specialization", "Hiring References"];

function Q({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[13px] font-semibold text-foreground">{label}</Label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {children}
    </div>
  );
}

function ApplicationPage() {
  const { user, isAuthenticated, isLoading, isAccountManager, logout, updateUser } =
    useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [d, setD] = useState<ApplicationDraft>(emptyDraft());
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  // Instant LinkedIn duplicate checking states
  const [linkedinFieldChecking, setLinkedinFieldChecking] = useState(false);
  const [linkedinFieldError, setLinkedinFieldError] = useState<string | null>(null);
  const [linkedinFieldValid, setLinkedinFieldValid] = useState(false);

  const isApproved = user?.is_active === true;
  const isPending =
    user?.is_active === false &&
    (user?.is_applied || getStatus() === "pending_review");

  // Real-time duplicate check for recruiter LinkedIn
  const checkRecruiterLinkedinLive = async (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      setLinkedinFieldError(null);
      setLinkedinFieldValid(false);
      setLinkedinFieldChecking(false);
      return;
    }

    const handle = extractLinkedInHandle(trimmed);
    if (!handle) {
      setLinkedinFieldError("Only LinkedIn profile URLs (e.g. linkedin.com/in/username) are accepted.");
      setLinkedinFieldValid(false);
      setLinkedinFieldChecking(false);
      return;
    }

    setLinkedinFieldChecking(true);
    setLinkedinFieldError(null);
    try {
      const res = await api.get<{ is_duplicate?: boolean; message?: string }>(
        `/api/marketplace/recruiter-applications/check-linkedin/?linkedin=${encodeURIComponent(trimmed)}`
      );
      if (res?.is_duplicate) {
        setLinkedinFieldError(res.message || "A recruiter with this LinkedIn profile already exists.");
        setLinkedinFieldValid(false);
      } else {
        setLinkedinFieldError(null);
        setLinkedinFieldValid(true);
      }
    } catch {
      setLinkedinFieldError(null);
    } finally {
      setLinkedinFieldChecking(false);
    }
  };

  // Real-time debounced check as soon as user enters recruiter LinkedIn URL
  useEffect(() => {
    const trimmed = d.linkedin?.trim() || "";
    if (!trimmed) {
      setLinkedinFieldError(null);
      setLinkedinFieldValid(false);
      setLinkedinFieldChecking(false);
      return;
    }

    const timer = setTimeout(() => {
      checkRecruiterLinkedinLive(trimmed);
    }, 450);

    return () => clearTimeout(timer);
  }, [d.linkedin]);

  // Load existing application draft or status
  const checkApplicationStatus = async (manual = false) => {
    if (manual) setChecking(true);
    try {
      const res = await api.get<any>("/api/marketplace/recruiter-applications/me/");
      if (res && res.applied) {
        setStatus("pending_review");
        if (user && !user.is_applied) {
          updateUser({ ...user, is_applied: true });
        }
      }

      // Check live user active status from backend
      const localMe = await api.get<any>("/api/auth/me/");
      if (localMe && user) {
        const updated = {
          ...user,
          is_active: Boolean(localMe.is_active),
          is_applied: Boolean(localMe.is_applied),
        };
        updateUser(updated);
        if (localMe.is_active) {
          setStatus("approved");
          if (manual) {
            toast.success("Congratulations! Your recruiter account has been approved.");
          }
        } else if (manual) {
          toast.info("Your application is currently under review by our team.");
        }
      }
    } catch (err) {
      if (manual) {
        toast.error("Could not refresh status. Please try again.");
      }
    } finally {
      if (manual) setChecking(false);
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate({ to: "/login" });
        return;
      }
      if (isAccountManager) {
        navigate({ to: "/am" });
        return;
      }
      setD(getDraft());
      checkApplicationStatus();
    }
  }, [isAuthenticated, isLoading, isAccountManager]);

  const set = (p: Partial<ApplicationDraft>) => {
    const n = { ...d, ...p };
    setD(n);
    saveDraft(n);
  };

  const filteredCountries = useMemo(
    () =>
      countries.filter(
        (c) =>
          !d.countries.includes(c) && c.toLowerCase().includes(q.toLowerCase()),
      ),
    [q, d.countries],
  );

  useEffect(() => {
    if (!d.linkedin) {
      let link = user?.roles?.linkedin || (user as any)?.linkedin || "";
      if (!link && typeof window !== "undefined") {
        try {
          link = sessionStorage.getItem("signup_linkedin") || "";
        } catch {}
      }
      if (link) {
        set({ linkedin: link });
      }
    }
  }, [user, d.linkedin]);

  const recruiterLinkedin = d.linkedin?.trim() || "";

  const recruiterHandle = useMemo(() => {
    return recruiterLinkedin ? extractLinkedInHandle(recruiterLinkedin) : null;
  }, [recruiterLinkedin]);

  const refErrors = useMemo(() => {
    const errors: (string | null)[] = [null, null, null];
    const handles: (string | null)[] = [null, null, null];

    for (let i = 0; i < 3; i++) {
      const val = d.refs[i]?.trim();
      if (!val) continue;

      const handle = extractLinkedInHandle(val);
      if (!handle) {
        errors[i] = "Only LinkedIn profile URLs (e.g. linkedin.com/in/username) are accepted.";
        continue;
      }

      if (recruiterHandle && handle === recruiterHandle) {
        errors[i] = "Reference cannot be your own LinkedIn profile.";
        continue;
      }

      let dupIndex = -1;
      for (let prev = 0; prev < i; prev++) {
        if (handles[prev] && handles[prev] === handle) {
          dupIndex = prev;
          break;
        }
      }
      if (dupIndex !== -1) {
        errors[i] = `Duplicate reference: Already entered as Candidate ${dupIndex + 1}.`;
        continue;
      }

      handles[i] = handle;
    }

    // Bidirectional duplicate check
    for (let i = 0; i < 3; i++) {
      if (errors[i] || !handles[i]) continue;
      for (let other = 0; other < 3; other++) {
        if (other !== i && handles[other] && handles[other] === handles[i]) {
          errors[i] = `Duplicate reference: Matches Candidate ${other + 1}.`;
          break;
        }
      }
    }

    return errors;
  }, [d.refs, recruiterHandle]);

  // 1. Account Approved State
  if (isApproved) {
    return (
      <AuthLayout aside={false} title="Account Approved & Active">
        <div className="space-y-6 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-success-soft text-success">
            <ShieldCheck className="size-7" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Welcome to the Yuvro Recruiter Network!
            </h2>
            <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">
              Your application has been verified and approved by the Account Management team. You now have full access to marketplace jobs, candidate submissions, and bounties.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-5 text-[13px] font-semibold text-brand-foreground hover:bg-brand/90"
            >
              Go to Dashboard <ArrowRight className="size-4" />
            </button>
            <button
              onClick={() => navigate({ to: "/jobs" })}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-5 text-[13px] font-semibold text-foreground hover:bg-surface-sunken"
            >
              <Briefcase className="size-4" /> Browse Jobs
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // 2. Under Review State (when recruiter is inactive and has applied)
  if (isPending) {
    return (
      <AuthLayout aside={false} title="Application Submitted">
        <div className="space-y-5">
          <p className="text-[13px] leading-6 text-muted-foreground">
            Thanks for applying to join the Yuvro recruiter network. Your application is now under review.
          </p>
          <div className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3">
            <span className="text-xs text-muted-foreground">Status</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning">
              <span className="size-1.5 rounded-full bg-warning" /> Pending Review
            </span>
          </div>
          <p className="text-[13px] text-muted-foreground">
            We'll notify you once your application has been reviewed.
          </p>
          <div className="flex flex-col gap-2 pt-3">
            <button
              onClick={() => checkApplicationStatus(true)}
              disabled={checking}
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-surface text-[13px] font-semibold text-foreground hover:bg-surface-sunken disabled:opacity-50"
            >
              <RefreshCw className={cn("size-4", checking && "animate-spin text-brand")} />
              {checking ? "Checking status..." : "Check Status"}
            </button>
            <button
              onClick={() => logout()}
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md text-[13px] font-semibold text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // Initial loading indicator
  if (loadingInitial && isLoading) {
    return (
      <AuthLayout aside={false} title="Recruiter Application">
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-brand" />
        </div>
      </AuthLayout>
    );
  }

  // Validation per step
  const validate = () => {
    if (step === 0) {
      if (!d.phoneNumber.trim() || d.phoneNumber.replace(/\D/g, "").length < 5) {
        return "Enter a valid phone number.";
      }
      if (!d.linkedin || !d.linkedin.trim()) {
        return "LinkedIn profile URL is required.";
      }
      if (!extractLinkedInHandle(d.linkedin.trim())) {
        return "Please enter a valid LinkedIn profile URL (e.g. https://www.linkedin.com/in/username).";
      }
      if (linkedinFieldError) {
        return linkedinFieldError;
      }
      if (!d.years) {
        return "Select your years of recruitment experience.";
      }
      if (!d.startup) {
        return "Tell us whether you have hired for early-stage startups.";
      }
      if (d.startup === "yes" && !d.startupDetail.trim()) {
        return "Describe your early-stage startup hiring experience.";
      }
      if (d.countries.length === 0) {
        return "Select at least one hiring country.";
      }
    }
    if (step === 1) {
      if (d.roles.length !== 3) {
        return "Select exactly 3 roles.";
      }
      if (!d.tools.trim()) {
        return "Tell us which sourcing tools you use.";
      }
    }
    if (step === 2) {
      const ref0 = d.refs[0]?.trim();
      const ref1 = d.refs[1]?.trim();
      const ref2 = d.refs[2]?.trim();

      if (!ref0) {
        return "Candidate 1 LinkedIn profile is required.";
      }
      if (!ref1) {
        return "Candidate 2 LinkedIn profile is required.";
      }

      const activeErr = refErrors.find((e) => e !== null);
      if (activeErr) {
        return activeErr;
      }

      const handle0 = extractLinkedInHandle(ref0);
      const handle1 = extractLinkedInHandle(ref1);

      if (!handle0) {
        return "Candidate 1 must be a valid LinkedIn profile URL.";
      }
      if (!handle1) {
        return "Candidate 2 must be a valid LinkedIn profile URL.";
      }
      if (handle0 === handle1) {
        return "Candidate 1 and Candidate 2 cannot be the same LinkedIn profile.";
      }
      if (recruiterHandle && (handle0 === recruiterHandle || handle1 === recruiterHandle)) {
        return "Candidate references cannot be your own LinkedIn profile.";
      }

      if (ref2) {
        const handle2 = extractLinkedInHandle(ref2);
        if (!handle2) {
          return "Candidate 3 must be a valid LinkedIn profile URL or left empty.";
        }
        if (handle2 === handle0 || handle2 === handle1) {
          return "Candidate 3 cannot be a duplicate of Candidate 1 or Candidate 2.";
        }
        if (recruiterHandle && handle2 === recruiterHandle) {
          return "Candidate 3 cannot be your own LinkedIn profile.";
        }
      }
    }
    return null;
  };

  const handleNext = async () => {
    const err = validate();
    setError(err);
    if (err) return;

    if (step === 0) {
      // Check duplicate recruiter LinkedIn with backend
      try {
        setChecking(true);
        const res = await api.get<{ is_duplicate?: boolean; message?: string }>(
          `/api/marketplace/recruiter-applications/check-linkedin/?linkedin=${encodeURIComponent(d.linkedin.trim())}`
        );
        if (res?.is_duplicate) {
          setError(res.message || "A recruiter with this LinkedIn profile already exists.");
          return;
        }
      } catch (e: any) {
        console.warn("LinkedIn duplicate check error:", e);
      } finally {
        setChecking(false);
      }
    }

    if (step < 2) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Submit Application at Step 2
    try {
      setSubmitting(true);
      setError(null);

      const candidateRefs = d.refs.map((r) => r.trim()).filter(Boolean);

      const payload = {
        name: getUserDisplayName(user, "Recruiter"),
        email: user?.email || "",
        phone: `${d.phoneCountryCode} ${d.phoneNumber.trim()}`.trim(),
        linkedin: recruiterLinkedin,
        experience_years: d.years,
        top_roles: d.roles,
        early_stage_startup_hiring: d.startup === "yes",
        startup_hiring_detail: d.startup === "yes" ? d.startupDetail.trim() : "",
        hiring_geography: d.countries.join(", "),
        sourcing_tools: d.tools.trim(),
        hiring_references: candidateRefs,
      };

      await api.post("/api/marketplace/recruiter-applications/", payload);

      setStatus("pending_review");
      clearDraft();
      if (user) {
        updateUser({ ...user, is_applied: true });
      }
      toast.success("Application submitted successfully!");
    } catch (apiErr: any) {
      const fieldMsg =
        apiErr?.linkedin?.[0] ||
        apiErr?.data?.linkedin?.[0] ||
        apiErr?.response?.data?.linkedin?.[0];
      setError(
        fieldMsg ||
          apiErr?.message ||
          apiErr?.detail ||
          "Failed to submit application. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      aside={false}
      title={step === 2 ? "Share your recent hiring experience" : "Recruiter Application"}
      description={
        step === 2
          ? "Share LinkedIn profiles of candidates you recently helped hire."
          : "Tell us about your recruiting experience and the types of talent you specialize in."
      }
    >
      {/* 3 Step Stepper */}
      <ol className="mb-6 grid grid-cols-3 gap-2">
        {steps.map((s, i) => (
          <li
            key={s}
            className={cn("border-t-2 pt-2", i <= step ? "border-brand" : "border-border")}
          >
            <span
              className={cn(
                "num text-[11px] font-semibold",
                i <= step ? "text-brand" : "text-muted-foreground",
              )}
            >
              0{i + 1}
            </span>
            <span
              className={cn(
                "block text-xs font-medium",
                i === step ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {s}
            </span>
          </li>
        ))}
      </ol>

      <div className="space-y-5">
        {/* Step 0: Experience */}
        {step === 0 ? (
          <>
            <Q label="Contact number *">
              <div className="flex gap-2">
                {/* Country code dropdown */}
                <select
                  value={d.phoneCountryIso}
                  onChange={(e) => {
                    const selected = countryDialCodes.find((c) => c.iso === e.target.value);
                    if (selected) {
                      set({
                        phoneCountryCode: selected.code,
                        phoneCountryIso: selected.iso,
                      });
                    }
                  }}
                  className="h-10 w-[200px] shrink-0 rounded-md border border-input bg-surface px-2 text-[13px] outline-none focus-visible:ring-[3px] focus-visible:ring-brand/20"
                  aria-label="Country code"
                >
                  {countryDialCodes.map((c) => (
                    <option key={`${c.iso}-${c.code}`} value={c.iso}>
                      {c.flag} {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                {/* Phone number input */}
                <Input
                  type="tel"
                  value={d.phoneNumber}
                  onChange={(e) => set({ phoneNumber: e.target.value })}
                  placeholder="555 010 2020"
                  className="h-10 flex-1"
                />
              </div>
            </Q>
            <Q
              label="LinkedIn profile URL *"
              hint="Your personal LinkedIn profile link (e.g. https://www.linkedin.com/in/username)"
            >
              <div className="relative">
                <Input
                  type="url"
                  value={d.linkedin}
                  onChange={(e) => {
                    const val = e.target.value;
                    set({ linkedin: val });
                    setLinkedinFieldValid(false);
                    if (linkedinFieldError) setLinkedinFieldError(null);
                    if (error) setError(null);
                  }}
                  onBlur={() => {
                    if (d.linkedin?.trim()) {
                      checkRecruiterLinkedinLive(d.linkedin);
                    }
                  }}
                  placeholder="https://www.linkedin.com/in/your-profile"
                  className={`h-10 pr-9 ${
                    linkedinFieldError
                      ? "border-destructive focus-visible:ring-destructive/30"
                      : linkedinFieldValid
                      ? "border-emerald-500 focus-visible:ring-emerald-500/30"
                      : ""
                  }`}
                />
                {linkedinFieldChecking ? (
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                ) : linkedinFieldValid ? (
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-emerald-600">
                    <svg className="size-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : null}
              </div>
              {linkedinFieldError ? (
                <p className="mt-1 text-[12px] font-medium text-destructive">
                  {linkedinFieldError}
                </p>
              ) : null}
            </Q>
            <Q
              label="Recruitment experience *"
              hint="How many years of experience do you have in recruitment?"
            >
              <select
                value={d.years}
                onChange={(e) => set({ years: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-surface px-3 text-[13px] outline-none focus-visible:ring-[3px] focus-visible:ring-brand/20"
              >
                <option value="">Select</option>
                {[
                  "Less than 1 year",
                  "1–2 years",
                  "3–5 years",
                  "6–10 years",
                  "10+ years",
                ].map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Q>
            <Q
              label="Early-stage startup hiring *"
              hint="Have you hired for early-stage startups?"
            >
              <div className="flex gap-2">
                {(["yes", "no"] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => set({ startup: o })}
                    className={cn(
                      "h-9 flex-1 rounded-md border text-[13px] font-semibold capitalize transition-colors",
                      d.startup === o
                        ? "border-brand bg-brand-soft text-brand"
                        : "border-border bg-surface text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </Q>
            {d.startup === "yes" ? (
              <Q label="Tell us about your early-stage startup hiring experience *">
                <Textarea
                  value={d.startupDetail}
                  onChange={(e) => set({ startupDetail: e.target.value })}
                  placeholder="Tell us about the startups, stages, or types of roles you have hired for."
                  rows={4}
                />
              </Q>
            ) : null}
            <Q
              label="Major hiring geography *"
              hint="Which country or countries have you primarily recruited for?"
            >
              {d.countries.length ? (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {d.countries.map((c) => (
                    <span
                      key={c}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-brand/30 bg-brand-soft pl-2 pr-1 text-xs font-medium text-brand"
                    >
                      {c}
                      <button
                        type="button"
                        aria-label={`Remove ${c}`}
                        onClick={() =>
                          set({ countries: d.countries.filter((x) => x !== c) })
                        }
                      >
                        <X className="size-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search countries"
                className="h-10"
              />
              <div className="mt-1.5 max-h-36 overflow-y-auto rounded-md border border-border bg-surface">
                {filteredCountries.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      set({ countries: [...d.countries, c] });
                      setQ("");
                    }}
                    className="block w-full border-b border-border px-3 py-2 text-left text-[13px] last:border-0 hover:bg-surface-sunken"
                  >
                    {c}
                  </button>
                ))}
                {filteredCountries.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">No matches</p>
                ) : null}
              </div>
            </Q>
          </>
        ) : null}

        {/* Step 1: Specialization */}
        {step === 1 ? (
          <>
            <Q
              label="Choose 3 major roles you have hired for *"
              hint="Select exactly 3 roles you have the strongest hiring experience in."
            >
              <p className="num text-xs font-semibold text-foreground">
                {d.roles.length} of 3 selected
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {roleOptions.map((r) => {
                  const on = d.roles.includes(r);
                  const locked = !on && d.roles.length >= 3;
                  return (
                    <button
                      key={r}
                      type="button"
                      disabled={locked}
                      onClick={() =>
                        set({
                          roles: on
                            ? d.roles.filter((x) => x !== r)
                            : [...d.roles, r],
                        })
                      }
                      className={cn(
                        "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] font-medium transition-colors",
                        on
                          ? "border-brand bg-brand text-brand-foreground"
                          : "border-border bg-surface text-muted-foreground hover:text-foreground",
                        locked && "cursor-not-allowed opacity-40",
                      )}
                    >
                      {on ? <Check className="size-3.5" /> : null}
                      {r}
                    </button>
                  );
                })}
              </div>
            </Q>
            <Q
              label="Sourcing tools you use *"
              hint="Which tools or platforms do you regularly use to identify and source candidates?"
            >
              <Input
                value={d.tools}
                onChange={(e) => set({ tools: e.target.value })}
                placeholder="LinkedIn Recruiter, SeekOut, GitHub…"
                className="h-10"
              />
            </Q>
          </>
        ) : null}

        {/* Step 2: Hiring References */}
        {step === 2 ? (
          <>
            <div className="flex gap-2.5 rounded-md border border-border bg-surface px-3 py-2.5 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
              We will not contact these candidates. These profiles are used only for reference to understand your recruiting experience and the types of talent you have successfully hired.
            </div>
            {[0, 1, 2].map((i) => {
              const val = d.refs[i]?.trim();
              const err = refErrors[i];
              const isValid = Boolean(val && !err);
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[13px] font-semibold text-foreground">
                      Candidate {i + 1}
                      {i < 2 ? (
                        <span className="text-destructive"> *</span>
                      ) : (
                        <span className="text-xs font-normal text-muted-foreground"> (optional)</span>
                      )}
                    </Label>
                    {isValid ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                        <Check className="size-3" /> Valid profile
                      </span>
                    ) : null}
                  </div>
                  <Input
                    type="url"
                    value={d.refs[i]}
                    onChange={(e) => {
                      const refs = [...d.refs] as ApplicationDraft["refs"];
                      refs[i] = e.target.value;
                      set({ refs });
                      if (error) setError(null);
                    }}
                    placeholder="https://www.linkedin.com/in/candidate-profile"
                    className={cn(
                      "h-10 transition-colors",
                      err
                        ? "border-destructive text-destructive placeholder:text-destructive/50 focus-visible:ring-destructive/30"
                        : isValid
                          ? "border-success/60 focus-visible:ring-success/30"
                          : "",
                    )}
                  />
                  {err ? (
                    <p className="text-xs text-destructive">
                      {err}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </>
        ) : null}

        {/* Validation Error Banner */}
        {error ? (
          <p className="rounded-md border border-destructive/25 bg-danger-soft px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}

        {/* Actions Navigation Bar */}
        <div className="flex items-center justify-between border-t border-border pt-5">
          <button
            type="button"
            onClick={() =>
              step === 0 ? logout() : (setError(null), setStep(step - 1))
            }
            className="h-10 rounded-md border border-border px-4 text-[13px] font-semibold text-foreground hover:bg-surface-sunken"
          >
            {step === 0 ? "Sign out" : "Back"}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleNext}
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-brand px-5 text-[13px] font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Submitting...
              </>
            ) : step === 2 ? (
              <>
                <CheckCircle2 className="size-4" /> Submit Application
              </>
            ) : (
              "Next"
            )}
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
