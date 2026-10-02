import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  Check,
  CircleAlert,
  CircleCheck,
  ExternalLink,
} from "lucide-react";
import { Panel, PanelHeader, SectionLabel } from "@/components/app/primitives";
import { StatusBadge } from "@/components/app/status-badge";
import { ActivityItem } from "@/components/app/activity-item";
import { activityForJob, candidatesForJob, getJob, type Job } from "@/lib/data";
import { fetchRecruiterJobById } from "@/lib/recruiter-jobs";

export const Route = createFileRoute("/jobs/$jobId/")({
  loader: ({ params }) => {
    const job = getJob(params.jobId);
    return { job: job || null, jobId: params.jobId };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.job) {
      return { meta: [{ title: "Job Details — Yuvro Marketplace" }] };
    }
    const { job } = loaderData;
    const title = `${job.title} at ${job.company} — ${job.reward} recruiter reward`;
    const description = `${job.company} (${job.fundingStage}, ${job.companySize}) is hiring ${job.openings} ${job.title}. Salary ${job.salary}. Recruiter reward ${job.reward} (${job.rewardPct}).`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: JobDetailsTab,
});

function FlagList({
  items,
  tone,
  label,
}: {
  items: string[];
  tone: "green" | "red";
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const shown = open ? items : items.slice(0, 3);
  if (items.length === 0) return null;
  return (
    <div className="px-4 py-3">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
        {tone === "green" ? (
          <CircleCheck className="size-3.5 text-success" />
        ) : (
          <CircleAlert className="size-3.5 text-destructive" />
        )}
        {label}
      </p>
      <ul className="mt-2 space-y-1.5">
        {shown.map((f) => (
          <li
            key={f}
            className={
              tone === "green"
                ? "rounded-md bg-success-soft px-2.5 py-1.5 text-[13px] leading-5 text-foreground"
                : "rounded-md bg-danger-soft px-2.5 py-1.5 text-[13px] leading-5 text-foreground"
            }
          >
            {f}
          </li>
        ))}
      </ul>
      {items.length > 3 ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-2 text-xs font-semibold text-brand hover:underline"
        >
          {open ? `Show fewer ${label.toLowerCase()}` : `Show all ${label.toLowerCase()}`}
        </button>
      ) : null}
    </div>
  );
}

