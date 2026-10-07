import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AmPageHeader, AmShell } from "@/components/am/am-shell";
import { useAm } from "@/components/am/am-store";
import { Btn, Field, FormSection, inputCls, textareaCls } from "@/components/am/am-ui";
import { Switch } from "@/components/ui/switch";
import type { AmJob, AmJobStatus } from "@/lib/am-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/am/jobs/$jobId_/edit")({
  head: () => ({
    meta: [
      { title: "Edit Job — Account Manager | Yuvro" },
      {
        name: "description",
        content:
          "Edit marketplace job parameters: role details, status, compensation, bounty terms, requirements, evaluation signals, and screening questions.",
      },
      { property: "og:title", content: "Edit Job — Account Manager | Yuvro" },
      {
        property: "og:description",
        content: "Full page job editor for Account Managers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AmEditJobPage,
});

const steps = [
  "Company & role",
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
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

const currencies = ["USD", "EUR", "GBP", "INR"];

function normEmpType(t?: string): string {
  const s = String(t || "").toLowerCase();
  if (s.includes("part")) return "part_time";
  if (s.includes("contract")) return "contract";
  if (s.includes("intern")) return "internship";
  return "full_time";
}

function normWorkModel(w?: string): string {
  const s = String(w || "").toLowerCase();
  if (s.includes("remote")) return "remote";
  if (s.includes("onsite") || s.includes("site")) return "onsite";
  return "hybrid";
}

function AmEditJobPage() {
  const { jobId } = Route.useParams();
  const navigate = useNavigate();
  const am = useAm();
  const { state, refreshJobs, refreshCompanies, updateJob } = am;

  const job = am.job(jobId);
  const [step, setStep] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    refreshJobs();
    refreshCompanies();
  }, [refreshJobs, refreshCompanies]);

  const company = job ? am.companyOfJob(job.id) : null;

  const [form, setForm] = useState({
    // Step 1: Company & role
    companyId: "",
    title: "",
    status: "active" as AmJobStatus,
    employmentType: "full_time",
    workModel: "hybrid",
    location: "",
    experience: "",
    openRoles: "1",

    // Step 2: Compensation & bounty
    salaryMin: "",
    salaryMax: "",
    salaryCurrency: "USD",
    companyToYuvroPct: "20",
    yuvroCommissionPct: "5",
    recruiterSlots: "6",
    payoutTerms: "30, 60, 90",
    visaSponsorship: "Visa sponsorship available",
    benefitsAndPerks: "",

    // Step 3: Job description & signals
    jobDescription: "",
    mustHaves: "",
    targetCompanies: "",
    signalsGreen: "",
    signalsRed: "",

    // Step 4: Process & questions
    process: "",
    questions: "",
  });

  // Populate form from existing job once available
  useEffect(() => {
    if (job && !initialized) {
      setForm({
        companyId: job.companyId || state.companies[0]?.id || "",
        title: job.title || "",
        status: job.status || "active",
        employmentType: normEmpType(job.employmentType),
        workModel: normWorkModel(job.workModel),
        location: job.location || "",
        experience:
          job.experience && job.experience !== "—" ? job.experience : job.yearsExperience || "",
        openRoles: String(job.openings || 1),

        salaryMin: job.salaryMin ? String(job.salaryMin) : "",
        salaryMax: job.salaryMax ? String(job.salaryMax) : "",
        salaryCurrency: job.currency || "USD",
        equity:
          job.equityValue !== undefined && job.equityValue !== null
            ? String(job.equityValue)
            : job.equity && job.equity !== "—"
            ? job.equity.replace(/[^0-9.]/g, "")
            : "",
        companyToYuvroPct:
          job.companyToYuvroPct !== undefined ? String(job.companyToYuvroPct) : "20",
        yuvroCommissionPct:
          job.yuvroCommissionPct !== undefined ? String(job.yuvroCommissionPct) : "5",
        recruiterSlots: String(job.recruiterSlots || 6),
        payoutTerms: job.payoutTerms?.length ? job.payoutTerms.join(", ") : "30, 60, 90",
        visaSponsorship: job.visa || job.sponsorship || "Visa sponsorship available",
        benefitsAndPerks:
          job.benefitsAndPerks || (job.jd?.benefits ? job.jd.benefits.join("\n") : ""),

        jobDescription: job.jobDescription || job.jd?.aboutRole || "",
        mustHaves: (job.mustHave || job.jd?.requirements || []).join("\n"),
        targetCompanies: (job.targetCompanies || []).join("\n"),
        signalsGreen: (job.signals?.green || job.niceToHave || []).join("\n"),
        signalsRed: (job.signals?.red || []).join("\n"),

        process: (job.process || []).join("\n"),
        questions: (job.questions || []).map((q) => q.q).join("\n"),
      });
      setInitialized(true);
    }
  }, [job, initialized, state.companies]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const lines = (s: string) =>
    s
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

  // Computed Bounty Details
  const companyFeePct = parseFloat(form.companyToYuvroPct) || 0;
  const yuvroCommPct = parseFloat(form.yuvroCommissionPct) || 0;
  const recruiterPct = Math.max(0, companyFeePct - yuvroCommPct);
  const salaryMinNum = parseFloat(form.salaryMin) || 0;
  const salaryMaxNum = parseFloat(form.salaryMax) || 0;
  const bountyMinCalc = (salaryMinNum * recruiterPct) / 100;
  const bountyMaxCalc = (salaryMaxNum * recruiterPct) / 100;

  const validateStep = (stepIndex: number): boolean => {
    if (stepIndex === 0) {
      if (!form.companyId) {
        toast.error("Please select a company.");
        return false;
      }
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
        toast.error("Company fee % must be greater than 0% and at most 100%.");
        return false;
      }
      const commPct = parseFloat(form.yuvroCommissionPct);
      if (!form.yuvroCommissionPct.trim() || isNaN(commPct) || commPct < 0 || commPct > feePct) {
        toast.error("Yuvro commission % must be between 0% and the company fee %.");
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

      // benefitsAndPerks is optional!
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

  const submit = async (overrideStatus?: AmJobStatus) => {
    if (!job) return;
    const targetStatus = overrideStatus || form.status;

    if (targetStatus === "active") {
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

    const patch: Partial<AmJob> = {
      companyId: form.companyId,
      title: form.title.trim(),
      status: targetStatus,
      employmentType: empTypeLabel,
      location: form.location.trim(),
      workModel: workModelLabel,
      experience: form.experience.trim(),
      yearsExperience: form.experience.trim(),
      openings: parseInt(form.openRoles, 10) || 1,
      recruiterSlots: parseInt(form.recruiterSlots, 10) || 6,
      salaryMin: salaryMinNum,
      salaryMax: salaryMaxNum,
      currency: form.salaryCurrency as "USD" | "GBP" | "EUR",
      equity: eq !== null ? `${eq}%` : "—",
      equityValue: eq,
      companyToYuvroPct: companyFeePct,
      yuvroCommissionPct: yuvroCommPct,
      recruiterPct,
      bountyPct: `${companyFeePct}% fee (${recruiterPct}% to recruiter)`,
      bountyMin: bountyMinCalc,
      bountyMax: bountyMaxCalc,
      payoutTerms: parsedPayoutTerms.length ? parsedPayoutTerms : [30, 60, 90],
      paymentRules: `Net ${parsedPayoutTerms.length ? parsedPayoutTerms.join(", ") : "30, 60, 90"} days`,
      visa: form.visaSponsorship.trim(),
      sponsorship: form.visaSponsorship.trim(),
      jobDescription: form.jobDescription.trim(),
      benefitsAndPerks: form.benefitsAndPerks.trim(),
      mustHave: mustHavesList,
      targetCompanies: targetCompaniesList,
      signals: {
        green: greenSignals,
        red: redSignals,
      },
      niceToHave: greenSignals,
      jd: {
        aboutRole: form.jobDescription.trim(),
        responsibilities: job.jd?.responsibilities || mustHavesList,
        requirements: mustHavesList,
        benefits: lines(form.benefitsAndPerks),
      },
      process: processList.length ? processList : job.process,
      questions: questionsList.length ? questionsList : job.questions,
    };

    try {
      setSaving(true);
      await updateJob(job.id, patch);
      await refreshJobs();
      toast.success(targetStatus === "draft" ? "Job saved as draft" : "Job updated successfully");
      navigate({
        to: "/am/jobs/$jobId",
        params: { jobId: job.slug || job.id },
        search: { tab: "overview" },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update job";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!job) {
    return (
      <AmShell>
        <AmPageHeader
          title="Job not found"
          description="The job you are attempting to edit could not be found."
        />
        <div className="px-4 py-6 sm:px-6">
          <Btn onClick={() => navigate({ to: "/am/jobs" })}>Back to jobs</Btn>
        </div>
      </AmShell>
    );
  }

  const jobTargetId = job.slug || job.id;

  return (
    <AmShell>
      <AmPageHeader
        breadcrumb={
          <span>
            <Link to="/am/jobs" className="hover:text-foreground hover:underline">
              Jobs
            </Link>{" "}
            /{" "}
            {company ? (
              <>
                <Link
                  to="/am/companies/$companyId"
                  params={{ companyId: company.slug || company.id }}
                  className="hover:text-foreground hover:underline"
                >
                  {company.name}
                </Link>{" "}
                /{" "}
              </>
            ) : null}
            <Link
              to="/am/jobs/$jobId"
              params={{ jobId: jobTargetId }}
              className="hover:text-foreground hover:underline"
            >
              {job.title}
            </Link>{" "}
            / Edit
          </span>
        }
        title={`Edit job — ${job.title}`}
        description={`Update role parameters, compensation structure, bounty split, requirements, and screening questions for ${company?.name || "client company"}.`}
        actions={
          <div className="flex items-center gap-2">
            <Btn
              onClick={() =>
                navigate({
                  to: "/am/jobs/$jobId",
                  params: { jobId: jobTargetId },
                  search: { tab: "overview" },
                })
              }
            >
              <ArrowLeft className="size-4" /> Cancel
            </Btn>
            <Btn variant="primary" onClick={() => submit()} disabled={saving}>
              <Check className="size-4" /> {saving ? "Saving..." : "Save changes"}
            </Btn>
          </div>
        }
      >
        <ol className="flex flex-wrap items-center gap-1">
          {steps.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => handleStepClick(i)}
                className={cn(
                  "flex h-8 items-center gap-2 rounded-md px-2.5 text-xs font-medium transition-colors",
                  i === step
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-surface-sunken",
                )}
              >
                <span className="num opacity-70">{i + 1}</span>
                {s}
              </button>
            </li>
          ))}
        </ol>
      </AmPageHeader>

      <div className="px-4 sm:px-6">
        {step === 0 ? (
          <FormSection
            title="Company & role"
            description="Assign the company account, employment terms, work model, and required experience level."
          >
            <Field label="Company *" hint="Select the client company offering this position">
              <select
                value={form.companyId}
                onChange={(e) => set("companyId", e.target.value)}
                className={inputCls}
              >
                {state.companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Marketplace status"
              hint="Set whether this role is active and open to recruiters or in draft."
            >
              <div className="flex h-9 items-center justify-between rounded-md border border-border bg-surface px-3">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex size-2 rounded-full",
                      form.status === "active" ? "bg-emerald-500" : "bg-muted-foreground",
                    )}
                  />
                  <span className="text-[13px] font-medium text-foreground">
                    {form.status === "active" ? "Active" : "Draft"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({form.status === "active" ? "Open to recruiters" : "Hidden in draft"})
                  </span>
                </div>
                <Switch
                  checked={form.status === "active"}
                  onCheckedChange={(checked) => set("status", checked ? "active" : "draft")}
                  className="data-[state=checked]:bg-brand"
                />
              </div>
            </Field>

            <Field label="Job title *" hint="e.g. Senior Backend Engineer">
              <input
                className={inputCls}
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Senior Backend Engineer"
              />
            </Field>

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

            <Field label="Location *" hint="e.g. San Francisco, CA or London, UK or Remote">
              <input
                className={inputCls}
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="San Francisco, CA"
              />
            </Field>

            <Field label="Experience requirement *" hint="e.g. 5+ years, Senior">
              <input
                className={inputCls}
                value={form.experience}
                onChange={(e) => set("experience", e.target.value)}
                placeholder="5+ years, Senior"
              />
            </Field>

            <Field label="Open roles / Headcount *" hint="Number of open slots for this role">
              <input
                type="number"
                min="1"
                className={inputCls}
                value={form.openRoles}
                onChange={(e) => set("openRoles", e.target.value)}
              />
            </Field>
          </FormSection>
        ) : null}

        {step === 1 ? (
          <FormSection
            title="Compensation & bounty"
            description="Configure salary ranges, equity, platform fee split, and payout milestones."
          >
            <Field label="Salary minimum *" hint="Annual base salary minimum">
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

            <Field label="Salary maximum *" hint="Annual base salary maximum">
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

            <Field label="Salary currency *">
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

            <Field
              label="Company to Yuvro fee (%) *"
              hint="Total % of first-year salary paid by client company (e.g. 20%)"
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

            <Field label="Yuvro commission (%) *" hint="Commission retained by Yuvro (e.g. 5%)">
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                className={inputCls}
                value={form.yuvroCommissionPct}
                onChange={(e) => set("yuvroCommissionPct", e.target.value)}
                placeholder="5"
              />
            </Field>

            {/* Live Recruiter Bounty Calculation Banner */}
            <div className="sm:col-span-2 rounded-lg border border-brand/20 bg-brand/5 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-brand">
                <Sparkles className="size-4" />
                Live Recruiter Bounty Calculation
              </div>
              <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
                <div>
                  <span className="text-muted-foreground">Recruiter share:</span>
                  <span className="num ml-1 font-semibold text-foreground">{recruiterPct}%</span>
                  <span className="ml-1 text-[11px] text-muted-foreground">
                    ({companyFeePct}% − {yuvroCommPct}%)
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Recruiter bounty range:</span>
                  <span className="num ml-1 font-semibold text-brand">
                    ${bountyMinCalc.toLocaleString()} – ${bountyMaxCalc.toLocaleString()}{" "}
                    {form.salaryCurrency}
                  </span>
                  <span className="ml-1 text-[11px] text-muted-foreground">
                    per successful hire
                  </span>
                </div>
              </div>
            </div>

            <Field
              label="Recruiter slots / capacity *"
              hint="Maximum number of recruiters who may work this role at once (e.g. 6)"
              className="sm:col-span-2"
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

            <Field
              label="Payout milestone terms *"
              hint="Milestone days in ascending order (e.g. 30, 60, 90)"
              className="sm:col-span-2"
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
              hint="e.g. Available, No sponsorship, Transfer only"
              className="sm:col-span-2"
            >
              <input
                className={inputCls}
                value={form.visaSponsorship}
                onChange={(e) => set("visaSponsorship", e.target.value)}
                placeholder="Visa sponsorship available"
              />
            </Field>

            <Field
              label="Benefits & perks (Optional)"
              hint="Company benefits, health coverage, bonuses, and perks"
              className="sm:col-span-2"
            >
              <textarea
                className={textareaCls}
                value={form.benefitsAndPerks}
                onChange={(e) => set("benefitsAndPerks", e.target.value)}
                placeholder="Comprehensive health insurance, 401(k) matching, unlimited PTO..."
              />
            </Field>
          </FormSection>
        ) : null}

        {step === 2 ? (
          <FormSection
            title="Job description & signals"
            description="Define the role description, mandatory requirements, and evaluation green & red flags."
          >
            <Field
              label="Complete job description *"
              hint="Full overview and summary of the role"
              className="sm:col-span-2"
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
              className="sm:col-span-2"
            >
              <textarea
                rows={4}
                className={textareaCls}
                value={form.mustHaves}
                onChange={(e) => set("mustHaves", e.target.value)}
                placeholder="5+ years experience in Python and Django&#10;Experience architecting high-throughput REST APIs&#10;Proficiency with PostgreSQL and Redis"
              />
            </Field>

            <Field
              label="Target companies (Sourcing targets) *"
              hint="Ideal companies to source candidates from (comma-separated or one per line, e.g. Google, Stripe, Meta, Amazon)"
              className="sm:col-span-2"
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
              className="sm:col-span-2"
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
              className="sm:col-span-2"
            >
              <textarea
                rows={3}
                className={textareaCls}
                value={form.signalsRed}
                onChange={(e) => set("signalsRed", e.target.value)}
                placeholder="Lack of production backend web service experience&#10;Frequent job switches under 6 months"
              />
            </Field>
          </FormSection>
        ) : null}

        {step === 3 ? (
          <FormSection
            title="Process & questions"
            description="Candidate screening questions and interview stages."
          >
            <Field
              label="Candidate screening questions *"
              hint="One question per line. Recruiters or candidates will answer these during submission."
              className="sm:col-span-2"
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
              hint="One stage per line (recruiter screen, tech interview, hiring manager, offer)"
              className="sm:col-span-2"
            >
              <textarea
                rows={4}
                className={textareaCls}
                value={form.process}
                onChange={(e) => set("process", e.target.value)}
                placeholder="Recruiter screen&#10;Account Manager review&#10;Hiring manager interview&#10;Technical loop&#10;Final decision & offer"
              />
            </Field>
          </FormSection>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 py-5">
          <Btn onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Back
          </Btn>
          <div className="flex gap-2">
            {step < steps.length - 1 ? (
              <Btn variant="primary" onClick={handleContinue}>
                Continue
              </Btn>
            ) : (
              <Btn variant="primary" onClick={() => submit()} disabled={saving}>
                <Check className="size-4" /> {saving ? "Saving..." : "Save changes"}
              </Btn>
            )}
          </div>
        </div>
      </div>
    </AmShell>
  );
}
