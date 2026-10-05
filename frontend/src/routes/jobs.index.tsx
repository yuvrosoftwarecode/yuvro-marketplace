import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck, Briefcase, MapPin, Users } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import {
  CompanyMark,
  EmptyState,
  FilterBar,
  FilterChip,
  PageHeader,
  Panel,
  SearchBar,
} from "@/components/app/primitives";
import { jobs as fallbackJobs, type Job } from "@/lib/data";
import { fetchRecruiterJobs } from "@/lib/recruiter-jobs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/jobs/")({
  head: () => ({
    meta: [
      { title: "Browse Marketplace Jobs — Bounties, Salary & Requirements" },
      {
        name: "description",
        content:
          "Search marketplace roles by salary, recruiter reward, work model, funding stage and experience level, then request client access.",
      },
      { property: "og:title", content: "Browse Marketplace Jobs — Bounties, Salary & Requirements" },
      {
        property: "og:description",
        content: "Filter live recruiter roles by reward, salary, location, funding stage and experience.",
      },
    ],
  }),
  component: BrowseJobsPage,
});

function BrowseJobsPage() {
  const [jobList, setJobList] = useState<Job[]>(fallbackJobs);
  const [query, setQuery] = useState("");
  const [model, setModel] = useState("Any work model");
  const [stage, setStage] = useState("Any funding stage");
  const [exp, setExp] = useState("Any experience");
  const [saved, setSaved] = useState<string[]>(fallbackJobs.filter((j) => j.saved).map((j) => j.id));
  const [view, setView] = useState<"rows" | "cards">("rows");

  useEffect(() => {
    let active = true;
    fetchRecruiterJobs().then((data) => {
      if (active && data && data.length > 0) {
        setJobList(data);
        setSaved(data.filter((j) => j.saved).map((j) => j.id));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const openJobs = useMemo(
    () =>
      jobList.filter(
        (j) =>
          (!j.status || j.status === "not_applied") &&
          String(j.rawStatus || "").toLowerCase() !== "draft",
      ),
    [jobList],
  );

  const results = useMemo(
    () =>
      openJobs.filter((j) => {
        const q = (j.company + j.title + j.location).toLowerCase().includes(query.toLowerCase());
        const m = model === "Any work model" || j.workModel === model;
        const s = stage === "Any funding stage" || j.fundingStage === stage;
        const e = exp === "Any experience" || j.experience === exp;
        return q && m && s && e;
      }),
    [openJobs, query, model, stage, exp],
  );

  const toggleSave = (id: string) =>
    setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <AppShell>
      <PageHeader
        title="Browse jobs"
        description="Marketplace roles open to recruiters. Rewards, salary bands and requirement sets are published by the client."
        actions={
          <div className="inline-flex rounded-md border border-border p-0.5">
            {(["rows", "cards"] as const).map((v) => (
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
        <div className="flex flex-col gap-3">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search job title, company or location"
            className="max-w-xl"
          />
          <FilterBar
            onReset={() => {
              setModel("Any work model");
              setStage("Any funding stage");
              setExp("Any experience");
            }}
          >
            <FilterChip label="Model" value={model} options={["Any work model", "Remote", "Hybrid", "On-site"]} onChange={setModel} />
            <FilterChip
              label="Funding"
              value={stage}
              options={["Any funding stage", "Series A", "Series B", "Series C", "Series D"]}
              onChange={setStage}
            />
            <FilterChip
              label="Experience"
              value={exp}
              options={["Any experience", "4+ years", "5+ years", "6+ years", "7+ years", "8+ years"]}
              onChange={setExp}
            />
          </FilterBar>
        </div>
      </PageHeader>

      <div className="p-4 sm:p-6">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            <span className="num font-semibold text-foreground">{results.length}</span> roles ·{" "}
            <span className="num font-semibold text-foreground">{saved.length}</span> saved
          </p>
          <p className="text-xs text-muted-foreground">Sorted by posted date</p>
        </div>

        <Panel className="overflow-hidden">
          {results.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="size-5" />}
              title="No roles match these filters"
              description="Widen the work model or funding stage filters to see more marketplace roles."
            />
          ) : view === "rows" ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-surface-sunken">
                    {["Company / Role", "Location", "Salary", "Reward", "Employment type", "Openings", ""].map(
                      (h) => (
                        <th key={h} className="label-caps px-4 py-2.5 font-semibold">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody>
                  {results.map((j) => (
                    <tr key={j.id} className="border-b border-border transition-colors last:border-0 hover:bg-surface-sunken">
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <CompanyMark short={j.companyShort} tone={j.logoTone} logoUrl={j.logoUrl} />
                          <div className="min-w-0">
                            <Link
                              to="/jobs/$jobId"
                              params={{ jobId: j.id }}
                              className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-foreground hover:text-brand"
                            >
                              <span className="truncate">{j.title}</span>
                              {j.status === "approved" ? (
                                <span
                                  title="Live"
                                  aria-label="Live"
                                  className="size-1.5 shrink-0 rounded-full bg-success"
                                />
                              ) : null}
                            </Link>
                            <p className="truncate text-xs text-muted-foreground">
                              {j.company}
                              {j.formerly ? ` (formerly ${j.formerly})` : ""} · {j.companySize} · {j.fundingStage}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-foreground">
                        <span className="block truncate">{j.location}</span>
                        <span className="text-xs text-muted-foreground">{j.workModel}</span>
                      </td>
                      <td className="num px-4 py-3 text-[13px] text-foreground">{j.salary}</td>
                      <td className="px-4 py-3">
                        <span className="num text-[13px] font-semibold text-foreground">{j.reward}</span>
                        <span className="block text-xs text-muted-foreground">{j.rewardPct}</span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-foreground">{j.employmentType}</td>
                      <td className="num px-4 py-3 text-[13px] text-foreground">{j.openings}</td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleSave(j.id)}
                            aria-label={saved.includes(j.id) ? "Remove saved job" : "Save job"}
                            className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                          >
                            {saved.includes(j.id) ? (
                              <BookmarkCheck className="size-4 text-brand" />
                            ) : (
                              <Bookmark className="size-4" />
                            )}
                          </button>
                          <Link
                            to="/jobs/$jobId"
                            params={{ jobId: j.id }}
                            className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-sunken"
                          >
                            {j.status === "approved" ? "Open" : "View details"}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
              {results.map((j) => (
                <article key={j.id} className="flex flex-col bg-surface p-4">
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
                    <CompanyMark short={j.companyShort} tone={j.logoTone} logoUrl={j.logoUrl} />
                    <div className="min-w-0">
                      <Link
                        to="/jobs/$jobId"
                        params={{ jobId: j.id }}
                        className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-foreground hover:text-brand"
                      >
                        <span className="truncate">{j.title}</span>
                        {j.status === "approved" ? (
                          <span title="Live" aria-label="Live" className="size-1.5 shrink-0 rounded-full bg-success" />
                        ) : null}
                      </Link>

                      <p className="truncate text-xs text-muted-foreground">
                        {j.company} · {j.fundingStage}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSave(j.id)}
                      aria-label="Save job"
                      className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-surface-sunken"
                    >
                      {saved.includes(j.id) ? (
                        <BookmarkCheck className="size-4 text-brand" />
                      ) : (
                        <Bookmark className="size-4" />
                      )}
                    </button>
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
                      <dt className="text-muted-foreground">Employment type</dt>
                      <dd className="font-medium text-foreground">{j.employmentType}</dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" /> {j.location}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3" /> {j.openings} openings
                    </span>
                    <span>Posted {j.posted}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-3">
                    <Link
                      to="/jobs/$jobId"
                      params={{ jobId: j.id }}
                      className="inline-flex h-8 items-center rounded-md bg-brand px-3 text-xs font-semibold text-brand-foreground hover:bg-brand/90"
                    >
                      {j.status === "approved" ? "Open job" : "Request access"}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
