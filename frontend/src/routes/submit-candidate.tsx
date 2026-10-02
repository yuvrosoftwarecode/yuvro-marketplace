import { useState, useEffect, useTransition, useMemo, type ChangeEvent, type DragEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  Globe,
  Linkedin,
  Loader2,
  Sparkles,
  Upload,
  UserCheck,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader, Panel, PanelHeader, SectionLabel } from "@/components/app/primitives";
import { StatusBadge } from "@/components/app/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useJobContext } from "@/components/app/job-context";
import { useAmOptional } from "@/components/am/am-store";
import { parseResumeFile } from "@/lib/resume-parser";
import { api } from "@/lib/api";
import { normalizeLinkedinUrl } from "@/lib/utils";

export const Route = createFileRoute("/submit-candidate")({
  head: () => ({
    meta: [
      { title: "Submit a Candidate — Candidate Screening & Review" },
      {
        name: "description",
        content:
          "Submit a qualified candidate for client review with resume parsing, compensation terms, and screening Q&A.",
      },
    ],
  }),
  component: SubmitCandidatePage,
});

type Step = 1 | 2 | 3 | 4;

interface CandidateFormData {
  // Step 1: Resume & Basics
  resumeFile: File | null;
  resumeFileName: string;
  name: string;
  currentRole: string;
  currentCompany: string;
  location: string;
  experience: string;
  email: string;
  phone: string;

  // Step 2: Links & Work Authorization
  linkedin: string;
  github: string;
  portfolio: string;
  visa: string;
  compensation: string;
  availability: string;

  // Step 3: Recommendation & Screening
  recommendation: string;
  answers: Record<string, string>;
}

