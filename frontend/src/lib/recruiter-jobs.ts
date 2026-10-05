import { api } from "@/lib/api";
import type { Job } from "@/lib/data";

const tones = [
  "oklch(0.47 0.105 252)",
  "oklch(0.45 0.11 160)",
  "oklch(0.45 0.12 40)",
  "oklch(0.42 0.09 210)",
  "oklch(0.46 0.14 340)",
  "oklch(0.43 0.13 290)",
  "oklch(0.44 0.12 270)",
];

export function mapBackendJobToRecruiterJob(apiJob: Record<string, unknown>): Job {
  const comp = (apiJob.company as Record<string, unknown>) || {};
  const companyName = String(comp.name || "Company");
  const words = companyName.trim().split(/\s+/);
  const companyShort = (
    words.length > 1 && words[1] ? words[0][0] + words[1][0] : companyName.slice(0, 2)
  ).toUpperCase();

  const toneIndex =
    Math.abs(companyName.split("").reduce((a, b) => a + b.charCodeAt(0), 0)) % tones.length;
  const logoTone = tones[toneIndex] || "oklch(0.47 0.105 252)";

  const workModelMap: Record<string, "Remote" | "Hybrid" | "On-site"> = {
    remote: "Remote",
    hybrid: "Hybrid",
    onsite: "On-site",
  };
  const workModel = workModelMap[String(apiJob.work_model || "").toLowerCase()] || "Hybrid";

  const empTypeMap: Record<string, string> = {
    full_time: "Full-time",
    part_time: "Part-time",
    contract: "Contract",
    internship: "Internship",
  };
  const employmentType =
    empTypeMap[String(apiJob.employment_type || "").toLowerCase()] || "Full-time";

  const salMin = Number(apiJob.salary_min) || 0;
  const salMax = Number(apiJob.salary_max) || 0;
  const currency = String(apiJob.salary_currency || "USD");
  const currSym =
    currency === "USD"
      ? "$"
      : currency === "EUR"
        ? "€"
        : currency === "GBP"
          ? "£"
          : currency === "INR"
            ? "₹"
            : `${currency} `;
  const salaryStr =
    salMin && salMax
      ? `${currSym}${salMin.toLocaleString()} – ${currSym}${salMax.toLocaleString()}`
      : `${currSym}${salMin.toLocaleString()}`;

  const eqMin = apiJob.equity_min != null ? Number(apiJob.equity_min) : null;
  const eqMax = apiJob.equity_max != null ? Number(apiJob.equity_max) : null;
  const equityStr =
    eqMin != null && eqMax != null
      ? `${eqMin}% – ${eqMax}%`
      : eqMin != null
        ? `${eqMin}%`
        : "—";

  const bountyData = (apiJob.bounty as Record<string, unknown>) || {};
  const recruiterPct = Number(
    bountyData.recruiter_percentage ?? apiJob.recruiter_percentage ?? 15,
  );
  const bountyMin = Number(
    bountyData.min ?? apiJob.recruiter_bounty_min ?? (salMin * recruiterPct) / 100,
  );
  const bountyMax = Number(
    bountyData.max ?? apiJob.recruiter_bounty_max ?? (salMax * recruiterPct) / 100,
  );
  const rewardStr =
    bountyMin && bountyMax
      ? `${currSym}${Math.round(bountyMin).toLocaleString()} – ${currSym}${Math.round(bountyMax).toLocaleString()}`
      : `${currSym}${Math.round(bountyMin).toLocaleString()}`;
  const rewardPctStr = `${recruiterPct}% of first-year base`;

  const payoutTermsList =
    Array.isArray(apiJob.payout_terms) && apiJob.payout_terms.length > 0
      ? apiJob.payout_terms
      : [30, 60, 90];
  const payoutTermsStr = `Net ${payoutTermsList.join(", ")} days`;

  const postedDate = apiJob.posted_at || apiJob.created_at;
  const postedStr = postedDate
    ? new Date(String(postedDate)).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Today";

  const questionsList =
    Array.isArray(apiJob.candidate_questions) && apiJob.candidate_questions.length > 0
      ? (apiJob.candidate_questions as Record<string, unknown>[]).map((q) => ({
          q: String(q.question || q.q || ""),
          required: q.required !== false,
          type: String(q.type || "Short text"),
        }))
      : [
          { q: "Upload resume in English (PDF)", required: true, type: "File upload" },
          { q: "LinkedIn profile URL", required: true, type: "URL" },
          { q: "Current location and notice period", required: true, type: "Short text" },
        ];

  const signalsData = (apiJob.signals as Record<string, string[]>) || {};
  const greenSignals = Array.isArray(signalsData.green) ? signalsData.green : [];
  const redSignals = Array.isArray(signalsData.red) ? signalsData.red : [];

  const mustHaves = Array.isArray(apiJob.must_haves) ? (apiJob.must_haves as string[]) : [];

  const benefitsRaw = String(apiJob.benefits_and_perks || "");
  const benefitsList = benefitsRaw
    .split("\n")
    .map((b) => b.trim())
    .filter(Boolean);

  const rawId = String(apiJob.id);
  const slug = String(apiJob.slug || apiJob.id);

  const recApp = (apiJob.recruiter_application as Record<string, unknown>) || {};
  let recStatus: "not_applied" | "approved" | "pending" | "rejected" | "paused" | "archived" =
    "not_applied";

  const rawJobStatus = String(apiJob.status || "").toLowerCase();
  if (rawJobStatus === "paused") {
    recStatus = "paused";
  } else if (rawJobStatus === "closed" || rawJobStatus === "filled") {
    recStatus = "archived";
  } else if (recApp.applied) {
    if (recApp.status === "approved") recStatus = "approved";
    else if (recApp.status === "rejected") recStatus = "rejected";
    else if (recApp.status === "withdrawn") recStatus = "not_applied";
    else recStatus = "pending";
  } else {
    recStatus = "not_applied";
  }

  const appliedOnStr = recApp.created_at
    ? new Date(String(recApp.created_at)).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : undefined;

  const rejectedOnStr = recApp.reviewed_at
    ? new Date(String(recApp.reviewed_at)).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : undefined;

  return {
    id: slug || rawId,
    backendId: rawId,
    applicationId: recApp.application_id ? String(recApp.application_id) : undefined,
    whyFit: recApp.why_fit ? String(recApp.why_fit) : undefined,
    company: companyName,
    companyShort,
    logoUrl: (() => {
      const rawLogo =
        comp.logo_url ||
        comp.logo ||
        apiJob.company_logo ||
        apiJob.company_logo_url ||
        apiJob.logo_url ||
        apiJob.logo;
      if (typeof rawLogo === "string" && rawLogo.trim()) {
        const trimmed = rawLogo.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
          return trimmed;
        }
        const backendBase = (
          import.meta.env.VITE_BACKEND_API_BASE_URL || "http://localhost:8004"
        ).replace(/\/api\/?$/, "").replace(/\/$/, "");
        return `${backendBase}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
      }
      return undefined;
    })(),
    logoTone,
    title: String(apiJob.title || "Job Title"),
    location: String(apiJob.location || "Remote"),
    workModel,
    employmentType,
    salary: salaryStr,
    equity: equityStr,
    competitiveEquity: true,
    visaSponsorship: String(apiJob.visa_sponsorship || "Available"),
    experience: String(apiJob.experience || "Senior"),
    openings: Number(apiJob.open_roles || 1),
    reward: rewardStr,
    rewardPct: rewardPctStr,
    bonusPool: "Included in base compensation",
    payoutTerms: payoutTermsStr,
    posted: postedStr,
    status: recStatus,
    rawStatus: rawJobStatus,
    appliedOn: appliedOnStr,
    rejectionReason: recApp.rejection_reason ? String(recApp.rejection_reason) : undefined,
    rejectedOn: rejectedOnStr,
    companySize: String(comp.company_size || "—"),
    fundingStage: String(comp.funding_stage || "—"),
    fundingAmount: String(comp.funding || "—"),
    founded: (() => {
      const compFounded =
        comp.founded_year ??
        comp.founded ??
        apiJob.founded_year ??
        apiJob.founded;
      return compFounded != null && String(compFounded).trim() !== "" && String(compFounded).trim() !== "—"
        ? String(compFounded)
        : "—";
    })(),
    website: String(comp.website || ""),
    investors: Array.isArray(comp.investors) ? (comp.investors as string[]) : [],
    founders: Array.isArray(comp.leadership) && comp.leadership.length > 0
      ? (comp.leadership as Record<string, unknown>[]).map((l) => {
          const lName = String(l.name || "Leader");
          const lTitle = String(l.title || "Founding Team");
          const lPrior = String(l.prior || "");
          const rawLink = String(l.linkedin_url || l.linkedin || l.link || comp.website || "#");
          const link =
            rawLink.startsWith("http") || rawLink.startsWith("#") || rawLink.startsWith("/")
              ? rawLink
              : `https://${rawLink}`;
          return {
            name: lName,
            title: lTitle,
            prior: lPrior,
            link,
          };
        })
      : [],
    whyCompany: Array.isArray(comp.why_company)
      ? (comp.why_company as Record<string, unknown>[])
          .map((w) => ({
            title: String(w.title || w.name || w.heading || ""),
            description: String(w.description || w.body || w.text || ""),
          }))
          .filter((w) => w.title || w.description)
      : [],
    companyOverview: String(comp.overview || ""),
    whyRole: String(comp.why_role || ""),
    pedigree: [],
    repeatFounders: comp.repeat_founders ? String(comp.repeat_founders) : "—",
    activeCandidates: 0,
    about: apiJob.job_description
      ? [
          {
            heading: "Role overview",
            body: String(apiJob.job_description),
            defaultOpen: true,
          },
        ]
      : [],
    requirements: mustHaves,
    greenFlags: greenSignals,
    redFlags: redSignals,
    bonuses: [],
    benefits:
      benefitsList.length > 0
        ? [{ group: "Company Benefits", items: benefitsList }]
        : [],
    questions: questionsList,
    targetCompanies: Array.isArray(apiJob.target_companies)
      ? (apiJob.target_companies as string[])
      : Array.isArray(apiJob.targetCompanies)
        ? (apiJob.targetCompanies as string[])
        : typeof apiJob.target_companies === "string"
          ? String(apiJob.target_companies).split(",").map((s) => s.trim()).filter(Boolean)
          : [],
    process:
      Array.isArray(apiJob.hiring_process) && apiJob.hiring_process.length > 0
        ? (apiJob.hiring_process as string[])
        : Array.isArray(apiJob.process) && (apiJob.process as string[]).length > 0
          ? (apiJob.process as string[])
          : [
              "Recruiter screen",
              "Account Manager review",
              "Hiring manager interview",
              "Technical loop",
              "Final decision & offer",
            ],
    hiringProcess:
      Array.isArray(apiJob.hiring_process) && apiJob.hiring_process.length > 0
        ? (apiJob.hiring_process as string[])
        : Array.isArray(apiJob.process) && (apiJob.process as string[]).length > 0
          ? (apiJob.process as string[])
          : [
              "Recruiter screen",
              "Account Manager review",
              "Hiring manager interview",
              "Technical loop",
              "Final decision & offer",
            ],
  };
}

