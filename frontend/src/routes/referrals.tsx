import { createFileRoute } from "@tanstack/react-router";
import { Gift } from "lucide-react";
import { WorkspacePage } from "@/components/app/workspace-page";
import { EmptyState, MetaRow, Panel, PanelHeader } from "@/components/app/primitives";
import { StatusBadge } from "@/components/app/status-badge";
import { useAuth, getUserDisplayName } from "@/lib/auth";

export const Route = createFileRoute("/referrals")({
  head: () => ({
    meta: [
      { title: "Referrals & Promotions — Recruiter Incentives" },
      {
        name: "description",
        content:
          "Track recruiter referral credit, active marketplace promotions and bonus multipliers on your desk.",
      },
      { property: "og:title", content: "Referrals & Promotions — Recruiter Incentives" },
      {
        property: "og:description",
        content: "Referral credit, active promotions and bonus multipliers.",
      },
    ],
  }),
  component: ReferralsPage,
});

type Promotion = {
  name: string;
  detail: string;
  ends: string;
  tone: "success" | "brand" | "info";
};

// No hardcoded dummy promotions
const promos: Promotion[] = [];

function ReferralsPage() {
  const { user } = useAuth();
  const referralHandle = user?.username || user?.email?.split("@")[0] || "recruiter";

  return (
    <WorkspacePage
      title="Referrals & promotions"
      description="Incentives currently applied to your placements."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel className="overflow-hidden">
          <PanelHeader title="Active promotions" meta="Applied automatically at payout" />
          {promos.length === 0 ? (
            <EmptyState
              icon={<Gift className="size-5" />}
              title="No active promotions"
              description="Active seasonal sprints, bounty bonuses and referral campaigns will appear here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {promos.map((p) => (
                <li
                  key={p.name}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-foreground">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.detail}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="num text-xs text-muted-foreground">Ends {p.ends}</span>
                    <StatusBadge tone={p.tone} dot>
                      Active
                    </StatusBadge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Your referral account" />
          <dl className="px-4 py-2">
            <MetaRow label="Referral link" value={`yuvro.com/r/${referralHandle}`} />
            <MetaRow label="Recruiters referred" value="0" />
            <MetaRow label="Credit earned" value="$0" />
            <MetaRow label="Credit pending" value="$0" />
            <MetaRow label="Next payout" value="—" />
          </dl>
        </Panel>
      </div>
    </WorkspacePage>
  );
}
