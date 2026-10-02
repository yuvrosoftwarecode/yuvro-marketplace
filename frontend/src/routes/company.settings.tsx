import { createFileRoute } from "@tanstack/react-router";
import { CompanySection, CompanyShell } from "@/components/company/company-shell";

export const Route = createFileRoute("/company/settings")({
  head: () => ({
    meta: [
      { title: "Company Settings — Yuvro Marketplace" },
      { name: "description", content: "Account preferences, notifications and hiring workflow defaults." },
      { property: "og:title", content: "Company Settings — Yuvro Marketplace" },
      { property: "og:description", content: "Manage preferences, notifications and workflow defaults." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <CompanyShell title="Settings" description="Account preferences and hiring workflow defaults.">
      <div className="grid gap-4 lg:grid-cols-2">
        <CompanySection title="Profile">Contact details and time zone.</CompanySection>
        <CompanySection title="Notifications">Choose what triggers an email or in-app alert.</CompanySection>
        <CompanySection title="Hiring defaults">Default interview stages and SLA targets.</CompanySection>
        <CompanySection title="Security">Password and session management.</CompanySection>
      </div>
    </CompanyShell>
  );
}
