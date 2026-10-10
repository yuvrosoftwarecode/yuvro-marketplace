/**
 * Account Manager domain model + seed data.
 *
 * Relationship: COMPANY -> JOB -> { requests, submissions, candidates,
 * feedback, threads, events, activity }. A candidate exists globally, a
 * SUBMISSION always belongs to exactly one job + recruiter (or the AM).
 */

export type AmJobStatus =
  | "draft"
  | "pending"
  | "pending_approval"
  | "active"
  | "hiring"
  | "paused"
  | "filled"
  | "closed"
  | "cancelled"
  | "archived";

export type RequestStatus = "pending" | "approved" | "rejected" | "withdrawn" | "removed";

export type SubmissionStatus =
  | "submitted"
  | "am_review"
  | "am_approved"
  | "am_rejected"
  | "forwarded"
  | "company_reviewing"
  | "company_rejected"
  | "interview"
  | "offer"
  | "hired"
  | "withdrawn"
  | "on_hold";

export type CandidateStage =
  | "submitted"
  | "am_review"
  | "company_review"
  | "interview"
  | "final"
  | "offer"
  | "hired"
  | "rejected";

export type PayoutStatus = "pending" | "approved" | "processing" | "paid" | "failed" | "disputed";
export type RecruiterStatus = "active" | "pending" | "suspended" | "inactive";
export type CompanyStatus = "active" | "onboarding" | "paused" | "inactive";
export type SourceType = "recruiter" | "agency" | "account_manager" | "referral" | "direct";

export type AmCompany = {
  id: string;
  slug?: string;
  name: string;
  short: string;
  tone: string;
  industry: string;
  website: string;
  size: string;
  fundingStage: string;
  funding: string;
  founded: string;
  hq: string;
  status: CompanyStatus;
  overview: string;
  whyCompany: string;
  whyRole: string;
  investors: string[];
  founders: { name: string; title: string; prior: string }[];
  logoUrl?: string;
  logo?: string;
  logoFile?: File;
  highlights?: { title: string; description: string }[];
  leaders?: { name: string; title: string; linkedin: string }[];
  contacts: {
    name: string;
    title: string;
    email: string;
    phone: string;
    role: "Hiring manager" | "Primary contact" | "Talent partner";
    loginStatus: "active" | "invited" | "none";
  }[];
  managerName?: string;
  managerDesignation?: string;
  managerEmail?: string;
  managerMobile?: string;
  companyManager?: {
    id: number;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    designation?: string;
    phoneNumber?: string;
  } | null;
  totalPaid: number;
  totalSaved: number;
  totalHires: number;
};

export type AmJob = {
  id: string;
  companyId: string;
  title: string;
  department: string;
  employmentType: string;
  location: string;
  workModel: "Remote" | "Hybrid" | "Onsite" | "On-site";
  experience: string;
  yearsExperience: string;
  salaryMin: number;
  salaryMax: number;
  currency: "USD" | "GBP" | "EUR";
  equity: string;
  bonus: string;
  compNotes: string;
  status: AmJobStatus;
  openings: number;
  deadline: string;
  createdAt: string;
  lastActivity: string;
  bountyPct: string;
  bountyMin: number;
  bountyMax: number;
  recruiterReward: string;
  paymentRules: string;
  recruiterSlots: number;
  hiringManager: string;
  companyContact: string;
  visa: string;
  sponsorship: string;
  mustHave: string[];
  niceToHave: string[];
  skills: string[];
  domain: string;
  education: string;
  locationRequirement: string;
  otherRequirements: string[];
  slug?: string;
  equityValue?: number | null;
  companyToYuvroPct?: number;
  yuvroCommissionPct?: number;
  recruiterPct?: number;
  payoutTerms?: number[];
  jobDescription?: string;
  benefitsAndPerks?: string;
  signals?: { green: string[]; red: string[] };
  process: string[];
  questions: { q: string; type: string; required: boolean }[];
  targetCompanies?: string[];
  createdBy?: {
    id: string;
    email: string;
    name: string;
    role?: string;
    is_company_manager?: boolean;
    is_account_manager?: boolean;
  } | null;
};

export type AmRecruiter = {
  id: string;
  slug?: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  website: string;
  type: "Independent" | "Agency";
  agency: string;
  experience: string;
  status: RecruiterStatus;
  specializations: string[];
  markets: string[];
  createdBy: string;
  createdAt: string;
  responseRate: number;
  qualityScore: number;
  verification: {
    identity: boolean;
    agency: boolean;
    payment: boolean;
    tax: boolean;
    agreement: boolean;
  };
  interviewStats: {
    scheduled: number;
    completed: number;
    technical: number;
    hiringManager: number;
    final: number;
    noShows: number;
    cancelled: number;
    rescheduled: number;
  };
  amRejectionReasons: { reason: string; count: number }[];
  companyRejectionReasons: { reason: string; count: number }[];
};

export type AmRequest = {
  id: string;
  jobId: string;
  recruiterId: string;
  recruiterProfileId?: string;
  recruiterName?: string;
  recruiterEmail?: string;
  status: RequestStatus;
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  reason?: string;
  pitch: string;
  relevantProfiles: number;
  relevantHistory: string;
};

export type AmCandidate = {
  id: string;
  name: string;
  currentRole: string;
  currentCompany: string;
  location: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  portfolio: string;
  resume: string;
  resumeUrl?: string;
  visa: string;
  visaStatus?: string;
  compensation: string;
  currentCompensation?: string;
  currentSalary?: string;
  expectedCompensation?: string;
  expectedSalary?: string;
  availability: string;
  noticePeriod?: string;
  experience: string;
  skills: string[];
};

export type AmSubmission = {
  id: string;
  jobId: string;
  jobSlug?: string;
  candidateId: string;
  recruiterId: string | null;
  source: SourceType;
  submittedAt: string;
  match: number;
  status: SubmissionStatus;
  stage: CandidateStage;
  lastActivity: string;
  recommendation: string;
  recruiterNotes: string;
  amNotes: string;
  rejection_reason?: string;
  rejectionReason?: string;
  decision_note?: string;
  decisionNote?: string;
  ai: { score: number; strengths: string[]; gaps: string[]; redFlags: string[] };
  answers: { q: string; a: string }[];
  timeline: { label: string; at: string; by: string; note?: string }[];
  amDecision?: { decision: "approved" | "rejected"; at: string; by: string; reason?: string };
  bounty?: number;
  payoutStatus?: PayoutStatus;
  hiredAt?: string;
};

export type AmFeedback = {
  id: string;
  jobId: string;
  submissionId: string;
  from: string;
  at: string;
  state: "pending" | "received" | "action_required" | "rejected" | "advanced";
  body: string;
  rejectionReason?: string;
  handled?: boolean;
};

export type AmMessage = {
  id: string;
  from: string;
  role: "Company" | "Recruiter" | "Candidate" | "Account Manager";
  at: string;
  body: string;
};

export type AmThread = {
  id: string;
  kind: "company" | "recruiter" | "candidate";
  jobId: string;
  companyId: string;
  recruiterId?: string;
  candidateId?: string;
  participant: string;
  participantTitle: string;
  unread: number;
  urgent?: boolean;
  messages: AmMessage[];
};

export type AmEvent = {
  id: string;
  type: "Interview" | "Company meeting" | "Recruiter call" | "Follow-up" | "Deadline";
  title: string;
  date: string;
  time: string;
  jobId: string;
  companyId: string;
  candidateId?: string;
  recruiterId?: string;
  stage?: string;
};

export type AmActivity = {
  id: string;
  jobId?: string;
  recruiterId?: string;
  candidateId?: string;
  companyId?: string;
  actor: string;
  action: string;
  object: string;
  at: string;
  from?: string;
  to?: string;
};

export type AmNotification = {
  id: string;
  category: "Jobs" | "Recruiters" | "Submissions" | "Company" | "Hiring" | "Finance";
  body: string;
  at: string;
  read: boolean;
  link: { jobId?: string; tab?: string; focus?: string; to?: string };
};

export type AmPayout = {
  id: string;
  jobId: string;
  candidateId: string;
  recruiterId: string;
  bounty: number;
  recruiterShare: number;
  companyPayment: number;
  status: PayoutStatus;
  hireDate: string;
  paidDate?: string;
};

export type AmAttention = {
  id: string;
  kind: "request" | "submission" | "feedback" | "interview" | "candidate";
  headline: string;
  context: string;
  meta: string;
  cta: string;
  link: { jobId?: string; tab?: string; focus?: string; to?: string };
};

/* ------------------------------------------------------------------ labels */

export const jobStatusLabel: Record<AmJobStatus, string> = {
  draft: "Draft",
  pending: "Pending approval",
  pending_approval: "Pending approval",
  active: "Active",
  hiring: "Hiring",
  paused: "Paused",
  filled: "Filled",
  closed: "Closed",
  cancelled: "Cancelled",
  archived: "Archived",
};

export const requestStatusLabel: Record<RequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  removed: "Removed",
};

