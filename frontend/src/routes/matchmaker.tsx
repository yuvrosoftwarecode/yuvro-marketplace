import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { WorkspacePage } from "@/components/app/workspace-page";
import { EmptyState, Panel, PanelHeader, SearchBar, SectionLabel } from "@/components/app/primitives";
import { StatusBadge } from "@/components/app/status-badge";
import { useJobContext } from "@/components/app/job-context";
import { candidates } from "@/lib/data";

export const Route = createFileRoute("/matchmaker")({
  head: () => ({
    meta: [
      { title: "Matchmaker — Rank Candidates Against Client Criteria" },
      {
        name: "description",
        content:
          "Score candidates against the client's published requirements, green flags and disqualifiers before submitting.",
      },
      { property: "og:title", content: "Matchmaker — Rank Candidates Against Client Criteria" },
      {
        property: "og:description",
        content: "Score candidates against published client criteria before submitting.",
      },
    ],
  }),
  component: MatchmakerPage,
});

function MatchmakerPage() {
  const { job } = useJobContext();
  const [query, setQuery] = useState("");
  const pool = candidates.filter((c) =>
    (c.name + c.title).toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <WorkspacePage
      title="Matchmaker"
      description={`Scored against ${job.company}'s ${job.requirements.length} hard requirements and ${job.redFlags.length} disqualifiers.`}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Ranked candidates"
            meta={`${pool.length} in your talent pool`}
            actions={
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder="Search pool"
                className="w-48"
              />
            }
          />
          {pool.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="size-5" />}
              title="No candidates in talent pool"
              description="Candidates submitted to your desk will be ranked and scored against client requirements here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {pool.slice(0, 10).map((c, i) => {
              const score = 97 - i * 5;
              return (
                <li
                  key={c.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-foreground">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.title} · {c.location}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge tone={score > 90 ? "success" : score > 75 ? "info" : "neutral"}>
                      {score}% fit
                    </StatusBadge>
                    <Link
                      to="/submit-candidate"
                      className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-2.5 text-xs font-semibold text-foreground hover:bg-surface-sunken"
                    >
                      Submit
                    </Link>
                  </div>
                </li>
              );
            })}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Scoring inputs" meta="Client-published criteria" />
          <div className="px-4 py-3">
            <SectionLabel>Requirements</SectionLabel>
            <ul className="mt-1.5 space-y-1.5 text-[13px] leading-5 text-foreground">
              {job.requirements.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
          <div className="border-t border-border px-4 py-3">
            <SectionLabel>Disqualifiers</SectionLabel>
            <ul className="mt-1.5 space-y-1.5 text-[13px] leading-5 text-destructive">
              {job.redFlags.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>
    </WorkspacePage>
  );
}