function JobDetailsTab() {
  const loaderData = Route.useLoaderData();
  const { jobId } = Route.useParams();
  const [job, setJob] = useState<Job | null>(loaderData?.job || getJob(jobId) || null);

  useEffect(() => {
    let active = true;
    if (jobId) {
      fetchRecruiterJobById(jobId).then((fetched) => {
        if (active && fetched) setJob(fetched);
      });
    }
    return () => {
      active = false;
    };
  }, [jobId]);

  if (!job) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Loading job details…
      </div>
    );
  }

  const pipeline = candidatesForJob(job.id);
  const log = activityForJob(job.id);
  const responsibilities = job.about?.find((s) => s.heading.toLowerCase().startsWith("responsib"));
  const narrative = (job.about || []).filter((s) => s !== responsibilities);

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0 space-y-5">
        <Panel>
          <PanelHeader title={`About ${job.company}`} />
          <div className="px-4 py-3">
            <p className="text-[13px] leading-6 text-muted-foreground">
              {job.about?.find((s) => s.heading.toLowerCase().includes("company"))?.body ?? job.repeatFounders}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { label: "Size", value: job.companySize },
                { label: "Stage", value: job.fundingStage },
                { label: "Founded", value: job.founded },
              ].map((b) => (
                <div key={b.label} className="rounded-md border border-border px-2 py-1.5">
                  <p className="label-caps">{b.label}</p>
                  <p className="num mt-0.5 truncate text-[12px] font-semibold text-foreground">{b.value}</p>
                </div>
              ))}
            </div>
            {job.website ? (
              <a
                href={job.website.startsWith("http") ? job.website : `https://${job.website}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 transition-colors hover:bg-surface-sunken"
              >
                <span className="min-w-0">
                  <span className="label-caps block">Website</span>
                  <span className="block truncate text-[13px] font-semibold text-brand">{job.website}</span>
                </span>
                <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
              </a>
            ) : null}
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              {job.fundingAmount} {job.investors?.length ? `· ${job.investors.join(", ")}` : ""}
            </p>
            <Link
              to="/jobs/$jobId/pipeline"
              params={{ jobId: job.id }}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
            >
              View candidate pipeline <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="About this role" meta={`${job.company} · posted ${job.posted}`} />
          <div className="max-h-[520px] space-y-5 overflow-y-auto px-4 py-4">
            {narrative.map((s) => (
              <div key={s.heading}>
                <SectionLabel>{s.heading}</SectionLabel>
                <p className="mt-1.5 max-w-[78ch] text-[13.5px] leading-6 text-muted-foreground">{s.body}</p>
              </div>
            ))}

            {responsibilities ? (
              <div>
                <SectionLabel>What you&apos;ll own</SectionLabel>
                <ol className="mt-2 space-y-2">
                  {responsibilities.body
                    .split(". ")
                    .map((x) => x.replace(/\.$/, "").trim())
                    .filter(Boolean)
                    .map((item, i) => (
                      <li
                        key={item}
                        className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-md bg-surface-sunken px-3 py-2.5"
                      >
                        <span className="num text-[11px] font-semibold text-muted-foreground">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="text-[13.5px] leading-6 text-foreground">{item}</span>
                      </li>
                    ))}
                </ol>
              </div>
            ) : null}
          </div>
        </Panel>

        {job.questions && job.questions.length ? (
          <Panel>
            <PanelHeader
              title="Required candidate Q&A"
              meta="Answer these before submitting a candidate"
              actions={
                <StatusBadge tone="warning">
                  {job.questions.filter((q) => q.required).length} required
                </StatusBadge>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <thead>
                  <tr className="border-b border-border bg-surface-sunken">
                    {["Question", "Requirement", "Response type"].map((h) => (
                      <th key={h} className="label-caps px-4 py-2.5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {job.questions.map((q) => (
                    <tr key={q.q} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 text-[13px] text-foreground">{q.q}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge tone={q.required ? "warning" : "neutral"}>
                          {q.required ? "Required" : "Optional"}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{q.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        ) : null}
      </div>

      <aside className="min-w-0 space-y-5">
        {job.requirements && job.requirements.length ? (
          <Panel>
            <PanelHeader
              title="Requirements"
              meta={`${job.requirements.length} criteria`}
              actions={<StatusBadge tone="neutral">{job.experience}</StatusBadge>}
            />
            <div className="grid gap-2 p-4">
              {job.requirements.map((r) => (
                <div
                  key={r}
                  className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5 rounded-md border border-border px-3 py-2.5"
                >
                  <Check className="mt-0.5 size-3.5 shrink-0 text-brand" />
                  <span className="text-[13px] leading-5 text-foreground">{r}</span>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        {job.targetCompanies && job.targetCompanies.length > 0 ? (
          <Panel>
            <PanelHeader
              title="Target companies"
              meta="Ideal companies to source candidates from"
              actions={<Building2 className="size-4 text-muted-foreground" />}
            />
            <div className="p-4">
              <div className="flex flex-wrap gap-1.5">
                {job.targetCompanies.map((co) => (
                  <span
                    key={co}
                    className="rounded-md border border-border bg-surface-sunken px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {co}
                  </span>
                ))}
              </div>
            </div>
          </Panel>
        ) : null}

        {(job.greenFlags && job.greenFlags.length > 0) || (job.redFlags && job.redFlags.length > 0) ? (
          <Panel>
            <PanelHeader title="Candidate signals" meta="What the client screens for" />
            <div className="divide-y divide-border">
              <FlagList items={job.greenFlags || []} tone="green" label="Green flags" />
              <FlagList items={job.redFlags || []} tone="red" label="Red flags" />
            </div>
          </Panel>
        ) : null}

        {job.benefits && job.benefits.length ? (
          <Panel>
            <PanelHeader title="Benefits & perks" meta={`${job.benefits.length} groups`} />
            <div className="grid gap-2 p-4">
              {job.benefits.map((b) => (
                <div key={b.group} className="rounded-md bg-surface-sunken px-3 py-2.5">
                  <p className="text-[13px] font-semibold text-foreground">{b.group}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{b.items.join(" · ")}</p>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        {log && log.length ? (
          <Panel>
            <PanelHeader
              title="Job activity"
              meta={`${pipeline.length} candidates on this role`}
              actions={<CalendarClock className="size-4 text-muted-foreground" />}
            />
            <ul>
              {log.map((a) => (
                <ActivityItem key={a.id} item={a} />
              ))}
            </ul>
          </Panel>
        ) : null}
      </aside>
    </div>
  );
}
