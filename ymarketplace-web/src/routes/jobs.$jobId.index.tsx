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
import { MarkdownContent } from "@/components/common/markdown-content";

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
            {job.companyOverview || job.about?.find((s) => s.heading.toLowerCase().includes("company"))?.body || (job.repeatFounders && job.repeatFounders !== "—" ? job.repeatFounders : null) ? (
              <p className="text-[13px] leading-6 text-muted-foreground">
                {job.companyOverview || job.about?.find((s) => s.heading.toLowerCase().includes("company"))?.body || job.repeatFounders}
              </p>
            ) : null}
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
            {job.fundingAmount && job.fundingAmount !== "—" ? (
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {job.fundingAmount} {job.investors?.length ? `· ${job.investors.join(", ")}` : ""}
              </p>
            ) : null}

            {job.whyCompany && job.whyCompany.length > 0 ? (
              <div className="mt-4 border-t border-border pt-3">
                <p className="label-caps text-foreground">Why {job.company}</p>
                <div className="mt-2 space-y-2">
                  {job.whyCompany.map((item, idx) => (
                    <div key={idx} className="rounded-md bg-surface-sunken/60 p-2.5">
                      {item.title ? (
                        <p className="text-[13px] font-medium text-foreground">{item.title}</p>
                      ) : null}
                      {item.description ? (
                        <p className="mt-0.5 text-[12.5px] leading-5 text-muted-foreground">{item.description}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {job.whyRole ? (
              <div className="mt-3 border-t border-border/60 pt-2.5">
                <p className="label-caps text-foreground">Why this role matters</p>
                <p className="mt-1 text-[12.5px] leading-5 text-muted-foreground">{job.whyRole}</p>
              </div>
            ) : null}

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
          <div className="max-h-[560px] overflow-y-auto px-4 py-4">
            <MarkdownContent
              content={
                job.jobDescription ||
                (job.about && job.about.length > 0
                  ? job.about
                      .map((s) => (s.heading && !s.heading.toLowerCase().includes("overview") ? `### ${s.heading}\n\n${s.body}` : s.body))
                      .join("\n\n")
                  : "")
              }
            />
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
        {((job.mustHaves && job.mustHaves.length > 0) || (job.requirements && job.requirements.length > 0)) ? (
          (() => {
            const list = (job.mustHaves && job.mustHaves.length > 0 ? job.mustHaves : job.requirements) || [];
            return (
              <Panel>
                <PanelHeader
                  title="Must-haves"
                  meta={`${list.length} criteria`}
                  actions={<StatusBadge tone="neutral">{job.experience}</StatusBadge>}
                />
                <div className="grid gap-2 p-4">
                  {list.map((r) => (
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
            );
          })()
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
              {job.benefits.map((b) => {
                const items = (b.items || [])
                  .flatMap((it) => {
                    const s = String(it ?? "").trim();
                    if (s.includes("\n")) return s.split("\n");
                    if (s.includes(" · ")) return s.split(" · ");
                    if (s.includes("•")) return s.split("•");
                    if (s.includes(";")) return s.split(";");
                    return [s];
                  })
                  .map((x) => x.trim().replace(/^[-*•]\s*/, ""))
                  .filter(Boolean);

                return (
                  <div key={b.group} className="rounded-md bg-surface-sunken px-3 py-2.5">
                    <p className="text-[13px] font-semibold text-foreground">{b.group}</p>
                    <ul className="mt-2 space-y-1.5">
                      {items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
                          <span className="min-w-0 flex-1">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
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
