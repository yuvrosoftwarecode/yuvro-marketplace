import { useEffect, useState } from "react";

const KEY = "yuvro.recruiter.jobOrigin";
export type JobOrigin = "jobs" | "clients";

export function setJobOrigin(o: JobOrigin) {
  try {
    sessionStorage.setItem(KEY, o);
  } catch {
    /* ignore */
  }
}

export function useJobOrigin(): JobOrigin {
  const [o, setO] = useState<JobOrigin>("jobs");
  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY) === "clients") setO("clients");
    } catch {
      /* ignore */
    }
  }, []);
  return o;
}
