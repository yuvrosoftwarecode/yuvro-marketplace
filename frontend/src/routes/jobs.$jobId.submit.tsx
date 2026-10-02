import { useRef, useState, useEffect, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, FileText, Loader2, Sparkles, Upload, X, Send } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/app/status-badge";
import { getJob, type Job } from "@/lib/data";
import { fetchRecruiterJobById } from "@/lib/recruiter-jobs";
import { parseResumeFile } from "@/lib/resume-parser";
import { api } from "@/lib/api";
import { useAmOptional } from "@/components/am/am-store";
import { normalizeLinkedinUrl } from "@/lib/utils";

export const Route = createFileRoute("/jobs/$jobId/submit")({
  head: () => ({
    meta: [
      { title: "Submit a candidate — job workspace" },
      { name: "description", content: "Upload a resume, add candidate details and submit to the client." },
      { property: "og:title", content: "Submit a candidate — job workspace" },
      { property: "og:description", content: "Upload a resume, add candidate details and submit to the client." },
    ],
  }),
  component: SubmitTab,
});

type Form = {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  portfolio: string;
  livingLocation: string;
  workLocation: string;
  currentSalary: string;
  expectedSalary: string;
  noticePeriod: string;
  visaStatus: string;
  recruiterComments: string;
};

const empty: Form = {
  name: "",
  email: "",
  phone: "",
  linkedin: "",
  github: "",
  portfolio: "",
  livingLocation: "",
  workLocation: "",
  currentSalary: "",
  expectedSalary: "",
  noticePeriod: "",
  visaStatus: "",
  recruiterComments: "",
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function F({
  id,
  label,
  required,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
}: {
  id: keyof Form;
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: string | undefined;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[13px] font-medium text-foreground">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`h-10 text-[13px] ${
          error ? "border-destructive text-destructive focus-visible:ring-destructive" : ""
        }`}
        aria-invalid={!!error}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SubmitTab() {
  const { jobId } = Route.useParams();
  const [job, setJob] = useState<Job | null>(getJob(jobId) || null);
  const am = useAmOptional();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [rawFile, setRawFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendDuplicateMatch, setBackendDuplicateMatch] = useState<{
    candidateName?: string;
    matchedUrl?: string;
    reason?: string;
    message?: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    if (jobId) {
      fetchRecruiterJobById(jobId).then((fetched) => {
        if (active && fetched) setJob(fetched);
      });
    }
    return () => {
      active = false;
    };
  }, [jobId]);

  const activeJobIdentifiers = useMemo(() => {
    const set = new Set<string>();
    if (jobId) set.add(String(jobId).toLowerCase());
    if (job?.id) set.add(String(job.id).toLowerCase());
    if (job?.backendId) set.add(String(job.backendId).toLowerCase());
    if (job?.slug) set.add(String(job.slug).toLowerCase());

    if (am?.state?.jobs) {
      for (const j of am.state.jobs) {
        if (
          (jobId && (j.id === jobId || j.slug === jobId)) ||
          (job?.id && (j.id === job.id || j.slug === job.id)) ||
          (job?.backendId && (j.id === job.backendId || j.slug === job.backendId)) ||
          (job?.title && j.title?.toLowerCase() === job.title?.toLowerCase()) ||
          (job?.slug && j.slug?.toLowerCase() === job.slug?.toLowerCase())
        ) {
          if (j.id) set.add(String(j.id).toLowerCase());
          if (j.slug) set.add(String(j.slug).toLowerCase());
        }
      }
    }
    return set;
  }, [jobId, job, am?.state?.jobs]);

  const localDuplicateMatch = useMemo(() => {
    const normInput = normalizeLinkedinUrl(form.linkedin);
    if (!normInput || !am?.state) return null;

    const { submissions, candidates } = am.state;

    // Check existing submissions for THIS active job only
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
  }, [form.linkedin, am?.state, activeJobIdentifiers]);

  const duplicateLinkedinMatch = localDuplicateMatch || backendDuplicateMatch;

  const checkDuplicateWithBackend = async (linkedinUrl: string) => {
    const norm = normalizeLinkedinUrl(linkedinUrl);
    if (!norm) {
      setBackendDuplicateMatch(null);
      return null;
    }

    const currentJobId = job?.backendId || job?.id || jobId;
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
      if (form.linkedin) {
        checkDuplicateWithBackend(form.linkedin);
      } else {
        setBackendDuplicateMatch(null);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [form.linkedin, job?.backendId, job?.id, jobId]);

  const canSubmit = job?.status === "approved" || job?.status === "not_applied";

  const setField = (k: keyof Form) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[k];
        return next;
      });
    }
  };

  // Screening questions setup: use job's candidate questions or fallback to standard ones
  const activeQuestions = useMemo(() => {
    const rawQuestions = job?.questions || [];
    const filtered = rawQuestions.filter((q) => {
      const text = (q.q || "").toLowerCase();
      return !text.includes("upload resume") && !text.includes("linkedin profile url");
    });
    if (filtered.length > 0) return filtered;
    return [
      { q: "Why is this candidate a strong match for this role?", required: true, type: "Long text" },
      { q: "Current notice period and availability to start?", required: true, type: "Short text" },
    ];
  }, [job?.questions]);

  async function onFileSelected(f: File | undefined) {
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase() || "";
    if (!["pdf", "doc", "docx"].includes(ext)) {
      toast.error("Please upload a PDF, DOC, or DOCX resume");
      return;
    }

    setRawFile(f);
    setFileInfo({ name: f.name, size: f.size });

    try {
      const parsed = await parseResumeFile(f);
      setForm((prev) => ({
        ...prev,
        name: parsed.name || prev.name || "",
        email: parsed.email || prev.email || "",
        phone: parsed.phone || prev.phone || "",
        linkedin: parsed.linkedin || prev.linkedin || "",
        github: parsed.github || prev.github || "",
        portfolio: parsed.portfolio || prev.portfolio || "",
      }));
      setErrors((prev) => {
        const next = { ...prev };
        if (parsed.name) delete next.name;
        if (parsed.email) delete next.email;
        if (parsed.phone) delete next.phone;
        if (parsed.linkedin) delete next.linkedin;
        if (parsed.github) delete next.github;
        return next;
      });

      // As soon as resume is uploaded, immediately check LinkedIn duplicate for this job!
      if (parsed.linkedin) {
        checkDuplicateWithBackend(parsed.linkedin).then((match) => {
          if (match) {
            toast.error("Duplicate candidate for this job", {
              description: match.message,
            });
          } else {
            toast.success("Resume attached", {
              description: "Extracted candidate details into form fields.",
            });
          }
        });
      } else {
        toast.success("Resume attached", {
          description: "Extracted candidate details into form fields.",
        });
      }
    } catch (e: any) {
      console.warn("Resume parse warning:", e);
    }
  }

  async function handleSubmit() {
    if (duplicateLinkedinMatch) {
      toast.error("Cannot submit candidate", {
        description:
          duplicateLinkedinMatch.message ||
          "A candidate with this LinkedIn profile has already been submitted for this job.",
      });
      return;
    }

    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Candidate name is required";
    if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = "Enter a valid email address";
    if (!form.phone.trim()) errs.phone = "Mobile number is required";
    if (!form.linkedin.trim()) errs.linkedin = "Enter candidate's LinkedIn profile URL";
    if (!form.github.trim()) errs.github = "Enter candidate's GitHub profile URL";
    if (!form.livingLocation.trim()) errs.livingLocation = "Living location is required";
    if (!form.workLocation.trim()) errs.workLocation = "Work location is required";
    if (!form.currentSalary.trim()) errs.currentSalary = "Current salary is required";
    if (!form.expectedSalary.trim()) errs.expectedSalary = "Expected salary is required";
    if (!form.noticePeriod.trim()) errs.noticePeriod = "Notice period is required";
    if (!form.visaStatus.trim()) errs.visaStatus = "Visa status is required";
    if (!form.recruiterComments.trim()) errs.recruiterComments = "Recruiter standout features / comments are required";

    // Validate screening questions (all mandatory)
    activeQuestions.forEach((q, idx) => {
      if (!answers[q.q]?.trim()) {
        errs[`question_${idx}`] = "This question is required";
      }
    });

    setErrors(errs);
    if (!rawFile) {
      toast.error("Please upload the candidate's resume");
      return;
    }
    if (Object.keys(errs).length > 0) {
      toast.error("Please complete all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Re-verify with backend right before submitting
      const dup = await checkDuplicateWithBackend(form.linkedin);
      if (dup) {
        toast.error("Cannot submit candidate", {
          description: dup.message,
        });
        setIsSubmitting(false);
        return;
      }

      const qAnswers = activeQuestions.map((q, idx) => ({
        question_id: (q as any).id || `q${idx + 1}`,
        question: q.q,
        q: q.q,
        answer: answers[q.q]?.trim() || "—",
        a: answers[q.q]?.trim() || "—",
      }));

      // 1. Submit to backend API
      const targetJob = job?.backendId || job?.id || jobId;
      const formPayload = new FormData();
      if (targetJob) formPayload.append("job_id", String(targetJob));
      formPayload.append("first_name", form.name.split(" ")[0] || form.name);
      formPayload.append("last_name", form.name.split(" ").slice(1).join(" ") || "Candidate");
      formPayload.append("email", form.email.trim());
      formPayload.append("phone", form.phone.trim());
      formPayload.append("mobile", form.phone.trim());
      formPayload.append("linkedin_url", form.linkedin.trim());
      formPayload.append("github_url", form.github.trim());
      formPayload.append("portfolio_url", form.portfolio.trim());
      formPayload.append("living_location", form.livingLocation.trim());
      formPayload.append("work_location", form.workLocation.trim());
      formPayload.append("location", form.livingLocation.trim() || form.workLocation.trim());
      formPayload.append("current_salary", form.currentSalary.trim());
      formPayload.append("expected_salary", form.expectedSalary.trim());
      formPayload.append("compensation", form.expectedSalary.trim() || form.currentSalary.trim());
      formPayload.append("notice_period", form.noticePeriod.trim());
      formPayload.append("availability", form.noticePeriod.trim());
      formPayload.append("visa_status", form.visaStatus.trim());
      formPayload.append("work_authorization_status", form.visaStatus.trim());
      formPayload.append("recruiter_comments", form.recruiterComments.trim());
      formPayload.append("recommendation", form.recruiterComments.trim());
      formPayload.append("answers", JSON.stringify(qAnswers));

      if (rawFile) {
        formPayload.append("resume", rawFile);
      }

      try {
        await api.post("/api/recruiting/submissions/", formPayload);
      } catch (postErr: any) {
        const errorDetail =
          postErr?.data?.detail ||
          postErr?.data?.message ||
          postErr?.message ||
          "Failed to submit candidate to backend.";

        if (
          errorDetail.includes("already been submitted") ||
          errorDetail.includes("already submitted")
        ) {
          setBackendDuplicateMatch({
            candidateName: form.name,
            matchedUrl: form.linkedin,
            reason: "already_submitted_for_job",
            message: errorDetail,
          });
        }
        throw new Error(errorDetail);
      }

      // Refresh submissions directly from backend database
      await am?.refreshSubmissions(true).catch(() => {});

      toast.success("Candidate submitted successfully!", {
        description: `${form.name} → ${job?.company || "Client"}`,
      });
      navigate({ to: "/jobs/$jobId/pipeline", params: { jobId } });
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit candidate.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-4">
        <Section
          title="Resume *"
          description="Upload a PDF resume to auto-fill candidate details."
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => onFileSelected(e.target.files?.[0])}
          />
          {fileInfo ? (
            <div className="flex items-center gap-3 rounded-md border border-border bg-surface-sunken/60 px-3 py-2.5">
              <span className="grid size-8 place-items-center rounded-md bg-brand-soft text-brand">
                <FileText className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-foreground">{fileInfo.name}</p>
                <p className="text-[11px] text-muted-foreground">{formatFileSize(fileInfo.size)}</p>
              </div>
              <button
                type="button"
                aria-label="Remove resume"
                onClick={() => {
                  setRawFile(null);
                  setFileInfo(null);
                  if (fileRef.current) {
                    fileRef.current.value = "";
                  }
                  setForm(empty);
                  setAnswers({});
                  setErrors({});
                  setBackendDuplicateMatch(null);
                  toast.info("Resume removed", {
                    description: "All candidate form fields have been emptied.",
                  });
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onFileSelected(e.dataTransfer.files[0]);
              }}
              className="flex w-full flex-col items-center gap-1.5 rounded-md border border-dashed border-border bg-surface-sunken/40 px-4 py-6 text-center hover:bg-surface-sunken transition-colors"
            >
              <Upload className="size-5 text-muted-foreground" />
              <span className="text-[13px] font-medium text-foreground">
                Drag &amp; drop resume here, or click to browse
              </span>
              <span className="text-[11px] text-muted-foreground">PDF, DOC or DOCX</span>
            </button>
          )}
        </Section>

        {duplicateLinkedinMatch ? (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="size-5 shrink-0 mt-0.5 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-destructive">Duplicate Candidate LinkedIn Profile Detected</p>
              <p className="mt-1 text-xs leading-relaxed text-destructive/90">{duplicateLinkedinMatch.message}</p>
              <p className="mt-1.5 font-medium text-[11px] text-destructive">
                This candidate has already been submitted for this job. Duplicate submissions for the same role are not permitted.
              </p>
            </div>
          </div>
        ) : null}

        <Section
          title="Candidate Details"
          description="Basic identifying information and online profiles of the candidate for verification and reference."
        >
          <div className="space-y-4">
            <F
              id="name"
              label="Name"
              required
              value={form.name}
              onChange={setField("name")}
              placeholder="Candidate full name"
              error={errors.name}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <F
                id="email"
                label="Email"
                required
                type="email"
                value={form.email}
                onChange={setField("email")}
                placeholder="candidate@example.com"
                error={errors.email}
              />
              <F
                id="phone"
                label="Mobile number"
                required
                value={form.phone}
                onChange={setField("phone")}
                placeholder="+1 (555) 000-0000"
                error={errors.phone}
              />
              <F
                id="linkedin"
                label="LinkedIn URL"
                required
                value={form.linkedin}
                onChange={setField("linkedin")}
                placeholder="https://linkedin.com/in/username"
                error={errors.linkedin || (duplicateLinkedinMatch ? duplicateLinkedinMatch.message : undefined)}
              />
              <F
                id="github"
                label="GitHub URL"
                required
                value={form.github}
                onChange={setField("github")}
                placeholder="https://github.com/username"
                error={errors.github}
              />
              {duplicateLinkedinMatch ? (
                <div className="sm:col-span-2 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <p className="text-xs">{duplicateLinkedinMatch.message}</p>
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <F
                  id="portfolio"
                  label="Portfolio URL (Optional)"
                  value={form.portfolio}
                  onChange={setField("portfolio")}
                  placeholder="https://portfolio.me"
                />
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Location & Compensation"
          description="Where the candidate lives and works, pay expectations and availability."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <F
              id="livingLocation"
              label="Living location"
              required
              value={form.livingLocation}
              onChange={setField("livingLocation")}
              placeholder="City, country"
              error={errors.livingLocation}
            />
            <F
              id="workLocation"
              label="Work location"
              required
              value={form.workLocation}
              onChange={setField("workLocation")}
              placeholder="Preferred work location"
              error={errors.workLocation}
            />
            <F
              id="currentSalary"
              label="Current salary"
              required
              value={form.currentSalary}
              onChange={setField("currentSalary")}
              placeholder="e.g. $180,000"
              error={errors.currentSalary}
            />
            <F
              id="expectedSalary"
              label="Expected salary"
              required
              value={form.expectedSalary}
              onChange={setField("expectedSalary")}
              placeholder="e.g. $220,000"
              error={errors.expectedSalary}
            />
            <F
              id="noticePeriod"
              label="Notice period"
              required
              value={form.noticePeriod}
              onChange={setField("noticePeriod")}
              placeholder="e.g. 30 days"
              error={errors.noticePeriod}
            />
            <F
              id="visaStatus"
              label="Visa status"
              required
              value={form.visaStatus}
              onChange={setField("visaStatus")}
              placeholder="e.g. US Citizen, H-1B"
              error={errors.visaStatus}
            />
          </div>
        </Section>

        <Section
          title="Recruiter Comments"
          description="Why is this candidate a good fit? Motivation, compensation alignment, standout strengths."
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="recruiterComments" className="text-[13px] font-medium text-foreground">
                Standout features / Why are they a good fit <span className="text-destructive">*</span>
              </Label>
              <span className="text-[11px] text-muted-foreground">
                {form.recruiterComments.length}/2000
              </span>
            </div>
            <Textarea
              id="recruiterComments"
              rows={4}
              maxLength={2000}
              value={form.recruiterComments}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, recruiterComments: e.target.value }));
                if (errors.recruiterComments) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.recruiterComments;
                    return next;
                  });
                }
              }}
              placeholder="Why is this candidate a good fit? Motivation, compensation alignment, standout strengths."
              className={`text-[13px] ${
                errors.recruiterComments ? "border-destructive text-destructive focus-visible:ring-destructive" : ""
              }`}
            />
            {errors.recruiterComments ? (
              <p className="text-xs text-destructive">{errors.recruiterComments}</p>
            ) : null}
          </div>
        </Section>

        <Section
          title="Screening Questions"
          description="Answer the client's required screening questions for this candidate."
        >
          <div className="space-y-4">
            {activeQuestions.map((q, idx) => (
              <div key={q.q || idx} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={`q-${idx}`} className="text-[13px] font-medium text-foreground">
                    {q.q} <span className="text-destructive">*</span>
                  </Label>
                  <StatusBadge tone="warning" className="shrink-0 text-[10px]">
                    Required
                  </StatusBadge>
                </div>
                {q.type === "Long text" || q.q.length > 50 ? (
                  <Textarea
                    id={`q-${idx}`}
                    rows={3}
                    value={answers[q.q] || ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.q]: e.target.value }))}
                    placeholder={`Enter response for: ${q.q}`}
                    className="text-[13px]"
                  />
                ) : (
                  <Input
                    id={`q-${idx}`}
                    value={answers[q.q] || ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.q]: e.target.value }))}
                    placeholder={`Enter response for: ${q.q}`}
                    className="h-10 text-[13px]"
                  />
                )}
                {errors[`question_${idx}`] ? (
                  <p className="text-xs text-destructive">{errors[`question_${idx}`]}</p>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      </div>

      <aside className="lg:sticky lg:top-4 lg:self-start">
        <div className="flex flex-col rounded-lg border border-border bg-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-1.5 text-[13px] font-semibold text-brand">
              <Sparkles className="size-3.5" /> Evaluation
            </div>
            <StatusBadge tone="neutral">Coming soon</StatusBadge>
          </div>
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-3 grid size-10 place-items-center rounded-full bg-brand-soft text-brand">
              <Sparkles className="size-5" />
            </div>
            <p className="text-[13px] font-medium text-foreground">AI Match &amp; Evaluation</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Upload a resume to see how the candidate matches this job&apos;s requirements.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-sunken px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              Coming soon
            </div>
          </div>
          <div className="border-t border-border p-3">
            <label className="mb-3 flex cursor-pointer items-start gap-2 text-xs leading-5 text-muted-foreground">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
              />
              <span>
                I confirm that the candidate has been contacted and agreed to apply for this role, and I accept the{" "}
                <a
                  href="/help"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-brand underline-offset-2 hover:underline"
                >
                  Terms &amp; Conditions
                </a>.
              </span>
            </label>
            <button
              type="button"
              disabled={!canSubmit || !consent || isSubmitting || Boolean(duplicateLinkedinMatch)}
              onClick={handleSubmit}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand text-[13px] font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Submit to {job?.company || "Client"}
            </button>
            {duplicateLinkedinMatch ? (
              <p className="mt-2 text-center text-[11px] font-medium text-destructive">
                Submission blocked: A candidate with this LinkedIn profile has already been submitted for this job.
              </p>
            ) : !canSubmit ? (
              <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
                Submissions open once this job is active.
              </p>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
