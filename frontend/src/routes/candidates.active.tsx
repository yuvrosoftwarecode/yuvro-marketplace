import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { WorkspacePage } from "@/components/app/workspace-page";
import { EmptyState, Panel, PanelHeader, SearchBar } from "@/components/app/primitives";
import { CandidateRow } from "@/components/app/pipeline";
import { candidates, jobs } from "@/lib/data";

export const Route = createFileRoute("/candidates/active")({
  head: () => ({
    meta: [
      { title: "Active Candidates — In-Flight Submissions" },
      {
        name: "description",
        content:
          "Every candidate currently in a client process, with stage, client role and last activity.",
      },
      { property: "og:title", content: "Active Candidates — In-Flight Submissions" },
      {
        property: "og:description",
        content: "Candidates currently in a client process with stage and activity.",
      },
    ],
  }),
  component: ActiveCandidatesPage,
});

function ActiveCandidatesPage() {
  const [query, setQuery] = useState("");
  const list = candidates.filter(
    (c) => c.stage !== "rejected" && (c.name + c.title).toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <WorkspacePage
      title="Active candidates"
      description="Submissions in flight across all approved clients."
    >
      <Panel className="overflow-hidden">
        <PanelHeader
          title="In process"
          meta={`${list.length} candidates`}
          actions={
            <SearchBar value={query} onChange={setQuery} placeholder="Search" className="w-48" />
          }
        />
        {list.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title="No active candidates"
            description="Submit a candidate to an approved role to start a process."
          />
        ) : (
          <div>
            {list.map((c) => (
              <div key={c.id}>
                <p className="border-b border-border bg-surface-sunken px-4 py-1.5 text-[11px] font-semibold text-muted-foreground">
                  {jobs.find((j) => j.id === c.jobId)?.company} ·{" "}
                  {jobs.find((j) => j.id === c.jobId)?.title}
                </p>
                <CandidateRow candidate={c} showStage />
              </div>
            ))}
          </div>
        )}
      </Panel>
    </WorkspacePage>
  );
}
