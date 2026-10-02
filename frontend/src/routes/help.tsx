import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, LifeBuoy, ShieldCheck } from "lucide-react";
import { WorkspacePage } from "@/components/app/workspace-page";
import { Panel, PanelHeader } from "@/components/app/primitives";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & Resources — Recruiter Playbooks and Support" },
      {
        name: "description",
        content:
          "Submission standards, payout policy, screening playbooks and direct support for marketplace recruiters.",
      },
      { property: "og:title", content: "Help & Resources — Recruiter Playbooks and Support" },
      {
        property: "og:description",
        content: "Submission standards, payout policy and recruiter support.",
      },
    ],
  }),
  component: HelpPage,
});

const groups = [
  {
    icon: BookOpen,
    title: "Submission standards",
    items: [
      "How client requirement sets are approved",
      "Writing a submission note that survives screening",
      "Resume formatting and language requirements",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Payouts & policy",
    items: [
      "Net 30/60/90 terms explained",
      "90-day guarantee and clawbacks",
      "Bonus qualification rules",
    ],
  },
  {
    icon: LifeBuoy,
    title: "Support",
    items: [
      "Dispute a rejection",
      "Request reapplication to a client",
      "Report a duplicate candidate claim",
    ],
  },
];

function HelpPage() {
  return (
    <WorkspacePage
      title="Help & resources"
      description="Policy, playbooks and escalation paths for your desk."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {groups.map((g) => (
          <Panel key={g.title}>
            <PanelHeader
              title={g.title}
              actions={<g.icon className="size-4 text-muted-foreground" />}
            />
            <ul className="divide-y divide-border">
              {g.items.map((i) => (
                <li
                  key={i}
                  className="px-4 py-3 text-[13px] leading-5 text-foreground transition-colors hover:bg-surface-sunken"
                >
                  {i}
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </WorkspacePage>
  );
}
