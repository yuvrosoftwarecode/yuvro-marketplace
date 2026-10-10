import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, CheckCheck, Copy, Download, ExternalLink, FileText, Globe, Info, Loader2, Mail, Phone, X } from "lucide-react";
import { toast } from "sonner";
import { AmPageHeader, AmShell } from "@/components/am/am-shell";
import {
  Btn,
  BulletList,
  DefinitionGrid,
  DrawerBlock,
  StagePill,
  SubmissionStatusPill,
  TimelineList,
  inputCls,
  textareaCls,
} from "@/components/am/am-ui";
import { useAm } from "@/components/am/am-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { candidateStageLabel, candidateStages, getStageLabel, type CandidateStage } from "@/lib/am-data";
import { getPipelineStagesForJob, normalizeStageId } from "@/lib/data";
import { fetchRecruiterJobById } from "@/lib/recruiter-jobs";
import { extractFromDocx } from "@/lib/resume-parser";
import { DocxResumeViewer } from "@/components/common/docx-resume-viewer";
import { api } from "@/lib/api";

export const Route = createFileRoute("/am/submissions/$submissionId")({
  head: () => ({
    meta: [
      { title: "Candidate Submission Review — Account Manager" },
      {
        name: "description",
        content:
          "Full candidate submission record: contact links, resume preview, recruiter recommendation, screening answers and decision actions.",
      },
      { property: "og:title", content: "Candidate Submission Review — Account Manager" },
      { property: "og:description", content: "Review, forward or reject a recruiter candidate submission." },
    ],
  }),
  component: AmSubmissionPage,
});

function toUrl(v: string) {
  if (!v) return "";
  return v.startsWith("http") ? v : `https://${v}`;
}

function LinkValue({ value }: { value?: string | undefined }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <a
      href={toUrl(value)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-brand hover:underline"
    >
      <span className="truncate">{value}</span>
      <ExternalLink className="size-3 shrink-0" />
    </a>
  );
}

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}

