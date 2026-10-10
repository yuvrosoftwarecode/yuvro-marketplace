import type { AmCandidate, AmJob, AmSubmission } from "@/lib/am-data";
import type { FitClass, MatchStatus, RequirementFinding } from "@/lib/matchmaker";

/**
 * Evidence-based comparison of an already-submitted candidate against every
 * requirement configured on the job. Reuses the matchmaker status vocabulary
 * (Strong Match / Match / Partial / Does Not Match / Not Found) so the company
 * review page speaks the same language as the recruiter AI Matchmaker.
 */

const STOP = new Set([
  "and","or","the","a","an","of","in","on","at","to","with","for","from","within","years","year","yrs","plus",
  "experience","strong","required","requirement","must","have","nice","should","able","own","owning","comfortable",
  "scale","production","professional","deep","depth","across","using","work","working","who","that","this","be",
  "is","are","as","by","per","no","not","up","least","over","more","than","level","scope","2","3","4","5","6","7",
]);

const tokens = (s?: string) => {
  if (!s || typeof s !== "string") return [];
  return Array.from(
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9+#./ -]/g, " ")
        .split(/[\s/,-]+/)
        .map((t) => t.replace(/^\.+|\.+$/g, ""))
        .filter((t) => t.length > 2 && !STOP.has(t)),
    ),
  );
};

const overlap = (req?: string, hay?: string) => {
  if (!req || !hay) return 0;
  const t = tokens(req);
  if (!t.length) return 0;
  const h = ` ${hay.toLowerCase()} `;
  const hit = t.filter((x) => h.includes(x)).length;
  return hit / t.length;
};

const yearsOf = (s?: unknown) => {
  if (typeof s === "number") return s;
  if (!s || typeof s !== "string") return null;
  const m = s.match(/(\d+)/);
  return m ? Number(m[1]) : null;
};

type Dimension = {
  requirement: string;
  required: string;
  candidate: string | null;
  /** Extra candidate text searched for evidence beyond the stated value. */
  haystack: string;
  group: "required" | "preferred";
  /** Candidate skills, used to quote concrete evidence instead of a profile blob. */
  skills?: string[];
  /** Years comparison instead of keyword overlap. */
  years?: { required: number | null; candidate: number | null };
};

function assess(d: Dimension, ai?: AmSubmission["ai"]): RequirementFinding {
  const { requirement, required, candidate } = d;

  if (!candidate || !candidate.trim()) {
    return {
      requirement,
      required: required || "Not specified",
      candidate: "Not provided",
      status: "not_found",
      analysis: `The submission does not contain enough information to assess ${requirement.toLowerCase()}.`,
      evidence: null,
    };
  }

  const strengths = Array.isArray(ai?.strengths) ? ai.strengths : [];
  const gaps = Array.isArray(ai?.gaps) ? ai.gaps : [];
  const redFlags = Array.isArray(ai?.redFlags) ? ai.redFlags : [];

  const strength = strengths.find((s) => overlap(requirement, s) >= 0.4) ?? null;
  const gap = gaps.find((g) => overlap(requirement, g) >= 0.4) ?? null;
  const flag = redFlags.find((f) => overlap(requirement, f) >= 0.4) ?? null;
  const matchedSkills = (d.skills ?? []).filter((s) => overlap(s, requirement) >= 0.5 || overlap(requirement, s) >= 0.5);
  const ratio = Math.max(overlap(requirement, candidate), overlap(requirement, d.haystack || ""));

  let status: MatchStatus;
  if (d.years) {
    const { required: rq, candidate: cd } = d.years;
    if (cd === null) status = "not_found";
    else if (rq === null || cd >= rq) status = "strong";
    else if (cd >= rq - 1) status = "match";
    else status = "partial";
  } else if (flag) status = "no_match";
  else if (gap) status = ratio > 0 || matchedSkills.length ? "partial" : "no_match";
  else if (matchedSkills.length) status = "strong";
  else if (strength) status = "strong";
  else if (ratio >= 0.75) status = "strong";
  else if (ratio >= 0.4) status = "match";
  else if (ratio > 0) status = "partial";
  else status = "no_match";

  const analysis = d.years
    ? status === "strong"
      ? `Candidate reports ${candidate}, at or above the required ${required}.`
      : status === "match"
        ? `Candidate reports ${candidate}, just under the required ${required}.`
        : `Candidate reports ${candidate}, below the required ${required}.`
    : (flag ??
      gap ??
      strength ??
      (status === "strong"
        ? matchedSkills.length
          ? `Candidate lists ${matchedSkills.join(", ")} as core experience.`
          : `Candidate evidence covers this requirement directly.`
        : status === "match"
          ? `Candidate evidence broadly satisfies this requirement.`
          : status === "partial"
            ? `Partial evidence only — worth confirming during the interview.`
            : `No evidence of this requirement was found in the submission.`));

  const display = d.years
    ? candidate
    : matchedSkills.length
      ? matchedSkills.join(", ")
      : status === "no_match"
        ? "No relevant experience found"
        : candidate;

  return {
    requirement,
    required: required || "Not specified",
    candidate: display,
    status,
    analysis,
    evidence: strength ?? gap ?? null,
  };
}

const money = (job?: AmJob) => {
  if (!job) return "Competitive";
  if (!job.salaryMin && !job.salaryMax) return "Competitive";
  const sym = job.currency === "USD" ? "$" : job.currency === "GBP" ? "£" : "€";
  const minK = typeof job.salaryMin === "number" ? (job.salaryMin / 1000).toFixed(0) : "—";
  const maxK = typeof job.salaryMax === "number" ? (job.salaryMax / 1000).toFixed(0) : "—";
  return `${sym}${minK}K – ${sym}${maxK}K`;
};

