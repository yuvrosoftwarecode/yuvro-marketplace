import { getStageLabel, type AmCandidate, type AmRequest, type AmSubmission } from "./am-data";

export type ClientStatus =
  | "not_applied"
  | "approved"
  | "pending"
  | "rejected"
  | "paused"
  | "archived";
export type StageId = string;

export type Candidate = {
  id: string;
  name: string;
  title: string;
  location: string;
  stage: StageId;
  updated: string;
  jobId: string;
  note?: string;
};

export type Job = {
  id: string;
  backendId?: string;
  applicationId?: string;
  whyFit?: string;
  company: string;
  companyShort: string;
  logoUrl?: string;
  formerly?: string;
  logoTone: string;
  title: string;
  location: string;
  workModel: "Remote" | "Hybrid" | "On-site";
  employmentType: string;
  salary: string;
  equity: string;
  competitiveEquity: boolean;
  visaSponsorship: string;
  experience: string;
  openings: number;
  reward: string;
  rewardPct: string;
  bonusPool: string;
  payoutTerms: string;
  posted: string;
  status: ClientStatus;
  rawStatus?: string;
  saved?: boolean;
  companySize: string;
  fundingStage: string;
  fundingAmount: string;
  founded: string;
  website: string;
  investors: string[];
  founders: { name: string; title: string; prior: string; link: string }[];
  pedigree: string[];
  repeatFounders: string;
  activeCandidates: number;
  about: { heading: string; body: string; defaultOpen?: boolean }[];
  requirements: string[];
  greenFlags: string[];
  redFlags: string[];
  bonuses: { label: string; amount: string; qualification: string }[];
  benefits: { group: string; items: string[] }[];
  questions: { q: string; required: boolean; type: string }[];
  whyCompany?: { title: string; description: string }[];
  companyOverview?: string;
  whyRole?: string;
  appliedOn?: string;
  rejectionReason?: string;
  rejectedOn?: string;
  pauseReason?: string;
  process?: string[];
  hiringProcess?: string[];
  targetCompanies?: string[];
};

export type PipelineStage = {
  id: string;
  label: string;
};

export function normalizeStageId(label: string): string {
  if (!label) return "";
  const lower = label.toLowerCase().trim();
  if (
    lower === "am review" ||
    lower === "am_review" ||
    lower === "account manager review" ||
    lower === "account_manager_review" ||
    lower === "pending approval" ||
    lower === "pending_approval" ||
    lower === "submitted" ||
    lower === "pending"
  )
    return "am_review";
  if (lower === "recruiter screen" || lower === "recruiter_screen" || lower === "screen" || lower === "screening")
    return "recruiter_screen";
  if (lower === "application review" || lower === "application_review" || lower === "review") return "review";
  if (lower === "pre screen" || lower === "pre_screen" || lower === "prescreen") return "prescreen";
  if (
    lower === "hiring manager" ||
    lower === "hiring_manager" ||
    lower === "hiring manager interview" ||
    lower === "hiring_manager_interview"
  )
    return "hiring_manager";
  if (
    lower === "technical loop" ||
    lower === "technical_loop" ||
    lower === "technical interview" ||
    lower === "technical_interview" ||
    lower === "tech interview"
  )
    return "technical_loop";
  if (lower === "team interview" || lower === "team_interview" || lower === "team") return "team";
  if (lower === "final interview" || lower === "final_interview" || lower === "final") return "final";
  if (
    lower === "final decision & offer" ||
    lower === "final_decision_offer" ||
    lower === "final decision and offer" ||
    lower === "offer" ||
    lower === "offered"
  )
    return "offer";
  if (lower === "rejected" || lower === "reject" || lower === "am_rejected" || lower === "company_rejected") return "rejected";
  return lower.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || lower;
}

export function getPipelineStagesForJob(
  job?: { process?: string[]; hiringProcess?: string[]; hiring_process?: string[] } | null,
): PipelineStage[] {
  const amReviewStage: PipelineStage = { id: "am_review", label: "AM Review" };
  const rawProcess = job?.process || job?.hiringProcess || job?.hiring_process;

  let steps: PipelineStage[] = [];
  if (!rawProcess || rawProcess.length === 0) {
    steps = [
      { id: "recruiter_screen", label: "Recruiter screen" },
      { id: "hiring_manager", label: "Hiring manager interview" },
      { id: "technical_loop", label: "Technical loop" },
      { id: "offer", label: "Final decision & offer" },
    ];
  } else {
    steps = rawProcess.map((step) => ({
      id: normalizeStageId(step),
      label: step,
    }));
  }

  // Filter out any steps that duplicate am_review or rejected
  const filteredSteps = steps.filter(
    (s) => s.id !== "am_review" && s.id !== "rejected",
  );

  return [amReviewStage, ...filteredSteps];
}

