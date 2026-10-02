import { createFileRoute } from "@tanstack/react-router";
import { CircleSlash } from "lucide-react";
import { WorkspacePage } from "@/components/app/workspace-page";
import { EmptyState, Panel, PanelHeader } from "@/components/app/primitives";
import { candidates, jobs } from "@/lib/data";

export const Route = createFileRoute("/candidates/rejected")({
  head: () => ({
    meta: [
      { title: "Rejected Candidates — Reasons & Reusability" },
      {
        name: "description",
        content:
          "Rejected submissions with the client's stated reason, rejection date and cross-listing potential.",
      },
      { property: "og:title", content: "Rejected Candidates — Reasons & Reusability" },
      {
        property: "og:description",
        content: "Rejected submissions with stated reasons and rejection dates.",
      },
    ],
  }),
  component: RejectedCandidatesPage,
});

function RejectedCandidatesPage() {
  const list = candidates.filter((c) => c.stage === "rejected");

  return (
    <WorkspacePage
      title="Rejected candidates"
      description="Keep the reason on record — many are reusable on other roles."
    >
      <Panel className="overflow-hidden">
        <PanelHeader title="Rejections" meta={`${list.length} candidates`} />
        {list.length === 0 ? (
          <EmptyState
            icon={<CircleSlash className="size-5" />}
            title="No rejections"
            description="Nothing has been rejected by a client yet."
          />
        ) : (
          <ul className="divide-y divide-border">
            {list.map((c) => (
              <li
                key={c.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-foreground">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.title} · {jobs.find((j) => j.id === c.jobId)?.company}
                  </p>
                  {c.note ? <p className="mt-1 text-xs text-destructive">{c.note}</p> : null}
                </div>
                <span className="num shrink-0 text-[11px] text-muted-foreground">{c.updated}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </WorkspacePage>
  );
}
