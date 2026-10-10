import { createFileRoute } from "@tanstack/react-router";
import { CompanySection, CompanyShell } from "@/components/company/company-shell";

export const Route = createFileRoute("/company/team")({
  head: () => ({
    meta: [
      { title: "Team & Permissions — Company Portal" },
      { name: "description", content: "Invite hiring managers and interviewers and control what each person can see." },
      { property: "og:title", content: "Team & Permissions — Company Portal" },
      { property: "og:description", content: "Manage teammates, roles and interview access." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  return (
    <CompanyShell title="Team" description="Teammates, roles and interview access.">
      <div className="grid gap-4 lg:grid-cols-2">
        <CompanySection title="Members" meta="Active">
          Name, role and the jobs each person can access.
        </CompanySection>
        <CompanySection title="Invitations">Pending invites and their expiry.</CompanySection>
      </div>
    </CompanyShell>
  );
}