function dimensions(job?: AmJob, c?: AmCandidate): Dimension[] {
  const candidateSkills = Array.isArray(c?.skills) ? c.skills : [];
  const skillText = candidateSkills.join(", ");
  const candidateExperience = typeof c?.experience === "string" ? c.experience : "";
  const profile = [c?.currentRole, c?.currentCompany, candidateExperience, skillText].filter(Boolean).join(" · ");
  const req = (requirement: string, required: string, candidate: string | null, haystack = profile): Dimension => ({
    requirement,
    required: required || "Not specified",
    candidate,
    haystack,
    group: "required",
    skills: candidateSkills,
  });

  const jobYears = yearsOf(job?.yearsExperience || job?.experience);
  const candYears = yearsOf(c?.experience || (c as any)?.yearsExperience);

  const mustHave = Array.isArray(job?.mustHave) ? job.mustHave : [];
  const skills = Array.isArray(job?.skills) ? job.skills : [];
  const jdRequirements = Array.isArray(job?.jd?.requirements) ? job.jd.requirements : [];
  const otherRequirements = Array.isArray(job?.otherRequirements) ? job.otherRequirements : [];
  const niceToHave = Array.isArray(job?.niceToHave) ? job.niceToHave : [];

  const out: Dimension[] = [
    {
      requirement: "Years of experience",
      required: String(job?.yearsExperience || job?.experience || "Not specified"),
      candidate: candidateExperience || null,
      haystack: candidateExperience,
      group: "required",
      years: { required: jobYears, candidate: candYears },
    },
    ...mustHave.map((m) => req(m, "Must have", profile)),
    ...skills.map((s) => req(s, "Required skill", skillText || null, skillText)),
    ...jdRequirements.map((r) => req(r, "Role requirement", profile)),
    ...otherRequirements.map((r) => req(r, "Other requirement", profile)),
    { requirement: "Education", required: job?.education || "Not specified", candidate: null, haystack: "", group: "required" },
    req("Location", job?.locationRequirement || `${job?.location || "Remote"} · ${job?.workModel || "Remote"}`, c?.location || null, c?.location || ""),
    req("Work authorization", job?.visa || (job?.sponsorship ? `Sponsorship: ${job.sponsorship}` : "Not specified"), c?.visa || null, c?.visa || ""),
    req("Compensation", money(job), c?.compensation || null, c?.compensation || ""),
  ];

  const preferred: Dimension[] = [
    ...niceToHave.map((n) => ({
      requirement: n,
      required: "Nice to have",
      candidate: profile,
      haystack: profile,
      group: "preferred" as const,
      skills: candidateSkills,
    })),
    ...(job?.domain
      ? [
          {
            requirement: "Domain experience",
            required: job.domain,
            candidate: `${c?.currentCompany || ""} · ${c?.currentRole || ""}`.trim() || null,
            haystack: profile,
            group: "preferred" as const,
          },
        ]
      : []),
  ];

  return [...out, ...preferred];
}

export type CandidateMatch = {
  overall: { score: number; fit: FitClass; summary: string };
  required: RequirementFinding[];
  preferred: RequirementFinding[];
  summary: { strongMatches: string[]; gaps: string[]; needsVerification: string[] };
};

const fitOf = (score: number): FitClass =>
  score >= 85 ? "STRONG FIT" : score >= 70 ? "GOOD FIT" : score >= 50 ? "PARTIAL FIT" : "NOT MATCHING";

export function candidateMatch(job: AmJob, candidate: AmCandidate, submission: AmSubmission): CandidateMatch {
  const safeAi = submission?.ai || {
    score: submission?.match || 85,
    strengths: ["Candidate profile reviewed"],
    gaps: [],
    redFlags: [],
  };

  const findings = dimensions(job, candidate).map((d) => ({ d, f: assess(d, safeAi) }));
  const required = findings.filter((x) => x.d.group === "required").map((x) => x.f);
  const preferred = findings.filter((x) => x.d.group === "preferred").map((x) => x.f);
  const all = [...required, ...preferred];

  const score = submission?.match || safeAi.score || 85;
  const fit = fitOf(score);

  const strongList = all.filter((f) => f.status === "strong").map((f) => f.requirement);
  const gapList = all.filter((f) => f.status === "partial" || f.status === "no_match").map((f) => f.requirement);
  const verifyList = all.filter((f) => f.status === "not_found").map((f) => f.requirement);

  const safeStrengths = Array.isArray(safeAi.strengths) ? safeAi.strengths : [];
  const safeGaps = Array.isArray(safeAi.gaps) ? safeAi.gaps : [];
  const safeFlags = Array.isArray(safeAi.redFlags) ? safeAi.redFlags : [];

  const summary = [
    `${candidate?.name || "Candidate"} is a ${fit.toLowerCase()} for ${job?.title || "this role"} at ${score}% overall match.`,
    safeStrengths[0] ? `${safeStrengths[0]}.`.replace(/\.\.$/, ".") : "",
    safeGaps[0] ? `${safeGaps[0]}.`.replace(/\.\.$/, ".") : "",
    verifyList.length ? `${verifyList.slice(0, 2).join(" and ")} still need verification.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    overall: { score, fit, summary },
    required,
    preferred,
    summary: {
      strongMatches: strongList.slice(0, 6),
      gaps: [...new Set([...gapList, ...safeGaps])].slice(0, 6),
      needsVerification: [...new Set([...verifyList, ...safeFlags])].slice(0, 6),
    },
  };
}