export const submissionStatusLabel: Record<SubmissionStatus, string> = {
  submitted: "Submitted",
  am_review: "Pending review",
  am_approved: "AM approved",
  am_rejected: "AM rejected",
  forwarded: "Forwarded",
  company_reviewing: "Company reviewing",
  company_rejected: "Company rejected",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  withdrawn: "Withdrawn",
  on_hold: "On hold",
};

export const candidateStageLabel: Record<CandidateStage, string> = {
  submitted: "Submitted",
  am_review: "AM Review",
  company_review: "Company review",
  interview: "Interview",
  final: "Final",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
};

export function getStageLabel(stage?: string): string {
  if (!stage) return "AM Review";
  const s = stage.trim();
  if (candidateStageLabel[s as CandidateStage]) {
    return candidateStageLabel[s as CandidateStage];
  }
  const lower = s.toLowerCase();
  if (candidateStageLabel[lower as CandidateStage]) {
    return candidateStageLabel[lower as CandidateStage];
  }
  if (lower === "am_review" || lower === "am review" || lower === "submitted" || lower === "pending") {
    return "AM Review";
  }
  if (lower === "technical_interview") return "Technical Interview";
  if (lower === "hiring_manager") return "Hiring Manager";
  if (lower === "final_interview") return "Final Interview";

  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export const payoutStatusLabel: Record<PayoutStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  processing: "Processing",
  paid: "Paid",
  failed: "Failed",
  disputed: "Disputed",
};

export const candidateStages: CandidateStage[] = [
  "submitted",
  "am_review",
  "company_review",
  "interview",
  "final",
  "offer",
  "hired",
  "rejected",
];

/* ------------------------------------------------------------------ helpers */

export const money = (n: number | string | undefined | null, currency: "USD" | "GBP" | "EUR" = "USD") => {
  const num = typeof n === "number" && !isNaN(n) ? n : Number(n) || 0;
  const sym = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";
  if (Math.abs(num) >= 1000) return `${sym}${Math.round(num / 1000)}K`;
  return `${sym}${num.toLocaleString()}`;
};

export const moneyExact = (n: number | string | undefined | null, currency: "USD" | "GBP" | "EUR" = "USD") => {
  const num = typeof n === "number" && !isNaN(n) ? n : Number(n) || 0;
  const sym = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";
  return `${sym}${num.toLocaleString()}`;
};

export const salaryRange = (j?: Partial<AmJob> | null) => {
  if (!j) return "—";
  const min = j.salaryMin ?? 0;
  const max = j.salaryMax ?? 0;
  if (!min && !max) return "—";
  return `${money(min, j.currency)}–${money(max, j.currency)}`;
};

export const bountyRange = (j?: Partial<AmJob> | null) => {
  if (!j) return "—";
  const min = j.bountyMin ?? 0;
  const max = j.bountyMax ?? 0;
  if (!min && !max) return "—";
  return `${money(min)}–${money(max)}`;
};

/* ------------------------------------------------------------------ seed */
/* ------------------------------------------------------------------ seed */

export const amManager = {
  name: "Priya Raghunathan",
  initials: "PR",
  title: "Senior Account Manager",
  email: "priya@yuvro.com",
  region: "US & UK desks",
};

export const amCompanies: AmCompany[] = [
  {
    id: "within",
    name: "Within",
    short: "WI",
    tone: "oklch(0.47 0.105 252)",
    industry: "Document intelligence / AI infrastructure",
    website: "within.ai",
    size: "140 employees",
    fundingStage: "Series B",
    funding: "$78M raised",
    founded: "2019",
    hq: "San Francisco, CA",
    status: "active",
    overview:
      "Within builds document intelligence infrastructure for finance and audit teams. Four of the Big Four and 60+ public companies review filings on the platform; revenue grew 4.1x last year at 140% net retention.",
    whyCompany: "Second-time founders, disciplined burn, enterprise logos already in production.",
    whyRole: "Review surface is the bottleneck for two enterprise rollouts; leadership funded a dedicated staff-level owner.",
    investors: ["Sequoia Capital", "Index Ventures", "Conviction", "Neo"],
    founders: [
      { name: "Nadia Okonkwo", title: "Co-founder & CEO", prior: "Stripe, Palantir" },
      { name: "Ben Aldridge", title: "Co-founder & CTO", prior: "Scale AI, Figma" },
    ],
    contacts: [
      { name: "Dana Whitcomb", title: "VP Engineering", email: "dana@within.ai", phone: "+1 415 555 0142", role: "Hiring manager", loginStatus: "active" },
      { name: "Sam Ortiz", title: "Head of Talent", email: "sam@within.ai", phone: "+1 415 555 0188", role: "Primary contact", loginStatus: "active" },
    ],
    totalPaid: 186000,
    totalSaved: 412000,
    totalHires: 7,
  },
  {
    id: "helio",
    name: "Helio Systems",
    short: "HS",
    tone: "oklch(0.5 0.09 155)",
    industry: "Observability & cloud cost governance",
    website: "heliosystems.com",
    size: "320 employees",
    fundingStage: "Series C",
    funding: "$145M raised",
    founded: "2016",
    hq: "London, UK",
    status: "active",
    overview:
      "Helio Systems sells observability and cost-governance software to mid-market engineering organisations across EMEA. $52M ARR, 118% net retention, nine-week median sales cycle.",
    whyCompany: "Operating CRO scaled Datadog EMEA from $12M to $180M; commission plan is uncapped.",
    whyRole: "EMEA team over-attained by 118% and is splitting one oversized territory in two.",
    investors: ["Accel", "Balderton", "Iconiq Growth"],
    founders: [
      { name: "Marta Reyes", title: "Founder & CEO", prior: "Stripe, Monzo" },
      { name: "Tom Whitfield", title: "President & CRO", prior: "Datadog, Snowflake" },
    ],
    contacts: [
      { name: "Alice Fenwick", title: "EMEA Sales Director", email: "alice@heliosystems.com", phone: "+44 20 7946 0321", role: "Hiring manager", loginStatus: "active" },
      { name: "Ravi Menon", title: "Talent Lead EMEA", email: "ravi@heliosystems.com", phone: "+44 20 7946 0398", role: "Primary contact", loginStatus: "invited" },
    ],
    totalPaid: 94000,
    totalSaved: 231000,
    totalHires: 4,
  },
  {
    id: "orbital",
    name: "Orbital Freight",
    short: "OF",
    tone: "oklch(0.5 0.11 60)",
    industry: "Logistics infrastructure",
    website: "orbitalfreight.com",
    size: "85 employees",
    fundingStage: "Series A",
    funding: "$32M raised",
    founded: "2021",
    hq: "Austin, TX",
    status: "active",
    overview:
      "Orbital Freight builds pricing and dispatch infrastructure for regional trucking fleets, with 1,900 carriers live on the platform.",
    whyCompany: "Founding team from Flexport's carrier platform group; strong domain moat.",
    whyRole: "Deployment platform is blocking a real-time dispatch launch.",
    investors: ["8VC", "Bessemer"],
    founders: [{ name: "Dev Raman", title: "Co-founder & CTO", prior: "Flexport, Convoy" }],
    contacts: [
      { name: "Dev Raman", title: "Co-founder & CTO", email: "dev@orbitalfreight.com", phone: "+1 512 555 0110", role: "Hiring manager", loginStatus: "active" },
    ],
    totalPaid: 48000,
    totalSaved: 96000,
    totalHires: 2,
  },
  {
    id: "northlane",
    name: "Northlane Health",
    short: "NH",
    tone: "oklch(0.48 0.08 205)",
    industry: "Value-based care",
    website: "northlanehealth.com",
    size: "210 employees",
    fundingStage: "Series B",
    funding: "$64M raised",
    founded: "2018",
    hq: "Boston, MA",
    status: "onboarding",
    overview: "Northlane Health runs value-based care programs for 40 employer plans across the northeast.",
    whyCompany: "Clinician-founder team with two prior digital-health exits.",
    whyRole: "Care network scaling from 60 to 100 clinicians in 12 months.",
    investors: ["General Catalyst", "F-Prime"],
    founders: [{ name: "Dr. Amara Silva", title: "Co-founder & CMO", prior: "Mass General, Devoted Health" }],
    contacts: [
      { name: "Colleen Barr", title: "COO", email: "colleen@northlanehealth.com", phone: "+1 617 555 0173", role: "Hiring manager", loginStatus: "invited" },
    ],
    totalPaid: 0,
    totalSaved: 0,
    totalHires: 0,
  },
];

const sharedQuestions: AmJob["questions"] = [
  { q: "Upload resume in English (PDF)", type: "File upload", required: true },
  { q: "Work authorization status", type: "Single select", required: true },
  { q: "Base compensation expectation", type: "Currency", required: true },
  { q: "Earliest start date", type: "Date", required: true },
  { q: "Why is this candidate a strong fit?", type: "Long text", required: true },
];

