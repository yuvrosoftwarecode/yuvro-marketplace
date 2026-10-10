import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MessageSquareQuote } from "lucide-react";
import { EmptyState, Panel, PanelHeader } from "@/components/app/primitives";
import { StatusBadge, stageTone } from "@/components/app/status-badge";
import { getJob, getPipelineCandidatesForJob, stages, type Job } from "@/lib/data";
import { fetchRecruiterJobById } from "@/lib/recruiter-jobs";
import { useAmOptional } from "@/components/am/am-store";
import { useJobContext } from "@/components/app/job-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/jobs/$jobId/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback — job workspace" },
      { name: "description", content: "Client feedback on candidates submitted to this role." },
      { property: "og:title", content: "Feedback — job workspace" },
      { property: "og:description", content: "Client feedback on candidates submitted to this role." },
    ],
  }),
  component: FeedbackTab,
});

const stageLabel = (id: string) => stages.find((s) => s.id === id)?.label ?? id;

type ViewMode = "all" | "active" | "rejected";

function FeedbackTab() {
  const { jobId } = Route.useParams();
  const { job: contextJob } = useJobContext();
  const [job, setJob] = useState<Job | null>(
    () => (contextJob && (contextJob.id === jobId || contextJob.slug === jobId) ? contextJob : getJob(jobId) || null)
  );
  const am = useAmOptional();
  const [view, setView] = useState<ViewMode>("active");

  useEffect(() => {
    if (contextJob && (contextJob.id === jobId || contextJob.slug === jobId)) {
      setJob(contextJob);
    }
  }, [contextJob, jobId]);

  useEffect(() => {
    let active = true;
    if (jobId) {
      fetchRecruiterJobById(jobId).then((fetched) => {
        if (active && fetched) setJob(fetched);
      });
    }
    return () => {
      active = false;
    };
  }, [jobId]);

  const refreshSubmissions = am?.refreshSubmissions;
  useEffect(() => {
    refreshSubmissions?.(true);
  }, [refreshSubmissions]);

  const all = useMemo(() => {
    const targetJobId = job?.id || jobId;
    const targetBackendId = job?.backendId;
    return getPipelineCandidatesForJob(
      targetJobId,
      targetBackendId,
      am?.state.submissions,
      am?.state.candidates,
      am?.state.jobs,
      job?.slug,
      true, // includeRejected = true
    );
  }, [
    job,
    jobId,
    am?.state.submissions,
    am?.state.candidates,
    am?.state.jobs,
  ]);

  const allCount = all.length;
  const activeCount = all.filter((c) => c.stage !== "rejected").length;
  const rejectedCount = all.filter((c) => c.stage === "rejected").length;

  const rows = useMemo(() => {
    if (view === "active") {
      return all.filter((c) => c.stage !== "rejected");
    }
    if (view === "rejected") {
      return all.filter((c) => c.stage === "rejected");
    }
    return all;
  }, [all, view]);

  return (
    <div className="p-4 sm:p-6">
      <Panel>
        <PanelHeader
          title="Client feedback"
          meta="Candidate status for this role"
          actions={
            <div className="inline-flex rounded-md border border-border bg-surface-sunken p-0.5">
              {(
                [
                  { id: "all", label: `All (${allCount})` },
                  { id: "active", label: `Active (${activeCount})` },
                  { id: "rejected", label: `Rejected (${rejectedCount})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setView(tab.id)}
                  className={cn(
                    "rounded px-3 py-1 text-xs font-semibold transition-colors",
                    view === tab.id
                      ? "bg-surface text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          }
        />
        {rows.length === 0 ? (
          <EmptyState
            icon={<MessageSquareQuote className="size-5" />}
            title={
              view === "active"
                ? "No active candidates"
                : view === "rejected"
                ? "No rejected candidates"
                : "No candidates yet"
            }
            description={
              view === "active"
                ? "Active candidates for this role will appear here."
                : view === "rejected"
                ? "Rejected candidates and reasons for rejection will appear here."
                : "Candidates submitted to this role will appear here."
            }
          />
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Candidate name</th>
                <th className="px-4 py-2.5 font-medium">
                  {view === "active"
                    ? "Stage"
                    : view === "rejected"
                    ? "Reason for rejection"
                    : "Status / Feedback"}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.title}</p>
                  </td>
                  <td className="px-4 py-3">
                    {view === "active" ? (
                      <StatusBadge tone={stageTone[c.stage] || "neutral"} dot>
                        {stageLabel(c.stage)}
                      </StatusBadge>
                    ) : view === "rejected" ? (
                      <span className="text-muted-foreground">{c.note || "No reason provided"}</span>
                    ) : (
                      <div className="flex flex-col gap-1 items-start">
                        {c.stage === "rejected" ? (
                          <>
                            <StatusBadge tone="danger" dot>
                              Rejected
                            </StatusBadge>
                            {c.note ? (
                              <span className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">Reason:</span> {c.note}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <StatusBadge tone={stageTone[c.stage] || "neutral"} dot>
                            {stageLabel(c.stage)}
                          </StatusBadge>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