export const stages: PipelineStage[] = [
  { id: "am_review", label: "AM Review" },
  { id: "screening", label: "Screening" },
  { id: "technical_interview", label: "Technical Interview" },
  { id: "hiring_manager", label: "Hiring Manager" },
  { id: "final_interview", label: "Final Interview" },
  { id: "offer", label: "Offer" },
  { id: "hired", label: "Hired" },
];

const sharedBenefits: Job["benefits"] = [
  {
    group: "Healthcare",
    items: ["100% medical, dental, vision", "Dependents covered at 80%", "Mental health stipend"],
  },
  {
    group: "Financial",
    items: ["401(k) with 4% match", "Equity refresh at 24 months", "$1,200 home office budget"],
  },
  { group: "Learning", items: ["$3,000 annual learning budget", "Conference travel covered"] },
  {
    group: "AI & tooling",
    items: ["Company-paid frontier model seats", "Internal eval + agent tooling"],
  },
  { group: "Immigration", items: ["H-1B transfer, O-1 and green card support"] },
  {
    group: "Time off",
    items: [
      "Unlimited PTO, 15-day minimum",
      "12 company holidays",
      "Two company-wide shutdown weeks",
    ],
  },
];

const sharedQuestions: Job["questions"] = [
  { q: "Upload resume in English (PDF)", required: true, type: "File upload" },
  { q: "LinkedIn profile URL", required: true, type: "URL" },
  { q: "Current location (city, country)", required: true, type: "Short text" },
  { q: "Work authorization status", required: true, type: "Single select" },
  { q: "Open to relocation?", required: true, type: "Yes / No" },
  { q: "Base compensation expectation", required: true, type: "Currency" },
  { q: "Earliest start date", required: true, type: "Date" },
  { q: "Anything the hiring manager should know?", required: false, type: "Long text" },
];

export const jobs: Job[] = [];
export const candidates: Candidate[] = [];
export type Activity = {
  id: string;
  event: string;
  actor: string;
  time: string;
  object: string;
  jobId: string;
  kind: "advance" | "approve" | "reject" | "requirement" | "flag";
};
export const activity: Activity[] = [];
export type Message = {
  id: string;
  from: string;
  company: string;
  preview: string;
  time: string;
  unread: boolean;
  jobId: string;
};
export const messages: Message[] = [];

export const getJob = (id: string) => jobs.find((j) => j.id === id);
export const candidatesForJob = (id: string): Candidate[] => {
  if (!id) return [];
  const targetId = id.toLowerCase().trim();
  return candidates.filter(
    (c) => c.jobId && c.jobId.toLowerCase().trim() === targetId,
  );
};