export const amJobs: AmJob[] = [
  {
    id: "within-ai-frontend",
    companyId: "within",
    title: "Senior AI Frontend Engineer",
    department: "Product Engineering",
    employmentType: "Full-time",
    location: "Remote / UK",
    workModel: "Remote",
    experience: "6+ years",
    yearsExperience: "6–12 years",
    salaryMin: 250000,
    salaryMax: 315000,
    currency: "USD",
    equity: "0.15% – 0.40%",
    bonus: "10% annual target",
    compNotes: "Band flexes to $330K for staff-level scope. Equity refresh at 24 months.",
    status: "hiring",
    openings: 3,
    deadline: "Oct 24, 2026",
    createdAt: "Aug 21, 2026",
    lastActivity: "12 min ago",
    bountyPct: "17.5% of first-year compensation",
    bountyMin: 23000,
    bountyMax: 30000,
    recruiterReward: "70% of bounty to submitting recruiter",
    paymentRules: "Net 30 after 90-day guarantee. Clawback if candidate exits inside 90 days.",
    recruiterSlots: 14,
    hiringManager: "Dana Whitcomb, VP Engineering",
    companyContact: "Sam Ortiz, Head of Talent",
    visa: "H-1B transfer and O-1 supported",
    sponsorship: "Yes",
    mustHave: [
      "6+ years product frontend, 2+ at senior/staff scope",
      "Shipped virtualized, data-dense interfaces at scale",
      "Streaming / websocket UI experience",
      "TypeScript depth",
    ],
    niceToHave: ["Fintech or audit domain", "Public rendering/performance write-ups", "Early engineer at Series A/B"],
    skills: ["TypeScript", "React 19", "TanStack", "WebSockets", "Performance profiling"],
    domain: "Enterprise / fintech tooling",
    education: "No degree requirement",
    locationRequirement: "Remote within UK or US timezones overlapping 10am–2pm PT",
    otherRequirements: ["Comfortable owning performance budgets", "No framework hopping"],
    jd: {
      aboutRole:
        "Own the surface where reviewers work: dense review tables, diff views, streaming model output and inline citation. A product-engineering role for someone who cares about latency and keyboard-first interaction.",
      responsibilities: [
        "Lead frontend architecture for the review workspace",
        "Build streaming, cancelable AI interactions",
        "Hold performance budgets on 10k-row virtualized tables",
        "Mentor three mid-level engineers",
      ],
      requirements: ["Senior/staff frontend scope", "Data-dense product surfaces", "Strong TypeScript"],
      benefits: ["100% medical, dental, vision", "401(k) 4% match", "$3,000 learning budget", "Unlimited PTO, 15-day minimum"],
    },
    process: ["Screening", "Technical interview", "System design", "Hiring manager", "Final interview", "Offer"],
    questions: sharedQuestions,
  },
  {
    id: "within-applied-ai",
    companyId: "within",
    title: "Applied AI Engineer",
    department: "Applied AI",
    employmentType: "Full-time",
    location: "San Francisco, CA",
    workModel: "Hybrid",
    experience: "4+ years",
    yearsExperience: "4–9 years",
    salaryMin: 220000,
    salaryMax: 270000,
    currency: "USD",
    equity: "0.10% – 0.25%",
    bonus: "10% annual target",
    compNotes: "Hybrid three days in SoMa.",
    status: "active",
    openings: 2,
    deadline: "Nov 7, 2026",
    createdAt: "Aug 28, 2026",
    lastActivity: "2 h ago",
    bountyPct: "16% of first-year compensation",
    bountyMin: 19000,
    bountyMax: 24000,
    recruiterReward: "70% of bounty",
    paymentRules: "Net 30 after 90-day guarantee.",
    recruiterSlots: 10,
    hiringManager: "Ben Aldridge, CTO",
    companyContact: "Sam Ortiz, Head of Talent",
    visa: "H-1B transfer supported",
    sponsorship: "Yes",
    mustHave: ["Production LLM pipelines", "Python depth", "Eval design experience"],
    niceToHave: ["Retrieval systems", "Document extraction"],
    skills: ["Python", "LLM evals", "Retrieval", "Postgres"],
    domain: "Applied AI",
    education: "No degree requirement",
    locationRequirement: "Bay Area, hybrid",
    otherRequirements: ["Comfortable shipping weekly"],
    jd: {
      aboutRole: "Own extraction quality: evals, prompt architecture and model routing for audit-grade outputs.",
      responsibilities: ["Design eval harnesses", "Own extraction accuracy targets", "Partner with Review pod"],
      requirements: ["Applied LLM production experience"],
      benefits: ["Frontier model seats", "100% medical", "Two shutdown weeks"],
    },
    process: ["Screening", "Technical interview", "Hiring manager", "Final interview", "Offer"],
    questions: sharedQuestions,
  },
  {
    id: "helio-account-exec",
    companyId: "helio",
    title: "Senior Account Executive",
    department: "Sales",
    employmentType: "Full-time",
    location: "London, UK — Remote",
    workModel: "Remote",
    experience: "5+ years",
    yearsExperience: "5–10 years",
    salaryMin: 85000,
    salaryMax: 105000,
    currency: "GBP",
    equity: "0.05% – 0.12%",
    bonus: "Double OTE, uncapped",
    compNotes: "£1.4M quota, £58K average deal size.",
    status: "hiring",
    openings: 2,
    deadline: "Oct 10, 2026",
    createdAt: "Aug 12, 2026",
    lastActivity: "48 min ago",
    bountyPct: "14% of first-year base",
    bountyMin: 14000,
    bountyMax: 18500,
    recruiterReward: "70% of bounty",
    paymentRules: "Net 60 after 90-day guarantee.",
    recruiterSlots: 8,
    hiringManager: "Alice Fenwick, EMEA Sales Director",
    companyContact: "Ravi Menon, Talent Lead",
    visa: "UK right to work required",
    sponsorship: "No",
    mustHave: ["Full-cycle mid-market sales", "9–12 week cycles", "Consistent quota attainment"],
    niceToHave: ["Sold infrastructure or observability", "Built own pipeline"],
    skills: ["Enterprise sales", "MEDDPICC", "Forecasting"],
    domain: "Infrastructure SaaS",
    education: "No degree requirement",
    locationRequirement: "UK-based, monthly London onsite",
    otherRequirements: ["No sponsorship available"],
    jd: {
      aboutRole: "Full-cycle mid-market AE covering UK & Ireland with a dedicated solutions engineer.",
      responsibilities: ["Own pipeline generation", "Run technical evaluations", "Negotiate commercial terms"],
      requirements: ["£1M+ quota carried"],
      benefits: ["Private medical", "Pension match", "Remote-first"],
    },
    process: ["Screening", "Hiring manager", "Panel", "Final interview", "Offer"],
    questions: sharedQuestions,
  },
  {
    id: "orbital-platform-eng",
    companyId: "orbital",
    title: "Staff Platform Engineer",
    department: "Infrastructure",
    employmentType: "Full-time",
    location: "Austin, TX",
    workModel: "Onsite",
    experience: "8+ years",
    yearsExperience: "8–15 years",
    salaryMin: 195000,
    salaryMax: 230000,
    currency: "USD",
    equity: "0.10% – 0.25%",
    bonus: "None",
    compNotes: "On-site five days in East Austin.",
    status: "active",
    openings: 1,
    deadline: "Nov 1, 2026",
    createdAt: "Aug 30, 2026",
    lastActivity: "5 h ago",
    bountyPct: "15% of first-year base",
    bountyMin: 18000,
    bountyMax: 24000,
    recruiterReward: "70% of bounty",
    paymentRules: "Net 30 after 90-day guarantee.",
    recruiterSlots: 6,
    hiringManager: "Dev Raman, CTO",
    companyContact: "Dev Raman, CTO",
    visa: "Case by case",
    sponsorship: "Case by case",
    mustHave: ["Kubernetes at production scale", "Real-time systems", "On-site in Austin"],
    niceToHave: ["Logistics domain", "Built platform teams"],
    skills: ["Kubernetes", "Terraform", "Go", "Observability"],
    domain: "Logistics infrastructure",
    education: "No degree requirement",
    locationRequirement: "Austin, on-site",
    otherRequirements: ["No remote flexibility"],
    jd: {
      aboutRole: "Own the deployment platform, CI and multi-tenant infrastructure behind a real-time dispatch engine.",
      responsibilities: ["Own CI/CD", "Harden multi-tenancy", "Drive incident practice"],
      requirements: ["Production Kubernetes ownership"],
      benefits: ["Medical, dental, vision", "Downtown parking", "Equity"],
    },
    process: ["Screening", "Technical interview", "System design", "Hiring manager", "Offer"],
    questions: sharedQuestions,
  },
  {
    id: "northlane-clinical-lead",
    companyId: "northlane",
    title: "Clinical Operations Lead",
    department: "Clinical Operations",
    employmentType: "Full-time",
    location: "Boston, MA — Hybrid",
    workModel: "Hybrid",
    experience: "7+ years",
    yearsExperience: "7–14 years",
    salaryMin: 150000,
    salaryMax: 175000,
    currency: "USD",
    equity: "0.03% – 0.08%",
    bonus: "8% annual target",
    compNotes: "Hybrid two days in Boston.",
    status: "draft",
    openings: 1,
    deadline: "Nov 20, 2026",
    createdAt: "Sep 4, 2026",
    lastActivity: "1 d ago",
    bountyPct: "12% of first-year base",
    bountyMin: 15000,
    bountyMax: 19000,
    recruiterReward: "70% of bounty",
    paymentRules: "Net 90 after 90-day guarantee.",
    recruiterSlots: 4,
    hiringManager: "Colleen Barr, COO",
    companyContact: "Colleen Barr, COO",
    visa: "No sponsorship",
    sponsorship: "No",
    mustHave: ["7+ years clinical operations", "Managed 25+ clinicians"],
    niceToHave: ["RN licensure", "Value-based care exposure"],
    skills: ["Clinical ops", "Staffing models", "Quality metrics"],
    domain: "Digital health",
    education: "Bachelor's; clinical licensure preferred",
    locationRequirement: "Greater Boston",
    otherRequirements: ["Draft — awaiting company sign-off on bounty"],
    jd: {
      aboutRole: "Lead clinical operations across intake, triage and care-team staffing for a 60-clinician network.",
      responsibilities: ["Own staffing model", "Improve triage SLAs"],
      requirements: ["Clinical operations leadership"],
      benefits: ["Medical", "Licensure reimbursement"],
    },
    process: ["Screening", "Hiring manager", "Panel", "Offer"],
    questions: sharedQuestions,
  },
  {
    id: "helio-solutions-eng",
    companyId: "helio",
    title: "Solutions Engineer, EMEA",
    department: "Sales Engineering",
    employmentType: "Full-time",
    location: "London, UK — Hybrid",
    workModel: "Hybrid",
    experience: "4+ years",
    yearsExperience: "4–9 years",
    salaryMin: 75000,
    salaryMax: 95000,
    currency: "GBP",
    equity: "0.03% – 0.07%",
    bonus: "20% variable",
    compNotes: "",
    status: "paused",
    openings: 1,
    deadline: "Dec 1, 2026",
    createdAt: "Jul 30, 2026",
    lastActivity: "6 d ago",
    bountyPct: "13% of first-year base",
    bountyMin: 11000,
    bountyMax: 14000,
    recruiterReward: "70% of bounty",
    paymentRules: "Net 60 after 90-day guarantee.",
    recruiterSlots: 5,
    hiringManager: "Alice Fenwick, EMEA Sales Director",
    companyContact: "Ravi Menon, Talent Lead",
    visa: "UK right to work required",
    sponsorship: "No",
    mustHave: ["Pre-sales engineering", "Kubernetes literacy"],
    niceToHave: ["Observability tooling"],
    skills: ["Pre-sales", "Kubernetes", "Demos"],
    domain: "Infrastructure SaaS",
    education: "No degree requirement",
    locationRequirement: "London, hybrid",
    otherRequirements: ["Paused pending Q4 headcount review"],
    jd: {
      aboutRole: "Partner with AEs on technical evaluation across EMEA mid-market.",
      responsibilities: ["Run POCs", "Own technical win"],
      requirements: ["Pre-sales experience"],
      benefits: ["Private medical", "Pension match"],
    },
    process: ["Screening", "Technical interview", "Hiring manager", "Offer"],
    questions: sharedQuestions,
  },
  {
    id: "within-eng-manager",
    companyId: "within",
    title: "Engineering Manager, Ingest",
    department: "Product Engineering",
    employmentType: "Full-time",
    location: "San Francisco, CA",
    workModel: "Hybrid",
    experience: "9+ years",
    yearsExperience: "9–16 years",
    salaryMin: 260000,
    salaryMax: 310000,
    currency: "USD",
    equity: "0.20% – 0.45%",
    bonus: "12% annual target",
    compNotes: "",
    status: "filled",
    openings: 1,
    deadline: "Sep 1, 2026",
    createdAt: "Jun 14, 2026",
    lastActivity: "9 d ago",
    bountyPct: "17.5% of first-year compensation",
    bountyMin: 26000,
    bountyMax: 32000,
    recruiterReward: "70% of bounty",
    paymentRules: "Net 30 after 90-day guarantee.",
    recruiterSlots: 8,
    hiringManager: "Dana Whitcomb, VP Engineering",
    companyContact: "Sam Ortiz, Head of Talent",
    visa: "H-1B transfer supported",
    sponsorship: "Yes",
    mustHave: ["Managed 6+ engineers", "Data platform background"],
    niceToHave: ["Enterprise deployments"],
    skills: ["Engineering management", "Data pipelines"],
    domain: "Enterprise data",
    education: "No degree requirement",
    locationRequirement: "Bay Area, hybrid",
    otherRequirements: [],
    jd: {
      aboutRole: "Lead the Ingest pod through enterprise volume growth.",
      responsibilities: ["Grow the pod", "Own reliability targets"],
      requirements: ["People leadership"],
      benefits: ["100% medical", "Equity refresh"],
    },
    process: ["Screening", "Hiring manager", "Panel", "Final interview", "Offer"],
    questions: sharedQuestions,
  },
];

