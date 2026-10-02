import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader, Panel, PanelHeader, SearchBar } from "@/components/app/primitives";
import { PipelineBoard, PipelineViewToggle } from "@/components/app/pipeline";
import { useJobContext } from "@/components/app/job-context";
import { useAmOptional } from "@/components/am/am-store";
import {
  getPipelineCandidatesForJob,
  getPipelineStagesForJob,
  normalizeStageId,
} from "@/lib/data";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Candidate Pipeline — Stage Board by Client Role" },
      {
        name: "description",
        content:
          "Track every submitted candidate by stage: AM review followed by role-specific hiring process steps.",
      },
      { property: "og:title", content: "Candidate Pipeline — Stage Board by Client Role" },
      {
        property: "og:description",
        content: "Stage-by-stage candidate board starting with AM Review followed by role hiring process.",
      },
    ],
  }),
  component: PipelinePage,
});

function PipelinePage() {
  const { job } = useJobContext();
  const am = useAmOptional();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"compact" | "open">("open");

  const refreshSubmissions = am?.refreshSubmissions;
  useEffect(() => {
    refreshSubmissions?.();
  }, [refreshSubmissions]);

  const jobStages = getPipelineStagesForJob(job);
  const list = useMemo(() => {
    const allForJob = getPipelineCandidatesForJob(
      job.id,
      job.backendId,
      am?.state.submissions,
      am?.state.candidates,
      am?.state.jobs,
    );
    return allForJob.filter((c) =>
      (c.name + c.title).toLowerCase().includes(query.toLowerCase()),
    );
  }, [
    job.id,
    job.backendId,
    am?.state.submissions,
    am?.state.candidates,
    am?.state.jobs,
    query,
  ]);

  return (
    <AppShell>
      <PageHeader
        title="Pipeline"
        description={`${job.company} — ${job.title}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search candidates"
            className="sm:w-80"
          />
          <div className="scroll-slim flex gap-4 overflow-x-auto text-xs text-muted-foreground">
            {jobStages.map((s, idx) => {
              const isFirstStage = idx === 0;
              const count = list.filter((c) => {
                const normCandidateStage = normalizeStageId(c.stage);
                return (
                  normCandidateStage === s.id ||
                  c.stage?.toLowerCase() === s.label.toLowerCase() ||
                  (isFirstStage &&
                    (c.stage === "pending" ||
                      c.stage === "submitted" ||
                      c.stage === "am_review" ||
                      normCandidateStage === "pending" ||
                      normCandidateStage === "am_review" ||
                      !c.stage))
                );
              }).length;

              return (
                <span key={s.id} className="shrink-0">
                  {s.label}{" "}
                  <span className="num font-semibold text-foreground">
                    {count}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </PageHeader>

      <div className="p-4 sm:p-6">
        <Panel className="overflow-hidden">
          <PanelHeader title="Stage board" meta={`${list.length} candidates`} />
          <PipelineBoard candidates={list} job={job} compact={false} fullWidth={true} />
        </Panel>
      </div>
    </AppShell>
  );
}
