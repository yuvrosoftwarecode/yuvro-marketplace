import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import { yhubApiUtil } from "@/utils/RestApiUtil";
import {
  amActivity,
  amCandidates,
  amCompanies,
  amEvents,
  amFeedback,
  amJobs,
  amNotifications,
  amPayouts,
  amRecruiters,
  amRequests,
  amSubmissions,
  amThreads,
  getStageLabel,
  type AmActivity,
  type AmAttention,
  type AmCandidate,
  type AmCompany,
  type AmEvent,
  type AmFeedback,
  type AmJob,
  type AmNotification,
  type AmPayout,
  type AmRecruiter,
  type AmRequest,
  type AmSubmission,
  type AmThread,
  type CandidateStage,
  type PayoutStatus,
  type SourceType,
} from "@/lib/am-data";
import { normalizeStageId } from "@/lib/data";
import { normalizeLinkedinUrl } from "@/lib/utils";

const SESSION_KEY = "yuvro.am.session";

type State = {
  companies: AmCompany[];
  jobs: AmJob[];
  recruiters: AmRecruiter[];
  requests: AmRequest[];
  candidates: AmCandidate[];
  submissions: AmSubmission[];
  feedback: AmFeedback[];
  threads: AmThread[];
  events: AmEvent[];
  activity: AmActivity[];
  notifications: AmNotification[];
  payouts: AmPayout[];
};

export type JobStats = {
  approvedRecruiters: number;
  pendingRequests: number;
  submissions: number;
  pendingSubmissions: number;
  candidates: number;
  activeCandidates: number;
  feedbackPending: number;
  interviews: number;
  offers: number;
  hires: number;
};

export type NewCandidateInput = {
  jobId: string;
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  portfolio: string;
  location: string;
  visa: string;
  compensation: string;
  availability: string;
  currentRole: string;
  currentCompany: string;
  resume: string;
  source: SourceType;
  recruiterId: string | null;
  match: number;
  recommendation: string;
  answers: { q: string; a: string }[];
};

type Ctx = {
  state: State;
  signedIn: boolean;
  signIn: (email: string) => void;
  signOut: () => void;

  company: (id: string) => AmCompany;
  job: (id: string) => AmJob | undefined;
  recruiter: (id: string | null | undefined) => AmRecruiter | undefined;
  candidate: (id: string) => AmCandidate | undefined;
  companyOfJob: (jobId: string) => AmCompany;

  jobStats: (jobId: string) => JobStats;
  attention: AmAttention[];
  kpis: {
    activeJobs: number;
    pendingRequests: number;
    pendingSubmissions: number;
    inProcess: number;
    feedbackPending: number;
    interviewsToday: number;
    offers: number;
    hires: number;
    pendingPayouts: number;
  };
  unreadMessages: number;
  unreadNotifications: number;
  search: (q: string) => SearchResult[];

  assignRecruiter: (
    jobId: string,
    recruiterId: string,
    note?: string,
  ) => Promise<{ ok: boolean; message?: string }>;
  approveRequest: (id: string) => void;
  rejectRequest: (id: string, reason: string) => void;
  approveSubmission: (id: string) => void;
  rejectSubmission: (id: string, reason: string) => void;
  requestInfo: (id: string, note: string) => void;
  advanceCandidate: (submissionId: string, to: CandidateStage) => void;
  handleFeedback: (feedbackId: string) => void;
  addCandidate: (input: NewCandidateInput) => { ok: boolean; message: string };
  duplicateCheck: (
    jobId: string,
    name: string,
    email: string,
    linkedin?: string,
  ) => { candidate?: AmCandidate; submission?: AmSubmission };
  createJob: (job: AmJob) => Promise<AmJob>;
  updateJob: (jobId: string, patch: Partial<AmJob>) => Promise<AmJob | undefined>;
  sendMessage: (threadId: string, body: string) => void;
  markThreadRead: (threadId: string) => void;
  setPayoutStatus: (id: string, status: PayoutStatus) => void;
  markNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  createRecruiter: (
    r: Partial<AmRecruiter> & { name: string; email: string; password?: string },
  ) => Promise<AmRecruiter>;
  createCompany: (c: Partial<AmCompany> & { name: string }) => Promise<AmCompany>;
  refreshCompanies: () => Promise<void>;
  refreshJobs: () => Promise<void>;
  refreshRecruiters: () => Promise<void>;
  refreshRequests: () => Promise<void>;
  refreshSubmissions: () => Promise<void>;
};


export type SearchResult = {
  id: string;
  kind: "Job" | "Company" | "Recruiter" | "Candidate";
  title: string;
  context: string;
  meta: string;
  to: string;
  search?: Record<string, string>;
};

// Keep one context instance across hot reloads / duplicate module graphs,
// otherwise a provider from an older module copy is invisible to consumers.
const globalStore = globalThis as unknown as { __amContext?: React.Context<Ctx | null> };
const AmContext = (globalStore.__amContext ??= createContext<Ctx | null>(null));

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;
const stamp = () => "just now";

function formatRelativeTime(isoString?: unknown): string {
  if (!isoString || typeof isoString !== "string") return "just now";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return String(isoString);

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "just now";
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return `${mins}m ago`;
  }
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return `${hours}h ago`;
  }
  if (diffSec < 86400 * 7) {
    const days = Math.floor(diffSec / 86400);
    return `${days}d ago`;
  }
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

let inFlightCompaniesPromise: Promise<void> | null = null;
let lastCompaniesFetchTime = 0;

let inFlightJobsPromise: Promise<void> | null = null;
let lastJobsFetchTime = 0;

let inFlightRecruitersPromise: Promise<void> | null = null;
let lastRecruitersFetchTime = 0;

let inFlightRequestsPromise: Promise<void> | null = null;
let lastRequestsFetchTime = 0;

let inFlightSubmissionsPromise: Promise<void> | null = null;
let lastSubmissionsFetchTime = 0;


export const normalizeUrl = (url?: string) => {
  if (!url || !url.trim()) return "";
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || /^data:/i.test(trimmed) || trimmed.startsWith("/")) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