export const amRecruiters: AmRecruiter[] = [
  {
    id: "sarah-lin",
    name: "Sarah Lin",
    email: "sarah@abcrecruiting.com",
    phone: "+1 415 555 0233",
    location: "San Francisco, CA",
    linkedin: "linkedin.com/in/sarahlin",
    website: "abcrecruiting.com",
    type: "Agency",
    agency: "ABC Recruiting",
    experience: "9 years",
    status: "active",
    specializations: ["Frontend", "AI/ML", "Product"],
    markets: ["US", "San Francisco", "Remote", "Startup"],
    createdBy: "Priya Raghunathan",
    createdAt: "Feb 3, 2026",
    responseRate: 96,
    qualityScore: 92,
    verification: { identity: true, agency: true, payment: true, tax: true, agreement: true },
    interviewStats: { scheduled: 34, completed: 31, technical: 18, hiringManager: 9, final: 4, noShows: 1, cancelled: 2, rescheduled: 5 },
    amRejectionReasons: [
      { reason: "Skills mismatch", count: 4 },
      { reason: "Experience", count: 2 },
      { reason: "Compensation", count: 1 },
    ],
    companyRejectionReasons: [
      { reason: "Technical", count: 5 },
      { reason: "Experience", count: 2 },
      { reason: "Culture", count: 1 },
    ],
  },
  {
    id: "marcus-obi",
    name: "Marcus Obi",
    email: "marcus@obitalent.co",
    phone: "+44 20 7946 0455",
    location: "London, UK",
    linkedin: "linkedin.com/in/marcusobi",
    website: "obitalent.co",
    type: "Agency",
    agency: "Obi Talent",
    experience: "12 years",
    status: "active",
    specializations: ["GTM", "Sales", "Finance"],
    markets: ["UK", "EMEA", "Remote", "Enterprise"],
    createdBy: "Priya Raghunathan",
    createdAt: "Jan 19, 2026",
    responseRate: 91,
    qualityScore: 88,
    verification: { identity: true, agency: true, payment: true, tax: false, agreement: true },
    interviewStats: { scheduled: 22, completed: 20, technical: 4, hiringManager: 11, final: 5, noShows: 0, cancelled: 1, rescheduled: 3 },
    amRejectionReasons: [
      { reason: "Location", count: 3 },
      { reason: "Skills mismatch", count: 2 },
    ],
    companyRejectionReasons: [
      { reason: "Experience", count: 3 },
      { reason: "Compensation", count: 2 },
    ],
  },
  {
    id: "aisha-farrow",
    name: "Aisha Farrow",
    email: "aisha.farrow@gmail.com",
    phone: "+1 512 555 0187",
    location: "Austin, TX",
    linkedin: "linkedin.com/in/aishafarrow",
    website: "",
    type: "Independent",
    agency: "—",
    experience: "6 years",
    status: "active",
    specializations: ["DevOps", "Backend", "Data"],
    markets: ["US", "Austin", "Remote"],
    createdBy: "Priya Raghunathan",
    createdAt: "Mar 22, 2026",
    responseRate: 87,
    qualityScore: 84,
    verification: { identity: true, agency: false, payment: true, tax: true, agreement: true },
    interviewStats: { scheduled: 14, completed: 12, technical: 8, hiringManager: 3, final: 1, noShows: 1, cancelled: 1, rescheduled: 2 },
    amRejectionReasons: [
      { reason: "Duplicate", count: 2 },
      { reason: "Experience", count: 2 },
    ],
    companyRejectionReasons: [{ reason: "Technical", count: 3 }],
  },
  {
    id: "diego-marin",
    name: "Diego Marin",
    email: "diego@northpeaksearch.com",
    phone: "+1 646 555 0122",
    location: "New York, NY",
    linkedin: "linkedin.com/in/diegomarin",
    website: "northpeaksearch.com",
    type: "Agency",
    agency: "Northpeak Search",
    experience: "8 years",
    status: "pending",
    specializations: ["Product", "Design", "Frontend"],
    markets: ["US", "New York", "Remote"],
    createdBy: "Priya Raghunathan",
    createdAt: "Sep 2, 2026",
    responseRate: 78,
    qualityScore: 71,
    verification: { identity: true, agency: false, payment: false, tax: false, agreement: false },
    interviewStats: { scheduled: 3, completed: 2, technical: 1, hiringManager: 1, final: 0, noShows: 0, cancelled: 1, rescheduled: 0 },
    amRejectionReasons: [{ reason: "Skills mismatch", count: 1 }],
    companyRejectionReasons: [],
  },
  {
    id: "hana-sato",
    name: "Hana Sato",
    email: "hana@satotalent.jp",
    phone: "+81 3 5555 0198",
    location: "Tokyo, JP",
    linkedin: "linkedin.com/in/hanasato",
    website: "satotalent.jp",
    type: "Independent",
    agency: "—",
    experience: "5 years",
    status: "inactive",
    specializations: ["AI/ML", "Data"],
    markets: ["APAC", "Remote"],
    createdBy: "Priya Raghunathan",
    createdAt: "Apr 8, 2026",
    responseRate: 64,
    qualityScore: 69,
    verification: { identity: true, agency: false, payment: true, tax: false, agreement: true },
    interviewStats: { scheduled: 6, completed: 5, technical: 3, hiringManager: 2, final: 0, noShows: 1, cancelled: 0, rescheduled: 1 },
    amRejectionReasons: [{ reason: "Location", count: 2 }],
    companyRejectionReasons: [{ reason: "Culture", count: 1 }],
  },
  {
    id: "omar-haddad",
    name: "Omar Haddad",
    email: "omar@haddadpartners.com",
    phone: "+1 312 555 0144",
    location: "Chicago, IL",
    linkedin: "linkedin.com/in/omarhaddad",
    website: "haddadpartners.com",
    type: "Agency",
    agency: "Haddad Partners",
    experience: "14 years",
    status: "suspended",
    specializations: ["Finance", "Operations"],
    markets: ["US", "Remote", "Enterprise"],
    createdBy: "Priya Raghunathan",
    createdAt: "Dec 11, 2025",
    responseRate: 42,
    qualityScore: 55,
    verification: { identity: true, agency: true, payment: true, tax: true, agreement: false },
    interviewStats: { scheduled: 9, completed: 6, technical: 2, hiringManager: 3, final: 1, noShows: 3, cancelled: 2, rescheduled: 4 },
    amRejectionReasons: [
      { reason: "Duplicate", count: 5 },
      { reason: "Other", count: 3 },
    ],
    companyRejectionReasons: [{ reason: "Technical", count: 2 }],
  },
];

