import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { jobs, type Job } from "@/lib/data";
import { fetchRecruiterJobs } from "@/lib/recruiter-jobs";

export type JobContextType = {
  job: Job;
  approvedJobs: Job[];
  allJobs: Job[];
  setJobId: (id: string) => void;
  recent: string[];
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  refreshJobs: () => Promise<void>;
};

const JobContext = createContext<JobContextType | null>(null);

const emptyJob: Job = {
  id: "",
  company: "",
  companyShort: "",
  logoTone: "oklch(0.47 0.105 252)",
  title: "",
  location: "",
  workModel: "Hybrid",
  employmentType: "Full-time",
  salary: "",
  equity: "",
  competitiveEquity: false,
  visaSponsorship: "",
  experience: "",
  openings: 0,
  reward: "",
  rewardPct: "",
  bonusPool: "",
  payoutTerms: "",
  posted: "",
  status: "approved",
  companySize: "",
  fundingStage: "",
  fundingAmount: "",
  founded: "",
  website: "",
  investors: [],
  founders: [],
  pedigree: [],
  repeatFounders: "",
  activeCandidates: 0,
  about: [],
  requirements: [],
  greenFlags: [],
  redFlags: [],
  bonuses: [],
  benefits: [],
  questions: [],
};

export function JobContextProvider({ children }: { children: ReactNode }) {
  const STORAGE_KEY_JOB_ID = "yuvro_selected_job_id";
  const STORAGE_KEY_CACHED_JOBS = "yuvro_cached_jobs";
  const STORAGE_KEY_RECENT = "yuvro_recent_job_ids";

  const [allJobs, setAllJobs] = useState<Job[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_CACHED_JOBS);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.filter(
              (j: Job) => String(j.rawStatus || "").toLowerCase() !== "draft",
            );
          }
        }
      } catch {}
    }
    return [];
  });

  const [jobId, setJobIdState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem(STORAGE_KEY_JOB_ID) || "";
      } catch {}
    }
    return "";
  });

  const [recent, setRecent] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_RECENT);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  });

  const [sidebarCollapsed, setCollapsed] = useState(false);

  const refreshJobs = useCallback(async () => {
    try {
      const data = await fetchRecruiterJobs(false);
      if (data && data.length > 0) {
        const nonDraft = data.filter(
          (j) => String(j.rawStatus || "").toLowerCase() !== "draft",
        );
        setAllJobs(nonDraft);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY_CACHED_JOBS, JSON.stringify(nonDraft));
          } catch {}
        }
      }
    } catch (err) {
      console.warn("Failed to refresh recruiter jobs:", err);
    }
  }, []);

  useEffect(() => {
    refreshJobs();
  }, [refreshJobs]);

  const approved = useMemo(() => {
    const nonDraftJobs = allJobs.filter(
      (j) => String(j.rawStatus || "").toLowerCase() !== "draft",
    );
    const explicitlyApproved = nonDraftJobs.filter((j) => j.status === "approved");
    if (explicitlyApproved.length > 0) return explicitlyApproved;
    // Fallback to active/available jobs if no explicitly approved jobs exist
    return nonDraftJobs.filter((j) => j.status !== "archived" && j.status !== "paused");
  }, [allJobs]);

  // Synchronize and auto-select 1st available job when loading or when selected jobId is no longer available
  useEffect(() => {
    if (approved.length > 0) {
      const isValid =
        Boolean(jobId) &&
        approved.some(
          (j) =>
            j.id === jobId ||
            (j.backendId && j.backendId === jobId) ||
            j.id.toLowerCase() === jobId.toLowerCase(),
        );

      if (!isValid) {
        const firstAvailable = approved[0]!;
        const firstId = firstAvailable.id;
        setJobIdState(firstId);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY_JOB_ID, firstId);
          } catch {}
        }
      }
    }
  }, [approved, jobId]);

  const selectedJob = useMemo<Job>(() => {
    if (jobId) {
      const found = approved.find(
        (j) =>
          j.id === jobId ||
          (j.backendId && j.backendId === jobId) ||
          j.id.toLowerCase() === jobId.toLowerCase(),
      );
      if (found) return found;
    }
    if (approved.length > 0) return approved[0]!;
    return emptyJob;
  }, [jobId, approved]);

  const setJobId = useCallback((id: string) => {
    if (!id) return;
    setJobIdState(id);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_JOB_ID, id);
      } catch {}
    }
    setRecent((r) => {
      const next = [id, ...r.filter((x) => x !== id)].slice(0, 4);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  }, []);

  const value = useMemo<JobContextType>(
    () => ({
      job: selectedJob,
      approvedJobs: approved,
      allJobs,
      setJobId,
      recent,
      sidebarCollapsed,
      toggleSidebar: () => setCollapsed((v) => !v),
      refreshJobs,
    }),
    [selectedJob, approved, allJobs, setJobId, recent, sidebarCollapsed, refreshJobs],
  );

  return <JobContext.Provider value={value}>{children}</JobContext.Provider>;
}

export function useJobContext() {
  const ctx = useContext(JobContext);
  if (!ctx) throw new Error("useJobContext must be used inside JobContextProvider");
  return ctx;
}
