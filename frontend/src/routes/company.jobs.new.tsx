import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { CompanySection, CompanyShell } from "@/components/company/company-shell";
import { Button } from "@/components/ui/button";
import { Field, inputCls, textareaCls } from "@/components/am/am-ui";
import { useAm } from "@/components/am/am-store";
import { api } from "@/lib/api";
import { signedInCompany } from "@/lib/company-review";
import type { AmJob, AmJobStatus } from "@/lib/am-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/company/jobs/new")({
  head: () => ({
    meta: [
      { title: "Create a Job — Company Portal | Yuvro" },
      {
        name: "description",
        content:
          "Define role details, compensation, screening questions and bounty for a new job.",
      },
      { property: "og:title", content: "Create a Job — Company Portal | Yuvro" },
      {
        property: "og:description",
        content: "Set up a new role for recruiters to source against.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompanyCreateJobPage,
});

const steps = [
  "Role basics",
  "Compensation & bounty",
  "Job description & signals",
  "Process & questions",
];

const employmentTypes = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
];

const workModels = [
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
  { value: "onsite", label: "On-site" },
];

const currencies = ["USD", "EUR", "GBP", "INR"];

type CompanyInfo = {
  id: string;
  name: string;
  logo_url?: string;
  industry?: string;
};

function CompanyCreateJobPage() {
  const { createJob } = useAm();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchCurrentCompany = async () => {
      try {
        const res = await api.get<{
          id: string;
          name: string;
          logo_url?: string;
          logo?: string;
          industry?: string;
        }>("/api/marketplace/companies/my/");
        if (res && res.id) {
          setCompany({
            id: res.id,
            name: res.name,
            logo_url: res.logo_url || res.logo,
            industry: res.industry,
          });
        } else {
          throw new Error("No company returned");
        }
      } catch {
        const fallback = signedInCompany();
        if (fallback) {
          setCompany({
            id: fallback.id,
            name: fallback.name,
            logo_url: fallback.logoUrl || fallback.logo,
            industry: fallback.industry,
          });
        }
      } finally {
        setIsLoadingCompany(false);
      }
    };

    fetchCurrentCompany();
  }, []);

  const [form, setForm] = useState({
    // Step 0: Role basics
    title: "",
    employmentType: "full_time",
    workModel: "hybrid",
    location: "",
    experience: "Senior (5+ years)",
    openRoles: "1",

    // Step 1: Compensation & bounty
    salaryMin: "150000",
    salaryMax: "195000",
    salaryCurrency: "USD",
    equity: "0.10",
    companyToYuvroPct: "20",
    yuvroCommissionPct: "5",
    recruiterSlots: "6",
    payoutTerms: "30, 60, 90",
    visaSponsorship: "Visa sponsorship available",
    benefitsAndPerks:
      "Comprehensive health, dental, and vision insurance\n401(k) matching up to 5%\nUnlimited PTO and flexible hours\nAnnual learning and remote setup stipend",

    // Step 2: Job description & signals
    jobDescription:
      "We are seeking an experienced Senior Software Engineer to design, build, and maintain mission-critical backend services and APIs that power our core platform.",
    mustHaves:
      "5+ years of software engineering experience with backend systems\nDeep proficiency in Python, Django, and relational databases (PostgreSQL)\nProven experience architecting scalable REST APIs and event-driven architectures",
    targetCompanies: "Google\nStripe\nDatadog\nMeta\nAmazon",
    signalsGreen:
      "Experience at a fast-paced high-growth technology startup\nActive open-source contributions or technical community leadership\nStrong cross-functional collaboration and technical mentorship skills",
    signalsRed:
      "Lack of production Python/Django web service experience\nHistory of frequent transitions under 6 months without clear justification",

    // Step 3: Process & questions
    process:
      "Recruiter screen\nAccount Manager review\nHiring manager interview\nTechnical loop\nFinal decision & offer",
    questions:
      "Why is this candidate a strong match for this role?\nConfirm current location, notice period, and compensation expectations.",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const lines = (s: string) =>
    s
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

  // Computed Bounty Details
  const companyFeePct = parseFloat(form.companyToYuvroPct) || 0;
  const salaryMinNum = parseFloat(form.salaryMin) || 0;
  const salaryMaxNum = parseFloat(form.salaryMax) || 0;
  const bountyMinCalc = (salaryMinNum * companyFeePct) / 100;
  const bountyMaxCalc = (salaryMaxNum * companyFeePct) / 100;

  const validateStep = (stepIndex: number): boolean => {
    if (stepIndex === 0) {
      if (!form.title.trim()) {
        toast.error("Job title is required.");
        return false;
      }
      if (!form.employmentType.trim()) {
        toast.error("Employment type is required.");
        return false;
      }
      if (!form.workModel.trim()) {
        toast.error("Work model is required.");
        return false;
      }
      if (!form.location.trim()) {
        toast.error("Job location is required.");
        return false;
      }
      if (!form.experience.trim()) {
        toast.error("Experience requirement is required.");
        return false;
      }
      const roles = parseInt(form.openRoles, 10);
      if (!form.openRoles.trim() || isNaN(roles) || roles < 1) {
        toast.error("Open roles / headcount must be at least 1.");
        return false;
      }
      return true;
    }

    if (stepIndex === 1) {
      const sMin = parseFloat(form.salaryMin);
      if (!form.salaryMin.trim() || isNaN(sMin) || sMin <= 0) {
        toast.error("Salary minimum is required and must be greater than 0.");
        return false;
      }
      const sMax = parseFloat(form.salaryMax);
      if (!form.salaryMax.trim() || isNaN(sMax) || sMax <= 0) {
        toast.error("Salary maximum is required and must be greater than 0.");
        return false;
      }
      if (sMin > sMax) {
        toast.error("Salary minimum cannot be greater than salary maximum.");
        return false;
      }
      if (!form.salaryCurrency.trim()) {
        toast.error("Salary currency is required.");
        return false;
      }

      const eq = parseFloat(form.equity);
      if (!form.equity.trim() || isNaN(eq) || eq < 0) {
        toast.error("Equity % is required (enter 0 if none).");
        return false;
      }

      const feePct = parseFloat(form.companyToYuvroPct);
      if (!form.companyToYuvroPct.trim() || isNaN(feePct) || feePct <= 0 || feePct > 100) {
        toast.error("Yuvro commission % must be greater than 0% and at most 100%.");
        return false;
      }

      const slots = parseInt(form.recruiterSlots, 10);
      if (!form.recruiterSlots.trim() || isNaN(slots) || slots < 1) {
        toast.error("Recruiter slots must be at least 1.");
        return false;
      }

      const parsedPayoutTerms = form.payoutTerms
        .split(",")
        .map((x) => parseInt(x.trim(), 10))
        .filter((x) => !isNaN(x) && x > 0);
      if (!form.payoutTerms.trim() || parsedPayoutTerms.length === 0) {
        toast.error("Payout milestone terms are required (e.g. 30, 60, 90).");
        return false;
      }

      if (!form.visaSponsorship.trim()) {
        toast.error("Visa / sponsorship information is required.");
        return false;
      }
      return true;
    }

    if (stepIndex === 2) {
      if (!form.jobDescription.trim()) {
        toast.error("Complete job description is required.");
        return false;
      }
      if (!lines(form.mustHaves).length) {
        toast.error("Must-have requirements are required (at least one).");
        return false;
      }
      if (!lines(form.targetCompanies.replace(/,/g, "\n")).length) {
        toast.error("Target companies are required (at least one).");
        return false;
      }
      if (!lines(form.signalsGreen).length) {
        toast.error("Positive evaluation signals (Green flags) are required.");
        return false;
      }
      if (!lines(form.signalsRed).length) {
        toast.error("Disqualifiers & warnings (Red flags) are required.");
        return false;
      }
      return true;
    }

    if (stepIndex === 3) {
      if (!lines(form.questions).length) {
        toast.error("Candidate screening questions are required (at least one).");
        return false;
      }
      if (!lines(form.process).length) {
        toast.error("Hiring process stages are required (at least one).");
        return false;
      }
      return true;
    }

    return true;
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep <= step) {
      setStep(targetStep);
      return;
    }
    for (let s = step; s < targetStep; s++) {
      if (!validateStep(s)) {
        setStep(s);
        return;
      }
    }
    setStep(targetStep);
  };

  const handleContinue = () => {
    if (validateStep(step)) {
      setStep((s) => s + 1);
    }
  };

  const submit = async (status: AmJobStatus) => {
    if (status === "active") {
      for (let s = 0; s < steps.length; s++) {
        if (!validateStep(s)) {
          setStep(s);
          return;
        }
      }
    } else {
      if (!validateStep(0)) {
        setStep(0);
        return;
      }
    }

    if (!company?.id) {
      toast.error("Unable to resolve company account. Please refresh and try again.");
      return;
    }

    setIsSubmitting(true);

    const eq = form.equity.trim() ? parseFloat(form.equity) : null;

    const parsedPayoutTerms = form.payoutTerms
      .split(",")
      .map((x) => parseInt(x.trim(), 10))
      .filter((x) => !isNaN(x) && x > 0)
      .sort((a, b) => a - b);

    const mustHavesList = lines(form.mustHaves);
    const targetCompaniesList = lines(form.targetCompanies.replace(/,/g, "\n"));
    const greenSignals = lines(form.signalsGreen);
    const redSignals = lines(form.signalsRed);
    const questionsList = lines(form.questions).map((q) => ({
      q,
      type: "Long text",
      required: true,
    }));
    const processList = lines(form.process);

    const empTypeLabel =
      employmentTypes.find((e) => e.value === form.employmentType)?.label || "Full-time";
    const workModelLabel =
      (workModels.find((w) => w.value === form.workModel)?.label as
        "Remote" | "Hybrid" | "Onsite" | "On-site") || "Hybrid";

    const id = `JOB-${Math.floor(1000 + Math.random() * 8999)}`;
    const jobPayload: AmJob = {
      id,
      companyId: company.id,
      title: form.title.trim(),
      department: "Engineering",
      employmentType: empTypeLabel,
      location: form.location.trim(),
      workModel: workModelLabel,
      experience: form.experience.trim(),
      yearsExperience: form.experience.trim(),
      salaryMin: salaryMinNum,
      salaryMax: salaryMaxNum,
      currency: form.salaryCurrency as "USD" | "GBP" | "EUR",
      equity: eq !== null ? `${eq}%` : "—",
      equityValue: eq,
      bonus: "—",
      compNotes: "",
      status,
      openings: parseInt(form.openRoles, 10) || 1,
      deadline: "In 30 days",
      createdAt: "Today",
      lastActivity: "just now",
      bountyPct: `${companyFeePct}% commission to Yuvro`,
      bountyMin: bountyMinCalc,
      bountyMax: bountyMaxCalc,
      companyToYuvroPct: companyFeePct,
      yuvroCommissionPct: 0,
      recruiterPct: companyFeePct,
      payoutTerms: parsedPayoutTerms.length ? parsedPayoutTerms : [30, 60, 90],
      recruiterReward: `${companyFeePct}% commission to Yuvro`,
      paymentRules: `Net ${parsedPayoutTerms.join(", ")} days`,
      recruiterSlots: parseInt(form.recruiterSlots, 10) || 6,
      hiringManager: "To be assigned",
      companyContact: "To be assigned",
      visa: form.visaSponsorship,
      sponsorship: form.visaSponsorship,
      mustHave: mustHavesList,
      targetCompanies: targetCompaniesList,
      niceToHave: greenSignals,
      skills: mustHavesList.slice(0, 4),
      domain: "Engineering",
      education: "Not required",
      locationRequirement: `${form.location} · ${workModelLabel}`,
      otherRequirements: [],
      jobDescription: form.jobDescription,
      benefitsAndPerks: form.benefitsAndPerks,
      signals: {
        green: greenSignals,
        red: redSignals,
      },
      jd: {
        aboutRole: form.jobDescription,
        responsibilities: mustHavesList,
        requirements: mustHavesList,
        benefits: lines(form.benefitsAndPerks),
      },
      process: processList,
      questions: questionsList,
    };

    try {
      await createJob(jobPayload);
      toast.success(
        status === "draft"
          ? "Job saved as draft"
          : "Job submitted for approval! Your Account Manager will review and publish it.",
      );
      navigate({ to: "/company" });
    } catch (err: unknown) {
      console.error("Create job error:", err);
      const msg = err instanceof Error ? err.message : "Failed to create job";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CompanyShell
      title="Create a job"
      description="Define role details, compensation, screening questions and bounty terms for candidate sourcing."
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => submit("draft")}
            disabled={isSubmitting || isLoadingCompany}
          >
            Save draft
          </Button>
          <Button
            size="sm"
            onClick={() => submit("pending_approval")}
            disabled={isSubmitting || isLoadingCompany}
            className="gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Check className="size-3.5" />
                Submit for approval
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-4xl space-y-5 pb-12">
        {/* Step Indicator Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3">
          {steps.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => handleStepClick(i)}
              className={cn(
                "flex h-8 items-center gap-2 rounded-md px-3 text-xs font-medium transition-colors",
                i === step
                  ? "bg-foreground text-background font-semibold shadow-xs"
                  : "text-muted-foreground hover:bg-surface-sunken hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "num flex size-4 items-center justify-center rounded-full text-[10px]",
                  i === step
                    ? "bg-background text-foreground"
                    : "bg-surface-sunken text-muted-foreground",
                )}
              >
                {i + 1}
              </span>
              {s}
            </button>
          ))}
        </div>

        {/* Step 0: Role basics */}
        {step === 0 ? (
          <CompanySection
            title="Role basics"
            meta="Step 1 of 4"
          >
            <div className="space-y-4">
              {/* Company banner */}
              <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-sunken/40 p-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface p-1">
                  {company?.logo_url ? (
                    <img
                      src={company.logo_url}
                      alt={company.name}
                      className="size-full object-contain"
                    />
                  ) : (
                    <Building2 className="size-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Hiring for {company?.name || "Your Company"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    This role will be linked to your verified company profile.
                  </p>
                </div>
              </div>

              <Field label="Job title *" hint="e.g. Senior Backend Engineer">
                <input
                  className={inputCls}
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="e.g. Senior Backend Engineer"
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Employment type *">
                  <select
                    className={inputCls}
                    value={form.employmentType}
                    onChange={(e) => set("employmentType", e.target.value)}
                  >
                    {employmentTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Work model *">
                  <select
                    className={inputCls}
                    value={form.workModel}
                    onChange={(e) => set("workModel", e.target.value)}
                  >
                    {workModels.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Location *" hint="e.g. San Francisco, CA or Bengaluru or Remote">
                  <input
                    className={inputCls}
                    value={form.location}
                    onChange={(e) => set("location", e.target.value)}
                    placeholder="e.g. San Francisco, CA or Remote"
                  />
                </Field>

                <Field label="Experience requirement *" hint="e.g. 5+ years, Senior">
                  <input
                    className={inputCls}
                    value={form.experience}
                    onChange={(e) => set("experience", e.target.value)}
                    placeholder="e.g. 5+ years, Senior"
                  />
                </Field>
              </div>

              <Field
                label="Open roles / Headcount *"
                hint="Number of open slots for this role"
              >
                <input
                  type="number"
                  min="1"
                  className={inputCls}
                  value={form.openRoles}
                  onChange={(e) => set("openRoles", e.target.value)}
                />
              </Field>
            </div>
          </CompanySection>
        ) : null}

        {/* Step 1: Compensation & bounty */}
        {step === 1 ? (
          <CompanySection
            title="Compensation & bounty"
            meta="Step 2 of 4"
          >
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Salary minimum *" hint="Annual base minimum">
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    className={inputCls}
                    value={form.salaryMin}
                    onChange={(e) => set("salaryMin", e.target.value)}
                    placeholder="150000"
                  />
                </Field>

                <Field label="Salary maximum *" hint="Annual base maximum">
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    className={inputCls}
                    value={form.salaryMax}
                    onChange={(e) => set("salaryMax", e.target.value)}
                    placeholder="195000"
                  />
                </Field>

                <Field label="Currency *">
                  <select
                    className={inputCls}
                    value={form.salaryCurrency}
                    onChange={(e) => set("salaryCurrency", e.target.value)}
                  >
                    {currencies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Equity (%) *" hint="e.g. 0.10">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className={inputCls}
                  value={form.equity}
                  onChange={(e) => set("equity", e.target.value)}
                  placeholder="0.10"
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Yuvro commission (%) *"
                  hint="Commission % of first-year base salary paid to Yuvro on successful hire"
                >
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    className={inputCls}
                    value={form.companyToYuvroPct}
                    onChange={(e) => set("companyToYuvroPct", e.target.value)}
                    placeholder="20"
                  />
                </Field>

                <Field
                  label="Recruiter slots / capacity *"
                  hint="Max recruiters who can source candidates at once"
                >
                  <input
                    type="number"
                    min="1"
                    max="50"
                    className={inputCls}
                    value={form.recruiterSlots}
                    onChange={(e) => set("recruiterSlots", e.target.value)}
                    placeholder="6"
                  />
                </Field>
              </div>

              {/* Live Yuvro Placement Fee Calculation Card */}
              <div className="rounded-lg border border-brand/20 bg-brand/5 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-brand">
                  <Sparkles className="size-4" />
                  Estimated Yuvro Placement Fee Calculation
                </div>
                <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
                  <div>
                    <span className="text-muted-foreground">Commission rate:</span>
                    <span className="num ml-1 font-semibold text-foreground">
                      {companyFeePct}%
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Fee on successful hire:</span>
                    <span className="num ml-1 font-semibold text-brand">
                      {form.salaryCurrency === "INR" ? "₹" : form.salaryCurrency === "EUR" ? "€" : form.salaryCurrency === "GBP" ? "£" : "$"}
                      {bountyMinCalc.toLocaleString()} – {form.salaryCurrency === "INR" ? "₹" : form.salaryCurrency === "EUR" ? "€" : form.salaryCurrency === "GBP" ? "£" : "$"}
                      {bountyMaxCalc.toLocaleString()} {form.salaryCurrency}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Payout milestone terms *"
                  hint="Milestone days ascending (e.g. 30, 60, 90)"
                >
                  <input
                    className={inputCls}
                    value={form.payoutTerms}
                    onChange={(e) => set("payoutTerms", e.target.value)}
                    placeholder="30, 60, 90"
                  />
                </Field>

                <Field
                  label="Visa / Sponsorship *"
                  hint="e.g. Visa sponsorship available, No sponsorship, Transfer only"
                >
                  <input
                    className={inputCls}
                    value={form.visaSponsorship}
                    onChange={(e) => set("visaSponsorship", e.target.value)}
                    placeholder="Visa sponsorship available"
                  />
                </Field>
              </div>

              <Field
                label="Benefits & perks (Optional)"
                hint="Health insurance, bonuses, stock options, PTO, and other incentives"
              >
                <textarea
                  className={textareaCls}
                  rows={3}
                  value={form.benefitsAndPerks}
                  onChange={(e) => set("benefitsAndPerks", e.target.value)}
                  placeholder="Comprehensive health insurance, 401(k) matching, unlimited PTO..."
                />
              </Field>
            </div>
          </CompanySection>
        ) : null}

        {/* Step 2: Job description & signals */}
        {step === 2 ? (
          <CompanySection
            title="Job description & signals"
            meta="Step 3 of 4"
          >
            <div className="space-y-4">
              <Field
                label="Complete job description *"
                hint="Overview of the role, responsibilities, and team impact"
              >
                <textarea
                  rows={4}
                  className={textareaCls}
                  value={form.jobDescription}
                  onChange={(e) => set("jobDescription", e.target.value)}
                  placeholder="We are looking for..."
                />
              </Field>

              <Field
                label="Must-have requirements *"
                hint="One requirement per line (hard disqualifiers if missing)"
              >
                <textarea
                  rows={4}
                  className={textareaCls}
                  value={form.mustHaves}
                  onChange={(e) => set("mustHaves", e.target.value)}
                  placeholder="5+ years experience in Python and Django&#10;Experience architecting high-throughput REST APIs&#10;Proficiency with PostgreSQL"
                />
              </Field>

              <Field
                label="Target companies (Sourcing targets) *"
                hint="Ideal companies to source from (one per line or comma-separated)"
              >
                <textarea
                  rows={3}
                  className={textareaCls}
                  value={form.targetCompanies}
                  onChange={(e) => set("targetCompanies", e.target.value)}
                  placeholder="Google&#10;Stripe&#10;Datadog&#10;Meta&#10;Amazon"
                />
              </Field>

              <Field
                label="Positive evaluation signals (Green flags) *"
                hint="One item per line (traits that make a candidate exceptional)"
              >
                <textarea
                  rows={3}
                  className={textareaCls}
                  value={form.signalsGreen}
                  onChange={(e) => set("signalsGreen", e.target.value)}
                  placeholder="Experience at a high-growth tech startup&#10;Open source contributions or technical blog posts"
                />
              </Field>

              <Field
                label="Disqualifiers & warnings (Red flags) *"
                hint="One item per line (indicators of poor fit)"
              >
                <textarea
                  rows={3}
                  className={textareaCls}
                  value={form.signalsRed}
                  onChange={(e) => set("signalsRed", e.target.value)}
                  placeholder="Lack of production backend web service experience&#10;Frequent job switches under 6 months"
                />
              </Field>
            </div>
          </CompanySection>
        ) : null}

        {/* Step 3: Process & questions */}
        {step === 3 ? (
          <CompanySection
            title="Process & questions"
            meta="Step 4 of 4"
          >
            <div className="space-y-4">
              <Field
                label="Candidate screening questions *"
                hint="One question per line. Recruiters or candidates will answer these during submission."
              >
                <textarea
                  rows={4}
                  className={textareaCls}
                  value={form.questions}
                  onChange={(e) => set("questions", e.target.value)}
                  placeholder="Why is this candidate a strong fit for this role?&#10;Confirm notice period and compensation expectations."
                />
              </Field>

              <Field
                label="Hiring process stages *"
                hint="One stage per line (e.g. Recruiter screen, Technical loop, Final decision)"
              >
                <textarea
                  rows={4}
                  className={textareaCls}
                  value={form.process}
                  onChange={(e) => set("process", e.target.value)}
                  placeholder="Recruiter screen&#10;Hiring manager interview&#10;Technical loop&#10;Final decision & offer"
                />
              </Field>
            </div>
          </CompanySection>
        ) : null}

        {/* Bottom Wizard Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || isSubmitting}
          >
            Back
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => submit("draft")}
              disabled={isSubmitting || isLoadingCompany}
            >
              Save draft
            </Button>
            {step < steps.length - 1 ? (
              <Button
                type="button"
                size="sm"
                onClick={handleContinue}
                disabled={isSubmitting}
              >
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => submit("pending_approval")}
                disabled={isSubmitting || isLoadingCompany}
                className="gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" />
                    Submit for approval
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </CompanyShell>
  );
}
