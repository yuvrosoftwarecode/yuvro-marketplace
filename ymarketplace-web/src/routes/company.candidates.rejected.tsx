import { createFileRoute } from "@tanstack/react-router";
import { CompanySection, CompanyShell } from "@/components/company/company-shell";

export const Route = createFileRoute("/company/candidates/rejected")({
  head: () => ({
    meta: [
      { title: "Rejected Candidates — Company Portal" },
      { name: "description", content: "Rejected candidates with the reason on record and the role they applied to." },
      { property: "og:title", content: "Rejected Candidates — Company Portal" },
      { property: "og:description", content: "Keep rejection reasons on record for recruiters and future roles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RejectedPage,
});

function RejectedPage() {
  return (
    <CompanyShell title="Rejected" description="Reasons stay on record so recruiters can calibrate future submissions.">
      <CompanySection title="Rejections" meta="Last 90 days">
        Candidate, role, stated reason and date.
      </CompanySection>
    </CompanyShell>
  );
}
