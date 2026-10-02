import type { Job } from "./data";

export type MatchStatus = "strong" | "match" | "partial" | "no_match" | "not_found";
export type FitClass = "STRONG FIT" | "GOOD FIT" | "PARTIAL FIT" | "NOT MATCHING";

export type RequirementFinding = {
  requirement: string;
  required: string;
  candidate: string;
  status: MatchStatus;
  analysis: string;
  evidence: string | null;
};

export type ResumeProfile = {
  name: string;
  currentRole: string;
  experienceYears: string;
  location: string | null;
  education: string | null;
  skills: string[];
  links: string[];
};

export type MatchAnalysis = {
  candidate: ResumeProfile;
  overall: { score: number; fit: FitClass; headline: string };
  required: RequirementFinding[];
  preferred: RequirementFinding[];
  summary: { strongMatches: string[]; gaps: string[]; needsVerification: string[] };
};

export type JobSpec = {
  jobId: string;
  company: string;
  title: string;
  required: string[];
  preferred: string[];
  disqualifiers: string[];
};

export const statusLabel: Record<MatchStatus, string> = {
  strong: "Strong Match",
  match: "Match",
  partial: "Partial Match",
  no_match: "Does Not Match",
  not_found: "Not Found",
};

export const statusGlyph: Record<MatchStatus, string> = {
  strong: "✓",
  match: "✓",
  partial: "~",
  no_match: "✕",
  not_found: "?",
};

export const statusTone: Record<MatchStatus, "success" | "info" | "warning" | "danger" | "neutral"> = {
  strong: "success",
  match: "info",
  partial: "warning",
  no_match: "danger",
  not_found: "neutral",
};

export const fitTone: Record<FitClass, "success" | "info" | "warning" | "danger"> = {
  "STRONG FIT": "success",
  "GOOD FIT": "info",
  "PARTIAL FIT": "warning",
  "NOT MATCHING": "danger",
};

/** Every requirement already configured on the job, split into required vs preferred. */
export function jobSpec(job: Job): JobSpec {
  const required = [
    `${job.experience} relevant experience`,
    ...job.requirements,
    `Location: ${job.location} · ${job.workModel}`,
    job.visaSponsorship.toLowerCase().startsWith("no")
      ? `Work authorization: ${job.visaSponsorship.replace(/^no\s*—?\s*/i, "") || "must already be authorized"}`
      : `Work authorization / visa: ${job.visaSponsorship}`,
    `Compensation expectation within ${job.salary}`,
  ];
  return {
    jobId: job.id,
    company: job.company,
    title: job.title,
    required,
    preferred: job.greenFlags,
    disqualifiers: job.redFlags,
  };
}

export const accessibleJobs = (all: Job[]) => all.filter((j) => j.status === "approved" || j.status === "pending");

export type MatchHistoryEntry = {
  id: string;
  analyzedAt: string;
  jobId: string;
  jobTitle: string;
  company: string;
  candidateName: string;
  candidateRole: string;
  resumeName: string;
  score: number;
  fit: FitClass;
};

const HISTORY_KEY = "yuvro.matchmaker.history.v1";

export function readHistory(): MatchHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as MatchHistoryEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeHistory(entries: MatchHistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 25)));
  } catch {
    /* storage unavailable */
  }
}

export function formatAnalyzedAt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