export function getPipelineCandidatesForJob(
  jobId: string,
  backendId?: string,
  amSubmissions?: {
    id: string;
    jobId: string;
    jobSlug?: string;
    candidateId: string;
    stage?: string;
    status?: string;
    submittedAt?: string;
    lastActivity?: string;
    recommendation?: string;
    recruiterNotes?: string;
  }[],
  amCandidates?: {
    id: string;
    name: string;
    currentRole?: string;
    currentCompany?: string;
    location?: string;
  }[],
  amJobs?: { id: string; slug?: string; title?: string }[],
  jobSlug?: string,
  includeRejected = false,
): Candidate[] {
  if (amSubmissions && amCandidates) {
    const targetIds = new Set<string>();
    const registerId = (val?: string) => {
      if (!val) return;
      const c = val.toLowerCase().trim();
      targetIds.add(c);
      if (c.includes("-")) {
        const parts = c.split("-");
        const suffix = parts[parts.length - 1];
        if (suffix && suffix.length >= 6) {
          targetIds.add(suffix);
        }
      }
    };

    registerId(jobId);
    registerId(backendId);
    registerId(jobSlug);

    // Expand targetIds with slug/id mappings from amJobs
    if (amJobs && amJobs.length > 0) {
      for (const j of amJobs) {
        const jId = (j.id || "").toLowerCase().trim();
        const jSlug = (j.slug || "").toLowerCase().trim();
        const jTitle = (j.title || "").toLowerCase().trim();

        let isMatch = false;
        for (const t of targetIds) {
          if (
            (jId && (jId === t || jId.startsWith(t) || t.startsWith(jId))) ||
            (jSlug && (jSlug === t || jSlug.includes(t) || t.includes(jSlug))) ||
            (jTitle && (jTitle === t || t.includes(jTitle)))
          ) {
            isMatch = true;
            break;
          }
        }
        if (isMatch) {
          registerId(jId);
          registerId(jSlug);
        }
      }
    }

    const matchingSubmissions = amSubmissions.filter((s) => {
      if (!s.jobId && !s.jobSlug) return false;
      const sJobId = (s.jobId || "").toLowerCase().trim();
      const sJobSlug = (s.jobSlug || "").toLowerCase().trim();

      for (const t of targetIds) {
        if (
          (sJobId && (sJobId === t || sJobId.startsWith(t) || t.startsWith(sJobId))) ||
          (sJobSlug && (sJobSlug === t || sJobSlug.includes(t) || t.includes(sJobSlug)))
        ) {
          return true;
        }
      }
      return false;
    });

    if (matchingSubmissions.length > 0) {
      const mapped = matchingSubmissions.map((sub) => {
        const cand =
          amCandidates.find((c) => c.id === sub.candidateId) ||
          (sub as any).candidate;
        const name =
          cand?.name ||
          cand?.full_name ||
          `${cand?.first_name || ""} ${cand?.last_name || ""}`.trim() ||
          "Candidate";
        const rawRole = cand?.currentRole || cand?.current_title;
        const rawCompany = cand?.currentCompany || cand?.current_company;
        let title = "Candidate";
        if (rawRole && rawRole !== "—" && rawRole.trim() && rawCompany && rawCompany !== "—" && rawCompany.trim()) {
          title = `${rawRole.trim()}, ${rawCompany.trim()}`;
        } else if (rawRole && rawRole !== "—" && rawRole.trim()) {
          title = rawRole.trim();
        } else if (rawCompany && rawCompany !== "—" && rawCompany.trim()) {
          title = rawCompany.trim();
        }

        const rawLoc = cand?.location || cand?.current_location;
        const location = rawLoc && rawLoc !== "—" && rawLoc.trim() ? rawLoc.trim() : "Remote";
        const rawStage = sub.stage || sub.status || "am_review";
        const isRejected =
          sub.status === "rejected" ||
          sub.status === "am_rejected" ||
          sub.status === "company_rejected" ||
          rawStage === "rejected" ||
          rawStage === "am_rejected" ||
          rawStage === "company_rejected";
        const stage = isRejected
          ? "rejected"
          : rawStage === "submitted" || rawStage === "pending"
          ? "am_review"
          : rawStage;
        const updated = sub.lastActivity || sub.submittedAt || "Recently";

        const rawNote =
          (sub as any).rejection_reason ||
          (sub as any).decision_note ||
          (sub as any).rejectionReason ||
          (sub as any).decisionNote ||
          sub.recommendation ||
          sub.recruiterNotes;
        const note =
          rawNote && !rawNote.toLowerCase().includes("recruiter desk")
            ? rawNote
            : undefined;

        return {
          id: sub.id,
          name,
          title,
          location,
          stage,
          updated,
          jobId: sub.jobId || jobId,
          note,
        };
      });

      if (!includeRejected) {
        return mapped.filter((c) => c.stage !== "rejected");
      }
      return mapped;
    }
  }

  const fallback = candidatesForJob(jobId);
  return includeRejected ? fallback : fallback.filter((c) => c.stage !== "rejected");
}

export const approvedJobs = () => jobs.filter((j) => j.status === "approved");
export const activityForJob = (id: string) => activity.filter((a) => a.jobId === id);

