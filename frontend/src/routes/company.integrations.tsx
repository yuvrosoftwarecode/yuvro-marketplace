import { createFileRoute } from "@tanstack/react-router";
import { CompanySection, CompanyShell } from "@/components/company/company-shell";

export const Route = createFileRoute("/company/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — Company Portal" },
      { name: "description", content: "Connect your calendar, ATS and messaging tools to keep hiring in sync." },
      { property: "og:title", content: "Integrations — Company Portal" },
      { property: "og:description", content: "Connect calendar, ATS and messaging tools." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IntegrationsPage,
});

function IntegrationsPage() {
  return (
    <CompanyShell title="Integrations" description="Keep interviews, candidates and messages in sync with your tools.">
      <div className="grid gap-4 lg:grid-cols-2">
        <CompanySection title="Calendar">Two-way sync for interview scheduling.</CompanySection>
        <CompanySection title="ATS">Push hired candidates into your ATS.</CompanySection>
        <CompanySection title="Messaging">Route alerts to a shared channel.</CompanySection>
        <CompanySection title="API & webhooks">Keys and event subscriptions.</CompanySection>
      </div>
    </CompanyShell>
  );
}