export const amRequests: AmRequest[] = [
  {
    id: "req-1",
    jobId: "within-ai-frontend",
    recruiterId: "sarah-lin",
    status: "pending",
    requestedAt: "24 min ago",
    pitch: "I placed two staff frontend engineers at Ramp and Mercury this year, both data-dense review products. I have four warm profiles already screened for streaming UI work.",
    relevantProfiles: 4,
    relevantHistory: "3 placements in AI infra frontend, 2 at Series B stage",
  },
  {
    id: "req-2",
    jobId: "within-ai-frontend",
    recruiterId: "diego-marin",
    status: "pending",
    requestedAt: "2 h ago",
    pitch: "Design-adjacent frontend network in NYC. Two candidates from Linear and Notion open to remote UK-overlap roles.",
    relevantProfiles: 2,
    relevantHistory: "1 placement in product engineering",
  },
  {
    id: "req-3",
    jobId: "helio-account-exec",
    recruiterId: "marcus-obi",
    status: "pending",
    requestedAt: "3 h ago",
    pitch: "EMEA infrastructure sales is my core desk — I closed the Datadog and Grafana equivalents of this role twice.",
    relevantProfiles: 6,
    relevantHistory: "5 AE placements at £1M+ quota",
  },
  {
    id: "req-4",
    jobId: "orbital-platform-eng",
    recruiterId: "aisha-farrow",
    status: "pending",
    requestedAt: "5 h ago",
    pitch: "Austin-based, I know every platform team in the city. Three on-site-willing candidates with production Kubernetes.",
    relevantProfiles: 3,
    relevantHistory: "4 infra placements in Texas",
  },
  {
    id: "req-5",
    jobId: "within-ai-frontend",
    recruiterId: "marcus-obi",
    status: "approved",
    requestedAt: "Aug 24, 2026",
    decidedAt: "Aug 24, 2026",
    decidedBy: "Priya Raghunathan",
    pitch: "UK-based candidate pool matches the timezone requirement.",
    relevantProfiles: 5,
    relevantHistory: "2 frontend placements in UK",
  },
  {
    id: "req-6",
    jobId: "within-applied-ai",
    recruiterId: "sarah-lin",
    status: "approved",
    requestedAt: "Aug 29, 2026",
    decidedAt: "Aug 29, 2026",
    decidedBy: "Priya Raghunathan",
    pitch: "Applied AI desk with three eval-focused engineers in play.",
    relevantProfiles: 3,
    relevantHistory: "2 applied AI placements",
  },
  {
    id: "req-7",
    jobId: "helio-account-exec",
    recruiterId: "omar-haddad",
    status: "rejected",
    requestedAt: "Aug 20, 2026",
    decidedAt: "Aug 21, 2026",
    decidedBy: "Priya Raghunathan",
    reason: "Duplicate submissions on prior EMEA roles and no UK right-to-work screening in place.",
    pitch: "US finance desk, can source UK AEs.",
    relevantProfiles: 1,
    relevantHistory: "No EMEA placements",
  },
  {
    id: "req-8",
    jobId: "orbital-platform-eng",
    recruiterId: "hana-sato",
    status: "rejected",
    requestedAt: "Aug 26, 2026",
    decidedAt: "Aug 27, 2026",
    decidedBy: "Priya Raghunathan",
    reason: "Role is strictly on-site in Austin; recruiter pool is APAC remote.",
    pitch: "APAC data and ML pool.",
    relevantProfiles: 0,
    relevantHistory: "No US on-site placements",
  },
];

export const amCandidates: AmCandidate[] = [
  {
    id: "john-smith",
    name: "John Smith",
    currentRole: "Staff Frontend Engineer",
    currentCompany: "Ramp",
    location: "Manchester, UK",
    email: "john.smith@proton.me",
    phone: "+44 7700 900123",
    linkedin: "linkedin.com/in/johnsmithfe",
    github: "github.com/jsmith-fe",
    portfolio: "jsmith.dev",
    resume: "john-smith-2026.pdf",
    visa: "UK citizen",
    compensation: "$285,000 target",
    availability: "4 weeks notice",
    experience: "11 years",
    skills: ["TypeScript", "React", "Virtualized tables", "WebSockets", "Rendering perf"],
  },
  {
    id: "david-lee",
    name: "David Lee",
    currentRole: "Senior Frontend Engineer",
    currentCompany: "Linear",
    location: "Remote — Portugal",
    email: "david.lee@fastmail.com",
    phone: "+351 912 000 441",
    linkedin: "linkedin.com/in/davidleeui",
    github: "github.com/dlee",
    portfolio: "dlee.design",
    resume: "david-lee-cv.pdf",
    visa: "EU citizen",
    compensation: "$265,000 target",
    availability: "Immediate",
    experience: "8 years",
    skills: ["TypeScript", "React", "Streaming UI", "Design systems"],
  },
  {
    id: "nina-patel",
    name: "Nina Patel",
    currentRole: "Frontend Lead",
    currentCompany: "Mercury",
    location: "London, UK",
    email: "nina.patel@hey.com",
    phone: "+44 7700 900456",
    linkedin: "linkedin.com/in/ninapatel",
    github: "github.com/npatel",
    portfolio: "ninapatel.io",
    resume: "nina-patel-resume.pdf",
    visa: "UK citizen",
    compensation: "$300,000 target",
    availability: "6 weeks notice",
    experience: "12 years",
    skills: ["TypeScript", "React", "Performance", "Team leadership"],
  },
  {
    id: "tomas-berg",
    name: "Tomas Berg",
    currentRole: "Enterprise AE",
    currentCompany: "Grafana Labs",
    location: "London, UK",
    email: "tomas.berg@gmail.com",
    phone: "+44 7700 900987",
    linkedin: "linkedin.com/in/tomasberg",
    github: "",
    portfolio: "",
    resume: "tomas-berg-ae.pdf",
    visa: "UK right to work",
    compensation: "£100,000 base / £200,000 OTE",
    availability: "1 month notice",
    experience: "9 years",
    skills: ["Full-cycle sales", "MEDDPICC", "Observability"],
  },
  {
    id: "claire-dubois",
    name: "Claire Dubois",
    currentRole: "Mid-market AE",
    currentCompany: "Datadog",
    location: "London, UK",
    email: "claire.dubois@icloud.com",
    phone: "+44 7700 900222",
    linkedin: "linkedin.com/in/clairedubois",
    github: "",
    portfolio: "",
    resume: "claire-dubois.pdf",
    visa: "UK right to work",
    compensation: "£95,000 base",
    availability: "2 weeks notice",
    experience: "7 years",
    skills: ["Full-cycle sales", "Pipeline generation"],
  },
  {
    id: "raj-kapoor",
    name: "Raj Kapoor",
    currentRole: "Staff Platform Engineer",
    currentCompany: "Convoy",
    location: "Austin, TX",
    email: "raj.kapoor@gmail.com",
    phone: "+1 512 555 0999",
    linkedin: "linkedin.com/in/rajkapoor",
    github: "github.com/rkapoor",
    portfolio: "",
    resume: "raj-kapoor-platform.pdf",
    visa: "US citizen",
    compensation: "$225,000 target",
    availability: "3 weeks notice",
    experience: "13 years",
    skills: ["Kubernetes", "Terraform", "Go", "Multi-tenancy"],
  },
  {
    id: "elena-vargas",
    name: "Elena Vargas",
    currentRole: "Applied AI Engineer",
    currentCompany: "Scale AI",
    location: "San Francisco, CA",
    email: "elena.vargas@gmail.com",
    phone: "+1 415 555 0777",
    linkedin: "linkedin.com/in/elenavargas",
    github: "github.com/evargas",
    portfolio: "",
    resume: "elena-vargas-ai.pdf",
    visa: "H-1B transfer required",
    compensation: "$255,000 target",
    availability: "6 weeks notice",
    experience: "7 years",
    skills: ["Python", "LLM evals", "Retrieval", "Postgres"],
  },
  {
    id: "kwame-mensah",
    name: "Kwame Mensah",
    currentRole: "Senior Frontend Engineer",
    currentCompany: "Notion",
    location: "New York, NY",
    email: "kwame.mensah@gmail.com",
    phone: "+1 646 555 0333",
    linkedin: "linkedin.com/in/kwamemensah",
    github: "github.com/kmensah",
    portfolio: "kwame.build",
    resume: "kwame-mensah.pdf",
    visa: "US citizen",
    compensation: "$270,000 target",
    availability: "4 weeks notice",
    experience: "9 years",
    skills: ["TypeScript", "React", "Collaborative editing"],
  },
];