export function formatApiErrorMessage(err: unknown): string {
  if (!err) return "An unexpected error occurred.";
  if (typeof err === "object" && err !== null && "data" in err) {
    const data = (err as { data: unknown }).data;
    if (typeof data === "object" && data !== null) {
      const messages: string[] = [];
      for (const [key, val] of Object.entries(data)) {
        if (Array.isArray(val)) {
          messages.push(`${key}: ${val.join(", ")}`);
        } else if (typeof val === "string") {
          messages.push(`${key}: ${val}`);
        } else if (typeof val === "object" && val !== null) {
          messages.push(`${key}: ${JSON.stringify(val)}`);
        }
      }
      if (messages.length > 0) return messages.join(" | ");
    }
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export function mapBackendCompanyToAmCompany(apiCo: Record<string, unknown>): AmCompany {
  const highlights =
    Array.isArray(apiCo.why_company) && apiCo.why_company.length > 0
      ? (apiCo.why_company as { title: string; description: string }[])
      : [];

  const leaders =
    Array.isArray(apiCo.leadership) && apiCo.leadership.length > 0
      ? (apiCo.leadership as Record<string, unknown>[]).map((l) => ({
          name: String(l.name || ""),
          title: String(l.title || ""),
          linkedin: String(l.linkedin_url || l.linkedin || ""),
        }))
      : [];

  const whyCompanyStr =
    apiCo.why_company && typeof apiCo.why_company === "string"
      ? apiCo.why_company
      : Array.isArray(apiCo.why_company) && apiCo.why_company.length > 0
        ? (apiCo.why_company as Record<string, unknown>[])
            .map((h) => (h.title ? `${h.title}: ${h.description || ""}` : ""))
            .filter(Boolean)
            .join(" ")
        : "";

  const slug =
    (apiCo.slug as string) ||
    (apiCo.name
      ? String(apiCo.name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
      : String(apiCo.id));

  return {
    id: String(apiCo.id),
    slug,
    name: String(apiCo.name || ""),
    short: String(apiCo.name || "CO").slice(0, 2).toUpperCase(),
    tone: "oklch(0.47 0.105 252)",
    industry: String(apiCo.industry || "—"),
    website: String(apiCo.website || ""),
    size: String(apiCo.company_size || "—"),
    fundingStage: String(apiCo.funding_stage || "—"),
    funding: String(apiCo.funding || "—"),
    founded: apiCo.founded_year ? String(apiCo.founded_year) : "—",
    hq: String(apiCo.headquarters || "—"),
    status: (apiCo.status as any) || "active",
    overview: String(apiCo.overview || ""),
    whyCompany: whyCompanyStr,
    whyRole: String(apiCo.why_role || ""),
    investors: [],
    founders: [],
    logoUrl: String(apiCo.logo_url || ""),
    highlights,
    leaders,
    contacts: apiCo.company_manager_detail
      ? [
          {
            name:
              `${(apiCo.company_manager_detail as Record<string, unknown>).first_name || ""} ${(apiCo.company_manager_detail as Record<string, unknown>).last_name || ""}`.trim() ||
              String(
                (apiCo.company_manager_detail as Record<string, unknown>).username ||
                  (apiCo.company_manager_detail as Record<string, unknown>).email ||
                  "Company Manager",
              ),
            title: String(
              (apiCo.company_manager_detail as Record<string, unknown>).designation ||
                "Company Manager",
            ),
            email: String((apiCo.company_manager_detail as Record<string, unknown>).email || ""),
            phone: String(
              (apiCo.company_manager_detail as Record<string, unknown>).phone_number || "",
            ),
            role: "Primary contact" as const,
            loginStatus: "invited" as const,
          },
        ]
      : [],
    companyManager: apiCo.company_manager_detail
      ? {
          id: Number((apiCo.company_manager_detail as Record<string, unknown>).id),
          username: String(
            (apiCo.company_manager_detail as Record<string, unknown>).username || "",
          ),
          email: String((apiCo.company_manager_detail as Record<string, unknown>).email || ""),
          firstName: String(
            (apiCo.company_manager_detail as Record<string, unknown>).first_name || "",
          ),
          lastName: String(
            (apiCo.company_manager_detail as Record<string, unknown>).last_name || "",
          ),
          role: String((apiCo.company_manager_detail as Record<string, unknown>).role || ""),
          designation: String(
            (apiCo.company_manager_detail as Record<string, unknown>).designation || "",
          ),
          phoneNumber: String(
            (apiCo.company_manager_detail as Record<string, unknown>).phone_number || "",
          ),
        }
      : null,
    totalPaid: 0,
    totalSaved: 0,
    totalHires: 0,
  };
}

export function mapBackendJobToAmJob(
  apiJob: Record<string, unknown>,
  fallbackJob?: Partial<AmJob>,
): AmJob {
  const comp = apiJob.company as Record<string, unknown> | undefined;
  const companyId = comp?.id
    ? String(comp.id)
    : apiJob.company_id
      ? String(apiJob.company_id)
      : "";

  const slug =
    (apiJob.slug as string) ||
    (apiJob.title
      ? String(apiJob.title)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
      : String(apiJob.id));

  const empTypeMap: Record<string, string> = {
    full_time: "Full-time",
    part_time: "Part-time",
    contract: "Contract",
    internship: "Internship",
  };
  const empType =
    empTypeMap[String(apiJob.employment_type || "")] ||
    (apiJob.employment_type as string) ||
    "Full-time";

  const workModelMap: Record<string, "Remote" | "Hybrid" | "On-site"> = {
    remote: "Remote",
    hybrid: "Hybrid",
    onsite: "On-site",
    "on-site": "On-site",
    Onsite: "On-site",
    "On-site": "On-site",
  };
  const rawWm = String(apiJob.work_model || "").toLowerCase();
  const workModel =
    workModelMap[rawWm] ||
    (rawWm.includes("site")
      ? "On-site"
      : rawWm.includes("remote")
        ? "Remote"
        : "Hybrid");

  const salaryData = apiJob.salary as Record<string, unknown> | undefined;
  const bountyData = apiJob.bounty as Record<string, unknown> | undefined;

  const salaryMin =
    salaryData?.min !== undefined
      ? Number(salaryData.min)
      : apiJob.salary_min !== undefined
        ? Number(apiJob.salary_min)
        : 0;

  const salaryMax =
    salaryData?.max !== undefined
      ? Number(salaryData.max)
      : apiJob.salary_max !== undefined
        ? Number(apiJob.salary_max)
        : 0;

  const currency = (apiJob.salary_currency ||
    salaryData?.currency ||
    "USD") as "USD" | "GBP" | "EUR";

  const bountyMin =
    bountyData?.min !== undefined
      ? Number(bountyData.min)
      : apiJob.recruiter_bounty_min !== undefined
        ? Number(apiJob.recruiter_bounty_min)
        : 0;

  const bountyMax =
    bountyData?.max !== undefined
      ? Number(bountyData.max)
      : apiJob.recruiter_bounty_max !== undefined
        ? Number(apiJob.recruiter_bounty_max)
        : 0;

  const bountyPctStr =
    bountyData?.recruiter_percentage !== undefined
      ? `${bountyData.recruiter_percentage}% of salary`
      : apiJob.company_to_yuvro_percentage !== undefined
        ? `${apiJob.company_to_yuvro_percentage}% fee`
        : "15% of salary";

  const recruiterRewardStr =
    bountyData?.recruiter_percentage !== undefined
      ? `${bountyData.recruiter_percentage}% to recruiter`
      : "70% of bounty";

  const mustHaves =
    Array.isArray(apiJob.must_haves) && apiJob.must_haves.length > 0
      ? (apiJob.must_haves as string[])
      : [];

  const questions =
    Array.isArray(apiJob.candidate_questions) && apiJob.candidate_questions.length > 0
      ? (apiJob.candidate_questions as Record<string, unknown>[]).map((q) => ({
          q: String(q.question || q.q || ""),
          type: String(q.type || "Long text"),
          required: q.required !== false,
        }))
      : [];

  const payoutTerms =
    Array.isArray(apiJob.payout_terms) && apiJob.payout_terms.length > 0
      ? `Net ${apiJob.payout_terms.join(", ")} days`
      : "Net 30";

  const signalsData = (apiJob.signals as Record<string, string[]>) || {};
  const greenSignals = Array.isArray(signalsData.green)
    ? signalsData.green
    : [];
  const redSignals = Array.isArray(signalsData.red) ? signalsData.red : [];

  return {
    id: String(apiJob.id),
    slug: String(apiJob.slug || slug),
    companyId,
    title: String(apiJob.title || ""),
    department: "Engineering",
    employmentType: empType,
    location: String(apiJob.location || ""),
    workModel,
    experience: String(apiJob.experience || "—"),
    yearsExperience: String(apiJob.experience || "—"),
    salaryMin,
    salaryMax,
    currency,
    equity: apiJob.equity != null ? `${apiJob.equity}%` : "—",
    equityValue: apiJob.equity != null ? Number(apiJob.equity) : undefined,
    bonus: "—",
    compNotes: "",
    status: (apiJob.status as any) || "active",
    openings: Number(apiJob.open_roles || 1),
    deadline: "In 30 days",
    createdAt: apiJob.created_at
      ? new Date(String(apiJob.created_at)).toLocaleDateString()
      : "Today",
    lastActivity: "just now",
    bountyPct: bountyPctStr,
    bountyMin,
    bountyMax,
    companyToYuvroPct: Number(apiJob.company_to_yuvro_percentage) || undefined,
    yuvroCommissionPct: Number(apiJob.yuvro_commission_percentage) || undefined,
    recruiterPct:
      Number(bountyData?.recruiter_percentage || apiJob.recruiter_percentage) ||
      undefined,
    payoutTerms: Array.isArray(apiJob.payout_terms)
      ? (apiJob.payout_terms as number[])
      : undefined,
    recruiterReward: recruiterRewardStr,
    paymentRules: payoutTerms,
    recruiterSlots:
      apiJob.recruiter_slots !== undefined && apiJob.recruiter_slots !== null
        ? Number(apiJob.recruiter_slots)
        : 2,
    hiringManager: "To be assigned",
    companyContact: "To be assigned",
    visa: String(apiJob.visa_sponsorship || "No sponsorship"),
    sponsorship: String(apiJob.visa_sponsorship || "No"),
    mustHave: mustHaves,
    niceToHave: greenSignals,
    signals: {
      green: greenSignals,
      red: redSignals,
    },
    skills: [],
    domain: "Engineering",
    education: "No degree requirement",
    locationRequirement: `${apiJob.location || ""} · ${workModel}`,
    otherRequirements: [],
    jobDescription: String(apiJob.job_description || ""),
    benefitsAndPerks: String(apiJob.benefits_and_perks || ""),
    jd: {
      aboutRole: String(apiJob.job_description || ""),
      responsibilities: [],
      requirements: [],
      benefits: apiJob.benefits_and_perks
        ? [String(apiJob.benefits_and_perks)]
        : [],
    },
    process:
      Array.isArray(apiJob.hiring_process) && apiJob.hiring_process.length > 0
        ? (apiJob.hiring_process as string[])
        : Array.isArray(apiJob.process) && (apiJob.process as string[]).length > 0
        ? (apiJob.process as string[])
        : fallbackJob?.process && fallbackJob.process.length > 0
        ? fallbackJob.process
        : [
            "Recruiter screen",
            "Account Manager review",
            "Hiring manager interview",
            "Technical loop",
            "Final decision & offer",
          ],
    questions,
    targetCompanies: Array.isArray(apiJob.target_companies)
      ? (apiJob.target_companies as string[])
      : [],
    createdBy: (apiJob.created_by_detail as any) || (fallbackJob?.createdBy ?? null),
    activityLog: [],
  };
}

export function mapBackendRecruiterToAmRecruiter(
  apiRec: Record<string, unknown>,
): AmRecruiter {
  const specializations =
    Array.isArray(apiRec.specializations) && apiRec.specializations.length > 0
      ? (apiRec.specializations as string[])
      : [];

  const markets =
    Array.isArray(apiRec.markets) && apiRec.markets.length > 0
      ? (apiRec.markets as string[])
      : [];

  const verification =
    apiRec.verification && typeof apiRec.verification === "object"
      ? {
          identity: Boolean((apiRec.verification as any).identity),
          agency: Boolean((apiRec.verification as any).agency),
          payment: Boolean((apiRec.verification as any).payment),
          tax: Boolean((apiRec.verification as any).tax),
          agreement: Boolean((apiRec.verification as any).agreement),
        }
      : {
          identity: false,
          agency: false,
          payment: false,
          tax: false,
          agreement: false,
        };

  const interviewStats =
    apiRec.interview_stats && typeof apiRec.interview_stats === "object"
      ? {
          scheduled: Number((apiRec.interview_stats as any).scheduled || 0),
          completed: Number((apiRec.interview_stats as any).completed || 0),
          technical: Number((apiRec.interview_stats as any).technical || 0),
          hiringManager: Number(
            (apiRec.interview_stats as any).hiringManager ||
              (apiRec.interview_stats as any).hiring_manager ||
              0,
          ),
          final: Number((apiRec.interview_stats as any).final || 0),
          noShows: Number(
            (apiRec.interview_stats as any).noShows ||
              (apiRec.interview_stats as any).no_shows ||
              0,
          ),
          cancelled: Number((apiRec.interview_stats as any).cancelled || 0),
          rescheduled: Number((apiRec.interview_stats as any).rescheduled || 0),
        }
      : {
          scheduled: 0,
          completed: 0,
          technical: 0,
          hiringManager: 0,
          final: 0,
          noShows: 0,
          cancelled: 0,
          rescheduled: 0,
        };

  const amRejectionReasons =
    Array.isArray(apiRec.am_rejection_reasons) && apiRec.am_rejection_reasons.length > 0
      ? (apiRec.am_rejection_reasons as { reason: string; count: number }[])
      : [];

  const companyRejectionReasons =
    Array.isArray(apiRec.company_rejection_reasons) && apiRec.company_rejection_reasons.length > 0
      ? (apiRec.company_rejection_reasons as { reason: string; count: number }[])
      : [];

  const rawType = String(apiRec.type || "Independent");
  const recType: "Independent" | "Agency" =
    rawType.toLowerCase() === "agency" ? "Agency" : "Independent";

  const rawStatus = String(apiRec.status || "active").toLowerCase();
  const recStatus: RecruiterStatus =
    rawStatus === "pending"
      ? "pending"
      : rawStatus === "suspended"
        ? "suspended"
        : rawStatus === "inactive"
          ? "inactive"
          : "active";

  const createdAt = apiRec.created_at
    ? new Date(String(apiRec.created_at)).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Today";

  const slug =
    (apiRec.slug as string) ||
    (apiRec.name
      ? String(apiRec.name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
      : String(apiRec.id));

  const userId = String(
    apiRec.user_id ||
      (apiRec.user && typeof apiRec.user === "object" ? (apiRec.user as any).id : apiRec.user) ||
      "",
  );

  return {
    id: String(apiRec.id),
    slug,
    userId: userId || undefined,
    name: String(apiRec.name || ""),
    email: String(apiRec.email || ""),
    phone: String(apiRec.phone || ""),
    location: String(apiRec.location || "—"),
    linkedin: String(apiRec.linkedin || ""),
    website: String(apiRec.website || ""),
    type: recType,
    agency: String(
      apiRec.agency || (recType === "Agency" ? apiRec.name : "—"),
    ),
    experience: String(apiRec.experience || "—"),
    status: recStatus,
    specializations,
    markets,
    createdBy: String(apiRec.created_by || "Priya Raghunathan"),
    createdAt,
    responseRate:
      apiRec.response_rate !== undefined
        ? Number(apiRec.response_rate)
        : 0,
    qualityScore:
      apiRec.quality_score !== undefined
        ? Number(apiRec.quality_score)
        : 0,
    verification,
    interviewStats,
    amRejectionReasons,
    companyRejectionReasons,
  };
}

export function AmProvider({ children }: { children: ReactNode }) {

  const [state, setState] = useState<State>(() => {
    return {
      companies: [],
      jobs: [],
      recruiters: [],
      candidates: [],
      requests: [],
      submissions: [],
      threads: [],
      feedback: [],
      events: [],
      payouts: [],
      activity: [],
      notifications: [],
    };
  });

  const refreshCompanies = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && inFlightCompaniesPromise) {
      return inFlightCompaniesPromise;
    }
    if (!force && now - lastCompaniesFetchTime < 3000) {
      return;
    }
    lastCompaniesFetchTime = now;
    inFlightCompaniesPromise = (async () => {
      try {
        const res = await api.get<
          | { results?: Record<string, unknown>[]; data?: Record<string, unknown>[] }
          | Record<string, unknown>[]
        >("/api/marketplace/companies/");
        const rawList = Array.isArray(res) ? res : res.results || res.data || [];
        if (Array.isArray(rawList)) {
          setState((s) => {
            const apiCompaniesMapped = rawList.map((apiCo: Record<string, unknown>) =>
              mapBackendCompanyToAmCompany(apiCo),
            );

            return {
              ...s,
              companies: apiCompaniesMapped,
            };
          });
        }
      } catch (err) {
        console.warn("Failed to fetch companies from backend:", err);
      } finally {
        inFlightCompaniesPromise = null;
      }
    })();

    return inFlightCompaniesPromise;
  }, []);

  const refreshJobs = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && inFlightJobsPromise) {
      return inFlightJobsPromise;
    }
    if (!force && now - lastJobsFetchTime < 3000) {
      return;
    }
    lastJobsFetchTime = now;
    inFlightJobsPromise = (async () => {
      try {
        const res = await api.get<
          | { results?: Record<string, unknown>[]; data?: Record<string, unknown>[] }
          | Record<string, unknown>[]
        >("/api/marketplace/jobs/");
        const rawList = Array.isArray(res) ? res : res.results || res.data || [];
        if (Array.isArray(rawList)) {
          setState((s) => {
            const apiJobsMapped = rawList.map((apiJob: Record<string, unknown>) =>
              mapBackendJobToAmJob(apiJob),
            );

            return {
              ...s,
              jobs: apiJobsMapped,
            };
          });
        }
      } catch (err) {
        console.warn("Failed to fetch jobs from backend:", err);
      } finally {
        inFlightJobsPromise = null;
      }
    })();

    return inFlightJobsPromise;
  }, []);

  const refreshRecruiters = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && inFlightRecruitersPromise) {
      return inFlightRecruitersPromise;
    }
    if (!force && now - lastRecruitersFetchTime < 3000) {
      return;
    }
    lastRecruitersFetchTime = now;
    inFlightRecruitersPromise = (async () => {
      try {
        const res = await api.get<
          | { results?: Record<string, unknown>[]; data?: Record<string, unknown>[] }
          | Record<string, unknown>[]
        >("/api/marketplace/recruiters/");
        const rawList = Array.isArray(res) ? res : res.results || res.data || [];
        if (Array.isArray(rawList)) {
          setState((s) => {
            const apiRecruitersMapped = rawList.map((apiRec: Record<string, unknown>) =>
              mapBackendRecruiterToAmRecruiter(apiRec),
            );

            return {
              ...s,
              recruiters: apiRecruitersMapped,
            };
          });
        }
      } catch (err) {
        console.warn("Failed to fetch recruiters from backend:", err);
      } finally {
        inFlightRecruitersPromise = null;
      }
    })();

    return inFlightRecruitersPromise;
  }, []);

  const refreshRequests = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && inFlightRequestsPromise) {
      return inFlightRequestsPromise;
    }
    if (!force && now - lastRequestsFetchTime < 3000) {
      return;
    }
    lastRequestsFetchTime = now;
    inFlightRequestsPromise = (async () => {
      try {
        const res = await api.get<
          | { results?: Record<string, unknown>[]; data?: Record<string, unknown>[] }
          | Record<string, unknown>[]
        >("/api/recruiting/applications/");
        const rawList = Array.isArray(res) ? res : res.results || res.data || [];
        if (Array.isArray(rawList)) {
          setState((s) => {
            const apiRequestsMapped: AmRequest[] = rawList.map(
              (app: Record<string, unknown>) => {
                const jobObj = (app.job as Record<string, unknown>) || {};
                const recObj = (app.recruiter as Record<string, unknown>) || {};
                const rawStatus = String(app.status || "pending").toLowerCase();
                const reqStatus =
                  rawStatus === "approved"
                    ? "approved"
                    : rawStatus === "rejected"
                      ? "rejected"
                      : rawStatus === "withdrawn"
                        ? "withdrawn"
                        : "pending";

                const requestedAtStr = app.created_at
                  ? new Date(String(app.created_at)).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : "Today";

                const decidedAtStr = app.reviewed_at
                  ? new Date(String(app.reviewed_at)).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : undefined;

                const recProfileId = String(
                  (recObj as any).recruiter_profile_id || (recObj as any).recruiterId || "",
                );
                const recUserId = String(recObj.id || app.recruiter_id || "");
                const recId = recProfileId || recUserId;
                const recName = String(recObj.name || (recObj as any).full_name || "");
                const recEmail = String(recObj.email || "");

                return {
                  id: String(app.id),
                  jobId: String(jobObj.id || app.job_id || ""),
                  recruiterId: recId,
                  recruiterProfileId: recProfileId || undefined,
                  recruiterName: recName || undefined,
                  recruiterEmail: recEmail || undefined,
                  status: reqStatus as any,
                  requestedAt: requestedAtStr,
                  decidedAt: decidedAtStr,
                  decidedBy: (app.reviewed_by as Record<string, unknown>)?.name as
                    | string
                    | undefined,
                  reason: (app.rejection_reason as string) || undefined,
                  pitch: String(app.why_fit || ""),
                  relevantProfiles: 0,
                  relevantHistory: "",
                };
              },
            );

            return {
              ...s,
              requests: apiRequestsMapped,
            };
          });
        }
      } catch (err) {
        console.warn("Failed to fetch applications from backend:", err);
      } finally {
        inFlightRequestsPromise = null;
      }
    })();

    return inFlightRequestsPromise;
  }, []);

  const refreshSubmissions = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && inFlightSubmissionsPromise) {
      return inFlightSubmissionsPromise;
    }
    if (!force && now - lastSubmissionsFetchTime < 3000) {
      return;
    }
    lastSubmissionsFetchTime = now;
    inFlightSubmissionsPromise = (async () => {
      try {
        const res = await api.get<
          | { results?: Record<string, unknown>[]; data?: Record<string, unknown>[] }
          | Record<string, unknown>[]
        >("/api/recruiting/submissions/");
        const rawList = Array.isArray(res) ? res : res.results || res.data || [];
        if (Array.isArray(rawList)) {
          setState((s) => {
            const apiSubmissionsMapped: AmSubmission[] = [];
            const apiCandidatesMapped: AmCandidate[] = [...s.candidates];

            rawList.forEach((sub: Record<string, unknown>) => {
              const candObj = (sub.candidate as Record<string, unknown>) || {};
              const appObj = (sub.application as Record<string, unknown>) || {};
              const jobObj = (appObj.job as Record<string, unknown>) || {};
              const recObj = (appObj.recruiter as Record<string, unknown>) || {};

              const candId = String(candObj.id || sub.candidate_id || uid("cand"));
              const subId = String(sub.id);
              const jobId = String(jobObj.id || appObj.job_id || (sub as any).job_id || "");
              const jobSlug = String(jobObj.slug || appObj.job_slug || (sub as any).job_slug || "");

              const candData: AmCandidate = {
                id: candId,
                name: String(
                  candObj.full_name ||
                    `${candObj.first_name || ""} ${candObj.last_name || ""}`.trim() ||
                    "Candidate",
                ),
                currentRole: String(candObj.current_title || "—"),
                currentCompany: String(candObj.current_company || "—"),
                location: String(candObj.current_location || "—"),
                email: String(candObj.email || ""),
                phone: String(candObj.phone || ""),
                linkedin: String(candObj.linkedin_url || ""),
                github: String(candObj.github_url || candObj.github || ""),
                portfolio: String(candObj.portfolio_url || candObj.portfolio || ""),
                resume: String(
                  (candObj.resume && typeof candObj.resume === "string" && !candObj.resume.startsWith("http")
                    ? candObj.resume.split("/").pop()
                    : "") ||
                    (candObj.resume_url && typeof candObj.resume_url === "string"
                      ? candObj.resume_url.split("?")[0].split("/").pop()
                      : "") ||
                    "resume.pdf",
                ),
                resumeUrl: String(candObj.resume_url || candObj.resume || "") || undefined,
                visa: String(candObj.work_authorization_status || candObj.visa_status || candObj.visa || "—"),
                visaStatus: String(candObj.work_authorization_status || candObj.visa_status || candObj.visa || "—"),
                compensation: String(
                  candObj.expected_salary ||
                    candObj.compensation ||
                    (candObj.base_compensation_expectation
                      ? `$${candObj.base_compensation_expectation}`
                      : "") ||
                    "—",
                ),
                expectedCompensation: String(
                  candObj.expected_salary ||
                    candObj.compensation ||
                    (candObj.base_compensation_expectation
                      ? `$${candObj.base_compensation_expectation}`
                      : "") ||
                    "—",
                ),
                expectedSalary: String(
                  candObj.expected_salary ||
                    candObj.compensation ||
                    (candObj.base_compensation_expectation
                      ? `$${candObj.base_compensation_expectation}`
                      : "") ||
                    "—",
                ),
                currentCompensation: String(candObj.current_compensation || candObj.current_salary || candObj.currentSalary || "—"),
                currentSalary: String(candObj.current_compensation || candObj.current_salary || candObj.currentSalary || "—"),
                availability: String(
                  candObj.availability ||
                    candObj.notice_period ||
                    (candObj.earliest_start_date ? String(candObj.earliest_start_date) : "") ||
                    "—",
                ),
                noticePeriod: String(
                  candObj.notice_period ||
                    candObj.availability ||
                    "—",
                ),
                experience: "—",
                skills: [],
              };

              const existingIdx = apiCandidatesMapped.findIndex((c) => c.id === candId);
              if (existingIdx >= 0) {
                apiCandidatesMapped[existingIdx] = candData;
              } else {
                apiCandidatesMapped.push(candData);
              }

              const rawStatus = String(sub.status || "submitted").toLowerCase();
              const statusMap: Record<string, AmSubmissionStatus> = {
                submitted: "am_review",
                am_review: "am_review",
                am_approved: "company_review",
                company_review: "company_review",
                interview: "interview",
                offered: "offer",
                offer: "offer",
                hired: "hired",
                rejected: "am_rejected",
                am_rejected: "am_rejected",
                company_rejected: "company_rejected",
              };
              const mappedStatus = statusMap[rawStatus] || "am_review";

              const stageMap: Record<string, AmSubmissionStage> = {
                submitted: "am_review",
                am_review: "am_review",
                am_approved: "company_review",
                company_review: "company_review",
                interview: "interview",
                offered: "offer",
                offer: "offer",
                hired: "hired",
                rejected: "rejected",
                am_rejected: "rejected",
                company_rejected: "rejected",
              };
              const mappedStage = (sub.stage ? String(sub.stage) : undefined) || stageMap[rawStatus] || "am_review";

              const submittedTime = sub.submitted_at
                ? formatRelativeTime(sub.submitted_at)
                : "just now";
              const lastActTime = sub.updated_at
                ? formatRelativeTime(sub.updated_at)
                : sub.submitted_at
                ? formatRelativeTime(sub.submitted_at)
                : "just now";

              apiSubmissionsMapped.push({
                id: subId,
                jobId,
                jobSlug,
                candidateId: candId,
                recruiterId: String(recObj.id || appObj.recruiter_id || "rec-1"),
                source: "recruiter",
                submittedAt: submittedTime,
                match: 95,
                status: mappedStatus,
                stage: mappedStage,
                lastActivity: lastActTime,
                recommendation: String(sub.recruiter_notes || ""),
                recruiterNotes: String(sub.recruiter_notes || ""),
                amNotes: String(sub.decision_note || sub.rejection_reason || ""),
                rejection_reason: String(sub.rejection_reason || sub.decision_note || ""),
                rejectionReason: String(sub.rejection_reason || sub.decision_note || ""),
                decision_note: String(sub.decision_note || sub.rejection_reason || ""),
                decisionNote: String(sub.decision_note || sub.rejection_reason || ""),
                amDecision:
                  rawStatus === "rejected" || mappedStage === "rejected"
                    ? {
                        decision: "rejected",
                        at: lastActTime,
                        by: "Account Manager",
                        reason: String(sub.rejection_reason || sub.decision_note || ""),
                      }
                    : undefined,
                ai: {
                  score: 95,
                  strengths: ["Resume parsed — review strengths"],
                  gaps: ["Run AI evaluation for a full gap analysis"],
                  redFlags: [],
                },
                answers: Array.isArray(sub.answers) ? (sub.answers as any) : [],
                timeline: (() => {
                  const existingSub = s.submissions.find((x) => x.id === subId);
                  const baseTimeline =
                    existingSub && existingSub.timeline && existingSub.timeline.length > 0
                      ? [...existingSub.timeline]
                      : [
                          {
                            label: "Recruiter submitted",
                            at: submittedTime,
                            by: String(recObj.name || "Recruiter"),
                          },
                        ];
                  const normStage = normalizeStageId(mappedStage);
                  if (normStage === "rejected") {
                    const lastItem = baseTimeline[baseTimeline.length - 1];
                    if (!lastItem || lastItem.label.toLowerCase() !== "rejected") {
                      baseTimeline.push({
                        label: "Rejected",
                        at: lastActTime,
                        by: "Account Manager",
                        note: String(sub.rejection_reason || sub.decision_note || ""),
                      });
                    }
                  } else if (normStage && normStage !== "am_review" && normStage !== "submitted" && normStage !== "pending") {
                    const stageLabel = `Moved to ${getStageLabel(mappedStage)}`;
                    const lastItem = baseTimeline[baseTimeline.length - 1];
                    if (!lastItem || lastItem.label.toLowerCase() !== stageLabel.toLowerCase()) {
                      baseTimeline.push({
                        label: stageLabel,
                        at: lastActTime,
                        by: "Account Manager",
                      });
                    }
                  }
                  return baseTimeline;
                })(),
              });
            });

            return {
              ...s,
              submissions: apiSubmissionsMapped,
              candidates: apiCandidatesMapped,
            };
          });
        }
      } catch (err) {
        console.warn("Failed to fetch submissions from backend:", err);
      } finally {
        inFlightSubmissionsPromise = null;
      }
    })();

    return inFlightSubmissionsPromise;
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const res = await api.get<any>("/api/notifications/");
      const list = Array.isArray(res) ? res : res?.results || [];
      if (!Array.isArray(list)) return;

      const mapped: AmNotification[] = list.map((n: any) => {
        const isRequest =
          n.notification_type === "recruiter_job_application_received" ||
          n.data?.tab === "requests" ||
          (typeof n.link === "string" && n.link.includes("tab=requests"));
        const tab = isRequest
          ? "requests"
          : n.data?.tab || (typeof n.link === "string" && n.link.includes("tab=submissions") ? "submissions" : "submissions");

        return {
          id: String(n.id),
          category: (n.category as any) || "Recruiters",
          body: n.body || n.title,
          at: n.at || "Just now",
          read: Boolean(n.read),
          link: n.data?.jobId
            ? {
                jobId: n.data.jobId,
                tab,
                focus: n.data.focus || n.data.applicationId || n.data.submissionId,
              }
            : { to: n.link || "/am" },
        };
      });

      setState((s) => ({
        ...s,
        notifications: mapped,
      }));
    } catch (err) {
      console.warn("Failed to fetch AM notifications:", err);
    }
  }, []);

  useEffect(() => {
    refreshCompanies().catch(() => {});
    refreshJobs().catch(() => {});
    refreshRecruiters().catch(() => {});
    refreshRequests().catch(() => {});
    refreshSubmissions().catch(() => {});
    refreshNotifications().catch(() => {});

    const interval = setInterval(() => {
      refreshNotifications().catch(() => {});
    }, 25000);
    return () => clearInterval(interval);
  }, [refreshCompanies, refreshJobs, refreshRecruiters, refreshRequests, refreshSubmissions, refreshNotifications]);

  const [signedIn, setSignedIn] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SESSION_KEY) === "1";
  });

  const signIn = useCallback(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(SESSION_KEY, "1");
    setSignedIn(true);
  }, []);
  const signOut = useCallback(() => {
    if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
    setSignedIn(false);
  }, []);

  const value = useMemo<Ctx>(() => {
    const defaultFallbackCompany: AmCompany = {
      id: "unknown",
      slug: "unknown",
      name: "—",
      short: "—",
      tone: "oklch(0.47 0.105 252)",
      industry: "—",
      website: "",
      size: "—",
      fundingStage: "—",
      funding: "—",
      founded: "—",
      hq: "—",
      status: "active",
      overview: "",
      whyCompany: "",
      whyRole: "",
      investors: [],
      founders: [],
      logoUrl: "",
      highlights: [],
      leaders: [],
      contacts: [],
      totalPaid: 0,
      totalSaved: 0,
      totalHires: 0,
    };

    const companyById = (id: string): AmCompany => {
      if (!id) return state.companies[0] || defaultFallbackCompany;
      const target = id.trim().toLowerCase();
      return (
        state.companies.find(
          (c) =>
            c.id.toLowerCase() === target ||
            (c.slug && c.slug.toLowerCase() === target) ||
            c.name.toLowerCase() === target ||
            c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === target,
        ) ??
        (state.companies[0] || defaultFallbackCompany)
      );
    };
    const jobById = (id: string) => {
      if (!id) return undefined;
      const target = id.trim().toLowerCase();
      return state.jobs.find(
        (j) =>
          j.id.toLowerCase() === target ||
          (j.slug && j.slug.toLowerCase() === target) ||
          ((j as any).backendId && String((j as any).backendId).toLowerCase() === target) ||
          j.title.toLowerCase() === target ||
          j.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") === target ||
          (target.length >= 8 && (j.id.toLowerCase().includes(target) || target.includes(j.id.toLowerCase()))) ||
          (j.slug && target.length >= 6 && (j.slug.toLowerCase().includes(target) || target.includes(j.slug.toLowerCase()))),
      );
    };
    const recruiterById = (id: string | null | undefined) => {
      if (!id) return undefined;
      const target = id.trim().toLowerCase();
      return state.recruiters.find(
        (r) =>
          r.id.toLowerCase() === target ||
          (r.slug && r.slug.toLowerCase() === target) ||
          (r.userId && r.userId.toLowerCase() === target) ||
          (r as any).userId?.toLowerCase() === target ||
          (r as any).slug?.toLowerCase() === target ||
          r.email.toLowerCase() === target ||
          r.name.toLowerCase() === target ||
          r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === target,
      );
    };

    const candidateById = (id: string) => state.candidates.find((c) => c.id === id);
    const companyOfJob = (jobId: string) => companyById(jobById(jobId)?.companyId ?? "");

    const log = (
      entry: { [K in keyof AmActivity]?: AmActivity[K] | undefined } & {
        actor: string;
        action: string;
        object: string;
      },
    ) => ({ ...entry, id: uid("act"), at: stamp() }) as AmActivity;

    const notify = (n: Omit<AmNotification, "id" | "at" | "read">) =>
      ({ ...n, id: uid("n"), at: stamp(), read: false }) as AmNotification;

    const jobStats = (jobId: string): JobStats => {
      const j = jobById(jobId);
      const targetIds = new Set([jobId, j?.id, j?.slug].filter(Boolean) as string[]);
      const reqs = state.requests.filter((r) => targetIds.has(r.jobId));
      const subs = state.submissions.filter((s) => targetIds.has(s.jobId));
      const fbs = state.feedback.filter((f) => targetIds.has(f.jobId));
      return {
        approvedRecruiters: reqs.filter((r) => r.status === "approved").length,
        pendingRequests: reqs.filter((r) => r.status === "pending").length,
        submissions: subs.length,
        pendingSubmissions: subs.filter((s) => s.status === "am_review" || s.status === "submitted")
          .length,
        candidates: new Set(subs.map((s) => s.candidateId)).size,
        activeCandidates: subs.filter((s) => s.stage !== "rejected" && s.stage !== "hired").length,
        feedbackPending: fbs.filter(
          (f) => (f.state === "action_required" || f.state === "pending") && !f.handled,
        ).length,
        interviews: subs.filter((s) => s.stage === "interview" || s.stage === "final").length,
        offers: subs.filter((s) => s.stage === "offer").length,
        hires: subs.filter((s) => s.stage === "hired").length,
      };
    };

    const attention: AmAttention[] = [];
    state.requests
      .filter((r) => r.status === "pending")
      .forEach((r) => {
        const j = jobById(r.jobId);
        const rec = recruiterById(r.recruiterId);
        if (!j || !rec) return;
        attention.push({
          id: r.id,
          kind: "request",
          headline: `${rec.name} requested access to ${j.title}`,
          context: `${companyById(j.companyId).name} · ${rec.type === "Agency" ? rec.agency : "Independent"} · ${r.relevantProfiles} relevant profiles`,
          meta: `Requested ${r.requestedAt}`,
          cta: "Review request",
          link: { jobId: r.jobId, tab: "requests", focus: r.id },
        });
      });
    state.submissions
      .filter((s) => s.status === "am_review" || s.status === "submitted")
      .forEach((s) => {
        const j = jobById(s.jobId);
        const c = candidateById(s.candidateId);
        if (!j || !c) return;
        const rec = recruiterById(s.recruiterId);
        attention.push({
          id: s.id,
          kind: "submission",
          headline: `${rec ? rec.name : "You"} submitted ${c.name} for ${j.title}`,
          context: `${companyById(j.companyId).name} · ${c.currentRole} at ${c.currentCompany} · ${s.match}% match`,
          meta: `Submitted ${s.submittedAt} · last activity ${s.lastActivity}`,
          cta: "Review submission",
          link: { jobId: s.jobId, tab: "submissions", focus: s.id },
        });
      });
    state.feedback
      .filter((f) => (f.state === "action_required" || f.state === "pending") && !f.handled)
      .forEach((f) => {
        const j = jobById(f.jobId);
        if (!j) return;
        const sub = state.submissions.find((s) => s.id === f.submissionId);
        const c = sub ? candidateById(sub.candidateId) : undefined;
        attention.push({
          id: f.id,
          kind: "feedback",
          headline: `${f.from.split(",")[0]} left feedback on ${c?.name ?? "a candidate"}`,
          context: `${companyById(j.companyId).name} · ${j.title}`,
          meta: f.at,
          cta: "Open feedback",
          link: { jobId: f.jobId, tab: "feedback", focus: f.id },
        });
      });
    state.events
      .filter((e) => e.date === "Today" && e.type === "Interview")
      .forEach((e) => {
        const j = jobById(e.jobId);
        if (!j) return;
        const c = e.candidateId ? candidateById(e.candidateId) : undefined;
        attention.push({
          id: e.id,
          kind: "interview",
          headline: `${e.stage ?? "Interview"} today — ${c?.name ?? e.title}`,
          context: `${companyById(j.companyId).name} · ${j.title}${e.recruiterId ? ` · ${recruiterById(e.recruiterId)?.name}` : ""}`,
          meta: `${e.date} at ${e.time}`,
          cta: "Open calendar",
          link: { to: "/am/calendar" },
        });
      });
    state.submissions
      .filter((s) => s.stage === "offer")
      .forEach((s) => {
        const j = jobById(s.jobId);
        const c = candidateById(s.candidateId);
        if (!j || !c) return;
        attention.push({
          id: `upd-${s.id}`,
          kind: "candidate",
          headline: `${c.name} is at offer stage and needs a status update`,
          context: `${companyById(j.companyId).name} · ${j.title} · ${recruiterById(s.recruiterId)?.name ?? "Account Manager"}`,
          meta: `Last activity ${s.lastActivity}`,
          cta: "Open candidate",
          link: { jobId: s.jobId, tab: "candidates", focus: s.candidateId },
        });
      });

    const validJobIds = new Set(state.jobs.flatMap((j) => [j.id, j.slug].filter(Boolean)));
    const pendingRequests = state.requests.filter(
      (r) => r.status === "pending" && (validJobIds.size === 0 || validJobIds.has(r.jobId)),
    ).length;
    const pendingSubmissions = state.submissions.filter(
      (s) =>
        (s.status === "am_review" || s.status === "submitted") &&
        (validJobIds.size === 0 || validJobIds.has(s.jobId)),
    ).length;

    const kpis = {
      activeJobs: state.jobs.filter((j) => j.status === "active" || j.status === "hiring").length,
      pendingRequests,
      pendingSubmissions,
      inProcess: state.submissions.filter(
        (s) =>
          s.stage !== "rejected" &&
          s.stage !== "hired" &&
          (validJobIds.size === 0 || validJobIds.has(s.jobId)),
      ).length,
      feedbackPending: state.feedback.filter(
        (f) =>
          (f.state === "action_required" || f.state === "pending") &&
          !f.handled &&
          (validJobIds.size === 0 || validJobIds.has(f.jobId)),
      ).length,
      interviewsToday: state.events.filter(
        (e) =>
          e.date === "Today" &&
          e.type === "Interview" &&
          (validJobIds.size === 0 || validJobIds.has(e.jobId)),
      ).length,
      offers: state.submissions.filter(
        (s) => s.stage === "offer" && (validJobIds.size === 0 || validJobIds.has(s.jobId)),
      ).length,
      hires: state.submissions.filter(
        (s) => s.stage === "hired" && (validJobIds.size === 0 || validJobIds.has(s.jobId)),
      ).length,
      pendingPayouts: state.payouts
        .filter((p) => p.status !== "paid")
        .reduce((sum, p) => sum + p.recruiterShare, 0),
    };

    const search = (q: string): SearchResult[] => {
      const term = q.trim().toLowerCase();
      if (!term) return [];
      const out: SearchResult[] = [];
      state.jobs.forEach((j) => {
        const co = companyById(j.companyId);
        if (`${j.title} ${co.name} ${j.id} ${j.location}`.toLowerCase().includes(term)) {
          const st = jobStats(j.id);
          out.push({
            id: j.id,
            kind: "Job",
            title: j.title,
            context: co.name,
            meta: `${st.approvedRecruiters} recruiters · ${st.submissions} submissions`,
            to: "/am/jobs/$jobId",
          });
        }
      });
      state.candidates.forEach((c) => {
        if (`${c.name} ${c.currentCompany} ${c.currentRole}`.toLowerCase().includes(term)) {
          const sub = state.submissions.find((s) => s.candidateId === c.id);
          const j = sub ? jobById(sub.jobId) : undefined;
          out.push({
            id: c.id,
            kind: "Candidate",
            title: c.name,
            context: j ? `${j.title} · ${companyById(j.companyId).name}` : c.currentRole,
            meta: sub ? `Stage: ${sub.stage.replace("_", " ")}` : c.location,
            to: j ? "/am/jobs/$jobId" : "/am/jobs",
            ...(j ? { search: { tab: "candidates", focus: c.id, jobId: j.id } } : {}),
          });
        }
      });
      state.recruiters.forEach((r) => {
        if (`${r.name} ${r.agency} ${r.specializations.join(" ")}`.toLowerCase().includes(term)) {
          const active = state.requests.filter(
            (x) => x.recruiterId === r.id && x.status === "approved",
          ).length;
          out.push({
            id: r.id,
            kind: "Recruiter",
            title: r.name,
            context: r.type === "Agency" ? r.agency : "Independent recruiter",
            meta: `${active} active jobs · quality ${r.qualityScore}`,
            to: "/am/recruiters/$recruiterId",
          });
        }
      });
      state.companies.forEach((c) => {
        if (`${c.name} ${c.industry}`.toLowerCase().includes(term)) {
          const jobsCount = state.jobs.filter((j) => j.companyId === c.id).length;
          out.push({
            id: c.id,
            kind: "Company",
            title: c.name,
            context: c.industry,
            meta: `${jobsCount} jobs · ${c.totalHires} hires`,
            to: "/am/companies/$companyId",
          });
        }
      });
      return out.slice(0, 12);
    };

    /* ------------------------------------------------------------ actions */

    const assignRecruiter = async (jobId: string, recruiterId: string, note?: string) => {
      try {
        const j = state.jobs.find((x) => x.id === jobId || x.slug === jobId) || jobById(jobId);
        const rec =
          state.recruiters.find(
            (x) => x.id === recruiterId || x.slug === recruiterId || x.userId === recruiterId,
          ) || recruiterById(recruiterId);
        const targetBackendJobId = (j as any)?.backendId || j?.id || jobId;
        const targetRecruiterId = rec?.userId || rec?.id || recruiterId;

        // Post to backend assign endpoint
        const res = await api.post<Record<string, unknown>>(
          "/api/recruiting/applications/assign/",
          {
            job_id: targetBackendJobId,
            recruiter_id: targetRecruiterId,
            note: note || "Assigned directly by Account Manager",
          },
        );

        const jTitle = j?.title || "Job";
        const jCompanyId = j?.companyId || "";
        const recName = rec?.name || "Recruiter";
        const coName = companyById(jCompanyId)?.name || "Company";
        const appId = res?.id ? String(res.id) : `req_${Date.now()}`;

        setState((s) => {
          const existingReqIndex = s.requests.findIndex(
            (r) =>
              (r.jobId === j?.id || r.jobId === targetBackendJobId) &&
              (r.recruiterId === rec?.id ||
                r.recruiterId === targetRecruiterId ||
                r.recruiterProfileId === rec?.id),
          );

          let updatedRequests = [...s.requests];
          if (existingReqIndex >= 0) {
            updatedRequests[existingReqIndex] = {
              ...updatedRequests[existingReqIndex],
              status: "approved",
              decidedAt: "just now",
              decidedBy: "Priya Raghunathan",
              pitch: note || updatedRequests[existingReqIndex].pitch,
            };
          } else {
            const newReq: AmRequest = {
              id: appId,
              jobId: j?.id || targetBackendJobId,
              recruiterId: rec?.id || targetRecruiterId,
              recruiterProfileId: rec?.id,
              recruiterName: recName,
              recruiterEmail: rec?.email,
              relevantProfiles: 0,
              pitch: note || "Assigned directly by Account Manager",
              requestedAt: "just now",
              status: "approved",
              decidedAt: "just now",
              decidedBy: "Priya Raghunathan",
            };
            updatedRequests = [newReq, ...updatedRequests];
          }

          return {
            ...s,
            requests: updatedRequests,
            activity: [
              log({
                jobId: j?.id || targetBackendJobId,
                companyId: jCompanyId,
                recruiterId: rec?.id || targetRecruiterId,
                actor: "Priya Raghunathan",
                action: "assigned recruiter to job",
                object: recName,
                from: "Unassigned",
                to: "Approved",
              }),
              ...s.activity,
            ],
            notifications: [
              notify({
                category: "Recruiters",
                body: `${recName} was assigned to ${jTitle} at ${coName}.`,
                link: { jobId: j?.id || targetBackendJobId, tab: "requests", focus: appId },
              }),
              ...s.notifications,
            ],
          };
        });

        refreshRequests(true).catch(() => {});
        refreshJobs(true).catch(() => {});

        return { ok: true, message: `${recName} assigned to ${jTitle}` };
      } catch (err: any) {
        console.error("Failed to assign recruiter:", err);
        const errMsg =
          err?.response?.data?.detail || err?.message || "Failed to assign recruiter";
        return { ok: false, message: errMsg };
      }
    };

    const approveRequest = (id: string) => {
      api.post(`/api/recruiting/applications/${id}/approve/`).catch((err) => {
        console.warn("API approve failed, using local update:", err);
      });
      setState((s) => {
        const req = s.requests.find((r) => r.id === id);
        if (!req) return s;
        const j = s.jobs.find((x) => x.id === req.jobId) || jobById(req.jobId);
        const rec =
          s.recruiters.find((x) => x.id === req.recruiterId) || recruiterById(req.recruiterId);
        const jTitle = j?.title || "Job";
        const jCompanyId = j?.companyId || "";
        const recName = rec?.name || "Recruiter";
        const coName = companyById(jCompanyId).name;
        return {
          ...s,
          requests: s.requests.map((r) =>
            r.id === id
              ? { ...r, status: "approved", decidedAt: "just now", decidedBy: "Priya Raghunathan" }
              : r,
          ),
          activity: [
            log({
              jobId: j?.id || req.jobId,
              companyId: jCompanyId,
              recruiterId: rec?.id || req.recruiterId,
              actor: "Priya Raghunathan",
              action: "approved recruiter for job",
              object: recName,
              from: "Pending",
              to: "Approved",
            }),
            ...s.activity,
          ],
          notifications: [
            notify({
              category: "Recruiters",
              body: `${recName} was approved for ${jTitle} at ${coName}.`,
              link: { jobId: req.jobId, tab: "requests", focus: id },
            }),
            ...s.notifications,
          ],
        };
      });
    };

    const rejectRequest = (id: string, reason: string) => {
      api
        .post(`/api/recruiting/applications/${id}/reject/`, {
          rejection_reason: reason,
        })
        .catch((err) => {
          console.warn("API reject failed, using local update:", err);
        });
      setState((s) => {
        const req = s.requests.find((r) => r.id === id);
        if (!req) return s;
        const j = s.jobs.find((x) => x.id === req.jobId) || jobById(req.jobId);
        const rec =
          s.recruiters.find((x) => x.id === req.recruiterId) || recruiterById(req.recruiterId);
        const jTitle = j?.title || "Job";
        const jCompanyId = j?.companyId || "";
        const recName = rec?.name || "Recruiter";
        const coName = companyById(jCompanyId).name;
        return {
          ...s,
          requests: s.requests.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: "rejected",
                  reason,
                  decidedAt: "just now",
                  decidedBy: "Priya Raghunathan",
                }
              : r,
          ),
          activity: [
            log({
              jobId: j?.id || req.jobId,
              companyId: jCompanyId,
              recruiterId: rec?.id || req.recruiterId,
              actor: "Priya Raghunathan",
              action: "rejected recruiter request from",
              object: recName,
              from: "Pending",
              to: "Rejected",
            }),
            ...s.activity,
          ],
          notifications: [
            notify({
              category: "Recruiters",
              body: `${recName}'s request for ${jTitle} at ${coName} was rejected.`,
              link: { jobId: req.jobId, tab: "requests", focus: id },
            }),
            ...s.notifications,
          ],
        };
      });
    };

    const approveSubmission = (id: string) => {
      api
        .patch(`/api/recruiting/submissions/${id}/`, {
          status: "under_review",
          stage: "company_review",
        })
        .catch((err) => {
          console.warn("API approveSubmission failed:", err);
        });

      setState((s) => {
        const sub = s.submissions.find((x) => x.id === id);
        if (!sub) return s;
        const j = s.jobs.find((x) => x.id === sub.jobId) || jobById(sub.jobId);
        const c =
          s.candidates.find((x) => x.id === sub.candidateId) || candidateById(sub.candidateId);
        const co = companyById(j?.companyId || "");
        const cName = c?.name || "Candidate";
        const jTitle = j?.title || "Job";
        return {
          ...s,
          submissions: s.submissions.map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: "forwarded",
                  stage: "company_review",
                  lastActivity: "just now",
                  amDecision: { decision: "approved", at: "just now", by: "Priya Raghunathan" },
                  timeline: [
                    ...x.timeline,
                    { label: "AM approved", at: "just now", by: "Priya Raghunathan" },
                    { label: "Forwarded to company", at: "just now", by: "Priya Raghunathan" },
                  ],
                }
              : x,
          ),
          feedback: [
            {
              id: uid("fb"),
              jobId: j?.id || sub.jobId,
              submissionId: id,
              from: co.contacts[0]?.name ?? co.name,
              at: "Pending since just now",
              state: "pending",
              body: `Awaiting company review of ${cName}.`,
            },
            ...s.feedback,
          ],
          activity: [
            log({
              jobId: j?.id || sub.jobId,
              companyId: j?.companyId || "",
              candidateId: c?.id || sub.candidateId,
              recruiterId: sub.recruiterId ?? undefined,
              actor: "Priya Raghunathan",
              action: "approved and forwarded candidate",
              object: cName,
              from: "AM review",
              to: "Company review",
            }),
            ...s.activity,
          ],
          notifications: [
            notify({
              category: "Submissions",
              body: `${cName} was approved and forwarded to ${co.name} for ${jTitle}.`,
              link: { jobId: sub.jobId, tab: "submissions", focus: id },
            }),
            ...s.notifications,
          ],
        };
      });
    };

    const rejectSubmission = (id: string, reason: string) => {
      api
        .patch(`/api/recruiting/submissions/${id}/`, {
          status: "rejected",
          stage: "rejected",
          rejection_reason: reason,
          decision_note: reason,
        })
        .catch((err) => {
          console.warn("API rejectSubmission failed:", err);
        });

      setState((s) => {
        const sub = s.submissions.find((x) => x.id === id);
        if (!sub) return s;
        const j = s.jobs.find((x) => x.id === sub.jobId) || jobById(sub.jobId);
        const c =
          s.candidates.find((x) => x.id === sub.candidateId) || candidateById(sub.candidateId);
        const cName = c?.name || "Candidate";
        const jTitle = j?.title || "Job";
        return {
          ...s,
          submissions: s.submissions.map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: "am_rejected",
                  stage: "rejected",
                  rejection_reason: reason,
                  rejectionReason: reason,
                  decision_note: reason,
                  decisionNote: reason,
                  amNotes: reason,
                  lastActivity: "just now",
                  amDecision: {
                    decision: "rejected",
                    at: "just now",
                    by: "Priya Raghunathan",
                    reason,
                  },
                  timeline: [
                    ...x.timeline,
                    { label: "AM rejected", at: "just now", by: "Priya Raghunathan", note: reason },
                  ],
                }
              : x,
          ),
          activity: [
            log({
              jobId: j?.id || sub.jobId,
              companyId: j?.companyId || "",
              candidateId: c?.id || sub.candidateId,
              recruiterId: sub.recruiterId ?? undefined,
              actor: "Priya Raghunathan",
              action: "rejected submission",
              object: cName,
              from: "AM review",
              to: "Rejected",
            }),
            ...s.activity,
          ],
          notifications: [
            notify({
              category: "Submissions",
              body: `${cName} was rejected for ${jTitle} at ${companyById(j?.companyId || "").name} — ${reason}.`,
              link: { jobId: sub.jobId, tab: "submissions", focus: id },
            }),
            ...s.notifications,
          ],
        };
      });
    };

    const requestInfo = (id: string, note: string) =>
      setState((s) => {
        const sub = s.submissions.find((x) => x.id === id);
        if (!sub) return s;
        const j = s.jobs.find((x) => x.id === sub.jobId) || jobById(sub.jobId);
        const c =
          s.candidates.find((x) => x.id === sub.candidateId) || candidateById(sub.candidateId);
        const cName = c?.name || "Candidate";
        return {
          ...s,
          submissions: s.submissions.map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: "on_hold",
                  lastActivity: "just now",
                  timeline: [
                    ...x.timeline,
                    {
                      label: "More information requested",
                      at: "just now",
                      by: "Priya Raghunathan",
                      note,
                    },
                  ],
                }
              : x,
          ),
          activity: [
            log({
              jobId: j?.id || sub.jobId,
              companyId: j?.companyId || "",
              candidateId: c?.id || sub.candidateId,
              recruiterId: sub.recruiterId ?? undefined,
              actor: "Priya Raghunathan",
              action: "requested more information on",
              object: cName,
              from: "AM review",
              to: "On hold",
            }),
            ...s.activity,
          ],
        };
      });

    const advanceCandidate = (submissionId: string, to: string) => {
      const statusMap: Record<string, AmSubmission["status"]> = {
        submitted: "submitted",
        am_review: "am_review",
        company_review: "company_reviewing",
        interview: "interview",
        final: "interview",
        offer: "offer",
        hired: "hired",
        rejected: "company_rejected",
      };
      const mappedStatus = statusMap[to] || (to === "rejected" ? "company_rejected" : "company_reviewing");

      const backendStatus =
        to === "rejected" || to === "company_rejected"
          ? "rejected"
          : to === "am_review" || to === "submitted"
          ? "submitted"
          : "under_review";

      api
        .patch(`/api/recruiting/submissions/${submissionId}/`, {
          stage: to,
          status: backendStatus,
        })
        .catch((err) => {
          console.warn("Failed to update submission stage on backend:", err);
        });

      setState((s) => {
        const sub = s.submissions.find((x) => x.id === submissionId);
        if (!sub) return s;
        const j = s.jobs.find((x) => x.id === sub.jobId) || jobById(sub.jobId);
        const c =
          s.candidates.find((x) => x.id === sub.candidateId) || candidateById(sub.candidateId);

        const becameHire = to === "hired" && sub.stage !== "hired";
        const bounty = sub.bounty ?? (j ? Math.round((j.bountyMin + j.bountyMax) / 2) : 0);
        return {
          ...s,
          submissions: s.submissions.map((x) =>
            x.id === submissionId
              ? {
                  ...x,
                  stage: to as CandidateStage,
                  status: mappedStatus,
                  lastActivity: "just now",
                  ...(becameHire
                    ? { bounty, payoutStatus: "pending" as PayoutStatus, hiredAt: "just now" }
                    : {}),
                  timeline: [
                    ...x.timeline,
                    {
                      label: `Moved to ${getStageLabel(to)}`,
                      at: "just now",
                      by: "Priya Raghunathan",
                    },
                  ],
                }
              : x,
          ),
          payouts:
            becameHire && sub.recruiterId
              ? [
                  {
                    id: uid("po"),
                    jobId: j.id,
                    candidateId: c.id,
                    recruiterId: sub.recruiterId,
                    bounty,
                    recruiterShare: Math.round(bounty * 0.7),
                    companyPayment: bounty,
                    status: "pending" as PayoutStatus,
                    hireDate: "just now",
                  },
                  ...s.payouts,
                ]
              : s.payouts,
          activity: [
            log({
              jobId: j.id,
              companyId: j.companyId,
              candidateId: c.id,
              recruiterId: sub.recruiterId ?? undefined,
              actor: "Priya Raghunathan",
              action: "moved candidate",
              object: c.name,
              from: sub.stage.replace("_", " "),
              to: to.replace("_", " "),
            }),
            ...s.activity,
          ],
          notifications: [
            notify({
              category: becameHire ? "Hiring" : "Company",
              body: `${c.name} moved to ${to.replace("_", " ")} for ${j.title} at ${companyById(j.companyId).name}.`,
              link: { jobId: j.id, tab: "candidates", focus: c.id },
            }),
            ...(becameHire
              ? [
                  notify({
                    category: "Finance",
                    body: `Bounty of $${bounty.toLocaleString()} generated for ${c.name} — payout pending.`,
                    link: { to: "/am/payouts" },
                  }),
                ]
              : []),
            ...s.notifications,
          ],
        };
      });
    };

    const handleFeedback = (feedbackId: string) =>
      setState((s) => ({
        ...s,
        feedback: s.feedback.map((f) =>
          f.id === feedbackId ? { ...f, handled: true, state: "received" } : f,
        ),
      }));

    const duplicateCheck = (jobId: string, name: string, email: string, linkedin?: string) => {
      const normLinkedin = linkedin ? normalizeLinkedinUrl(linkedin) : "";
      const normEmail = email ? email.trim().toLowerCase() : "";
      const normName = name ? name.trim().toLowerCase() : "";

      const existing = state.candidates.find((c) => {
        const emailMatch = normEmail && c.email && c.email.trim().toLowerCase() === normEmail;
        const nameMatch = normName && c.name && c.name.trim().toLowerCase() === normName;
        const linkedinMatch =
          normLinkedin && c.linkedin && normalizeLinkedinUrl(c.linkedin) === normLinkedin;
        return Boolean(emailMatch || nameMatch || linkedinMatch);
      });

      const dupSub = existing
        ? state.submissions.find(
            (s) =>
              (s.jobId === jobId || (s.jobSlug && s.jobSlug === jobId)) &&
              s.candidateId === existing.id,
          )
        : undefined;

      return {
        ...(existing ? { candidate: existing } : {}),
        ...(dupSub ? { submission: dupSub } : {}),
      };
    };

    const addCandidate = (input: NewCandidateInput) => {
      const dup = duplicateCheck(input.jobId, input.name, input.email, input.linkedin);
      if (dup.submission) {
        return {
          ok: false,
          message: `${input.name} (or a candidate with this LinkedIn profile) has already been submitted for this job.`,
        };
      }
      const candidateId = dup.candidate?.id ?? uid("cand");
      const subId = uid("sub");
      setState((s) => {
        const j = s.jobs.find((x) => x.id === input.jobId) || jobById(input.jobId);
        const newCandidate: AmCandidate = dup.candidate ?? {
          id: candidateId,
          name: input.name,
          currentRole: input.currentRole || "—",
          currentCompany: input.currentCompany || "—",
          location: input.location,
          email: input.email,
          phone: input.phone,
          linkedin: input.linkedin,
          github: input.github,
          portfolio: input.portfolio,
          resume: input.resume || "resume.pdf",
          visa: input.visa,
          compensation: input.compensation,
          availability: input.availability,
          experience: "—",
          skills: [],
        };
        const submission: AmSubmission = {
          id: subId,
          jobId: input.jobId,
          candidateId,
          recruiterId: input.recruiterId,
          source: input.source,
          submittedAt: "just now",
          match: input.match,
          status: "am_review",
          stage: "am_review",
          lastActivity: "just now",
          recommendation: input.recommendation,
          recruiterNotes: input.recommendation || "—",
          amNotes:
            input.source === "account_manager" ? "Uploaded directly by Account Manager." : "",
          ai: {
            score: input.match,
            strengths: ["Resume parsed — review strengths"],
            gaps: ["Run AI evaluation for a full gap analysis"],
            redFlags: [],
          },
          answers: input.answers,
          timeline: [
            {
              label:
                input.source === "account_manager"
                  ? "AM uploaded candidate"
                  : "Recruiter submitted",
              at: "just now",
              by: input.recruiterId
                ? (recruiterById(input.recruiterId)?.name ?? "Recruiter")
                : "Priya Raghunathan",
            },
          ],
        };
        const nextCandidates = dup.candidate ? s.candidates : [newCandidate, ...s.candidates];
        const nextSubmissions = [submission, ...s.submissions];

        // Persist directly to backend database
        try {
          const payload = new FormData();
          payload.append("job_id", input.jobId);
          payload.append("first_name", input.name.split(" ")[0] || input.name);
          payload.append("last_name", input.name.split(" ").slice(1).join(" ") || "Candidate");
          payload.append("email", input.email.trim());
          payload.append("phone", input.phone.trim());
          payload.append("current_title", input.currentRole.trim());
          payload.append("current_company", input.currentCompany.trim());
          payload.append("current_location", input.location.trim());
          payload.append("linkedin_url", input.linkedin.trim());
          payload.append("github_url", input.github.trim());
          payload.append("portfolio_url", input.portfolio.trim());
          payload.append("work_authorization_status", input.visa.trim());
          payload.append("visa_status", input.visa.trim());
          payload.append("compensation", input.compensation.trim());
          payload.append("availability", input.availability.trim());
          payload.append("notice_period", input.availability.trim());
          payload.append("notes", input.recommendation.trim());
          payload.append("answers", JSON.stringify(input.answers || []));

          api.post("/api/recruiting/submissions/", payload)
            .then(() => refreshSubmissions(true))
            .catch((err) => console.warn("Backend addCandidate sync error:", err));
        } catch (err) {
          console.warn("Failed to dispatch backend addCandidate:", err);
        }

        return {
          ...s,
          candidates: nextCandidates,
          submissions: nextSubmissions,
          activity: [
            log({
              jobId: j?.id || input.jobId,
              companyId: j?.companyId || "",
              candidateId,
              recruiterId: input.recruiterId ?? undefined,
              actor: input.recruiterId
                ? (recruiterById(input.recruiterId)?.name ?? "Recruiter")
                : "Priya Raghunathan",
              action: "uploaded and submitted candidate",
              object: input.name,
              to: "AM review",
            }),
            ...s.activity,
          ],
          notifications: [
            notify({
              category: "Submissions",
              body: `${input.name} was submitted for ${j?.title || "Job"} at ${companyById(j?.companyId || "").name} and needs review.`,
              link: { jobId: j?.id || input.jobId, tab: "submissions", focus: subId },
            }),
            ...s.notifications,
          ],
        };
      });
      return {
        ok: true,
        message: dup.candidate
          ? `${input.name} already existed globally — linked to the existing candidate record.`
          : `${input.name} added and queued for review.`,
      };
    };

    const createJob = async (job: AmJob): Promise<AmJob> => {
      let createdApiJob: any = null;
      try {
        const targetCompany = companyById(job.companyId);
        const companyUuid = targetCompany?.id || job.companyId;

        const workModelLower = (job.workModel || "Hybrid").toLowerCase();
        const workModelChoice = workModelLower.includes("remote")
          ? "remote"
          : workModelLower.includes("onsite") || workModelLower.includes("site")
            ? "onsite"
            : "hybrid";

        const empTypeLower = (job.employmentType || "Full-time").toLowerCase();
        const empTypeChoice = empTypeLower.includes("part")
          ? "part_time"
          : empTypeLower.includes("contract") || empTypeLower.includes("fixed")
            ? "contract"
            : empTypeLower.includes("intern")
              ? "internship"
              : "full_time";

        const companyFeePct =
          job.companyToYuvroPct !== undefined
            ? Number(job.companyToYuvroPct)
            : (() => {
                const pctMatch = String(job.bountyPct).match(/(\d+(\.\d+)?)/);
                return pctMatch ? parseFloat(pctMatch[1]) : 20.0;
              })();

        const yuvroCommPct =
          job.yuvroCommissionPct !== undefined
            ? Number(job.yuvroCommissionPct)
            : Math.min(5.0, companyFeePct);

        const payload: Record<string, unknown> = {
          company_id: companyUuid,
          title: job.title.trim(),
          status: job.status || "active",
          location: job.location.trim(),
          employment_type: empTypeChoice,
          work_model: workModelChoice,
          experience: job.experience || job.yearsExperience || "",
          open_roles: Number(job.openings) || 1,
          recruiter_slots: Number(job.recruiterSlots) || (state.recruiters.length || 2),
          job_description: job.jobDescription || job.jd?.aboutRole || job.title,
          salary_min: Number(job.salaryMin) || 0,
          salary_max: Number(job.salaryMax) || 0,
          salary_currency: job.currency || "USD",
          equity:
            job.equityValue !== undefined && job.equityValue !== null && !isNaN(Number(job.equityValue))
              ? Number(job.equityValue)
              : null,
          visa_sponsorship: job.visa || job.sponsorship || "",
          benefits_and_perks:
            job.benefitsAndPerks ||
            (Array.isArray(job.jd?.benefits) ? job.jd.benefits.join("\n") : ""),
          company_to_yuvro_percentage: companyFeePct,
          yuvro_commission_percentage: yuvroCommPct,
          payout_terms: job.payoutTerms && job.payoutTerms.length ? job.payoutTerms : [30, 60, 90],
          must_haves: job.mustHave || [],
          candidate_questions: (job.questions || []).map((q) => ({
            question: q.q,
            type: q.type || "Long text",
            required: q.required !== false,
          })),
          signals: {
            green: job.signals?.green || job.niceToHave || [],
            red: job.signals?.red || [],
          },
          target_companies: job.targetCompanies || [],
          hiring_process: Array.isArray(job.process) && job.process.length > 0 ? job.process : [],
        };

        createdApiJob = await api.post("/api/marketplace/jobs/", payload);
      } catch (err: any) {
        console.warn("Backend createJob request failed:", err);
        let errorMsg = err?.message || "Failed to create job";
        if (err?.data && typeof err.data === "object") {
          const fieldErrors = Object.entries(err.data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`)
            .join(" | ");
          if (fieldErrors) errorMsg = fieldErrors;
        }
        throw new Error(errorMsg);
      }

      const finalJob = createdApiJob ? mapBackendJobToAmJob(createdApiJob, job) : job;

      setState((s) => ({
        ...s,
        jobs: [finalJob, ...s.jobs.filter((x) => x.id !== finalJob.id && x.id !== job.id)],
        activity: [
          log({
            jobId: finalJob.id,
            companyId: finalJob.companyId,
            actor: "Priya Raghunathan",
            action: "created job",
            object: finalJob.title,
            to: finalJob.status,
          }),
          ...s.activity,
        ],
        notifications: [
          notify({
            category: "Jobs",
            body: `${finalJob.title} at ${companyById(finalJob.companyId).name} was created (${finalJob.status}).`,
            link: { jobId: finalJob.id, tab: "overview" },
          }),
          ...s.notifications,
        ],
      }));

      return finalJob;
    };

    const updateJob = async (jobId: string, patch: Partial<AmJob>): Promise<AmJob | undefined> => {
      let updatedApiJob: any = null;
      try {
        const payload: Record<string, unknown> = {};
        if (patch.companyId) payload.company_id = patch.companyId;
        if (patch.title) payload.title = patch.title;
        if (patch.status) payload.status = patch.status;
        if (patch.location) payload.location = patch.location;
        if (patch.salaryMin !== undefined) payload.salary_min = patch.salaryMin;
        if (patch.salaryMax !== undefined) payload.salary_max = patch.salaryMax;
        if (patch.currency) payload.salary_currency = patch.currency;
        if (patch.equityValue !== undefined) {
          payload.equity = patch.equityValue;
        }
        if (patch.employmentType) {
          const emp = patch.employmentType.toLowerCase();
          payload.employment_type = emp.includes("part")
            ? "part_time"
            : emp.includes("contract")
            ? "contract"
            : emp.includes("intern")
            ? "internship"
            : "full_time";
        }
        if (patch.workModel) {
          const wm = patch.workModel.toLowerCase();
          payload.work_model = wm.includes("remote")
            ? "remote"
            : wm.includes("onsite") || wm.includes("site")
              ? "onsite"
              : "hybrid";
        }
        if (patch.experience) payload.experience = patch.experience;
        if (patch.openings !== undefined) payload.open_roles = patch.openings;
        if (patch.recruiterSlots !== undefined) payload.recruiter_slots = patch.recruiterSlots;
        if (patch.jobDescription !== undefined) payload.job_description = patch.jobDescription;
        if (patch.visa !== undefined) payload.visa_sponsorship = patch.visa;
        if (patch.benefitsAndPerks !== undefined) payload.benefits_and_perks = patch.benefitsAndPerks;
        if (patch.companyToYuvroPct !== undefined) payload.company_to_yuvro_percentage = patch.companyToYuvroPct;
        if (patch.yuvroCommissionPct !== undefined) payload.yuvro_commission_percentage = patch.yuvroCommissionPct;
        if (patch.payoutTerms) payload.payout_terms = patch.payoutTerms;
        if (patch.mustHave) payload.must_haves = patch.mustHave;
        if (patch.targetCompanies) payload.target_companies = patch.targetCompanies;
        if (patch.signals) payload.signals = patch.signals;
        if (patch.process) payload.hiring_process = patch.process;
        if (patch.questions) {
          payload.candidate_questions = patch.questions.map((q) => ({
            question: q.q,
            type: q.type || "Long text",
            required: q.required !== false,
          }));
        }

        if (Object.keys(payload).length > 0) {
          updatedApiJob = await api.patch(`/api/marketplace/jobs/${encodeURIComponent(jobId)}/`, payload);
        }
      } catch (err) {
        console.warn("Backend updateJob request failed, using local fallback:", err);
      }

      const existingJob =
        state.jobs.find((j) => j.id === jobId || j.slug === jobId) || jobById(jobId);
      const targetId = existingJob?.id || jobId;
      const mapped =
        updatedApiJob && existingJob
          ? mapBackendJobToAmJob(updatedApiJob, existingJob)
          : null;
      const updatedJob = mapped
        ? { ...mapped, ...patch }
        : { ...(existingJob || {}), ...patch };

      setState((s) => ({
        ...s,
        jobs: s.jobs.map((j) =>
          j.id === targetId ||
          j.slug === targetId ||
          j.id === jobId ||
          j.slug === jobId
            ? (updatedJob as AmJob)
            : j,
        ),
      }));

      return updatedJob as AmJob;
    };

    const sendMessage = (threadId: string, body: string) =>
      setState((s) => ({
        ...s,
        threads: s.threads.map((t) =>
          t.id === threadId
            ? {
                ...t,
                unread: 0,
                messages: [
                  ...t.messages,
                  {
                    id: uid("m"),
                    from: "Priya Raghunathan",
                    role: "Account Manager",
                    at: "just now",
                    body,
                  },
                ],
              }
            : t,
        ),
      }));

    const markThreadRead = (threadId: string) =>
      setState((s) => ({
        ...s,
        threads: s.threads.map((t) => (t.id === threadId ? { ...t, unread: 0 } : t)),
      }));

    const setPayoutStatus = (id: string, status: PayoutStatus) =>
      setState((s) => {
        const p = s.payouts.find((x) => x.id === id);
        if (!p) return s;
        const c = s.candidates.find((x) => x.id === p.candidateId);
        const rec = s.recruiters.find((x) => x.id === p.recruiterId);
        return {
          ...s,
          payouts: s.payouts.map((x) =>
            x.id === id
              ? { ...x, status, ...(status === "paid" ? { paidDate: "just now" } : {}) }
              : x,
          ),
          activity: [
            log({
              jobId: p.jobId,
              recruiterId: p.recruiterId,
              candidateId: p.candidateId,
              actor: "Priya Raghunathan",
              action: `set payout to ${status}`,
              object: `${c?.name ?? "placement"} bounty`,
              from: p.status,
              to: status,
            }),
            ...s.activity,
          ],
          notifications: [
            notify({
              category: "Finance",
              body: `Payout for ${c?.name ?? "placement"} (${rec?.name ?? "recruiter"}) is now ${status}.`,
              link: { to: "/am/payouts" },
            }),
            ...s.notifications,
          ],
        };
      });

    const markNotificationsRead = () => {
      api.post("/api/notifications/mark-all-read/").catch(() => {});
      setState((s) => ({
        ...s,
        notifications: s.notifications.map((n) => ({ ...n, read: true })),
      }));
    };

    const markNotificationRead = (id: string) => {
      api.post(`/api/notifications/${id}/read/`).catch(() => {});
      setState((s) => ({
        ...s,
        notifications: s.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
      }));
    };

    const createRecruiter = async (
      r: Partial<AmRecruiter> & { name: string; email: string; password?: string },
    ): Promise<AmRecruiter> => {
      const email = r.email.trim().toLowerCase();
      const password = r.password ? r.password.trim() : "";

      if (password) {
        try {
          const parts = r.name.trim().split(" ");
          const firstName = parts[0] || "Recruiter";
          const lastName = parts.slice(1).join(" ") || "";
          await yhubApiUtil.post("/auth/register/?product=marketplace", {
            email,
            username: email.split("@")[0],
            password,
            password_confirm: password,
            first_name: firstName,
            last_name: lastName,
            role: "recruiter_freelancer",
            roles: {
              marketplace: "recruiter_freelancer",
            },
          });
        } catch (yhubErr) {
          console.warn("YHub registration on createRecruiter (might already exist):", yhubErr);
        }
      }

      const payload = {
        name: r.name.trim(),
        email,
        password: password || undefined,
        phone: r.phone ? r.phone.trim() : "",
        location: r.location ? r.location.trim() : "",
        linkedin: normalizeUrl(r.linkedin),
        website: normalizeUrl(r.website),
        type: r.agency && r.agency !== "—" ? "Agency" : r.type || "Independent",
        agency: r.agency && r.agency !== "—" ? r.agency.trim() : "",
        experience: r.experience && r.experience !== "—" ? r.experience.trim() : "",
        status: r.status || "pending",
        specializations: r.specializations || [],
        markets: r.markets || [],
      };

      let createdApiRecruiter: Record<string, unknown> | null = null;
      try {
        createdApiRecruiter = await api.post<Record<string, unknown>>(
          "/api/marketplace/recruiters/",
          payload,
        );
      } catch (err) {
        console.error("Backend createRecruiter request failed:", err);
        throw new Error(formatApiErrorMessage(err));
      }

      const rec: AmRecruiter = mapBackendRecruiterToAmRecruiter(
        createdApiRecruiter,
        r as unknown as AmRecruiter,
      );

      setState((s) => ({
        ...s,
        recruiters: [
          rec,
          ...s.recruiters.filter(
            (x) =>
              x.id !== rec.id &&
              x.email.toLowerCase() !== rec.email.toLowerCase(),
          ),
        ],
        activity: [
          log({
            recruiterId: rec.id,
            actor: "Priya Raghunathan",
            action: "created recruiter account",
            object: rec.name,
            to: rec.status,
          }),
          ...s.activity,
        ],
      }));

      return rec;
    };


    const createCompany = async (c: Partial<AmCompany> & { name: string }): Promise<AmCompany> => {
      let resolvedLogoUrl = c.logoUrl ? normalizeUrl(c.logoUrl) : "";
      if (c.logoFile && !resolvedLogoUrl) {
        try {
          const fd = new FormData();
          fd.append("logo", c.logoFile);
          const uploadRes = await api.post<{ url: string; key: string }>(
            "/api/marketplace/companies/upload-logo/",
            fd,
          );
          if (uploadRes?.url) {
            resolvedLogoUrl = uploadRes.url;
          }
        } catch (uploadErr) {
          console.warn("Failed to upload logo before creating company:", uploadErr);
        }
      }

      const payload = {
        name: c.name.trim(),
        website: normalizeUrl(c.website),
        logo_url: resolvedLogoUrl,
        industry: c.industry && c.industry !== "—" ? c.industry : "",
        company_size: c.size && c.size !== "—" ? c.size : "",
        funding_stage: c.fundingStage && c.fundingStage !== "—" ? c.fundingStage : "",
        founded_year: c.founded && !isNaN(Number(c.founded)) ? Number(c.founded) : null,
        headquarters: c.hq && c.hq !== "—" ? c.hq : "",
        status: c.status || "onboarding",
        overview: c.overview || "",
        why_role: c.whyRole || "",
        why_company: c.highlights || [],
        leadership: (c.leaders || []).map((l) => ({
          name: l.name,
          title: l.title,
          linkedin_url: normalizeUrl(l.linkedin),
        })),
        manager_name: c.managerName?.trim() || undefined,
        manager_designation: c.managerDesignation?.trim() || undefined,
        manager_email: c.managerEmail?.trim() || undefined,
        manager_mobile: c.managerMobile?.trim() || undefined,
      };

      let createdApiCompany: Record<string, unknown> | null = null;
      try {
        createdApiCompany = await api.post<Record<string, unknown>>(
          "/api/marketplace/companies/",
          payload,
        );
      } catch (err) {
        console.error("Backend createCompany request failed:", err);
        throw new Error(formatApiErrorMessage(err));
      }

      const co: AmCompany = mapBackendCompanyToAmCompany(
        createdApiCompany,
        c as unknown as AmCompany,
      );

      setState((s) => ({
        ...s,
        companies: [
          co,
          ...s.companies.filter(
            (x) =>
              x.id !== co.id &&
              x.slug !== co.slug &&
              x.name.toLowerCase() !== co.name.toLowerCase(),
          ),
        ],
        activity: [
          log({
            companyId: co.id,
            actor: "Priya Raghunathan",
            action: "created company account",
            object: co.name,
            to: "Onboarding",
          }),
          ...s.activity,
        ],
      }));

      return co;
    };

    return {
      state,
      signedIn,
      signIn,
      signOut,
      company: companyById,
      job: jobById,
      recruiter: recruiterById,
      candidate: candidateById,
      companyOfJob,
      jobStats,
      attention,
      kpis,
      unreadMessages: state.threads.reduce((n, t) => n + t.unread, 0),
      unreadNotifications: state.notifications.filter((n) => !n.read).length,
      search,
      assignRecruiter,
      approveRequest,
      rejectRequest,
      approveSubmission,
      rejectSubmission,
      requestInfo,
      advanceCandidate,
      handleFeedback,
      addCandidate,
      duplicateCheck,
      createJob,
      updateJob,
      sendMessage,
      markThreadRead,
      setPayoutStatus,
      markNotificationsRead,
      markNotificationRead,
      createRecruiter,
      createCompany,
      refreshCompanies,
      refreshJobs,
      refreshRecruiters,
      refreshRequests,
      refreshSubmissions,
    };
  }, [
    state,
    signedIn,
    signIn,
    signOut,
    refreshCompanies,
    refreshJobs,
    refreshRecruiters,
    refreshRequests,
    refreshSubmissions,
  ]);


  return <AmContext.Provider value={value}>{children}</AmContext.Provider>;
}

export function useAm() {
  const ctx = useContext(AmContext);
  if (!ctx) throw new Error("useAm must be used inside AmProvider");
  return ctx;
}

export function useAmOptional() {
  return useContext(AmContext);
}

