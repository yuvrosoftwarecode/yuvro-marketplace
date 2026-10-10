import { createFileRoute, Link } from "@tanstack/react-router";
import { Share2 } from "lucide-react";
import { WorkspacePage } from "@/components/app/workspace-page";
import { EmptyState, Panel, PanelHeader } from "@/components/app/primitives";
import { StatusBadge } from "@/components/app/status-badge";
import { candidates, jobs } from "@/lib/data";

export const Route = createFileRoute("/cross-list")({
  head: () => ({
    meta: [
      { title: "Cross List — Reuse Candidates Across Client Roles" },
      {
        name: "description",
        content:
          "Match candidates already in your pipeline against other approved marketplace roles.",
      },
      { property: "og:title", content: "Cross List — Reuse Candidates Across Client Roles" },
      {
        property: "og:description",
        content: "Match existing candidates against other approved roles.",
      },
    ],
  }),
  component: CrossListPage,
});

function CrossListPage() {
  const pool = candidates.filter((c) => c.stage !== "hired");
  const targets = jobs.filter((j) => j.status === "approved");

  return (
    <WorkspacePage
      title="Cross list"
      description="Candidates who cleared screening on one role and match the requirement set of another."
    >
      <Panel className="overflow-hidden">
        <PanelHeader
          title="Suggested cross submissions"
          meta={`${pool.length} candidates · ${targets.length} approved roles`}
        />
        {pool.length === 0 || targets.length === 0 ? (
          <EmptyState
            icon={<Share2 className="size-5" />}
            title="No candidates to cross-list"
            description="Candidates who clear screening on one of your approved roles can be cross-submitted to other matching client roles."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-border bg-surface-sunken">
                  {["Candidate", "Current role", "Suggested role", "Match", ""].map((h) => (
                    <th key={h} className="label-caps px-4 py-2.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pool.slice(0, 8).map((c, i) => {
                  const target = targets[(i + 1) % targets.length];
                  if (!target) return null;
                  const match = 96 - i * 4;
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border last:border-0 hover:bg-surface-sunken"
                    >
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-medium text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.title}</p>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted-foreground">
                        {jobs.find((j) => j.id === c.jobId)?.title || "—"}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-foreground">{target.title}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={match > 90 ? "success" : match > 80 ? "info" : "neutral"}>
                          {match}% fit
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to="/submit-candidate"
                          className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-2.5 text-xs font-semibold text-foreground hover:bg-surface-sunken"
                        >
                          Cross submit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </WorkspacePage>
  );
}