const tl = (label: string, at: string, by: string, note?: string) => ({ label, at, by, ...(note ? { note } : {}) });

export const amSubmissions: AmSubmission[] = [
  {
    id: "sub-1",
    jobId: "within-ai-frontend",
    candidateId: "john-smith",
    recruiterId: "sarah-lin",
    source: "recruiter",
    submittedAt: "Sep 5, 2026",
    match: 94,
    status: "am_review",
    stage: "am_review",
    lastActivity: "2 h ago",
    recommendation:
      "John rebuilt Ramp's transaction review table for 50k rows and owns their streaming approvals UI — the closest analogue to Within's review surface I have seen. UK-based so timezone overlap is clean.",
    recruiterNotes: "Wants staff scope and a design partner. Will not relocate. Comp expectation is inside band.",
    amNotes: "",
    ai: {
      score: 94,
      strengths: ["Virtualized table ownership at 50k rows", "Streaming approvals UI", "11 years TypeScript"],
      gaps: ["No formal audit/fintech compliance exposure"],
      redFlags: [],
    },
    answers: [
      { q: "Work authorization status", a: "UK citizen, no sponsorship required" },
      { q: "Base compensation expectation", a: "$285,000" },
      { q: "Earliest start date", a: "Oct 6, 2026" },
    ],
    timeline: [
      tl("Recruiter submitted", "Sep 5, 2026 · 09:12", "Sarah Lin"),
      tl("AM reviewing", "Sep 6, 2026 · 08:40", "Priya Raghunathan"),
    ],
  },
  {
    id: "sub-2",
    jobId: "within-ai-frontend",
    candidateId: "david-lee",
    recruiterId: null,
    source: "account_manager",
    submittedAt: "Sep 4, 2026",
    match: 91,
    status: "interview",
    stage: "interview",
    lastActivity: "5 h ago",
    recommendation: "Sourced directly from the Linear talent pool. Streaming UI depth, immediate availability.",
    recruiterNotes: "—",
    amNotes: "Company moved fast; technical interview booked for Sep 8.",
    ai: { score: 91, strengths: ["Streaming UI", "Immediate availability"], gaps: ["No enterprise deployment experience"], redFlags: [] },
    answers: [
      { q: "Work authorization status", a: "EU citizen, remote contract" },
      { q: "Base compensation expectation", a: "$265,000" },
    ],
    timeline: [
      tl("AM uploaded candidate", "Sep 4, 2026 · 11:02", "Priya Raghunathan"),
      tl("AM approved", "Sep 4, 2026 · 11:20", "Priya Raghunathan"),
      tl("Forwarded to company", "Sep 4, 2026 · 11:22", "Priya Raghunathan"),
      tl("Company reviewing", "Sep 4, 2026 · 16:40", "Dana Whitcomb"),
      tl("Interview requested", "Sep 5, 2026 · 09:05", "Dana Whitcomb", "Technical interview, Sep 8"),
    ],
    amDecision: { decision: "approved", at: "Sep 4, 2026", by: "Priya Raghunathan" },
  },
  {
    id: "sub-3",
    jobId: "within-ai-frontend",
    candidateId: "nina-patel",
    recruiterId: "marcus-obi",
    source: "recruiter",
    submittedAt: "Sep 2, 2026",
    match: 88,
    status: "company_reviewing",
    stage: "company_review",
    lastActivity: "1 d ago",
    recommendation: "Frontend lead at Mercury, ran their card review surface. Wants a staff IC track, not management.",
    recruiterNotes: "Comp expectation at top of band; flexible on equity split.",
    amNotes: "Strong, but confirm IC vs management expectation with Dana.",
    ai: { score: 88, strengths: ["Team leadership", "Fintech domain"], gaps: ["Less streaming UI depth"], redFlags: ["Comp at top of band"] },
    answers: [{ q: "Base compensation expectation", a: "$300,000" }],
    timeline: [
      tl("Recruiter submitted", "Sep 2, 2026 · 14:20", "Marcus Obi"),
      tl("AM approved", "Sep 2, 2026 · 17:05", "Priya Raghunathan"),
      tl("Forwarded to company", "Sep 2, 2026 · 17:06", "Priya Raghunathan"),
      tl("Company reviewing", "Sep 3, 2026 · 10:11", "Sam Ortiz"),
    ],
    amDecision: { decision: "approved", at: "Sep 2, 2026", by: "Priya Raghunathan" },
  },
  {
    id: "sub-4",
    jobId: "within-ai-frontend",
    candidateId: "kwame-mensah",
    recruiterId: "diego-marin",
    source: "recruiter",
    submittedAt: "Sep 5, 2026",
    match: 76,
    status: "am_review",
    stage: "am_review",
    lastActivity: "6 h ago",
    recommendation: "Collaborative editing depth at Notion, strong TypeScript. Open to UK timezone overlap.",
    recruiterNotes: "Prefers hybrid NYC but will consider remote.",
    amNotes: "",
    ai: {
      score: 76,
      strengths: ["Collaborative editing", "Strong TypeScript"],
      gaps: ["No data-dense enterprise review surface", "No streaming model output work"],
      redFlags: ["Timezone overlap unconfirmed"],
    },
    answers: [{ q: "Base compensation expectation", a: "$270,000" }],
    timeline: [tl("Recruiter submitted", "Sep 5, 2026 · 18:44", "Diego Marin")],
  },
  {
    id: "sub-5",
    jobId: "helio-account-exec",
    candidateId: "tomas-berg",
    recruiterId: "marcus-obi",
    source: "recruiter",
    submittedAt: "Aug 28, 2026",
    match: 93,
    status: "offer",
    stage: "offer",
    lastActivity: "3 h ago",
    recommendation: "Carried £1.6M quota at Grafana with 121% attainment. Sold the exact same buyer.",
    recruiterNotes: "Two other processes running; move fast.",
    amNotes: "Offer at £102K base approved by Alice.",
    ai: { score: 93, strengths: ["Quota attainment 121%", "Observability domain"], gaps: [], redFlags: ["Competing offers"] },
    answers: [{ q: "Base compensation expectation", a: "£100,000 base" }],
    timeline: [
      tl("Recruiter submitted", "Aug 28, 2026 · 10:04", "Marcus Obi"),
      tl("AM approved", "Aug 28, 2026 · 12:30", "Priya Raghunathan"),
      tl("Forwarded to company", "Aug 28, 2026 · 12:31", "Priya Raghunathan"),
      tl("Interview completed", "Sep 1, 2026 · 15:00", "Alice Fenwick"),
      tl("Offer extended", "Sep 5, 2026 · 17:20", "Alice Fenwick", "£102K base / £204K OTE"),
    ],
    amDecision: { decision: "approved", at: "Aug 28, 2026", by: "Priya Raghunathan" },
    bounty: 17500,
  },
  {
    id: "sub-6",
    jobId: "helio-account-exec",
    candidateId: "claire-dubois",
    recruiterId: "marcus-obi",
    source: "recruiter",
    submittedAt: "Sep 1, 2026",
    match: 81,
    status: "company_rejected",
    stage: "rejected",
    lastActivity: "1 d ago",
    recommendation: "Consistent mid-market attainment at Datadog, strong outbound motion.",
    recruiterNotes: "Would accept £92K base.",
    amNotes: "Company wanted larger deal-size history.",
    ai: { score: 81, strengths: ["Pipeline generation"], gaps: ["Average deal size below £40K"], redFlags: [] },
    answers: [{ q: "Base compensation expectation", a: "£95,000" }],
    timeline: [
      tl("Recruiter submitted", "Sep 1, 2026 · 09:30", "Marcus Obi"),
      tl("AM approved", "Sep 1, 2026 · 11:00", "Priya Raghunathan"),
      tl("Forwarded to company", "Sep 1, 2026 · 11:01", "Priya Raghunathan"),
      tl("Company rejected", "Sep 5, 2026 · 14:12", "Alice Fenwick", "Deal size history below bar"),
    ],
    amDecision: { decision: "approved", at: "Sep 1, 2026", by: "Priya Raghunathan" },
  },
  {
    id: "sub-7",
    jobId: "orbital-platform-eng",
    candidateId: "raj-kapoor",
    recruiterId: "aisha-farrow",
    source: "recruiter",
    submittedAt: "Sep 3, 2026",
    match: 89,
    status: "hired",
    stage: "hired",
    lastActivity: "4 h ago",
    recommendation: "Ex-Convoy platform lead, Austin-based, production Kubernetes at fleet scale.",
    recruiterNotes: "Signed at $222K base.",
    amNotes: "Hire confirmed; bounty eligible after 90-day guarantee.",
    ai: { score: 89, strengths: ["Kubernetes at scale", "Logistics domain", "Austin-based"], gaps: [], redFlags: [] },
    answers: [{ q: "Base compensation expectation", a: "$225,000" }],
    timeline: [
      tl("Recruiter submitted", "Sep 3, 2026 · 08:10", "Aisha Farrow"),
      tl("AM approved", "Sep 3, 2026 · 09:40", "Priya Raghunathan"),
      tl("Forwarded to company", "Sep 3, 2026 · 09:41", "Priya Raghunathan"),
      tl("Interview completed", "Sep 4, 2026 · 13:00", "Dev Raman"),
      tl("Offer accepted", "Sep 5, 2026 · 18:00", "Raj Kapoor"),
      tl("Hired", "Sep 6, 2026 · 09:00", "Dev Raman"),
    ],
    amDecision: { decision: "approved", at: "Sep 3, 2026", by: "Priya Raghunathan" },
    bounty: 22000,
    payoutStatus: "pending",
    hiredAt: "Sep 6, 2026",
  },
  {
    id: "sub-8",
    jobId: "within-applied-ai",
    candidateId: "elena-vargas",
    recruiterId: "sarah-lin",
    source: "recruiter",
    submittedAt: "Sep 4, 2026",
    match: 90,
    status: "forwarded",
    stage: "company_review",
    lastActivity: "8 h ago",
    recommendation: "Built Scale AI's extraction eval harness; exactly the eval-design depth Ben asked for.",
    recruiterNotes: "Needs H-1B transfer — confirmed supported.",
    amNotes: "Forwarded with visa note flagged.",
    ai: { score: 90, strengths: ["Eval harness design", "Retrieval systems"], gaps: ["No audit domain"], redFlags: ["H-1B transfer timing"] },
    answers: [{ q: "Work authorization status", a: "H-1B, transfer required" }],
    timeline: [
      tl("Recruiter submitted", "Sep 4, 2026 · 12:15", "Sarah Lin"),
      tl("AM approved", "Sep 4, 2026 · 14:02", "Priya Raghunathan"),
      tl("Forwarded to company", "Sep 4, 2026 · 14:03", "Priya Raghunathan"),
    ],
    amDecision: { decision: "approved", at: "Sep 4, 2026", by: "Priya Raghunathan" },
  },
  {
    id: "sub-9",
    jobId: "within-applied-ai",
    candidateId: "david-lee",
    recruiterId: "hana-sato",
    source: "recruiter",
    submittedAt: "Aug 30, 2026",
    match: 58,
    status: "am_rejected",
    stage: "rejected",
    lastActivity: "5 d ago",
    recommendation: "Strong engineer, could learn applied AI quickly.",
    recruiterNotes: "—",
    amNotes: "Frontend profile against an applied-AI requirement.",
    ai: { score: 58, strengths: ["Strong engineering fundamentals"], gaps: ["No Python or LLM production work"], redFlags: ["Requirement mismatch"] },
    answers: [],
    timeline: [
      tl("Recruiter submitted", "Aug 30, 2026 · 07:41", "Hana Sato"),
      tl("AM rejected", "Aug 30, 2026 · 10:12", "Priya Raghunathan", "Skills mismatch — no applied AI production work"),
    ],
    amDecision: { decision: "rejected", at: "Aug 30, 2026", by: "Priya Raghunathan", reason: "Skills mismatch" },
  },
  {
    id: "sub-10",
    jobId: "within-eng-manager",
    candidateId: "nina-patel",
    recruiterId: "sarah-lin",
    source: "recruiter",
    submittedAt: "Jul 18, 2026",
    match: 86,
    status: "hired",
    stage: "hired",
    lastActivity: "Aug 20, 2026",
    recommendation: "Managed six engineers at Mercury, data platform background.",
    recruiterNotes: "Signed at $288K.",
    amNotes: "Placed; payout completed.",
    ai: { score: 86, strengths: ["People leadership", "Data platform"], gaps: [], redFlags: [] },
    answers: [],
    timeline: [
      tl("Recruiter submitted", "Jul 18, 2026 · 09:00", "Sarah Lin"),
      tl("AM approved", "Jul 18, 2026 · 11:00", "Priya Raghunathan"),
      tl("Hired", "Aug 18, 2026 · 12:00", "Dana Whitcomb"),
    ],
    amDecision: { decision: "approved", at: "Jul 18, 2026", by: "Priya Raghunathan" },
    bounty: 28000,
    payoutStatus: "paid",
    hiredAt: "Aug 18, 2026",
  },
];

