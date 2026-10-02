import { useCallback, useEffect, useState } from "react";
import type { CandidateStage } from "@/lib/am-data";

const STAGE_KEY = "yuvro.company.review.stages.v1";
const LOG_KEY = "yuvro.company.review.log.v1";

export type ReviewLogEntry = {
  id: string;
  submissionId: string;
  candidate: string;
  job: string;
  from: CandidateStage;
  to: CandidateStage;
  reason?: string;
  note?: string;
  at: string;
  by: string;
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

/** Company-side stage decisions, persisted locally so the pipeline survives reloads. */
export function useReviewStore() {
  const [stages, setStages] = useState<Record<string, CandidateStage>>({});
  const [log, setLog] = useState<ReviewLogEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setStages(read<Record<string, CandidateStage>>(STAGE_KEY, {}));
    setLog(read<ReviewLogEntry[]>(LOG_KEY, []));
    setReady(true);
  }, []);

  const move = useCallback(
    (input: {
      submissionId: string;
      candidate: string;
      job: string;
      from: CandidateStage;
      to: CandidateStage;
      reason?: string;
      note?: string;
      by: string;
    }) => {
      setStages((prev) => {
        const next = { ...prev, [input.submissionId]: input.to };
        write(STAGE_KEY, next);
        return next;
      });
      setLog((prev) => {
        const entry: ReviewLogEntry = {
          id: `${input.submissionId}-${Date.now()}`,
          submissionId: input.submissionId,
          candidate: input.candidate,
          job: input.job,
          from: input.from,
          to: input.to,
          at: new Date().toISOString(),
          by: input.by,
          ...(input.reason ? { reason: input.reason } : {}),
          ...(input.note ? { note: input.note } : {}),
        };
        const next = [entry, ...prev].slice(0, 200);
        write(LOG_KEY, next);
        return next;
      });
    },
    [],
  );

  const reset = useCallback(() => {
    setStages({});
    setLog([]);
    write(STAGE_KEY, {});
    write(LOG_KEY, []);
  }, []);

  return { stages, log, move, reset, ready };
}

export const formatLogTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
