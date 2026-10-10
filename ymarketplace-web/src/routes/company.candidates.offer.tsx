import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CompanyShell } from "@/components/company/company-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { amJobs } from "@/lib/am-data";
import { signedInCompanyId, upcomingJoiners } from "@/lib/company-review";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/company/candidates/offer")({
  head: () => ({
    meta: [
      { title: "Offers — Company Portal" },
      { name: "description", content: "Signed offers with candidate, joining date, role and location." },
      { property: "og:title", content: "Offers — Company Portal" },
      { property: "og:description", content: "Track signed offers, start dates and locations in one table." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OfferPage,
});

function OfferPage() {
  const jobs = amJobs.filter((j) => j.companyId === signedInCompanyId);
  const [jobId, setJobId] = useState("all");
  const joiners = upcomingJoiners.filter((j) => jobId === "all" || j.jobId === jobId);
  const jobById = (id: string) => jobs.find((j) => j.id === id);

  return (
    <CompanyShell
      title="Offer"
      description="Signed offers with start dates, roles and locations."
      actions={
        <div className="flex items-center gap-2">
          <span className="label-caps hidden text-[10px] sm:block">Role</span>
          <Select value={jobId} onValueChange={setJobId}>
            <SelectTrigger
              aria-label="Filter offers by role"
              className="h-8 w-[220px] gap-1.5 rounded-md bg-surface px-2.5 text-xs shadow-panel sm:w-[260px]"
            >
              <SelectValue>{jobId === "all" ? "All roles" : jobById(jobId)?.title ?? "All roles"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All roles</SelectItem>
              {jobs.map((role) => (
                <SelectItem key={role.id} value={role.id} className="text-xs">
                  {role.title} · {role.location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="mx-auto max-w-[1440px] space-y-4">
        <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-panel">
          <header className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Signed offers</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Candidates who accepted and their start dates</p>
            </div>
            <span className="num rounded-md bg-success-soft px-2 py-1 text-[11px] font-semibold text-success">
              {joiners.length} joining
            </span>
          </header>

          <div className="hidden grid-cols-[minmax(0,2fr)_130px_minmax(0,1.7fr)_minmax(0,1.3fr)] gap-4 border-b border-border bg-surface-sunken px-5 py-2.5 md:grid">
            <span className="label-caps">Candidate</span>
            <span className="label-caps">Date of joining</span>
            <span className="label-caps">Role</span>
            <span className="label-caps">Location</span>
          </div>

          {joiners.length === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-muted-foreground">
              No signed offers for this role yet.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {joiners.map((joiner) => (
                <li
                  key={joiner.id}
                  className="grid gap-1.5 px-4 py-4 transition-colors hover:bg-surface-sunken sm:px-5 md:grid-cols-[minmax(0,2fr)_130px_minmax(0,1.7fr)_minmax(0,1.3fr)] md:items-center md:gap-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarFallback
                        className={cn("text-xs font-semibold", {
                          "bg-brand-soft text-brand": joiner.tone === "brand",
                          "bg-success-soft text-success": joiner.tone === "success",
                          "bg-warning-soft text-warning": joiner.tone === "warning",
                        })}
                      >
                        {joiner.initials}
                      </AvatarFallback>
                    </Avatar>
                    <p className="truncate text-[13.5px] font-semibold text-foreground">{joiner.name}</p>
                  </div>
                  <div className="num whitespace-nowrap text-[13px] font-medium text-foreground">
                    {joiner.date}
                    <span className="mt-0.5 block text-[11px] font-normal text-success">{joiner.timing}</span>
                  </div>
                  <p className="truncate text-[13px] text-muted-foreground">{joiner.role}</p>
                  <p className="truncate text-[13px] text-muted-foreground">
                    {jobById(joiner.jobId)?.location ?? "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </CompanyShell>
  );
}