let cachedJobs: Job[] | null = null;
let inFlightJobsPromise: Promise<Job[]> | null = null;
let lastJobsFetchTime = 0;

export async function fetchRecruiterJobs(force = false): Promise<Job[]> {
  const now = Date.now();
  if (!force && cachedJobs && now - lastJobsFetchTime < 3000) {
    return cachedJobs;
  }
  if (inFlightJobsPromise) {
    return inFlightJobsPromise;
  }

  inFlightJobsPromise = (async () => {
    try {
      const data = await api.get<{ results?: Record<string, unknown>[]; [key: string]: unknown }>(
        "/api/marketplace/jobs/",
      );
      const rawList = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : [];
      const visibleJobs = rawList.filter(
        (j) => String(j.status || "").toLowerCase() !== "draft",
      );
      const mapped = visibleJobs.map(mapBackendJobToRecruiterJob);
      cachedJobs = mapped;
      lastJobsFetchTime = Date.now();
      return mapped;
    } catch (err) {
      console.warn("Failed to fetch recruiter jobs from backend API:", err);
      return cachedJobs || [];
    } finally {
      inFlightJobsPromise = null;
    }
  })();

  return inFlightJobsPromise;
}

function matchesJobIdentifier(job: Job, target: string): boolean {
  if (!job || !target) return false;
  const norm = target.trim().toLowerCase();
  const jId = (job.id || "").toLowerCase();
  const bId = (job.backendId || "").toLowerCase();
  const titleSlug = (job.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");

  if (jId === norm || bId === norm) return true;
  if (bId && bId.startsWith(norm)) return true;
  if (bId && norm.includes(bId.slice(0, 8))) return true;
  if (norm.includes(jId)) return true;
  if (jId.includes(norm)) return true;
  if (norm.startsWith(titleSlug) || titleSlug.startsWith(norm)) return true;
  return false;
}

export async function fetchRecruiterJobById(idOrSlug: string): Promise<Job | null> {
  const norm = (idOrSlug || "").trim().toLowerCase();
  if (!norm) return null;

  // 1. First check cache if available
  if (cachedJobs && cachedJobs.length > 0) {
    const found = cachedJobs.find(
      (j) =>
        matchesJobIdentifier(j, norm) &&
        String(j.rawStatus || "").toLowerCase() !== "draft",
    );
    if (found) return found;
  }

  // 2. Try fetching specific job endpoint
  try {
    const data = await api.get<Record<string, unknown>>(
      `/api/marketplace/jobs/${encodeURIComponent(idOrSlug)}/`,
    );
    if (data && typeof data === "object" && data.id) {
      if (String(data.status || "").toLowerCase() === "draft") {
        return null;
      }
      return mapBackendJobToRecruiterJob(data);
    }
  } catch {
    // Continue to list fallback
  }

  // 3. Fallback to fetching all recruiter jobs from marketplace
  try {
    const all = await fetchRecruiterJobs(true);
    if (all && all.length > 0) {
      const found = all.find(
        (j) =>
          matchesJobIdentifier(j, norm) &&
          String(j.rawStatus || "").toLowerCase() !== "draft",
      );
      if (found) return found;
    }
  } catch (err) {
    console.warn(`Failed to fetch job fallback for ${idOrSlug}:`, err);
  }

  return null;
}

