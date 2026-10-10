import {
  amCandidates,
  amCompanies,
  amEvents,
  amJobs,
  amRecruiters,
  amSubmissions,
  candidateStageLabel,
  type AmCandidate,
  type AmEvent,
  type AmJob,
  type AmRecruiter,
  type AmSubmission,
  type CandidateStage,
} from "@/lib/am-data";

/** The company account currently signed into the company portal. */
export const signedInCompanyId = "within";
export const signedInCompanyUser = "Dana Whitcomb";

export const signedInCompany = () => amCompanies.find((c) => c.id === signedInCompanyId)!;

/** Only jobs that are actively hiring may be reviewed. */
export const activeCompanyJobs = (companyId?: string): AmJob[] => {
  if (!companyId) return [];
  return amJobs.filter(
    (j) => (j.companyId === companyId || (j as any).company === companyId) && (j.status === "hiring" || j.status === "active"),
  );
};

/** Stages the company owns, in order. AM-owned stages are never shown here. */
export const companyLadder: CandidateStage[] = ["company_review", "interview", "final", "offer", "hired"];

export const companyFilterStages: CandidateStage[] = [...companyLadder, "rejected"];

export const stageLabel = (s: CandidateStage) => candidateStageLabel[s];

/** Destination stages the company is allowed to move a candidate to. */
export function allowedTargets(current: CandidateStage): CandidateStage[] {
  if (current === "hired") return [];
  if (current === "rejected") return [];
  const i = companyLadder.indexOf(current);
  const forward = i < 0 ? companyLadder.slice(0, -1) : companyLadder.slice(i + 1);
  // Hired is only reachable from an extended offer.
  const targets = forward.filter((s) => (s === "hired" ? current === "offer" : true));
  return [...targets, "rejected"];
}

export const rejectionReasons = [
  "Skills mismatch",
  "Experience mismatch",
  "Compensation mismatch",
  "Location / work authorization",
  "Role no longer available",
  "Other",
];

export type ReviewRow = {
  submission: AmSubmission;
  candidate: AmCandidate;
  job: AmJob;
  recruiter: AmRecruiter | null;
  stage: CandidateStage;
};

/** Submissions the company can see: everything the Account Manager forwarded onward. */
const visibleToCompany = (s: AmSubmission) =>
  s.status !== "am_rejected" && s.stage !== "submitted" && s.stage !== "am_review";

const groupRank = (stage: CandidateStage) =>
  stage === "company_review" ? 0 : stage === "interview" || stage === "final" ? 1 : stage === "offer" ? 2 : stage === "hired" ? 3 : 4;

export function reviewRowsForJob(jobId: string, stageOverrides: Record<string, CandidateStage>): ReviewRow[] {
  const job = amJobs.find((j) => j.id === jobId || j.slug === jobId);
  if (!job) return [];

  const rows = amSubmissions
    .filter((s) => s.jobId === job.id || s.jobId === jobId)
    .map((submission) => ({ submission, stage: stageOverrides[submission.id] ?? submission.stage }))
    .filter(({ submission, stage }) => visibleToCompany({ ...submission, stage }))
    .map(({ submission, stage }) => {
      const candidate = amCandidates.find((c) => c.id === submission.candidateId);
      if (!candidate) return null;
      return {
        submission,
        candidate,
        job,
        recruiter: amRecruiters.find((r) => r.id === submission.recruiterId) ?? null,
        stage,
      } satisfies ReviewRow;
    })
    .filter((r): r is ReviewRow => r !== null)
    .sort((a, b) => groupRank(a.stage) - groupRank(b.stage));

  return rows;
}

export const stageCounts = (rows: ReviewRow[]) =>
  companyFilterStages.map((s) => ({ stage: s, count: rows.filter((r) => r.stage === s).length }));

/** One reviewable submission, resolved across every active job of the company. */
export function reviewRowById(
  submissionId: string,
  stageOverrides: Record<string, CandidateStage>,
  companyId = signedInCompanyId,
): ReviewRow | null {
  for (const job of activeCompanyJobs(companyId)) {
    const row = reviewRowsForJob(job.id, stageOverrides).find((r) => r.submission.id === submissionId);
    if (row) return row;
  }
  return null;
}

export const normalizeUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u.replace(/^\/+/, "")}`);

/** Accepted offers starting soon — shared by Overview and the Offer page (sample data). */
export type CompanyJoiner = {
  id: string;
  name: string;
  initials: string;
  jobId: string;
  role: string;
  date: string;
  timing: string;
  tone: "brand" | "success" | "warning";
};

export const upcomingJoiners: CompanyJoiner[] = [
  { id: "joiner-nina", name: "Nina Patel", initials: "NP", jobId: "within-eng-manager", role: "Engineering Manager, Ingest", date: "Oct 05, 2026", timing: "In 7 days", tone: "brand" },
  { id: "joiner-maya", name: "Maya Chen", initials: "MC", jobId: "within-applied-ai", role: "Applied AI Engineer", date: "Oct 12, 2026", timing: "In 14 days", tone: "success" },
  { id: "joiner-oliver", name: "Oliver Grant", initials: "OG", jobId: "within-ai-frontend", role: "Senior AI Frontend Engineer", date: "Oct 19, 2026", timing: "In 21 days", tone: "warning" },
];

/** Next scheduled interview for a candidate, preferring the given job. */
export function interviewSlotFor(candidateId: string, jobId?: string): AmEvent | null {
  const interviews = amEvents.filter((e) => e.type === "Interview" && e.candidateId === candidateId);
  return interviews.find((e) => e.jobId === jobId) ?? interviews[0] ?? null;
}