export const amFeedback: AmFeedback[] = [
  {
    id: "fb-1",
    jobId: "within-ai-frontend",
    submissionId: "sub-2",
    from: "Dana Whitcomb, VP Engineering",
    at: "5 h ago",
    state: "action_required",
    body: "Strong candidate. Schedule the technical interview for Tuesday and send the review-surface prompt in advance.",
  },
  {
    id: "fb-2",
    jobId: "within-ai-frontend",
    submissionId: "sub-3",
    from: "Sam Ortiz, Head of Talent",
    at: "1 d ago",
    state: "received",
    body: "Nina looks credible but we need to confirm she wants IC scope, not an EM track. Can you check before we book time?",
  },
  {
    id: "fb-3",
    jobId: "helio-account-exec",
    submissionId: "sub-5",
    from: "Alice Fenwick, EMEA Sales Director",
    at: "3 h ago",
    state: "advanced",
    body: "Offer approved at £102K base. Please confirm start date and notice period today.",
  },
  {
    id: "fb-4",
    jobId: "helio-account-exec",
    submissionId: "sub-6",
    from: "Alice Fenwick, EMEA Sales Director",
    at: "1 d ago",
    state: "rejected",
    body: "Passing on Claire. Deal-size history is materially below our bar for this territory.",
    rejectionReason: "Experience — average deal size below £40K",
  },
  {
    id: "fb-5",
    jobId: "orbital-platform-eng",
    submissionId: "sub-7",
    from: "Dev Raman, CTO",
    at: "4 h ago",
    state: "advanced",
    body: "Raj signed. Start date Sep 29. Great turnaround.",
  },
  {
    id: "fb-6",
    jobId: "within-applied-ai",
    submissionId: "sub-8",
    from: "Ben Aldridge, CTO",
    at: "Pending since 8 h",
    state: "pending",
    body: "Awaiting company review of Elena Vargas.",
  },
];