function SubmitCandidatePage() {
  const { job } = useJobContext();
  const am = useAmOptional();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isParsing, setIsParsing] = useState(false);
  const [parseSuccess, setParseSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [formData, setFormData] = useState<CandidateFormData>({
    resumeFile: null,
    resumeFileName: "",
    name: "",
    currentRole: "",
    currentCompany: "",
    location: "",
    experience: "",
    email: "",
    phone: "",
    linkedin: "",
    github: "",
    portfolio: "",
    visa: "US Citizen / Permanent Resident",
    compensation: "",
    availability: "4 weeks notice",
    recommendation: "",
    answers: {},
  });

  const activeJobIdentifiers = useMemo(() => {
    const set = new Set<string>();
    if (job?.id) set.add(String(job.id).toLowerCase());
    if (job?.backendId) set.add(String(job.backendId).toLowerCase());
    if (job?.slug) set.add(String(job.slug).toLowerCase());

    if (am?.state?.jobs) {
      for (const j of am.state.jobs) {
        if (
          (job?.id && (j.id === job.id || j.slug === job.id)) ||
          (job?.backendId && (j.id === job.backendId || j.slug === job.backendId)) ||
          (job?.title && j.title.toLowerCase() === job.title.toLowerCase()) ||
          (job?.slug && j.slug && j.slug.toLowerCase() === job.slug.toLowerCase())
        ) {
          if (j.id) set.add(String(j.id).toLowerCase());
          if (j.slug) set.add(String(j.slug).toLowerCase());
        }
      }
    }
    return set;
  }, [job, am?.state?.jobs]);

  const [backendDuplicateMatch, setBackendDuplicateMatch] = useState<{
    candidateName: string;
    matchedUrl: string;
    reason?: string;
    message?: string;
  } | null>(null);

  const localDuplicateMatch = useMemo(() => {
    const normInput = normalizeLinkedinUrl(formData.linkedin);
    if (!normInput || !am?.state) return null;

    const { submissions, candidates } = am.state;

    // Check existing submissions for active job only
    for (const sub of submissions) {
      const isJobMatch =
        activeJobIdentifiers.has(String(sub.jobId).toLowerCase()) ||
        (sub.jobSlug && activeJobIdentifiers.has(String(sub.jobSlug).toLowerCase()));

      if (!isJobMatch) continue;

      const cand = candidates.find((c) => c.id === sub.candidateId);
      if (cand && cand.linkedin && normalizeLinkedinUrl(cand.linkedin) === normInput) {
        return {
          candidateName: cand.name || "A candidate",
          matchedUrl: cand.linkedin,
          submissionId: sub.id,
          message: `A candidate (${cand.name || "A candidate"}) with this LinkedIn profile URL has already been submitted for this job.`,
        };
      }
    }

    return null;
  }, [formData.linkedin, am?.state, activeJobIdentifiers]);

  const duplicateLinkedinMatch = localDuplicateMatch || backendDuplicateMatch;

  const checkDuplicateWithBackend = async (linkedinUrl: string) => {
    const norm = normalizeLinkedinUrl(linkedinUrl);
    if (!norm) {
      setBackendDuplicateMatch(null);
      return null;
    }

    const currentJobId = job?.backendId || job?.id;
    if (!currentJobId) {
      setBackendDuplicateMatch(null);
      return null;
    }

    try {
      const res = await api.post<{
        is_duplicate: boolean;
        reason?: string;
        candidate_name?: string;
        message?: string;
      }>("/api/recruiting/submissions/check-duplicate/", {
        job_id: currentJobId,
        linkedin_url: linkedinUrl,
      });

      if (res && res.is_duplicate) {
        const match = {
          candidateName: res.candidate_name || "A candidate",
          matchedUrl: linkedinUrl,
          reason: res.reason,
          message:
            res.message ||
            "A candidate with this LinkedIn profile URL has already been submitted for this job.",
        };
        setBackendDuplicateMatch(match);
        return match;
      } else {
        setBackendDuplicateMatch(null);
        return null;
      }
    } catch (e: any) {
      console.warn("Backend duplicate check error:", e);
      return null;
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.linkedin) {
        checkDuplicateWithBackend(formData.linkedin);
      } else {
        setBackendDuplicateMatch(null);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [formData.linkedin, job?.backendId, job?.id]);

  const updateField = (field: keyof CandidateFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateAnswer = (question: string, answer: string) => {
    setFormData((prev) => ({
      ...prev,
      answers: { ...prev.answers, [question]: answer },
    }));
  };

  const handleResumeFile = async (file: File) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx" && ext !== "doc") {
      toast.error("Please upload a PDF or DOCX resume document.");
      return;
    }

    updateField("resumeFile", file);
    updateField("resumeFileName", file.name);
    setIsParsing(true);
    setParseSuccess(false);

    try {
      const parsed = await parseResumeFile(file);
      setIsParsing(false);

      let extractedCount = 0;
      setFormData((prev) => {
        const next = { ...prev };
        if (parsed.email) {
          next.email = parsed.email;
          extractedCount++;
        }
        if (parsed.phone) {
          next.phone = parsed.phone;
          extractedCount++;
        }
        if (parsed.name) {
          next.name = parsed.name;
          extractedCount++;
        }
        if (parsed.linkedin) {
          next.linkedin = parsed.linkedin;
          extractedCount++;
        }
        if (parsed.github) {
          next.github = parsed.github;
          extractedCount++;
        }
        if (parsed.portfolio) {
          next.portfolio = parsed.portfolio;
          extractedCount++;
        }
        return next;
      });

      setParseSuccess(true);
      if (extractedCount > 0) {
        const extractedItems = [
          parsed.name ? "name" : "",
          parsed.email ? "email" : "",
          parsed.phone ? "phone" : "",
          parsed.linkedin ? "LinkedIn" : "",
          parsed.github ? "GitHub" : "",
          parsed.portfolio ? "portfolio" : "",
        ]
          .filter(Boolean)
          .join(", ");

        toast.success("Resume parsed successfully", {
          description: `Extracted: ${extractedItems}`,
        });
      } else {
        toast.info("Resume uploaded", {
          description: file.name,
        });
      }

      if (parsed.linkedin) {
        checkDuplicateWithBackend(parsed.linkedin).then((match) => {
          if (match) {
            toast.error("Duplicate candidate for this job", {
              description: match.message,
            });
          }
        });
      }
    } catch (err) {
      console.warn("Resume parse failed:", err);
      setIsParsing(false);
      toast.info("Resume attached", { description: file.name });
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleResumeFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleResumeFile(file);
  };

  // Validations per step
  const validateStep1 = (): boolean => {
    if (!formData.resumeFileName && !formData.resumeFile) {
      toast.error("Please upload a resume (PDF or DOCX).");
      return false;
    }
    if (duplicateLinkedinMatch) {
      toast.error("Duplicate candidate submission", {
        description: `A candidate (${duplicateLinkedinMatch.candidateName}) with this LinkedIn profile has already been submitted for this job.`,
      });
      return false;
    }
    if (!formData.name.trim()) {
      toast.error("Candidate full name is required.");
      return false;
    }
    if (!formData.currentRole.trim() || !formData.currentCompany.trim()) {
      toast.error("Current title & company are required.");
      return false;
    }
    if (!formData.location.trim()) {
      toast.error("Current location is required.");
      return false;
    }
    if (!formData.experience.trim()) {
      toast.error("Years of experience is required.");
      return false;
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("A valid email address is required.");
      return false;
    }
    if (!formData.phone.trim()) {
      toast.error("A contact phone number is required.");
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!formData.linkedin.trim()) {
      toast.error("LinkedIn profile URL is required.");
      return false;
    }
    if (!formData.github.trim()) {
      toast.error("GitHub profile URL is required.");
      return false;
    }
    if (duplicateLinkedinMatch) {
      toast.error("Duplicate candidate submission", {
        description: `A candidate (${duplicateLinkedinMatch.candidateName}) with this LinkedIn profile has already been submitted for this job.`,
      });
      return false;
    }
    if (!formData.visa.trim()) {
      toast.error("Work authorization status is required.");
      return false;
    }
    if (!formData.compensation.trim()) {
      toast.error("Expected compensation / salary is required.");
      return false;
    }
    if (!formData.availability.trim()) {
      toast.error("Notice period / availability is required.");
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    if (duplicateLinkedinMatch) {
      toast.error("Duplicate candidate submission", {
        description: `A candidate (${duplicateLinkedinMatch.candidateName}) with this LinkedIn profile has already been submitted for this job.`,
      });
      return false;
    }
    if (!formData.recommendation.trim()) {
      toast.error("Please write a recruiter recommendation pitch for this candidate.");
      return false;
    }
    for (const q of job.questions) {
      if (!formData.answers[q.q]?.trim()) {
        toast.error(`Please answer screening question: "${q.q}"`);
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (duplicateLinkedinMatch) {
      toast.error("Duplicate candidate submission", {
        description: `A candidate (${duplicateLinkedinMatch.candidateName}) with this LinkedIn profile has already been submitted for this job.`,
      });
      return;
    }
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && !validateStep3()) return;
    setCurrentStep((s) => Math.min(4, s + 1) as Step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prevStep = () => {
    setCurrentStep((s) => Math.max(1, s - 1) as Step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (duplicateLinkedinMatch) {
      toast.error("Duplicate candidate submission", {
        description: `A candidate (${duplicateLinkedinMatch.candidateName}) with this LinkedIn profile has already been submitted for this job.`,
      });
      return;
    }
    if (!validateStep1() || !validateStep2() || !validateStep3()) return;

    setIsSubmitting(true);
    try {
      const qAnswers = job.questions.map((q, idx) => ({
        question_id: (q as any).id || `q${idx + 1}`,
        question: q.q,
        q: q.q,
        answer: formData.answers[q.q] || "—",
        a: formData.answers[q.q] || "—",
      }));

      // Find matching AM job from AM store by title, slug, or backendId
      const matchingJob = am?.state.jobs.find(
        (j) =>
          (job.backendId && (j.id === job.backendId || j.slug === job.backendId)) ||
          (job.id && (j.id === job.id || j.slug === job.id)) ||
          j.title.toLowerCase() === job.title.toLowerCase() ||
          (job.slug && j.slug && j.slug.toLowerCase() === job.slug.toLowerCase()),
      );

      const targetJobId = matchingJob?.id || matchingJob?.slug || job.backendId || job.id;

      // 1. Try posting to backend API if available
      try {
        const targetJob = matchingJob?.backendId || matchingJob?.id || targetJobId;
        const formPayload = new FormData();
        if (targetJob) formPayload.append("job_id", String(targetJob));
        formPayload.append("first_name", formData.name.split(" ")[0] || formData.name);
        formPayload.append("last_name", formData.name.split(" ").slice(1).join(" ") || "Candidate");
        formPayload.append("email", formData.email.trim());
        formPayload.append("phone", formData.phone.trim());
        formPayload.append("current_title", formData.currentRole.trim());
        formPayload.append("current_company", formData.currentCompany.trim());
        formPayload.append("current_location", formData.location.trim());
        formPayload.append("linkedin_url", formData.linkedin.trim());
        if (formData.github) formPayload.append("github_url", formData.github.trim());
        if (formData.portfolio) formPayload.append("portfolio_url", formData.portfolio.trim());
        if (formData.visa) {
          formPayload.append("work_authorization_status", formData.visa.trim());
          formPayload.append("visa_status", formData.visa.trim());
        }
        if (formData.compensation) formPayload.append("compensation", formData.compensation.trim());
        if (formData.availability) {
          formPayload.append("availability", formData.availability.trim());
          formPayload.append("notice_period", formData.availability.trim());
        }
        formPayload.append("notes", formData.recommendation.trim());
        formPayload.append("answers", JSON.stringify(qAnswers));

        if (formData.resumeFile) {
          formPayload.append("resume", formData.resumeFile);
        }

        try {
          await api.post("/api/recruiting/submissions/", formPayload);
        } catch (postErr: any) {
          console.warn("Backend submission error:", postErr);
          const errorDetail =
            postErr?.data?.detail ||
            postErr?.data?.message ||
            postErr?.message ||
            "Failed to submit candidate to backend.";
          if (
            errorDetail.includes("another recruiter") ||
            errorDetail.includes("already been submitted") ||
            errorDetail.includes("already submitted")
          ) {
            setBackendDuplicateMatch({
              candidateName: formData.name,
              matchedUrl: formData.linkedin || formData.email,
              reason: "owned_by_another_recruiter",
              message: errorDetail,
            });
            throw new Error(errorDetail);
          }
          throw new Error(errorDetail);
        }

        // Fetch fresh state from backend
        await am?.refreshSubmissions(true).catch(() => {});
      } catch (err: any) {
        if (
          err?.message?.includes("another recruiter") ||
          err?.message?.includes("already been submitted") ||
          err?.message?.includes("already submitted")
        ) {
          throw err;
        }
        console.warn("Backend sync non-blocking error:", err);
      }

      setDone(true);
      toast.success("Candidate submitted successfully!", {
        description: `${formData.name} submitted for ${job.company} — ${job.title}`,
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit candidate.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsMeta = [
    { num: 1, label: "Resume & Basics" },
    { num: 2, label: "Links & Terms" },
    { num: 3, label: "Screening & Pitch" },
    { num: 4, label: "Review & Confirm" },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Submit candidate"
        description={`${job.company} — ${job.title} · reward ${job.reward} (${job.rewardPct})`}
        actions={
          <StatusBadge tone="neutral">
            Step {currentStep} of 4
          </StatusBadge>
        }
      />

      <div className="grid gap-4 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          {/* Multi-step progress bar */}
          <div className="border border-border bg-surface p-4">
            <div className="grid grid-cols-4 gap-2">
              {stepsMeta.map((s) => {
                const isCurrent = currentStep === s.num;
                const isPassed = currentStep > s.num;
                return (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => {
                      if (s.num < currentStep) setCurrentStep(s.num as Step);
                    }}
                    disabled={s.num > currentStep || (Boolean(duplicateLinkedinMatch) && s.num > 1)}
                    className={`flex flex-col border-t-2 pt-2 text-left transition-colors ${
                      isCurrent
                        ? "border-brand text-foreground"
                        : isPassed
                          ? "border-brand/40 text-muted-foreground hover:text-foreground"
                          : "border-border text-muted-foreground/50 opacity-60"
                    }`}
                  >
                    <span className="label-caps flex items-center gap-1">
                      {isPassed ? <Check className="size-3 text-brand" /> : null}
                      Step {s.num}
                    </span>
                    <span className="truncate text-xs font-semibold">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Panel>
            <PanelHeader
              title={
                currentStep === 1
                  ? "Step 1: Resume & Personal Details"
                  : currentStep === 2
                    ? "Step 2: Links & Work Authorization"
                    : currentStep === 3
                      ? "Step 3: Screening & Recommendation"
                      : "Step 4: Review Submission"
              }
              meta="All fields are required unless marked optional"
            />

            {done ? (
              <div className="p-8 text-center">
                <div className="mx-auto grid size-12 place-items-center rounded-full bg-success/10 text-success">
                  <CheckCircle2 className="size-7" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-foreground">
                  Candidate successfully submitted!
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formData.name} was forwarded to the {job.company} Account Manager. Review typically completes in 2 business days.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDone(false);
                      setCurrentStep(1);
                      setFormData({
                        resumeFile: null,
                        resumeFileName: "",
                        name: "",
                        currentRole: "",
                        currentCompany: "",
                        location: "",
                        experience: "",
                        email: "",
                        phone: "",
                        linkedin: "",
                        github: "",
                        portfolio: "",
                        visa: "US Citizen / Permanent Resident",
                        compensation: "",
                        availability: "4 weeks notice",
                        recommendation: "",
                        answers: {},
                      });
                    }}
                    className="inline-flex h-9 items-center rounded-md border border-border bg-surface px-3.5 text-[13px] font-semibold text-foreground hover:bg-surface-sunken"
                  >
                    Submit another candidate
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/pipeline" })}
                    className="inline-flex h-9 items-center rounded-md bg-brand px-4 text-[13px] font-semibold text-brand-foreground hover:bg-brand/90"
                  >
                    View pipeline
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-6">
                {/* STEP 1 */}
                {currentStep === 1 ? (
                  <div className="space-y-6">
                    {duplicateLinkedinMatch ? (
                      <div className="flex items-start gap-2.5 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                        <AlertCircle className="size-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-destructive">Duplicate Candidate LinkedIn Profile Detected</p>
                          <p className="mt-0.5 text-[12px] leading-snug text-destructive/90">
                            A candidate (<span className="font-medium">{duplicateLinkedinMatch.candidateName}</span>) with this LinkedIn URL ({formData.linkedin}) has already been submitted for this position.
                          </p>
                        </div>
                      </div>
                    ) : null}
                    {/* Resume Upload Dropzone */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-foreground">
                        Resume document (PDF / DOCX) <span className="text-destructive">*</span>
                      </Label>
                      {isParsing ? (
                        <div className="grid place-items-center rounded-lg border-2 border-dashed border-brand bg-brand/5 p-6 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="size-8 animate-spin text-brand" />
                            <p className="text-[13px] font-medium text-foreground">
                              Extracting text & contact information...
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Parsing resume details...
                            </p>
                          </div>
                        </div>
                      ) : formData.resumeFileName ? (
                        <div className="flex items-center justify-between rounded-lg border border-success/40 bg-success/5 p-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="grid size-10 place-items-center rounded-full bg-success/20 text-success shrink-0">
                              <FileText className="size-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-foreground truncate">
                                {formData.resumeFileName}
                              </p>
                              <p className="flex items-center gap-1.5 text-xs text-success">
                                <Sparkles className="size-3.5" /> Resume attached & parsed
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const fileInput = document.getElementById("resume-file") as HTMLInputElement | null;
                              if (fileInput) fileInput.value = "";
                              setFormData({
                                resumeFile: null,
                                resumeFileName: "",
                                name: "",
                                currentRole: "",
                                currentCompany: "",
                                location: "",
                                experience: "",
                                email: "",
                                phone: "",
                                linkedin: "",
                                github: "",
                                portfolio: "",
                                visa: "US Citizen / Permanent Resident",
                                compensation: "",
                                availability: "4 weeks notice",
                                recommendation: "",
                                answers: {},
                              });
                              setParseSuccess(false);
                              setBackendDuplicateMatch(null);
                              toast.info("Resume removed", {
                                description: "All candidate form fields have been emptied.",
                              });
                            }}
                            className="ml-2 rounded p-1.5 text-muted-foreground hover:bg-surface-sunken hover:text-foreground transition-colors"
                            title="Remove resume and clear fields"
                          >
                            <X className="size-5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                          }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={handleDrop}
                          className={`relative grid place-items-center rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                            dragOver
                              ? "border-brand bg-brand/5"
                              : "border-border hover:border-border-strong hover:bg-surface-sunken"
                          }`}
                        >
                          <input
                            type="file"
                            id="resume-file"
                            accept=".pdf,.docx,.doc"
                            onChange={handleFileChange}
                            className="absolute inset-0 cursor-pointer opacity-0"
                          />
                          <div className="flex flex-col items-center gap-2">
                            <div className="grid size-10 place-items-center rounded-full bg-surface-sunken text-muted-foreground">
                              <Upload className="size-5" />
                            </div>
                            <p className="text-[13px] font-medium text-foreground">
                              Click or drag and drop candidate resume here
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Supports PDF and DOCX. Auto-extracts email, phone, and name.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="cand-name" className="text-xs font-medium text-foreground">
                          Candidate full name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="cand-name"
                          required
                          value={formData.name}
                          onChange={(e) => updateField("name", e.target.value)}
                          placeholder="e.g. John Smith"
                          className="h-10 text-[13px]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="cand-exp" className="text-xs font-medium text-foreground">
                          Total experience <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="cand-exp"
                          required
                          value={formData.experience}
                          onChange={(e) => updateField("experience", e.target.value)}
                          placeholder="e.g. 8 years (5 yrs backend)"
                          className="h-10 text-[13px]"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="cand-role" className="text-xs font-medium text-foreground">
                          Current title <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="cand-role"
                          required
                          value={formData.currentRole}
                          onChange={(e) => updateField("currentRole", e.target.value)}
                          placeholder="e.g. Senior Backend Engineer"
                          className="h-10 text-[13px]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="cand-company" className="text-xs font-medium text-foreground">
                          Current company <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="cand-company"
                          required
                          value={formData.currentCompany}
                          onChange={(e) => updateField("currentCompany", e.target.value)}
                          placeholder="e.g. Ramp"
                          className="h-10 text-[13px]"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="cand-loc" className="text-xs font-medium text-foreground">
                          Location <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="cand-loc"
                          required
                          value={formData.location}
                          onChange={(e) => updateField("location", e.target.value)}
                          placeholder="e.g. Manchester, UK"
                          className="h-10 text-[13px]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="cand-email" className="text-xs font-medium text-foreground">
                            Email <span className="text-destructive">*</span>
                          </Label>
                          {parseSuccess && formData.email ? (
                            <span className="text-[10px] font-medium text-brand">Auto-parsed</span>
                          ) : null}
                        </div>
                        <Input
                          id="cand-email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => updateField("email", e.target.value)}
                          placeholder="john.smith@example.com"
                          className="h-10 text-[13px]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="cand-phone" className="text-xs font-medium text-foreground">
                            Phone number <span className="text-destructive">*</span>
                          </Label>
                          {parseSuccess && formData.phone ? (
                            <span className="text-[10px] font-medium text-brand">Auto-parsed</span>
                          ) : null}
                        </div>
                        <Input
                          id="cand-phone"
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => updateField("phone", e.target.value)}
                          placeholder="+44 7700 900123"
                          className="h-10 text-[13px]"
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* STEP 2 */}
                {currentStep === 2 ? (
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <Label htmlFor="cand-linkedin" className="text-xs font-medium text-foreground">
                        LinkedIn profile URL <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Linkedin
                          className={`absolute left-3 top-3 size-4 ${
                            duplicateLinkedinMatch ? "text-destructive" : "text-muted-foreground"
                          }`}
                        />
                        <Input
                          id="cand-linkedin"
                          required
                          value={formData.linkedin}
                          onChange={(e) => updateField("linkedin", e.target.value)}
                          placeholder="https://linkedin.com/in/johnsmith"
                          className={`h-10 pl-9 text-[13px] ${
                            duplicateLinkedinMatch
                              ? "border-destructive text-destructive focus-visible:ring-destructive"
                              : ""
                          }`}
                        />
                      </div>
                      {duplicateLinkedinMatch ? (
                        <div className="mt-2 flex items-start gap-2.5 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                          <AlertCircle className="size-4 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-destructive">Duplicate Candidate Submission Detected</p>
                            <p className="mt-0.5 text-[12px] leading-snug text-destructive/90">
                              A candidate (<span className="font-medium">{duplicateLinkedinMatch.candidateName}</span>) with this LinkedIn profile URL has already been submitted for this job (<span className="font-medium">{job.title}</span>).
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="cand-github" className="text-xs font-medium text-foreground">
                          GitHub profile URL <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="cand-github"
                          required
                          value={formData.github}
                          onChange={(e) => updateField("github", e.target.value)}
                          placeholder="https://github.com/johnsmith"
                          className="h-10 text-[13px]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="cand-portfolio" className="text-xs font-medium text-foreground">
                          Portfolio / Personal website <span className="text-xs text-muted-foreground">(Optional)</span>
                        </Label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-3 size-4 text-muted-foreground" />
                          <Input
                            id="cand-portfolio"
                            value={formData.portfolio}
                            onChange={(e) => updateField("portfolio", e.target.value)}
                            placeholder="https://jsmith.dev"
                            className="h-10 pl-9 text-[13px]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="cand-visa" className="text-xs font-medium text-foreground">
                          Visa / Work authorization <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="cand-visa"
                          required
                          value={formData.visa}
                          onChange={(e) => updateField("visa", e.target.value)}
                          placeholder="e.g. UK citizen / No sponsorship needed"
                          className="h-10 text-[13px]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="cand-comp" className="text-xs font-medium text-foreground">
                          Expected salary / compensation <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="cand-comp"
                          required
                          value={formData.compensation}
                          onChange={(e) => updateField("compensation", e.target.value)}
                          placeholder="e.g. $180,000 target"
                          className="h-10 text-[13px]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="cand-avail" className="text-xs font-medium text-foreground">
                          Notice period / Availability <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="cand-avail"
                          required
                          value={formData.availability}
                          onChange={(e) => updateField("availability", e.target.value)}
                          placeholder="e.g. 4 weeks notice"
                          className="h-10 text-[13px]"
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* STEP 3 */}
                {currentStep === 3 ? (
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <Label htmlFor="cand-rec" className="text-xs font-medium text-foreground">
                        Recruiter recommendation & candidate pitch <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="cand-rec"
                        required
                        rows={4}
                        value={formData.recommendation}
                        onChange={(e) => updateField("recommendation", e.target.value)}
                        placeholder="Detail why this candidate is exceptional for this specific role, their standout achievements, leadership presence, and technical strengths..."
                        className="text-[13px]"
                      />
                    </div>

                    <div className="border-t border-border pt-4">
                      <SectionLabel>Client required screening Q&A</SectionLabel>
                      <div className="mt-3 space-y-4">
                        {job.questions.map((q) => (
                          <div key={q.q} className="space-y-1.5">
                            <Label className="flex items-center gap-2 text-xs font-medium text-foreground">
                              {q.q} <span className="text-destructive">*</span>
                              <StatusBadge tone="warning">
                                Required
                              </StatusBadge>
                            </Label>
                            <Textarea
                              rows={2}
                              required
                              value={formData.answers[q.q] || ""}
                              onChange={(e) => updateAnswer(q.q, e.target.value)}
                              placeholder={`Answer for: ${q.q}`}
                              className="text-[13px]"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* STEP 4 */}
                {currentStep === 4 ? (
                  <div className="space-y-6">
                    <div className="rounded-md border border-border bg-surface-sunken p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-base font-semibold text-foreground">{formData.name}</p>
                          <p className="text-[13px] text-muted-foreground">
                            {formData.currentRole} at {formData.currentCompany} · {formData.location} · {formData.experience}
                          </p>
                        </div>
                        <span className="rounded bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">
                          Ready for submission
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-4 rounded-md border border-border bg-surface p-4 sm:grid-cols-2">
                      <div>
                        <SectionLabel>Contact & Profiles</SectionLabel>
                        <ul className="mt-2 space-y-1 text-[13px]">
                          <li>
                            <span className="font-medium text-muted-foreground">Email:</span>{" "}
                            <span className="text-foreground">{formData.email}</span>
                          </li>
                          <li>
                            <span className="font-medium text-muted-foreground">Phone:</span>{" "}
                            <span className="text-foreground">{formData.phone}</span>
                          </li>
                          <li>
                            <span className="font-medium text-muted-foreground">LinkedIn:</span>{" "}
                            <span className="text-brand truncate">{formData.linkedin}</span>
                          </li>
                          {formData.github ? (
                            <li>
                              <span className="font-medium text-muted-foreground">GitHub:</span>{" "}
                              <span className="text-brand truncate">{formData.github}</span>
                            </li>
                          ) : null}
                          {formData.portfolio ? (
                            <li>
                              <span className="font-medium text-muted-foreground">Portfolio:</span>{" "}
                              <span className="text-brand truncate">{formData.portfolio}</span>
                            </li>
                          ) : null}
                        </ul>
                      </div>

                      <div>
                        <SectionLabel>Terms & Availability</SectionLabel>
                        <ul className="mt-2 space-y-1 text-[13px]">
                          <li>
                            <span className="font-medium text-muted-foreground">Visa / Auth:</span>{" "}
                            <span className="text-foreground">{formData.visa}</span>
                          </li>
                          <li>
                            <span className="font-medium text-muted-foreground">Expected Salary:</span>{" "}
                            <span className="num font-semibold text-foreground">{formData.compensation}</span>
                          </li>
                          <li>
                            <span className="font-medium text-muted-foreground">Notice Period:</span>{" "}
                            <span className="text-foreground">{formData.availability}</span>
                          </li>
                          <li>
                            <span className="font-medium text-muted-foreground">Resume File:</span>{" "}
                            <span className="font-semibold text-foreground">{formData.resumeFileName}</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="rounded-md border border-border p-4">
                      <SectionLabel>Recruiter Recommendation</SectionLabel>
                      <p className="mt-2 text-[13px] leading-6 text-foreground">
                        {formData.recommendation}
                      </p>
                    </div>

                    <div className="rounded-md border border-border p-4">
                      <SectionLabel>Screening Q&A Summary</SectionLabel>
                      <div className="mt-2 space-y-3">
                        {job.questions.map((q) => (
                          <div key={q.q} className="border-b border-border pb-2 last:border-0 last:pb-0">
                            <p className="text-xs font-semibold text-muted-foreground">{q.q}</p>
                            <p className="mt-0.5 text-[13px] text-foreground">
                              {formData.answers[q.q] || "—"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Navigation Buttons */}
                <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3.5 text-[13px] font-semibold text-foreground hover:bg-surface-sunken"
                    >
                      <ArrowLeft className="size-3.5" /> Back
                    </button>
                  ) : (
                    <div />
                  )}

                  {currentStep < 4 ? (
                    <button
                      type="button"
                      disabled={Boolean(duplicateLinkedinMatch)}
                      onClick={nextStep}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-4 text-[13px] font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next step <ArrowRight className="size-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmitting || Boolean(duplicateLinkedinMatch)}
                      onClick={handleSubmit}
                      className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-5 text-[13px] font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" /> Submitting...
                        </>
                      ) : (
                        <>
                          <UserCheck className="size-4" /> Submit Candidate for Approval
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </Panel>
        </div>

        {/* Right Rail: Screening Checklist & Disqualifiers */}
        <aside className="space-y-4">
          <Panel>
            <PanelHeader title="Screening checklist" meta="Confirm before submitting" />
            <ul className="divide-y divide-border">
              {job.requirements.map((r) => (
                <li key={r} className="px-4 py-2.5 text-[13px] leading-5 text-foreground flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader title="Disqualifiers" meta="Automatic rejection criteria" />
            <ul className="divide-y divide-border">
              {job.redFlags.map((r) => (
                <li key={r} className="px-4 py-2.5 text-[13px] leading-5 text-destructive flex items-start gap-2">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>
    </AppShell>
  );
}

