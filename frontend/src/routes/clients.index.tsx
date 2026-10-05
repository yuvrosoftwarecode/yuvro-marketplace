import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  Eye,
  FileText,
  MessageSquare,
  MoreHorizontal,
  Undo2,
  UserMinus,
  UserPlus,
  Workflow,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { CompanyMark, EmptyState, PageHeader, Panel, SearchBar } from "@/components/app/primitives";
import { StatusBadge, clientStatusTone } from "@/components/app/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { jobs as defaultJobs, statusLabel, type Job } from "@/lib/data";
import { fetchRecruiterJobs } from "@/lib/recruiter-jobs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clients/")({
  head: () => ({
    meta: [
      { title: "Your Jobs — Applications, Approvals & Pipeline Access" },
      {
        name: "description",
        content:
          "Manage every job on your desk: applied roles, approved jobs, rejection reasons, and candidate pipelines.",
      },
      { property: "og:title", content: "Your Jobs — Applications, Approvals & Pipeline Access" },
      {
        property: "og:description",
        content:
          "Applied, approved, and rejected job relationships with contextual recruiter actions.",
      },
    ],
  }),
  component: YourJobsPage,
});

type FilterTab = "all" | "pending" | "approved" | "rejected";

const tabs: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Applied" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

function ActionMenu({
  job,
  onWithdrawn,
  onUnassigned,
}: {
  job: Job;
  onWithdrawn?: () => void;
  onUnassigned?: () => void;
}) {
  const notify = (msg: string) => toast.success(msg, { description: `${job.company} — ${job.title}` });

  const handleWithdraw = async () => {
    if (job.applicationId) {
      try {
        await api.post(`/api/recruiting/applications/${job.applicationId}/withdraw/`, {});
        toast.success("Application withdrawn", { description: `${job.company} — ${job.title}` });
        if (onWithdrawn) onWithdrawn();
        return;
      } catch (err) {
        console.warn("Failed to withdraw application:", err);
      }
    }
    notify("Application withdrawn");
  };

  const handleUnassign = async () => {
    if (job.applicationId) {
      try {
        await api.post(`/api/recruiting/applications/${job.applicationId}/unassign/`, {});
        toast.success("Unassigned from role", { description: `${job.company} — ${job.title}` });
        if (onUnassigned) onUnassigned();
        return;
      } catch (err) {
        console.warn("Failed to unassign application:", err);
      }
    }
    notify("Unassigned from role");
    if (onUnassigned) onUnassigned();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${job.company}`}
          className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-surface-sunken hover:text-foreground"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {job.status === "pending"
            ? "Applied"
            : job.status === "approved"
              ? "Approved"
              : statusLabel[job.status] || job.status}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {job.status === "approved" ? (
          <>
            <DropdownMenuItem asChild>
              <Link to="/jobs/$jobId" params={{ jobId: job.id }}>
                <Eye className="size-4" /> Open job
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/jobs/$jobId/submit" params={{ jobId: job.id }}>
                <UserPlus className="size-4" /> Submit candidate
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/jobs/$jobId/pipeline" params={{ jobId: job.id }}>
                <Workflow className="size-4" /> View pipeline
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/jobs/$jobId/messages" params={{ jobId: job.id }}>
                <MessageSquare className="size-4" /> Message client
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleUnassign}>
              <UserMinus className="size-4" /> Unassign from role
            </DropdownMenuItem>
          </>
        ) : null}
        {job.status === "pending" ? (
          <>
            <DropdownMenuItem asChild>
              <Link to="/jobs/$jobId" params={{ jobId: job.id }}>
                <FileText className="size-4" /> View application
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleWithdraw}>
              <Undo2 className="size-4" /> Withdraw application
            </DropdownMenuItem>
          </>
        ) : null}
        {job.status === "rejected" ? (
          <>
            <DropdownMenuItem asChild>
              <Link to="/jobs/$jobId" params={{ jobId: job.id }}>
                <FileText className="size-4" /> View rejection details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => notify("Support request opened")}>
              <MessageSquare className="size-4" /> Contact support
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function YourJobsPage() {
  const [jobList, setJobList] = useState<Job[]>(defaultJobs);
  const [tab, setTab] = useState<FilterTab>("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"cards" | "list">("cards");

  const loadData = () => {
    fetchRecruiterJobs(true).then((data) => {
      if (data && data.length > 0) {
        setJobList(data);
      }
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const appliedJobs = useMemo(
    () =>
      jobList.filter(
        (j) =>
          j.status === "pending" ||
          j.status === "approved" ||
          j.status === "rejected",
      ),
    [jobList],
  );

  const counts = useMemo(() => {
    const c: Record<FilterTab, number> = {
      all: appliedJobs.length,
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    for (const j of appliedJobs) {
      if (j.status === "pending" || j.status === "approved" || j.status === "rejected") {
        c[j.status] = (c[j.status] ?? 0) + 1;
      }
    }
    return c;
  }, [appliedJobs]);

  const rows = useMemo(
    () =>
      appliedJobs.filter(
        (j) =>
          (tab === "all" || j.status === tab) &&
          (j.company + j.title + j.location).toLowerCase().includes(query.toLowerCase()),
      ),
    [appliedJobs, tab, query],
  );

  return (
    <AppShell>
      <PageHeader
        title="Your jobs"
        description="Every job application and approved role on your desk, with the actions available at each state."
        actions={
          <div className="inline-flex rounded-md border border-border p-0.5">
            {(["cards", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors",
                  view === v ? "bg-surface-sunken text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        }
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="scroll-slim -mb-px flex gap-1 overflow-x-auto">
            {tabs.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-surface-sunken text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                  <span className="num rounded border border-border bg-surface px-1 text-[11px] font-semibold text-foreground">
                    {counts[t.id] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
          <SearchBar value={query} onChange={setQuery} placeholder="Search company or role" className="lg:w-72" />
        </div>
      </PageHeader>

      <div className="p-4 sm:p-6">
        <Panel className="overflow-hidden">
          {rows.length === 0 ? (
            <EmptyState
              icon={<Building2 className="size-5" />}
              title="No jobs in this state"
              description="Apply to marketplace roles in Browse Jobs to build your active jobs list."
              action={
                <Link
                  to="/jobs"
                  className="inline-flex h-9 items-center rounded-md bg-brand px-3.5 text-[13px] font-semibold text-brand-foreground hover:bg-brand/90"
                >
                  Browse jobs
                </Link>
              }
            />
          ) : view === "cards" ? (
            <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((j) => (
                <article key={j.id} className="flex flex-col bg-surface p-4">
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
                    <CompanyMark short={j.companyShort} tone={j.logoTone} logoUrl={j.logoUrl} />
                    <div className="min-w-0">
                      <Link
                        to="/jobs/$jobId"
                        params={{ jobId: j.id }}
                        className="block truncate text-[13px] font-semibold text-foreground hover:text-brand"
                      >
                        {j.title}
                      </Link>
                      <Link
                        to="/jobs/$jobId"
                        params={{ jobId: j.id }}
                        className="block truncate text-xs text-muted-foreground hover:text-foreground"
                      >
                        {j.company} · {j.fundingStage}
                      </Link>
                    </div>
                    <ActionMenu job={j} onUnassigned={loadData} onWithdrawn={loadData} />
                  </div>
                  <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-[13px]">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Salary</dt>
                      <dd className="num truncate font-medium text-foreground">{j.salary}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Reward</dt>
                      <dd className="num font-semibold text-foreground">{j.reward}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Location</dt>
                      <dd className="truncate font-medium text-foreground">{j.location} · {j.workModel}</dd>
                    </div>
                  </dl>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <StatusBadge tone={clientStatusTone[j.status] || "neutral"} dot>
                      {j.status === "pending"
                        ? "Applied"
                        : j.status === "approved"
                          ? "Approved"
                          : statusLabel[j.status] || "Approved"}
                    </StatusBadge>
                    {j.status === "approved" ? (
                      <Link
                        to="/jobs/$jobId/submit"
                        params={{ jobId: j.id }}
                        className="inline-flex h-8 items-center rounded-md bg-brand px-2.5 text-xs font-semibold text-brand-foreground hover:bg-brand/90"
                      >
                        Submit candidate
                      </Link>
                    ) : (
                      <Link
                        to="/jobs/$jobId"
                        params={{ jobId: j.id }}
                        className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-2.5 text-xs font-semibold text-foreground hover:bg-surface-sunken"
                      >
                        {j.status === "pending" ? "View application" : "View details"}
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead>
                  <tr className="border-b border-border bg-surface-sunken">
                    {["Company", "Role", "Reward", "Salary", "Status", "Actions"].map((h) => (
                      <th key={h} className="label-caps px-4 py-2.5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((j) => (
                    <tr key={j.id} className="border-b border-border transition-colors last:border-0 hover:bg-surface-sunken">
                      <td className="px-4 py-3">
                        <Link
                          to="/jobs/$jobId"
                          params={{ jobId: j.id }}
                          className="flex min-w-0 items-center gap-3"
                        >
                          <CompanyMark short={j.companyShort} tone={j.logoTone} logoUrl={j.logoUrl} size="sm" />
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-semibold text-foreground">
                              {j.company}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {j.companySize} · {j.fundingStage}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to="/jobs/$jobId"
                          params={{ jobId: j.id }}
                          className="block max-w-[280px] truncate text-[13px] font-medium text-foreground hover:text-brand"
                        >
                          {j.title}
                        </Link>
                        <span className="block truncate text-xs text-muted-foreground">
                          {j.location} · {j.workModel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="num text-[13px] font-semibold text-foreground">{j.reward}</span>
                        <span className="block text-xs text-muted-foreground">{j.rewardPct}</span>
                      </td>
                      <td className="num px-4 py-3 text-[13px] text-foreground">{j.salary}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={clientStatusTone[j.status] || "neutral"} dot>
                          {j.status === "pending"
                            ? "Applied"
                            : j.status === "approved"
                              ? "Approved"
                              : statusLabel[j.status] || "Approved"}
                        </StatusBadge>
                        {j.status === "rejected" && j.rejectedOn ? (
                          <span className="block text-xs text-muted-foreground">Rejected {j.rejectedOn}</span>
                        ) : null}
                        {j.status === "pending" && j.appliedOn ? (
                          <span className="block text-xs text-muted-foreground">Applied {j.appliedOn}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {j.status === "approved" ? (
                            <Link
                              to="/jobs/$jobId/submit"
                              params={{ jobId: j.id }}
                              className="inline-flex h-8 items-center rounded-md bg-brand px-2.5 text-xs font-semibold text-brand-foreground hover:bg-brand/90"
                            >
                              Submit candidate
                            </Link>
                          ) : (
                            <Link
                              to="/jobs/$jobId"
                              params={{ jobId: j.id }}
                              className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-2.5 text-xs font-semibold text-foreground hover:bg-surface-sunken"
                            >
                              {j.status === "pending" ? "View application" : "View details"}
                            </Link>
                          )}
                          <ActionMenu job={j} onUnassigned={loadData} onWithdrawn={loadData} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
