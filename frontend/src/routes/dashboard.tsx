import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader, Panel, PanelHeader } from "@/components/app/primitives";
import { ActivityItem } from "@/components/app/activity-item";
import {
  ActiveBonusesPanel,
  MonthlyPerformancePanel,
  TopActiveRolesPanel,
} from "@/components/app/overview-blocks";
import { CandidateRow } from "@/components/app/pipeline";
import { activity, candidates, messages } from "@/lib/data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Recruiter Overview — Pipeline, Bounties & Client Activity" },
      {
        name: "description",
        content:
          "Track live candidate stages, pending client approvals, earned bounties and client activity across every approved role.",
      },
      {
        property: "og:title",
        content: "Recruiter Overview — Pipeline, Bounties & Client Activity",
      },
      {
        property: "og:description",
        content:
          "Live candidate stages, client approvals and bounty performance in one recruiter overview.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const active = candidates
    .filter((c) => c.stage !== "rejected" && c.stage !== "hired")
    .slice(0, 6);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader
          title="Overview"
          description="Desk status across every approved client, pipeline stage and payout in flight."
        />

        {/* Top two panels: Monthly Performance + Active Bonuses */}
        <div className="grid gap-4 p-4 pb-0 sm:p-6 sm:pb-0 md:grid-cols-2">
          <MonthlyPerformancePanel />
          <ActiveBonusesPanel />
        </div>

        {/* Main grid: left column (roles + candidates) + right sidebar (activity + messages) */}
        <div className="grid gap-4 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <TopActiveRolesPanel />

            <Panel>
              <PanelHeader
                title="Candidates needing attention"
                meta="Sorted by stage recency"
                actions={
                  <Link to="/pipeline" className="text-xs font-semibold text-brand hover:underline">
                    Open pipeline
                  </Link>
                }
              />
              <div>
                {active.length > 0 ? (
                  active.map((c) => <CandidateRow key={c.id} candidate={c} showStage />)
                ) : (
                  <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
                    No candidates in pipeline yet.
                  </p>
                )}
              </div>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel>
              <PanelHeader title="Client activity" meta="Last 7 days" />
              <ul>
                {activity.length > 0 ? (
                  activity.slice(0, 5).map((a) => <ActivityItem key={a.id} item={a} />)
                ) : (
                  <li className="px-4 py-6 text-center text-[13px] text-muted-foreground">
                    No recent activity.
                  </li>
                )}
              </ul>
            </Panel>

            <Panel>
              <PanelHeader
                title="Client messages"
                meta={`${messages.filter((m) => m.unread).length} unread`}
                actions={
                  <Link to="/messages" className="text-xs font-semibold text-brand hover:underline">
                    Inbox
                  </Link>
                }
              />
              <ul className="divide-y divide-border">
                {messages.length > 0 ? (
                  messages.map((m) => (
                    <li key={m.id} className="px-4 py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="min-w-0 truncate text-[13px] font-medium text-foreground">
                          {m.from} · <span className="text-muted-foreground">{m.company}</span>
                        </p>
                        <span className="num shrink-0 text-[11px] text-muted-foreground">{m.time}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{m.preview}</p>
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-6 text-center text-[13px] text-muted-foreground">
                    No messages yet.
                  </li>
                )}
              </ul>
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