export function getJobActivityLog(
  job?: { id: string; backendId?: string; slug?: string; title: string; company?: string; posted?: string } | null,
  amRequests?: {
    id: string;
    jobId: string;
    recruiterName?: string;
    status?: string;
    requestedAt?: string;
    decidedAt?: string;
    decidedBy?: string;
  }[],
  amSubmissions?: {
    id: string;
    jobId: string;
    jobSlug?: string;
    candidateId: string;
    stage?: string;
    status?: string;
    submittedAt?: string;
    lastActivity?: string;
    timeline?: { label: string; at: string; by: string }[];
  }[],
  amCandidates?: {
    id: string;
    name: string;
  }[],
): Activity[] {
  if (!job) return [];
  type ExtendedActivity = Activity & { timestampMs: number };
  const logItems: ExtendedActivity[] = [];

  const targetIds = new Set<string>();
  if (job.id) targetIds.add(job.id.toLowerCase().trim());
  if (job.backendId) targetIds.add(String(job.backendId).toLowerCase().trim());
  if (job.slug) targetIds.add(String(job.slug).toLowerCase().trim());

  const now = Date.now();

  function parseTimeToMs(timeStr?: string, defaultOffsetMs: number = 86400000): number {
    if (!timeStr) return now - defaultOffsetMs;
    const str = timeStr.toLowerCase().trim();
    if (str === "just now") return now;
    if (str === "recently" || str === "today") return now - defaultOffsetMs;

    const mMatch = str.match(/^(\d+)\s*m\s*ago$/);
    if (mMatch) return now - parseInt(mMatch[1], 10) * 60 * 1000;

    const hMatch = str.match(/^(\d+)\s*h\s*ago$/);
    if (hMatch) return now - parseInt(hMatch[1], 10) * 3600 * 1000;

    const dMatch = str.match(/^(\d+)\s*d\s*ago$/);
    if (dMatch) return now - parseInt(dMatch[1], 10) * 86400 * 1000;

    const dateParsed = new Date(timeStr).getTime();
    if (!isNaN(dateParsed) && dateParsed > 0) return dateParsed;

    return now - defaultOffsetMs;
  }

  // 1. Job Created / Posted Event (Job change by AM/Client)
  logItems.push({
    id: `act-job-posted-${job.id}`,
    event: "Job posted to marketplace",
    actor: job.company || "Account Manager",
    time: job.posted || "Sep 22",
    object: job.title,
    jobId: job.id,
    kind: "requirement",
    timestampMs: parseTimeToMs(job.posted, 7 * 86400000),
  });

  // 2. Candidate Stage Updates in pipeline (AM changing candidate stage)
  if (amSubmissions && amSubmissions.length > 0) {
    const matchingSubmissions = amSubmissions.filter((s) => {
      const sJobId = (s.jobId || "").toLowerCase().trim();
      const sJobSlug = (s.jobSlug || "").toLowerCase().trim();
      return (sJobId && targetIds.has(sJobId)) || (sJobSlug && targetIds.has(sJobSlug));
    });

    for (const sub of matchingSubmissions) {
      const cand = amCandidates?.find((c) => c.id === sub.candidateId);
      const candName = cand?.name || "Candidate";

      if (sub.timeline && sub.timeline.length > 0) {
        const subBaseMs = parseTimeToMs(sub.submittedAt, 3 * 86400000);
        sub.timeline.forEach((tl, idx) => {
          const lowerLabel = tl.label.toLowerCase();
          // Exclude recruiter initial submissions or access requests
          if (
            lowerLabel.includes("recruiter submitted") ||
            lowerLabel.includes("submitted for review") ||
            lowerLabel === "submitted" ||
            lowerLabel.includes("requested access") ||
            lowerLabel.includes("recruiter application")
          ) {
            return;
          }

          const isReject = lowerLabel.includes("reject");
          const isApprove = lowerLabel.includes("approve") || lowerLabel.includes("hired") || lowerLabel.includes("offer");
          const parsedItemMs = parseTimeToMs(tl.at, (sub.timeline!.length - idx) * 1800000);
          const stepMs = Math.max(parsedItemMs, subBaseMs + (idx + 1) * 60000) + idx * 1000;
          logItems.push({
            id: `act-sub-tl-${sub.id}-${idx}`,
            event: `${candName}: ${tl.label}`,
            actor: tl.by || "Account Manager",
            time: tl.at || "Recently",
            object: candName,
            jobId: job.id,
            kind: isReject ? "reject" : isApprove ? "approve" : "advance",
            timestampMs: stepMs,
          });
        });
      } else {
        const normStage = normalizeStageId(sub.stage || "");
        if (normStage && normStage !== "am_review" && normStage !== "submitted" && normStage !== "pending") {
          const isReject = normStage === "rejected";
          const lastActMs = parseTimeToMs(sub.lastActivity, 1800000);
          logItems.push({
            id: `act-sub-stage-${sub.id}`,
            event: `${candName}: Moved to ${getStageLabel(sub.stage || "")}`,
            actor: "Account Manager",
            time: sub.lastActivity || sub.submittedAt || "Recently",
            object: candName,
            jobId: job.id,
            kind: isReject ? "reject" : "approve",
            timestampMs: lastActMs,
          });
        }
      }
    }
  }

  // 3. Static activity items (only job changes or candidate stage changes)
  const staticItems = activity.filter((a) => {
    if (!targetIds.has(a.jobId.toLowerCase().trim())) return false;
    const lower = a.event.toLowerCase();
    if (
      lower.includes("requested access") ||
      lower.includes("recruiter application") ||
      lower.includes("recruiter submitted") ||
      lower.includes("submitted for review")
    ) {
      return false;
    }
    return true;
  });

  for (const item of staticItems) {
    logItems.push({
      ...item,
      timestampMs: parseTimeToMs(item.time, 86400000),
    });
  }

  // Sort CHRONOLOGICALLY (oldest first: a.timestampMs - b.timestampMs)
  logItems.sort((a, b) => a.timestampMs - b.timestampMs);

  return logItems.map(({ timestampMs, ...rest }) => rest);
}

export const statusLabel: Record<ClientStatus, string> = {
  not_applied: "Open to apply",
  approved: "Approved",
  pending: "Pending approval",
  rejected: "Rejected",
  paused: "Paused",
  archived: "Archived",
};