export const amThreads: AmThread[] = [
  {
    id: "th-1",
    kind: "company",
    jobId: "within-ai-frontend",
    companyId: "within",
    candidateId: "david-lee",
    participant: "Dana Whitcomb",
    participantTitle: "VP Engineering, Within",
    unread: 2,
    urgent: true,
    messages: [
      { id: "m1", from: "Dana Whitcomb", role: "Company", at: "Sep 6 · 08:14", body: "Can we schedule David Tuesday? Prefer 10am PT with the Review pod." },
      { id: "m2", from: "Dana Whitcomb", role: "Company", at: "Sep 6 · 08:15", body: "Also — is Nina IC or EM track? That changes the panel." },
    ],
  },
  {
    id: "th-2",
    kind: "recruiter",
    jobId: "within-ai-frontend",
    companyId: "within",
    recruiterId: "sarah-lin",
    candidateId: "john-smith",
    participant: "Sarah Lin",
    participantTitle: "ABC Recruiting",
    unread: 1,
    messages: [
      { id: "m3", from: "Sarah Lin", role: "Recruiter", at: "Sep 6 · 07:50", body: "John is interviewing elsewhere next week — any read on the review timeline?" },
    ],
  },
  {
    id: "th-3",
    kind: "recruiter",
    jobId: "helio-account-exec",
    companyId: "helio",
    recruiterId: "marcus-obi",
    candidateId: "tomas-berg",
    participant: "Marcus Obi",
    participantTitle: "Obi Talent",
    unread: 0,
    messages: [
      { id: "m4", from: "Marcus Obi", role: "Recruiter", at: "Sep 5 · 18:02", body: "Tomas has a competing offer at £98K. Can Helio move on the £102K today?" },
      { id: "m5", from: "Priya Raghunathan", role: "Account Manager", at: "Sep 5 · 18:20", body: "Alice approved £102K. Offer letter goes out this afternoon." },
    ],
  },
  {
    id: "th-4",
    kind: "company",
    jobId: "orbital-platform-eng",
    companyId: "orbital",
    candidateId: "raj-kapoor",
    participant: "Dev Raman",
    participantTitle: "CTO, Orbital Freight",
    unread: 0,
    messages: [
      { id: "m6", from: "Dev Raman", role: "Company", at: "Sep 6 · 09:02", body: "Raj signed, start date Sep 29. Send the invoice when the guarantee window opens." },
    ],
  },
  {
    id: "th-5",
    kind: "candidate",
    jobId: "within-ai-frontend",
    companyId: "within",
    candidateId: "john-smith",
    participant: "John Smith",
    participantTitle: "Candidate — Staff Frontend Engineer",
    unread: 1,
    messages: [
      { id: "m7", from: "John Smith", role: "Candidate", at: "Sep 6 · 06:40", body: "Happy to do the technical round any afternoon UK time this week." },
    ],
  },
];

export const amEvents: AmEvent[] = [
  { id: "ev-1", type: "Interview", title: "Technical interview — David Lee", date: "Today", time: "10:00 PT", jobId: "within-ai-frontend", companyId: "within", candidateId: "david-lee", stage: "Technical" },
  { id: "ev-2", type: "Interview", title: "Hiring manager screen — John Smith", date: "Today", time: "13:30 PT", jobId: "within-ai-frontend", companyId: "within", candidateId: "john-smith", recruiterId: "sarah-lin", stage: "Hiring manager" },
  { id: "ev-3", type: "Interview", title: "Final panel — Tomas Berg", date: "Today", time: "16:00 BST", jobId: "helio-account-exec", companyId: "helio", candidateId: "tomas-berg", recruiterId: "marcus-obi", stage: "Final" },
  { id: "ev-4", type: "Company meeting", title: "Weekly pipeline review — Within", date: "Tomorrow", time: "09:00 PT", jobId: "within-ai-frontend", companyId: "within" },
  { id: "ev-5", type: "Recruiter call", title: "Desk sync — Sarah Lin", date: "Tomorrow", time: "11:00 PT", jobId: "within-applied-ai", companyId: "within", recruiterId: "sarah-lin" },
  { id: "ev-6", type: "Follow-up", title: "Confirm Nina Patel IC vs EM scope", date: "Tomorrow", time: "15:00 PT", jobId: "within-ai-frontend", companyId: "within", candidateId: "nina-patel" },
  { id: "ev-7", type: "Deadline", title: "Hiring deadline — Senior Account Executive", date: "Oct 10", time: "All day", jobId: "helio-account-exec", companyId: "helio" },
  { id: "ev-8", type: "Interview", title: "Technical interview — Elena Vargas", date: "Sep 9", time: "14:00 PT", jobId: "within-applied-ai", companyId: "within", candidateId: "elena-vargas", recruiterId: "sarah-lin", stage: "Technical" },
  { id: "ev-9", type: "Interview", title: "Hiring manager interview — Nina Patel", date: "Tomorrow", time: "11:30 PT", jobId: "within-ai-frontend", companyId: "within", candidateId: "nina-patel", stage: "Hiring manager" },
];

export const amActivity: AmActivity[] = [
  { id: "act-1", jobId: "orbital-platform-eng", companyId: "orbital", candidateId: "raj-kapoor", recruiterId: "aisha-farrow", actor: "Dev Raman", action: "marked candidate hired", object: "Raj Kapoor", at: "4 h ago", from: "Offer", to: "Hired" },
  { id: "act-2", jobId: "helio-account-exec", companyId: "helio", candidateId: "tomas-berg", recruiterId: "marcus-obi", actor: "Alice Fenwick", action: "extended offer to", object: "Tomas Berg", at: "3 h ago", from: "Final", to: "Offer" },
  { id: "act-3", jobId: "within-ai-frontend", companyId: "within", candidateId: "david-lee", actor: "Dana Whitcomb", action: "requested interview for", object: "David Lee", at: "5 h ago", from: "Company review", to: "Interview" },
  { id: "act-4", jobId: "within-ai-frontend", companyId: "within", candidateId: "john-smith", recruiterId: "sarah-lin", actor: "Sarah Lin", action: "submitted candidate", object: "John Smith", at: "Sep 5", from: "—", to: "Pending review" },
  { id: "act-5", jobId: "within-ai-frontend", companyId: "within", recruiterId: "sarah-lin", actor: "Sarah Lin", action: "requested access to job", object: "Senior AI Frontend Engineer", at: "24 min ago" },
  { id: "act-6", jobId: "within-applied-ai", companyId: "within", candidateId: "elena-vargas", recruiterId: "sarah-lin", actor: "Priya Raghunathan", action: "forwarded candidate to company", object: "Elena Vargas", at: "8 h ago", from: "AM approved", to: "Company review" },
  { id: "act-7", jobId: "helio-account-exec", companyId: "helio", candidateId: "claire-dubois", recruiterId: "marcus-obi", actor: "Alice Fenwick", action: "rejected candidate", object: "Claire Dubois", at: "1 d ago", from: "Company review", to: "Rejected" },
  { id: "act-8", jobId: "within-eng-manager", companyId: "within", candidateId: "nina-patel", recruiterId: "sarah-lin", actor: "Finance", action: "completed payout for", object: "Nina Patel placement", at: "Aug 25", from: "Processing", to: "Paid" },
];

export const amNotifications: AmNotification[] = [
  { id: "n-1", category: "Recruiters", body: "Sarah Lin requested access to Senior AI Frontend Engineer at Within.", at: "24 min ago", read: false, link: { jobId: "within-ai-frontend", tab: "requests", focus: "req-1" } },
  { id: "n-2", category: "Submissions", body: "Sarah Lin submitted John Smith for Senior AI Frontend Engineer at Within.", at: "2 h ago", read: false, link: { jobId: "within-ai-frontend", tab: "submissions", focus: "sub-1" } },
  { id: "n-3", category: "Company", body: "Within requested a technical interview for David Lee — Senior AI Frontend Engineer.", at: "5 h ago", read: false, link: { jobId: "within-ai-frontend", tab: "feedback", focus: "fb-1" } },
  { id: "n-4", category: "Hiring", body: "Raj Kapoor was hired by Orbital Freight for Staff Platform Engineer.", at: "4 h ago", read: true, link: { jobId: "orbital-platform-eng", tab: "candidates", focus: "raj-kapoor" } },
  { id: "n-5", category: "Finance", body: "Bounty of $22,000 generated for Raj Kapoor (Aisha Farrow) — payout pending.", at: "4 h ago", read: false, link: { to: "/am/payouts" } },
  { id: "n-6", category: "Company", body: "Alice Fenwick rejected Claire Dubois for Senior Account Executive at Helio Systems.", at: "1 d ago", read: true, link: { jobId: "helio-account-exec", tab: "candidates", focus: "claire-dubois" } },
  { id: "n-7", category: "Jobs", body: "Clinical Operations Lead at Northlane Health is still in draft — bounty needs company sign-off.", at: "1 d ago", read: true, link: { jobId: "northlane-clinical-lead", tab: "overview" } },
];

export const amPayouts: AmPayout[] = [
  { id: "po-1", jobId: "orbital-platform-eng", candidateId: "raj-kapoor", recruiterId: "aisha-farrow", bounty: 22000, recruiterShare: 15400, companyPayment: 22000, status: "pending", hireDate: "Sep 6, 2026" },
  { id: "po-2", jobId: "within-eng-manager", candidateId: "nina-patel", recruiterId: "sarah-lin", bounty: 28000, recruiterShare: 19600, companyPayment: 28000, status: "paid", hireDate: "Aug 18, 2026", paidDate: "Aug 25, 2026" },
  { id: "po-3", jobId: "helio-account-exec", candidateId: "tomas-berg", recruiterId: "marcus-obi", bounty: 17500, recruiterShare: 12250, companyPayment: 17500, status: "approved", hireDate: "Pending signature" },
  { id: "po-4", jobId: "within-ai-frontend", candidateId: "john-smith", recruiterId: "sarah-lin", bounty: 26000, recruiterShare: 18200, companyPayment: 26000, status: "processing", hireDate: "Jul 2, 2026", paidDate: "—" },
  { id: "po-5", jobId: "helio-solutions-eng", candidateId: "claire-dubois", recruiterId: "marcus-obi", bounty: 12500, recruiterShare: 8750, companyPayment: 12500, status: "disputed", hireDate: "Jun 14, 2026" },
];
