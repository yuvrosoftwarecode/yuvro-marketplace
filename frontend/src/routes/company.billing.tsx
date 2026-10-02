import { createFileRoute } from "@tanstack/react-router";
import { CompanySection, CompanyShell } from "@/components/company/company-shell";

export const Route = createFileRoute("/company/billing")({
  head: () => ({
    meta: [
      { title: "Billing & Invoices — Company Portal" },
      { name: "description", content: "Plan, payment method, bounty payouts and downloadable invoices." },
      { property: "og:title", content: "Billing & Invoices — Company Portal" },
      { property: "og:description", content: "Review your plan, payouts and invoice history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  return (
    <CompanyShell title="Billing" description="Plan, payment method, bounty payouts and invoices.">
      <div className="grid gap-4 lg:grid-cols-2">
        <CompanySection title="Plan">Current plan and included seats.</CompanySection>
        <CompanySection title="Payment method">Card on file and billing contact.</CompanySection>
        <CompanySection title="Bounty payouts">Amounts due on accepted hires.</CompanySection>
        <CompanySection title="Invoices">Downloadable invoice history.</CompanySection>
      </div>
    </CompanyShell>
  );
}
