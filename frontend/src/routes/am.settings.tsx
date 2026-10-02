import { createFileRoute } from "@tanstack/react-router";
import { AmPageHeader, AmShell } from "@/components/am/am-shell";
import { useAm } from "@/components/am/am-store";
import { Btn, DefinitionGrid, Field, FormSection, inputCls } from "@/components/am/am-ui";
import { StatusBadge } from "@/components/app/status-badge";
import { useAuth, getUserDisplayName, getUserRoleTitle } from "@/lib/auth";

export const Route = createFileRoute("/am/settings")({
  head: () => ({
    meta: [
      { title: "Account Manager Settings — Yuvro" },
      {
        name: "description",
        content:
          "Manage your Account Manager profile, desk assignment, notification routing and marketplace permissions.",
      },
      { property: "og:title", content: "Account Manager Settings — Yuvro" },
      {
        property: "og:description",
        content: "Profile, desk coverage, notification routing and permission scope.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AmSettingsPage,
});

const permissions: { label: string; scope: string; allowed: boolean }[] = [
  {
    label: "Create and edit jobs on behalf of companies",
    scope: "All managed accounts",
    allowed: true,
  },
  { label: "Approve or reject recruiter job access", scope: "All managed jobs", allowed: true },
  {
    label: "Review submissions before the company sees them",
    scope: "All managed jobs",
    allowed: true,
  },
  {
    label: "Upload candidates directly as Account Manager",
    scope: "All managed jobs",
    allowed: true,
  },
  { label: "Move candidates across pipeline stages", scope: "All managed jobs", allowed: true },
  {
    label: "Message companies, recruiters and candidates",
    scope: "All managed jobs",
    allowed: true,
  },
  {
    label: "View recruiter contact details and payout history",
    scope: "Assigned recruiters",
    allowed: true,
  },
  {
    label: "Approve and release recruiter payouts",
    scope: "Up to $25,000 per hire",
    allowed: true,
  },
  { label: "Change company billing terms", scope: "Finance team only", allowed: false },
  { label: "Delete companies or recruiter accounts", scope: "Platform admin only", allowed: false },
];

function AmSettingsPage() {
  const { state } = useAm();
  const { user } = useAuth();

  const displayName = getUserDisplayName(user, "Account Manager");
  const email = user?.email || "";
  const title = getUserRoleTitle(user, "Account Manager");

  return (
    <AmShell>
      <AmPageHeader
        title="Settings"
        description="Your Account Manager profile, desk coverage and permission scope on the marketplace."
      />

      <div className="px-4 sm:px-6">
        <FormSection
          title="Profile"
          description="Shown to companies and recruiters on every thread you touch."
        >
          <Field label="Full name">
            <input className={inputCls} defaultValue={displayName} key={displayName} />
          </Field>
          <Field label="Title">
            <input className={inputCls} defaultValue={title} key={title} />
          </Field>
          <Field label="Work email">
            <input className={inputCls} defaultValue={email} key={email} />
          </Field>
          <Field label="Desk coverage">
            <input className={inputCls} defaultValue="Active Desk" />
          </Field>
        </FormSection>

        <FormSection
          title="Notification routing"
          description="Controls which events reach you by email in addition to the in-product inbox."
        >
          {[
            "New recruiter request on a managed job",
            "New submission awaiting review",
            "Company feedback received or overdue",
            "Interview scheduled, rescheduled or cancelled",
            "Offer extended, accepted or declined",
            "Payout status change",
          ].map((l) => (
            <label
              key={l}
              className="flex items-start gap-2.5 rounded-md border border-border bg-surface px-3 py-2.5"
            >
              <input
                type="checkbox"
                defaultChecked
                className="mt-0.5 size-4 accent-[var(--brand)]"
              />
              <span className="text-[13px] leading-5 text-foreground">{l}</span>
            </label>
          ))}
        </FormSection>

        <section className="border-b border-border py-6">
          <h2 className="text-[13px] font-semibold tracking-tight text-foreground">Permissions</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Account Manager permissions are wider than recruiter or company users, and are read-only
            here.
          </p>
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {permissions.map((p) => (
              <li
                key={p.label}
                className="grid gap-1 py-2.5 sm:grid-cols-[minmax(0,1fr)_10rem_6rem] sm:items-center"
              >
                <span className="text-[13px] text-foreground">{p.label}</span>
                <span className="text-xs text-muted-foreground">{p.scope}</span>
                <span className="sm:justify-self-end">
                  <StatusBadge tone={p.allowed ? "success" : "neutral"} dot>
                    {p.allowed ? "Allowed" : "Restricted"}
                  </StatusBadge>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="py-6">
          <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
            Desk snapshot
          </h2>
          <div className="mt-3">
            <DefinitionGrid
              items={[
                { label: "Companies", value: state.companies.length },
                { label: "Jobs", value: state.jobs.length },
                { label: "Recruiters", value: state.recruiters.length },
                { label: "Candidates", value: state.candidates.length },
                { label: "Submissions", value: state.submissions.length },
                { label: "Payout records", value: state.payouts.length },
              ]}
            />
          </div>
          <div className="mt-5 flex gap-2">
            <Btn variant="primary">Save changes</Btn>
            <Btn>Discard</Btn>
          </div>
        </section>
      </div>
    </AmShell>
  );
}
