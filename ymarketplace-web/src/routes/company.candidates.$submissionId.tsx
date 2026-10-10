import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  ExternalLink,
  FileText,
  Github,
  HelpCircle,
  Linkedin,
  Loader2,
  Mail,
  MessageSquareText,
  Network,
  Phone,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { CompanyShell } from "@/components/company/company-shell";
import { stageToneOf } from "@/components/company/review-bits";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getStageLabel, type CandidateStage } from "@/lib/am-data";
import { normalizeStageId } from "@/lib/data";
import { candidateMatch } from "@/lib/company-candidate-match";
import { fitTone } from "@/lib/matchmaker";
import {
  normalizeUrl,
  rejectionReasons,
  reviewRowById,
  signedInCompany,
  signedInCompanyUser,
  stageLabel,
  type ReviewRow,
} from "@/lib/company-review";
import { useReviewStore } from "@/lib/company-review-store";
import { DocxResumeViewer } from "@/components/common/docx-resume-viewer";
import { extractFromDocx } from "@/lib/resume-parser";

export const Route = createFileRoute("/company/candidates/$submissionId")({
  head: () => ({
    meta: [
      { title: "Candidate Review — Company Portal" },
      {
        name: "description",
        content:
          "Full candidate evaluation: AI summary with a match score out of 5, candidate details and stage decision.",
      },
      { property: "og:title", content: "Candidate Review — Company Portal" },
      {
        property: "og:description",
        content: "Evaluate a submitted candidate with an evidence-based AI summary and move them to the next stage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CandidateReviewPage,
});

export interface HiringStep {
  id: string;
  label: string;
}

function CandidateReviewPage() {
  const { submissionId } = Route.useParams();
  const navigate = useNavigate();
  const { stages, move } = useReviewStore();
  const mockRow = useMemo(() => reviewRowById(submissionId, stages), [submissionId, stages]);

  const [realRow, setRealRow] = useState<ReviewRow | null>(null);
  const [isLoadingReal, setIsLoadingReal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (mockRow) return;
    let isMounted = true;
    setIsLoadingReal(true);

    async function loadReal() {
      try {
        const s = await api.get<any>(`/api/recruiting/submissions/${submissionId}/`);
        if (!s || !isMounted) return;
        const cand = s.candidate || {};
        const app = s.application || {};
        const jobData = app.job || {};
        const candName =
          cand.full_name ||
          `${cand.first_name || ""} ${cand.last_name || ""}`.trim() ||
          "Candidate";

        const mappedStage = (s.stage || "company_review") as CandidateStage;

        const currentComp =
          cand.current_compensation ||
          cand.current_salary ||
          cand.currentCompensation ||
          cand.currentSalary ||
          "";

        const expectedComp =
          cand.expected_salary ||
          cand.expectedCompensation ||
          cand.compensation ||
          (cand.base_compensation_expectation
            ? `$${cand.base_compensation_expectation}`
            : "");

        const noticeVal = cand.notice_period || cand.availability || "";
        const visaVal =
          cand.work_authorization_status ||
          cand.visa_status ||
          cand.visa ||
          "";

        const mapped: ReviewRow = {
          submission: {
            id: s.id,
            jobId: jobData.id || "",
            candidateId: cand.id || "",
            recruiterId: app.recruiter?.id || "",
            status: s.status || "submitted",
            stage: mappedStage,
            match: 92,
            lastActivity: s.updated_at
              ? new Date(s.updated_at).toLocaleDateString()
              : "Recent",
            answers: s.answers || [],
            evaluations: [],
            notes: s.recruiter_notes
              ? [
                  {
                    author: app.recruiter?.full_name || "Recruiter",
                    text: s.recruiter_notes,
                    date: "Submission note",
                  },
                ]
              : [],
            timeline: [],
            ai: {
              score: 92,
              strengths: ["Candidate application verified", "Resume and profile attached"],
              gaps: [],
              redFlags: [],
            },
          } as any,
          candidate: {
            id: cand.id || s.id,
            name: candName,
            email: cand.email || "",
            phone: cand.phone || "",
            currentRole: cand.current_title || "Candidate",
            currentCompany: cand.current_company || "Available",
            location: cand.current_location || "Remote",
            yearsExperience: 5,
            skills: Array.isArray(cand.skills) ? cand.skills : [],
            noticePeriod: noticeVal || "—",
            availability: noticeVal || "—",
            expectedSalary: expectedComp || "—",
            expectedCompensation: expectedComp || "—",
            compensation: expectedComp || "—",
            currentCompensation: currentComp || "Not provided",
            currentSalary: currentComp || "Not provided",
            visa: visaVal || "—",
            visaStatus: visaVal || "—",
            linkedin: cand.linkedin_url,
            github: cand.github_url,
            portfolio: cand.portfolio_url,
            resume: cand.resume_url || cand.resume || "",
            resumeUrl: cand.resume_url || (cand.resume?.startsWith("http") ? cand.resume : ""),
          } as any,
          job: {
            id: jobData.id || "",
            companyId: jobData.company?.id || "",
            title: jobData.title || "Job Post",
            department: jobData.department || "Engineering",
            location: jobData.location || "Remote",
            workModel: jobData.work_model || "Remote",
            employmentType: jobData.employment_type || "Full-time",
            status: jobData.status || "active",
            salaryMin: Number(jobData.salary_min || 0),
            salaryMax: Number(jobData.salary_max || 0),
            currency: jobData.salary_currency || "USD",
            hiring_process: jobData.hiring_process || [],
            process: jobData.hiring_process || jobData.process || [],
            mustHave: Array.isArray(jobData.requirements) ? jobData.requirements : [],
            skills: [],
            niceToHave: [],
            otherRequirements: [],
            jd: {
              requirements: Array.isArray(jobData.requirements) ? jobData.requirements : [],
            },
            candidatesCount: 1,
            activeCount: 1,
            lastActivity: "Recent",
          } as any,
          recruiter: app.recruiter
            ? ({
                id: app.recruiter.id,
                name: app.recruiter.full_name || app.recruiter.email,
                email: app.recruiter.email,
                agency: "Independent",
                status: "active",
              } as any)
            : null,
          stage: mappedStage,
        };

        setRealRow(mapped);
      } catch (err) {
        console.error("Failed to load real candidate submission:", err);
      } finally {
        if (isMounted) setIsLoadingReal(false);
      }
    }

    loadReal();

    return () => {
      isMounted = false;
    };
  }, [submissionId, mockRow]);

  const row = mockRow || realRow;

  const [pending, setPending] = useState<string>("");
  const [reason, setReason] = useState(rejectionReasons[0] ?? "Skills mismatch");
  const [note, setNote] = useState("");
  const [resumeOpen, setResumeOpen] = useState(false);
  const [docxText, setDocxText] = useState<string | null>(null);
  const [docxLoading, setDocxLoading] = useState(false);

  // Hiring process steps derived dynamically from the job
  const hiringSteps: HiringStep[] = useMemo(() => {
    const jobData = row?.job;
    let raw: string[] = [];
    const hp = (jobData as any)?.hiring_process || (jobData as any)?.hiringProcess || (jobData as any)?.process;
    if (Array.isArray(hp) && hp.length > 0) {
      raw = hp;
    } else if (typeof hp === "string" && hp.trim()) {
      try {
        const parsed = JSON.parse(hp);
        if (Array.isArray(parsed) && parsed.length > 0) raw = parsed;
      } catch {
        raw = hp.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    }

    // Filter out AM review and rejected from company hiring process steps
    const filtered = raw.filter((step) => {
      const norm = normalizeStageId(step);
      return norm !== "am_review" && norm !== "rejected";
    });

    if (filtered.length === 0) {
      return [
        { id: "recruiter_screen", label: "Recruiter screen" },
        { id: "hiring_manager", label: "Hiring manager interview" },
        { id: "technical_loop", label: "Technical loop" },
        { id: "offer", label: "Final decision & offer" },
      ];
    }

    return filtered.map((step) => ({
      id: normalizeStageId(step),
      label: step,
    }));
  }, [row?.job]);

  const rowCandidate = row?.candidate;
  const resumeLink = (rowCandidate as any)?.resumeUrl || (rowCandidate?.resume?.startsWith("http") ? rowCandidate.resume : "");
  const resumeDisplayName =
    rowCandidate?.resume && !rowCandidate.resume.startsWith("http")
      ? rowCandidate.resume.split("/").pop() || "resume.pdf"
      : (rowCandidate as any)?.resumeUrl
        ? (rowCandidate as any).resumeUrl.split("?")[0].split("/").pop() || "resume.pdf"
        : "resume.pdf";

  const isDocx = Boolean(
    resumeDisplayName.toLowerCase().endsWith(".docx") ||
      resumeDisplayName.toLowerCase().endsWith(".doc") ||
      resumeLink.toLowerCase().includes(".docx") ||
      resumeLink.toLowerCase().includes(".doc")
  );

  useEffect(() => {
    if (resumeOpen && isDocx && resumeLink) {
      setDocxLoading(true);
      fetch(resumeLink)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch resume file buffer");
          return res.arrayBuffer();
        })
        .then((buffer) => extractFromDocx(buffer))
        .then((text) => {
          setDocxText(text);
          setDocxLoading(false);
        })
        .catch((err) => {
          console.warn("Failed to extract DOCX text:", err);
          setDocxText(null);
          setDocxLoading(false);
        });
    }
  }, [resumeOpen, isDocx, resumeLink]);

  if (isLoadingReal) {
    return (
      <CompanyShell title="Candidate" description="Loading candidate details...">
        <div className="flex h-64 items-center justify-center rounded-md border border-border bg-surface">
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-brand" />
            <span>Loading candidate profile...</span>
          </div>
        </div>
      </CompanyShell>
    );
  }

  if (!row) {
    return (
      <CompanyShell title="Candidate" description="Candidate review">
        <div className="rounded-md border border-border bg-surface">
          <EmptyState
            title="Candidate not found"
            description="This submission is no longer available for review."
            action={
              <Button asChild size="sm" variant="outline">
                <Link to="/company/candidates/active">Back to Pipeline</Link>
              </Button>
            }
          />
        </div>
      </CompanyShell>
    );
  }

  const { candidate, job, submission, stage } = row;
  const company = signedInCompany();
  const match = candidateMatch(job, candidate, submission);

  // Current stage matching against hiringSteps
  const currentNormalized = normalizeStageId(stage || submission.stage || "");
  let currentStepIndex = hiringSteps.findIndex((s) => s.id === currentNormalized);
  if (currentStepIndex === -1) {
    currentStepIndex = hiringSteps.findIndex(
      (s) =>
        s.label.toLowerCase() === (stage || "").toLowerCase() ||
        s.id.includes(currentNormalized) ||
        currentNormalized.includes(s.id)
    );
  }
  const activeStep = currentStepIndex >= 0 ? hiringSteps[currentStepIndex] : null;
  const isRejected = stage === "rejected" || submission.status === "rejected";

  const nextStep =
    !isRejected && currentStepIndex >= 0 && currentStepIndex < hiringSteps.length - 1
      ? hiringSteps[currentStepIndex + 1]
      : null;

  const commit = async (to: string, extra: { reason?: string; note?: string } = {}) => {
    setIsUpdating(true);
    const isReject = to === "rejected";
    const finalReason = isReject ? (extra.reason || reason || "Not a match") : "";
    const finalNote = extra.note || (isReject ? finalReason : note.trim());

    if (realRow) {
      try {
        await api.patch(`/api/recruiting/submissions/${submission.id}/`, {
          stage: to,
          status: isReject ? "rejected" : "under_review",
          rejection_reason: finalReason,
          decision_note: finalNote,
        });
        setRealRow((prev) =>
          prev
            ? {
                ...prev,
                stage: to as any,
                submission: {
                  ...prev.submission,
                  stage: to as any,
                  status: isReject ? "rejected" : "under_review",
                  decision_note: finalNote,
                  rejection_reason: finalReason,
                },
              }
            : null
        );
      } catch (patchErr: any) {
        console.error("Failed to update submission on backend:", patchErr);
        toast.error("Failed to update stage: " + (patchErr.message || "Unknown error"));
        setIsUpdating(false);
        return;
      }
    }

    move({
      submissionId: submission.id,
      candidate: candidate.name,
      job: job.title,
      from: stage,
      to: to as any,
      by: signedInCompanyUser,
      ...extra,
    });

    const targetLabel = hiringSteps.find((s) => s.id === to)?.label || (isReject ? "Rejected" : to);
    toast.success(isReject ? `${candidate.name} rejected` : `${candidate.name} moved to ${targetLabel}`, {
      description: `${job.title} · by ${signedInCompanyUser}`,
    });
    setIsUpdating(false);
    setPending("");
    setNote("");
  };

  const onStagePick = (value: string) => {
    if (!value) return;
    if (value === "rejected") {
      setPending("rejected");
      return;
    }
    commit(value, note.trim() ? { note: note.trim() } : {});
  };

  const links = [
    candidate.portfolio
      ? { label: "Yuvro Evaluations", href: normalizeUrl(candidate.portfolio), icon: Network }
      : null,
    candidate.linkedin ? { label: "LinkedIn Profile", href: normalizeUrl(candidate.linkedin), icon: Linkedin } : null,
    candidate.github ? { label: "GitHub Profile", href: normalizeUrl(candidate.github), icon: Github } : null,
  ].filter((l): l is { label: string; href: string; icon: typeof Linkedin } => l !== null);

  const scoreOutOfFive = Math.round((match.overall.score / 20) * 10) / 10;
  const currentStageLabel = isRejected ? "Rejected" : (activeStep?.label || getStageLabel(stage));

  return (
    <CompanyShell
      title={candidate.name}
      description={`${job.title} · ${company.name}`}
      actions={
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/company/candidates/active">
              <ArrowLeft className="size-4" /> Back to Pipeline
            </Link>
          </Button>
          <Button size="sm" variant="outline" onClick={() => setResumeOpen(true)}>
            <FileText className="size-4" /> Preview resume
          </Button>
          {resumeLink ? (
            <a
              href={resumeLink}
              download
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-semibold text-foreground hover:bg-surface-sunken"
            >
              <ExternalLink className="size-3.5" /> Download
            </a>
          ) : null}
        </div>
      }
    >
      <div className="mx-auto max-w-[1500px] overflow-hidden rounded-md border border-border bg-surface shadow-panel">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-5 lg:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl font-semibold text-foreground">{candidate.name}</h2>
              <StatusBadge tone={isRejected ? "danger" : stageToneOf(stage)} dot>
                {currentStageLabel}
              </StatusBadge>
            </div>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Candidate for <span className="font-medium text-foreground">{job.title}</span> · {candidate.location}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setResumeOpen(true)}>
              <FileText className="size-4" /> View resume
            </Button>
          </div>
        </header>

        <div className="grid min-w-0 xl:grid-cols-[270px_minmax(420px,1fr)_340px]">
          {/* Candidate Details Sidebar */}
          <aside className="border-b border-border bg-surface-sunken/50 xl:border-r xl:border-b-0">
            <div className="border-b border-border px-5 py-3.5">
              <p className="label-caps">Candidate details</p>
            </div>
            <dl className="divide-y divide-border">
              <FactRow label="Email" value={candidate.email} href={`mailto:${candidate.email}`} icon={Mail} />
              <FactRow label="Phone number" value={candidate.phone} href={`tel:${candidate.phone}`} icon={Phone} />
              <div className="min-w-0 px-5 py-3.5">
                <p className="label-caps">Resume</p>
                <div className="mt-1 flex items-center gap-2">
                  {candidate.resume || (candidate as any).resumeUrl ? (
                    <button
                      type="button"
                      onClick={() => setResumeOpen(true)}
                      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand hover:underline"
                    >
                      <FileText className="size-3.5" />
                      <span className="truncate max-w-[190px]">{resumeDisplayName}</span>
                    </button>
                  ) : (
                    <span className="text-[13px] text-muted-foreground">—</span>
                  )}
                </div>
              </div>
              <FactRow
                label="Current compensation"
                value={
                  candidate.currentCompensation ||
                  (candidate as any).current_compensation ||
                  (candidate as any).currentSalary ||
                  (candidate as any).current_salary ||
                  "Not provided"
                }
                mono={Boolean(
                  candidate.currentCompensation &&
                    candidate.currentCompensation !== "Not provided" &&
                    candidate.currentCompensation !== "—",
                )}
              />
              <FactRow
                label="Expected compensation"
                value={
                  candidate.expectedCompensation ||
                  candidate.compensation ||
                  candidate.expectedSalary ||
                  (candidate as any).expected_salary ||
                  "—"
                }
                mono
              />
              <FactRow
                label="Notice period"
                value={
                  candidate.noticePeriod ||
                  candidate.availability ||
                  (candidate as any).notice_period ||
                  "—"
                }
              />
              <FactRow
                label="Visa status"
                value={
                  candidate.visa ||
                  candidate.visaStatus ||
                  (candidate as any).work_authorization_status ||
                  "—"
                }
              />
            </dl>
            <div className="border-t border-border px-5 py-4">
              <p className="label-caps">Professional links</p>
              <div className="mt-3 space-y-1.5">
                {links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-2 rounded-sm px-2 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    <link.icon className="size-4 text-muted-foreground" />
                    <span className="flex-1">{link.label}</span>
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </div>
          </aside>

          {/* AI Match Summary */}
          <main className="min-w-0 border-b border-border xl:border-r xl:border-b-0">
            <section className="grid sm:grid-cols-[150px_minmax(0,1fr)]">
              <div className="border-b border-border bg-brand-soft px-5 py-5 sm:border-r sm:border-b-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-brand" />
                  <p className="label-caps">AI match</p>
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="num text-4xl font-semibold text-foreground">{scoreOutOfFive.toFixed(1)}</span>
                  <span className="num text-sm text-muted-foreground">/ 5</span>
                </div>
                <div className="mt-2 flex gap-0.5" aria-label={`${scoreOutOfFive} out of 5`}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "size-3.5",
                        star <= Math.round(scoreOutOfFive) ? "fill-brand text-brand" : "text-border-strong"
                      )}
                    />
                  ))}
                </div>
                <StatusBadge className="mt-3" tone={fitTone[match.overall.fit]}>
                  {match.overall.fit}
                </StatusBadge>
              </div>
              <div className="px-5 py-5">
                <p className="text-[13px] leading-6 text-foreground">{match.overall.summary}</p>
                <div className="mt-4 grid gap-3.5 border-t border-border pt-4">
                  <SummaryList title="Strong matches" items={match.summary.strongMatches} kind="good" />
                  <SummaryList title="Potential gaps" items={match.summary.gaps} kind="warn" />
                  <SummaryList title="Verify" items={match.summary.needsVerification} kind="verify" />
                </div>
              </div>
            </section>
          </main>

          {/* Decision Section with Job's Hiring Process Steps */}
          <aside className="bg-surface xl:sticky xl:top-4 xl:self-start">
            <section className="border-b border-border">
              <div className="border-b border-border px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold text-foreground">Decision</h3>
                  <StatusBadge tone={isRejected ? "danger" : "brand"}>
                    {currentStageLabel}
                  </StatusBadge>
                </div>
              </div>
              <div className="px-5 py-4">
                {/* Steps in hiring process */}
                <StageProgress
                  hiringSteps={hiringSteps}
                  currentIndex={currentStepIndex}
                  isRejected={isRejected}
                />

                <div className="mt-5 border-t border-border pt-4">
                  {isRejected ? (
                    <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                      <p className="font-semibold">Candidate rejected</p>
                      {submission.rejection_reason || (submission as any).rejectionReason ? (
                        <p className="mt-1 text-muted-foreground">
                          Reason: {submission.rejection_reason || (submission as any).rejectionReason}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {nextStep ? (
                        <Button
                          size="sm"
                          className="w-full justify-center bg-brand text-brand-foreground hover:bg-brand/90"
                          disabled={isUpdating}
                          onClick={() => commit(nextStep.id, note.trim() ? { note: note.trim() } : {})}
                        >
                          {isUpdating ? (
                            <>
                              <Loader2 className="mr-1.5 size-4 animate-spin" /> Updating...
                            </>
                          ) : (
                            `Advance to ${nextStep.label}`
                          )}
                        </Button>
                      ) : null}

                      <label className="grid gap-1.5">
                        <span className="label-caps">Move candidate</span>
                        <select
                          value=""
                          onChange={(e) => onStagePick(e.target.value)}
                          disabled={isUpdating}
                          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-[13px] font-medium outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                        >
                          <option value="">Select next stage</option>
                          {hiringSteps.map((step) => {
                            const isCurrent = step.id === (activeStep?.id || currentNormalized);
                            return (
                              <option key={step.id} value={step.id} disabled={isCurrent}>
                                Move to {step.label} {isCurrent ? "(Current)" : ""}
                              </option>
                            );
                          })}
                          <option value="rejected">Reject candidate</option>
                        </select>
                      </label>

                      <label className="grid gap-1.5">
                        <span className="flex items-center justify-between">
                          <span className="label-caps">Decision note</span>
                          <span className="text-[10px] text-muted-foreground">Optional</span>
                        </span>
                        <Textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Context shared with the team and recruiter"
                          className="min-h-[88px] resize-none text-[13px]"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="px-5 py-4">
              <div className="flex items-center gap-2">
                <MessageSquareText className="size-4 text-brand" />
                <p className="label-caps">Recruiter comments</p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-5 text-foreground">
                {submission.recruiterNotes || "No recruiter comments provided."}
              </p>
            </section>
          </aside>
        </div>
      </div>

      {/* Real Resume Preview Dialog (as in AM) */}
      <Dialog open={resumeOpen} onOpenChange={setResumeOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-border">
            <DialogTitle className="text-[14px] font-semibold flex items-center gap-2">
              <FileText className="size-4 text-brand" /> {resumeDisplayName}
            </DialogTitle>
            {resumeLink ? (
              <a
                href={resumeLink}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline mr-6 font-medium"
              >
                <ExternalLink className="size-3.5" /> Download / Open
              </a>
            ) : null}
          </DialogHeader>

          <div className="flex-1 min-h-0 py-2">
            {isDocx ? (
              <div className="h-[65vh] w-full overflow-y-auto rounded border border-border bg-white p-6 shadow-inner text-foreground">
                {docxLoading ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2">
                    <Loader2 className="size-8 animate-spin text-brand" />
                    <p className="text-xs text-muted-foreground">Loading Word document preview...</p>
                  </div>
                ) : docxText ? (
                  <DocxResumeViewer text={docxText} resumeLink={resumeLink} />
                ) : (
                  <div className="space-y-4 border border-border bg-surface-sunken p-6 rounded-md">
                    <div>
                      <p className="text-base font-semibold text-foreground">{candidate.name}</p>
                      <p className="text-[13px] text-muted-foreground">
                        {candidate.currentRole} at {candidate.currentCompany} · {candidate.location}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {candidate.email} · {candidate.phone}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Could not render preview directly. Please click "Download Resume" to view the original Word file.
                    </p>
                  </div>
                )}
              </div>
            ) : resumeLink ? (
              <iframe
                title="Resume preview"
                src={resumeLink}
                className="h-[65vh] w-full rounded border border-border bg-white"
              />
            ) : (
              <div className="space-y-4 border border-border bg-surface-sunken p-6 rounded-md">
                <div>
                  <p className="text-base font-semibold text-foreground">{candidate.name}</p>
                  <p className="text-[13px] text-muted-foreground">
                    {candidate.currentRole} at {candidate.currentCompany} · {candidate.location}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {candidate.email} · {candidate.phone}
                  </p>
                </div>
                <div>
                  <p className="label-caps">Experience</p>
                  <p className="mt-1 text-[13px] leading-6 text-foreground">
                    {candidate.experience || `${candidate.yearsExperience} years`} of experience across {candidate.skills?.join(", ") || "software engineering"}.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Preview generated from the submitted candidate profile.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setResumeOpen(false)}>
              Close
            </Button>
            {resumeLink ? (
              <a
                href={resumeLink}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-3.5 text-[13px] font-semibold text-brand-foreground hover:bg-brand/90"
              >
                <Download className="size-4" /> Download Resume
              </a>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={pending === "rejected"} onOpenChange={(o) => (!o ? setPending("") : undefined)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Candidate?</DialogTitle>
            <DialogDescription>
              {candidate.name} · {job.title}
            </DialogDescription>
          </DialogHeader>
          <label className="grid gap-1.5">
            <span className="label-caps">Reason (required)</span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-surface px-2.5 text-[13px] font-medium outline-none"
            >
              {rejectionReasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 mt-2">
            <span className="label-caps">Note (optional)</span>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for rejection to help recruiter..."
              className="min-h-[70px] resize-none text-[13px]"
            />
          </label>
          <DialogFooter className="mt-3">
            <Button size="sm" variant="ghost" onClick={() => setPending("")}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={isUpdating}
              onClick={async () => {
                await commit("rejected", { reason, note: note.trim() || reason });
                void navigate({ to: "/company/candidates/review" });
              }}
            >
              {isUpdating ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Reject Candidate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CompanyShell>
  );
}

function StageProgress({
  hiringSteps,
  currentIndex,
  isRejected,
}: {
  hiringSteps: HiringStep[];
  currentIndex: number;
  isRejected: boolean;
}) {
  return (
    <ol className="space-y-0" aria-label="Candidate hiring progress">
      {hiringSteps.map((step, index) => {
        const isPast = !isRejected && currentIndex > index;
        const isActive =
          !isRejected &&
          (currentIndex === index || (currentIndex === -1 && index === 0));
        const isComplete = !isRejected && currentIndex >= index;

        return (
          <li key={step.id} className="grid grid-cols-[18px_minmax(0,1fr)] gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "mt-0.5 grid size-[18px] place-items-center rounded-full border text-[9px] font-semibold",
                  isComplete
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-border-strong bg-surface text-muted-foreground"
                )}
              >
                {isPast ? "✓" : index + 1}
              </span>
              {index < hiringSteps.length - 1 ? (
                <span
                  className={cn(
                    "h-7 w-px",
                    currentIndex > index ? "bg-brand" : "bg-border"
                  )}
                />
              ) : null}
            </div>
            <div className="pb-4">
              <p
                className={cn(
                  "text-[12px] font-medium",
                  isActive
                    ? "text-brand font-semibold"
                    : isPast
                      ? "text-foreground"
                      : "text-muted-foreground"
                )}
              >
                {step.label}
              </p>
              {isActive ? (
                <p className="mt-0.5 text-[10px] text-muted-foreground">Current stage</p>
              ) : null}
            </div>
          </li>
        );
      })}
      {isRejected ? (
        <li className="mt-1 flex items-center gap-1.5 text-xs font-medium text-destructive">
          <AlertTriangle className="size-3.5" />
          <span>Candidate rejected</span>
        </li>
      ) : null}
    </ol>
  );
}

function FactRow({
  label,
  value,
  href,
  icon: Icon,
  external = false,
  mono = false,
}: {
  label: string;
  value: string;
  href?: string | undefined;
  icon?: LucideIcon | undefined;
  external?: boolean | undefined;
  mono?: boolean | undefined;
}) {
  const content = (
    <span
      className={cn(
        "flex min-w-0 items-center gap-1.5 text-[13px] font-medium",
        href ? "text-brand" : "text-foreground",
        mono && "num"
      )}
    >
      {Icon ? <Icon className="size-3.5 shrink-0 text-muted-foreground" /> : null}
      <span className="break-words">{value || "—"}</span>
      {external ? <ExternalLink className="size-3 shrink-0" /> : null}
    </span>
  );

  return (
    <div className="min-w-0 px-5 py-3.5">
      <p className="label-caps">{label}</p>
      <div className="mt-1">
        {href ? (
          <a
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noreferrer noopener" : undefined}
            className="hover:underline"
          >
            {content}
          </a>
        ) : (
          content
        )}
      </div>
    </div>
  );
}

function SummaryList({
  title,
  items,
  kind,
}: {
  title: string;
  items: string[];
  kind: "good" | "warn" | "verify";
}) {
  const Icon = kind === "good" ? CheckCircle2 : kind === "warn" ? AlertTriangle : HelpCircle;
  return (
    <div>
      <p className="label-caps">{title}</p>
      {items.length ? (
        <ul className="mt-1.5 space-y-1">
          {items.map((i) => (
            <li
              key={i}
              className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 text-[13px] leading-5 text-muted-foreground"
            >
              <Icon
                className={cn(
                  "mt-0.5 size-3.5 shrink-0",
                  kind === "good" ? "text-success" : kind === "warn" ? "text-warning" : "text-muted-foreground"
                )}
              />
              <span>{i}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-[13px] text-muted-foreground">None</p>
      )}
    </div>
  );
}