function AmSubmissionPage() {
  const { submissionId } = Route.useParams();
  const navigate = useNavigate();
  const am = useAm();
  const [note, setNote] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [docxText, setDocxText] = useState<string | null>(null);
  const [docxLoading, setDocxLoading] = useState(false);
  const [fetchedJob, setFetchedJob] = useState<any>(null);
  const mounted = useMounted();

  useEffect(() => {
    am.refreshJobs?.();
    am.refreshCompanies?.();
    am.refreshRecruiters?.();
    am.refreshRequests?.();
    am.refreshSubmissions?.(true);
  }, []);

  const submission = am.state.submissions.find((s) => s.id === submissionId);

  useEffect(() => {
    if (submission) {
      const existingNote =
        submission.rejection_reason ||
        submission.decision_note ||
        submission.rejectionReason ||
        submission.decisionNote ||
        submission.amNotes ||
        "";
      if (existingNote && !note) {
        setNote(existingNote);
      }
    }
  }, [
    submission?.id,
    submission?.rejection_reason,
    submission?.decision_note,
    submission?.rejectionReason,
    submission?.decisionNote,
    submission?.amNotes,
  ]);
  const cand = submission ? am.candidate(submission.candidateId) : undefined;
  const rec = submission ? am.recruiter(submission.recruiterId) : undefined;
  const directJob = submission ? (am.job(submission.jobId) || (submission.jobSlug ? am.job(submission.jobSlug) : undefined)) : undefined;
  const matchedJob =
    directJob ||
    (submission
      ? am.state.jobs.find((j) => {
          const sId = (submission.jobId || "").toLowerCase();
          const sSlug = (submission.jobSlug || "").toLowerCase();
          const jId = (j.id || "").toLowerCase();
          const jSlug = (j.slug || "").toLowerCase();
          const jTitle = (j.title || "").toLowerCase();
          const jTitleSlug = jTitle.replace(/[^a-z0-9]+/g, "-");
          return (
            (sId && (jId === sId || jSlug === sId || jTitle === sId || jTitleSlug === sId || sId.includes(jId) || jId.includes(sId))) ||
            (sSlug && (jId === sSlug || jSlug === sSlug || jTitle === sSlug || jTitleSlug === sSlug || sSlug.includes(jSlug) || jSlug.includes(sSlug)))
          );
        })
      : undefined);

  const job = matchedJob || fetchedJob;

  useEffect(() => {
    const targetJobId = submission?.jobId || submission?.jobSlug;
    if (targetJobId && !matchedJob) {
      fetchRecruiterJobById(targetJobId).then((fj) => {
        if (fj) setFetchedJob(fj);
      });
    }
  }, [submission?.jobId, submission?.jobSlug, matchedJob]);

  const resumeLink = cand?.resumeUrl || (cand?.resume?.startsWith("http") ? cand.resume : "");
  const resumeDisplayName =
    cand?.resume && !cand.resume.startsWith("http")
      ? cand.resume
      : cand?.resumeUrl
        ? cand.resumeUrl.split("?")[0].split("/").pop() || "resume.pdf"
        : "resume.pdf";

  const isDocx = Boolean(
    resumeDisplayName.toLowerCase().endsWith(".docx") ||
      resumeDisplayName.toLowerCase().endsWith(".doc") ||
      resumeLink.toLowerCase().includes(".docx") ||
      resumeLink.toLowerCase().includes(".doc"),
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

  if (!submission) {
    return (
      <AmShell>
        <AmPageHeader title="Submission Review" description="Loading submission record..." />
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <Loader2 className="size-8 animate-spin text-brand" />
          <p className="mt-3 text-xs text-muted-foreground">Fetching submission details from backend...</p>
          <div className="mt-4">
            <Btn size="sm" onClick={() => navigate({ to: "/am/jobs" })}>Back to jobs</Btn>
          </div>
        </div>
      </AmShell>
    );
  }

  const activeJob = mounted ? job : undefined;
  const activeCand = mounted ? cand : undefined;
  const company = job ? am.companyOfJob(job.id) : undefined;
  const pending = submission.status === "am_review" || submission.status === "submitted";

  const backToJob = () =>
    job
      ? navigate({ to: "/am/jobs/$jobId", params: { jobId: job.id }, search: { tab: "submissions" } })
      : navigate({ to: "/am/jobs" });

  return (
    <AmShell>
      <AmPageHeader
        breadcrumb={
          mounted ? (
            <span>
              <Link to="/am/jobs" className="hover:text-foreground hover:underline">
                Jobs
              </Link>{" "}
              /{" "}
              {activeJob ? (
                <Link
                  to="/am/jobs/$jobId"
                  params={{ jobId: activeJob.id }}
                  search={{ tab: "submissions" }}
                  className="hover:text-foreground hover:underline"
                >
                  {activeJob.title}
                </Link>
              ) : null}{" "}
              / <span className="font-medium text-foreground">{activeCand?.name || submission.candidateId}</span>
            </span>
          ) : undefined
        }
        title={cand?.name ?? submission.candidateId}
        {...(activeCand
          ? { description: `${activeCand.currentRole} at ${activeCand.currentCompany} · ${activeCand.location}` }
          : {})}
        actions={
          <>
            <SubmissionStatusPill status={submission.status} />
            <StagePill stage={submission.stage} />
            <Btn onClick={backToJob}>
              <ArrowLeft className="size-4" /> Back to submissions
            </Btn>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            {job?.title}
            {company ? ` · ${company.name}` : ""} · submitted {submission.submittedAt}
          </span>
        </div>
      </AmPageHeader>

      <div className="grid gap-4 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <div className="border border-border bg-surface">
            <DrawerBlock title="Candidate details">
              <DefinitionGrid
                items={[
                  { label: "Email", value: cand?.email ? <a href={`mailto:${cand.email}`} className="text-brand hover:underline">{cand.email}</a> : "—" },
                  { label: "Phone", value: cand?.phone ?? "—" },
                  { label: "LinkedIn", value: <LinkValue value={cand?.linkedin} /> },
                  { label: "GitHub", value: <LinkValue value={cand?.github} /> },
                  { label: "Portfolio", value: <LinkValue value={cand?.portfolio} /> },
                  {
                    label: "Resume",
                    value: cand?.resume || cand?.resumeUrl ? (
                      <button
                        type="button"
                        onClick={() => setResumeOpen(true)}
                        className="inline-flex items-center gap-1.5 text-brand hover:underline font-medium"
                      >
                        <FileText className="size-3.5" /> {resumeDisplayName}
                      </button>
                    ) : (
                      "—"
                    ),
                  },
                  { label: "Visa", value: cand?.visa ?? "—" },
                  { label: "Compensation", value: cand?.compensation ?? "—" },
                  { label: "Availability", value: cand?.availability ?? "—" },
                  { label: "Source", value: rec ? `${rec.name} (${rec.type})` : "Account Manager upload" },
                  { label: "Submitted", value: submission.submittedAt },
                ]}
              />
              {cand?.resume || cand?.resumeUrl ? (
                <div className="mt-3 flex items-center gap-2">
                  <Btn size="sm" onClick={() => setResumeOpen(true)}>
                    <FileText className="size-4" /> Preview resume
                  </Btn>
                  {resumeLink ? (
                    <a
                      href={resumeLink}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-semibold text-foreground hover:bg-surface-sunken"
                    >
                      <ExternalLink className="size-3.5" /> Open / Download
                    </a>
                  ) : null}
                </div>
              ) : null}
            </DrawerBlock>

            <DrawerBlock title="Recruiter recommendation">
              <p className="text-[13px] leading-6 text-foreground">{submission.recommendation}</p>
              {submission.recruiterNotes ? (
                <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{submission.recruiterNotes}</p>
              ) : null}
            </DrawerBlock>

            <DrawerBlock title="Screening answers">
              <ul className="space-y-3">
                {submission.answers.map((a) => (
                  <li key={a.q}>
                    <p className="text-xs font-medium text-muted-foreground">{a.q}</p>
                    <p className="mt-0.5 text-[13px] leading-6 text-foreground">{a.a}</p>
                  </li>
                ))}
              </ul>
            </DrawerBlock>

            <DrawerBlock title="Screening summary">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="label-caps">Strengths</p>
                  <div className="mt-1.5">
                    <BulletList items={submission.ai.strengths} tone="success" />
                  </div>
                </div>
                <div>
                  <p className="label-caps">Gaps</p>
                  <div className="mt-1.5">
                    <BulletList items={submission.ai.gaps} />
                  </div>
                </div>
                <div>
                  <p className="label-caps">Red flags</p>
                  <div className="mt-1.5">
                    <BulletList items={submission.ai.redFlags} tone="danger" />
                  </div>
                </div>
              </div>
            </DrawerBlock>

            <DrawerBlock title="Timeline">
              <TimelineList items={submission.timeline} />
            </DrawerBlock>
          </div>
        </div>

        <aside className="min-w-0">
          <div className="sticky top-4 border border-border bg-surface">
            <DrawerBlock title="Decision">
              {(submission.stage === "rejected" ||
                submission.status === "rejected" ||
                submission.status === "am_rejected") && (
                <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs">
                  <p className="font-semibold text-destructive">Candidate is currently Rejected</p>
                  {submission.rejection_reason || submission.decision_note ? (
                    <p className="mt-1 text-foreground leading-relaxed">
                      <span className="font-medium text-muted-foreground">Reason:</span>{" "}
                      {submission.rejection_reason || submission.decision_note}
                    </p>
                  ) : null}
                </div>
              )}

              {(() => {
                const activeStages = getPipelineStagesForJob(job);
                const currentStageId = (() => {
                  const norm = normalizeStageId(submission.stage);
                  if (norm === "rejected") return "rejected";
                  const exactMatch = activeStages.find(
                    (s) =>
                      s.id === norm ||
                      s.id === submission.stage ||
                      s.label.toLowerCase() === submission.stage?.toLowerCase(),
                  );
                  if (exactMatch) return exactMatch.id;
                  if (norm === "am_review" || norm === "pending" || !submission.stage) {
                    return "am_review";
                  }
                  return norm || "am_review";
                })();

                const activeTargetStage = selectedStage || currentStageId;
                const isTargetRejected = activeTargetStage === "rejected";

                const handleUpdateDecision = async () => {
                  if (isTargetRejected) {
                    if (!note.trim()) {
                      toast.error("A decision note is mandatory to reject a candidate.");
                      return;
                    }
                    setIsUpdating(true);
                    try {
                      await api.patch(`/api/recruiting/submissions/${submission.id}/`, {
                        status: "rejected",
                        stage: "rejected",
                        rejection_reason: note.trim(),
                        decision_note: note.trim(),
                      });
                      am.rejectSubmission(submission.id, note.trim());
                      await am.refreshSubmissions?.(true);
                      toast.success(`${cand?.name || "Candidate"} has been rejected with decision note recorded.`);
                    } catch (err: any) {
                      console.error("Failed to reject candidate:", err);
                      const errMsg = err?.data?.decision_note || err?.message || "Failed to update rejection.";
                      toast.error(String(errMsg));
                    } finally {
                      setIsUpdating(false);
                    }
                    return;
                  }

                  // Non-rejection stage update
                  setIsUpdating(true);
                  try {
                    const backendStatus =
                      activeTargetStage === "am_review" || activeTargetStage === "submitted"
                        ? "submitted"
                        : "under_review";

                    await api.patch(`/api/recruiting/submissions/${submission.id}/`, {
                      stage: activeTargetStage,
                      status: backendStatus,
                      decision_note: note.trim(),
                    });
                    am.advanceCandidate(submission.id, activeTargetStage as CandidateStage);
                    await am.refreshSubmissions?.(true);
                    const matched = activeStages.find((s) => s.id === activeTargetStage);
                    const label = matched?.label || activeTargetStage;
                    toast.success(`${cand?.name || "Candidate"} moved to ${label}`);
                  } catch (err: any) {
                    console.error("Failed to advance candidate:", err);
                    toast.error("Failed to update candidate stage.");
                  } finally {
                    setIsUpdating(false);
                  }
                };

                return (
                  <div>
                    <label className="label-caps block" htmlFor="stage">
                      Stage
                    </label>
                    <select
                      id="stage"
                      className={`${inputCls} mt-1.5`}
                      value={activeTargetStage}
                      onChange={(e) => setSelectedStage(e.target.value)}
                    >
                      {activeStages.map((st) => (
                        <option key={st.id} value={st.id}>
                          Move to {st.label}
                        </option>
                      ))}
                      <option value="rejected" className="text-destructive font-medium">
                        Move to Rejected
                      </option>
                    </select>

                    <div className="mt-4">
                      <label className="label-caps flex items-center justify-between" htmlFor="note">
                        <span>Decision note</span>
                        {isTargetRejected ? (
                          <span className="text-[11px] font-semibold text-destructive">* Required for rejection</span>
                        ) : (
                          <span className="text-[11px] font-normal text-muted-foreground">(Optional)</span>
                        )}
                      </label>
                      <textarea
                        id="note"
                        className={`${textareaCls} mt-1.5 ${
                          isTargetRejected && !note.trim() ? "border-destructive/60 focus:border-destructive" : ""
                        }`}
                        rows={4}
                        placeholder={
                          isTargetRejected
                            ? "Enter mandatory rejection reason to record..."
                            : "Reason shared with the recruiter or client when advancing or updating status."
                        }
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                      {isTargetRejected && !note.trim() && (
                        <p className="mt-1 text-xs text-destructive">
                          Decision note is mandatory when rejecting a candidate.
                        </p>
                      )}
                    </div>

                    <div className="mt-4">
                      <Btn
                        size="sm"
                        tone={isTargetRejected ? "danger" : "brand"}
                        disabled={isUpdating || (isTargetRejected && !note.trim())}
                        onClick={handleUpdateDecision}
                        className="w-full justify-center"
                      >
                        {isUpdating ? (
                          <>
                            <Loader2 className="mr-1.5 size-4 animate-spin" /> Saving...
                          </>
                        ) : isTargetRejected ? (
                          "Reject Candidate"
                        ) : (
                          `Update to ${activeStages.find((s) => s.id === activeTargetStage)?.label || getStageLabel(activeTargetStage)}`
                        )}
                      </Btn>
                    </div>
                  </div>
                );
              })()}
            </DrawerBlock>
          </div>
        </aside>
      </div>

      {/* Resume preview */}
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
                      <p className="text-base font-semibold text-foreground">{cand?.name}</p>
                      <p className="text-[13px] text-muted-foreground">
                        {cand?.currentRole} at {cand?.currentCompany} · {cand?.location} · {cand?.experience}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {cand?.email} · {cand?.phone}
                      </p>
                    </div>
                    <div>
                      <p className="label-caps">Experience</p>
                      <p className="mt-1 text-[13px] leading-6 text-foreground">
                        {cand?.experience} · {submission.recommendation}
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
                  <p className="text-base font-semibold text-foreground">{cand?.name}</p>
                  <p className="text-[13px] text-muted-foreground">
                    {cand?.currentRole} at {cand?.currentCompany} · {cand?.location} · {cand?.experience}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cand?.email} · {cand?.phone}
                  </p>
                </div>
                <div>
                  <p className="label-caps">Experience</p>
                  <p className="mt-1 text-[13px] leading-6 text-foreground">
                    {cand?.experience} · {submission.recommendation}
                  </p>
                </div>
                <div>
                  <p className="label-caps">Highlights</p>
                  <div className="mt-1.5">
                    <BulletList items={submission.ai.strengths} tone="success" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Preview generated from the submitted profile.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Btn onClick={() => setResumeOpen(false)}>Close</Btn>
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
    </AmShell>
  );
}

