import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AmPageHeader, AmShell } from "@/components/am/am-shell";
import { useAm } from "@/components/am/am-store";
import {
  BulletList,
  Btn,
  DefinitionGrid,
  JobStatusPill,
  Kpi,
  KpiGrid,
  StagePill,
  SubmissionStatusPill,
  TableShell,
  Tabs,
  TD,
  TH,
  THead,
  TR,
  TimelineList,
} from "@/components/am/am-ui";
import { StatusBadge } from "@/components/app/status-badge";
import { money, moneyExact, salaryRange, type AmCompany } from "@/lib/am-data";
import { api } from "@/lib/api";

export const Route = createFileRoute("/am/companies/$companyId")({
  head: () => ({
    meta: [
      { title: "Company 360 — Account Manager | Yuvro" },
      {
        name: "description",
        content:
          "Company workspace for Account Managers: jobs, candidate pipeline, contacts and logins, hiring history, spend and full activity trail.",
      },
      { property: "og:title", content: "Company 360 — Account Manager | Yuvro" },
      { property: "og:description", content: "One company account, every job, contact and hire." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AmCompanyPage,
});

function AmCompanyPage() {
  const { companyId } = Route.useParams();
  const am = useAm();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");

  const target = (companyId || "").trim().toLowerCase();
  const company = am.state.companies.find(
    (c) =>
      c.id.toLowerCase() === target ||
      (c.slug && c.slug.toLowerCase() === target) ||
      c.name.toLowerCase() === target ||
      c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === target,
  );

  useEffect(() => {
    if (companyId) {
      am.refreshCompanies();
    }
  }, [companyId]);

  if (!company) {
    return (
      <AmShell>
        <AmPageHeader
          title="Company not found"
          description="This account is no longer on the marketplace."
        />
        <div className="px-4 py-6 sm:px-6">
          <Btn onClick={() => navigate({ to: "/am/companies" })}>Back to companies</Btn>
        </div>
      </AmShell>
    );
  }

  const jobs = am.state.jobs.filter(
    (j) =>
      j.companyId === company.id ||
      (company.slug && j.companyId === company.slug) ||
      (company.name && j.companyId === company.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")),
  );
  const ids = jobs.map((j) => j.id);
  const subs = am.state.submissions.filter((s) => ids.includes(s.jobId));
  const threads = am.state.threads.filter(
    (t) => t.companyId === company.id || (company.slug && t.companyId === company.slug),
  );
  const activity = am.state.activity.filter(
    (a) =>
      a.companyId === company.id ||
      (company.slug && a.companyId === company.slug) ||
      (a.jobId && ids.includes(a.jobId)),
  );
  const hires = subs.filter((s) => s.stage === "hired");

  return (
    <AmShell>
      <AmPageHeader
        breadcrumb={
          <span>
            <Link to="/am/companies" className="hover:text-foreground hover:underline">
              Companies
            </Link>{" "}
            / {company.name}
          </span>
        }
        title={company.name}
        description={`${company.industry} · ${company.size} · ${company.fundingStage} (${company.funding}) · founded ${company.founded} · ${company.hq}`}
        actions={
          <>
            <Btn onClick={() => navigate({ to: "/am/messages" })}>Message company</Btn>
            <Btn
              variant="primary"
              onClick={() =>
                navigate({
                  to: "/am/jobs/new",
                  search: { companyId: company.id, company: company.slug || company.id },
                })
              }
            >
              Create job
            </Btn>
          </>
        }
      >
        <Tabs
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "jobs", label: "Jobs", count: jobs.length },
            { id: "pipeline", label: "Pipeline", count: subs.length },
            { id: "contacts", label: "Contacts", count: company.contacts.length },
            { id: "history", label: "Hiring history", count: hires.length },
            { id: "activity", label: "Activity" },
          ]}
          active={tab}
          onSelect={setTab}
        />
      </AmPageHeader>

      <KpiGrid>
        <Kpi
          label="Jobs"
          value={jobs.length}
          hint={`${jobs.filter((j) => j.status === "hiring").length} hiring now`}
        />
        <Kpi
          label="Awaiting AM review"
          value={subs.filter((s) => s.status === "am_review").length}
          tone="warning"
          hint="Before company sees them"
        />
        <Kpi
          label="In company process"
          value={
            subs.filter((s) => ["company_review", "interview", "final", "offer"].includes(s.stage))
              .length
          }
          hint="Live candidates"
        />
        <Kpi label="Hires" value={hires.length} tone="success" hint="All time" />
        <Kpi
          label="Total paid"
          value={money(company.totalPaid)}
          hint={`Saved ${money(company.totalSaved)} vs agency fees`}
        />
      </KpiGrid>

      {tab === "overview" ? (
        <div className="grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <section className="border-b border-border bg-surface px-4 py-5 sm:px-6 lg:border-b-0 lg:border-r">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={`${company.name} logo`}
                loading="lazy"
                className="mb-4 h-10 w-auto max-w-[160px] object-contain"
              />
            ) : null}
            <h2 className="text-[13px] font-semibold tracking-tight text-foreground">About</h2>
            <p className="mt-2 max-w-3xl text-[13px] leading-6 text-muted-foreground">
              {company.overview}
            </p>

            <h3 className="mt-5 text-[13px] font-semibold tracking-tight text-foreground">
              Why candidates join
            </h3>
            <p className="mt-1.5 max-w-3xl text-[13px] leading-6 text-muted-foreground">
              {company.whyCompany}
            </p>
            <h3 className="mt-4 text-[13px] font-semibold tracking-tight text-foreground">
              Why these roles matter
            </h3>
            <p className="mt-1.5 max-w-3xl text-[13px] leading-6 text-muted-foreground">
              {company.whyRole}
            </p>

            {company.highlights?.length ? (
              <>
                <h3 className="mt-5 text-[13px] font-semibold tracking-tight text-foreground">
                  Why {company.name}?
                </h3>
                <ul className="mt-2 divide-y divide-border border-y border-border">
                  {company.highlights.map((h) => (
                    <li key={h.title} className="grid gap-0.5 py-2.5">
                      <span className="text-[13px] font-medium text-foreground">{h.title}</span>
                      {h.description ? (
                        <span className="text-[12px] leading-5 text-muted-foreground">
                          {h.description}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {company.leaders?.length ? (
              <>
                <h3 className="mt-5 text-[13px] font-semibold tracking-tight text-foreground">
                  Leadership
                </h3>
                <ul className="mt-2 divide-y divide-border border-y border-border">
                  {company.leaders.map((l) => (
                    <li key={l.name} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-foreground">
                          {l.name}
                          {l.title ? ` · ${l.title}` : ""}
                        </span>
                        {l.linkedin ? (
                          <a
                            href={l.linkedin}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                          >
                            {l.linkedin}
                          </a>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            <h3 className="mt-5 text-[13px] font-semibold tracking-tight text-foreground">
              Founders
            </h3>
            <ul className="mt-2 divide-y divide-border border-y border-border">
              {company.founders.map((f) => (
                <li key={f.name} className="grid gap-0.5 py-2.5">
                  <span className="text-[13px] font-medium text-foreground">
                    {f.name} · {f.title}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{f.prior}</span>
                </li>
              ))}
            </ul>

            <h3 className="mt-5 text-[13px] font-semibold tracking-tight text-foreground">
              Investors
            </h3>
            <div className="mt-2">
              <BulletList items={company.investors} />
            </div>
          </section>

          <aside className="bg-surface px-4 py-5 sm:px-6">
            <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
              Account facts
            </h2>
            <div className="mt-2">
              <DefinitionGrid
                items={[
                  { label: "Website", value: company.website },
                  { label: "Industry", value: company.industry },
                  { label: "Size", value: company.size },
                  { label: "Funding", value: `${company.fundingStage} · ${company.funding}` },
                  { label: "Founded", value: company.founded },
                  { label: "HQ", value: company.hq },
                  { label: "Total hires", value: company.totalHires },
                  { label: "Total paid", value: moneyExact(company.totalPaid) },
                ]}
              />
            </div>

            <h2 className="mt-6 text-[13px] font-semibold tracking-tight text-foreground">
              Open conversations
            </h2>
            <ul className="mt-2 divide-y divide-border border-y border-border">
              {threads.length === 0 ? (
                <li className="py-3 text-[13px] text-muted-foreground">No active threads.</li>
              ) : null}
              {threads.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-foreground">
                      {t.participant}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {t.participantTitle}
                    </span>
                  </span>
                  <Btn
                    size="sm"
                    onClick={() =>
                      navigate({
                        to: "/am/jobs/$jobId",
                        params: { jobId: am.job(t.jobId)?.slug || t.jobId },
                        search: { tab: "messages" },
                      })
                    }
                  >
                    Open
                  </Btn>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      ) : null}

      {tab === "jobs" ? (
        <TableShell className="bg-surface">
          <THead>
            <TH>Job</TH>
            <TH>Status</TH>
            <TH>Location</TH>
            <TH align="right">Openings</TH>
            <TH align="right">Salary</TH>
            <TH align="right">Bounty</TH>
            <TH align="right">Submissions</TH>
            <TH align="right">In process</TH>
            <TH>Deadline</TH>
          </THead>
          <tbody>
            {jobs.map((j) => {
              const st = am.jobStats(j.id);
              return (
                <TR
                  key={j.id}
                  onClick={() =>
                    navigate({
                      to: "/am/jobs/$jobId",
                      params: { jobId: j.slug || j.id },
                      search: { tab: "overview" },
                    })
                  }
                >
                  <TD>
                    <span className="block truncate font-medium">{j.title}</span>
                    <span className="num block text-[11px] text-muted-foreground">
                      {j.employmentType} · {j.openings} opening{j.openings > 1 ? "s" : ""}
                    </span>
                  </TD>
                  <TD>
                    <JobStatusPill status={j.status} />
                  </TD>
                  <TD>
                    {j.location} · {j.workModel}
                  </TD>
                  <TD align="right" mono>
                    {j.openings}
                  </TD>
                  <TD align="right" mono>
                    {salaryRange(j)}
                  </TD>
                  <TD align="right" mono>
                    {money(j.bountyMin)}–{money(j.bountyMax)}
                  </TD>
                  <TD align="right" mono>
                    {st.submissions}
                  </TD>
                  <TD align="right" mono>
                    {st.activeCandidates}
                  </TD>
                  <TD>{j.deadline}</TD>
                </TR>
              );
            })}
          </tbody>
        </TableShell>
      ) : null}

      {tab === "pipeline" ? (
        <TableShell className="bg-surface">
          <THead>
            <TH>Candidate</TH>
            <TH>Job</TH>
            <TH>Recruiter</TH>
            <TH align="right">Match</TH>
            <TH>Status</TH>
            <TH>Stage</TH>
            <TH>Last activity</TH>
          </THead>
          <tbody>
            {subs.map((s) => (
              <TR
                key={s.id}
                onClick={() =>
                  navigate({
                    to: "/am/jobs/$jobId",
                    params: { jobId: am.job(s.jobId)?.slug || s.jobId },
                    search: { tab: "candidates", focus: s.candidateId },
                  })
                }
              >
                <TD className="font-medium">
                  {am.candidate(s.candidateId)?.name ?? s.candidateId}
                </TD>
                <TD>{am.job(s.jobId)?.title ?? s.jobId}</TD>
                <TD>{am.recruiter(s.recruiterId)?.name ?? "Account Manager"}</TD>
                <TD align="right" mono>
                  {s.match}%
                </TD>
                <TD>
                  <SubmissionStatusPill status={s.status} />
                </TD>
                <TD>
                  <StagePill stage={s.stage} />
                </TD>
                <TD className="text-muted-foreground">{s.lastActivity}</TD>
              </TR>
            ))}
          </tbody>
        </TableShell>
      ) : null}

      {tab === "contacts" ? (
        <TableShell className="bg-surface">
          <THead>
            <TH>Name</TH>
            <TH>Title</TH>
            <TH>Role</TH>
            <TH>Email</TH>
            <TH>Phone</TH>
            <TH>Login</TH>
          </THead>
          <tbody>
            {company.contacts.map((c) => (
              <TR key={c.email}>
                <TD className="font-medium">{c.name}</TD>
                <TD>{c.title}</TD>
                <TD>{c.role}</TD>
                <TD>{c.email}</TD>
                <TD>{c.phone}</TD>
                <TD>
                  <StatusBadge
                    tone={
                      c.loginStatus === "active"
                        ? "success"
                        : c.loginStatus === "invited"
                          ? "warning"
                          : "neutral"
                    }
                    dot
                  >
                    {c.loginStatus}
                  </StatusBadge>
                </TD>
              </TR>
            ))}
          </tbody>
        </TableShell>
      ) : null}

      {tab === "history" ? (
        <TableShell className="bg-surface">
          <THead>
            <TH>Candidate</TH>
            <TH>Job</TH>
            <TH>Recruiter</TH>
            <TH>Hired</TH>
            <TH align="right">Bounty</TH>
            <TH>Payout</TH>
          </THead>
          <tbody>
            {hires.length === 0 ? (
              <TR>
                <TD className="py-8 text-center text-muted-foreground">No hires recorded yet.</TD>
              </TR>
            ) : null}
            {hires.map((s) => (
              <TR key={s.id}>
                <TD className="font-medium">
                  {am.candidate(s.candidateId)?.name ?? s.candidateId}
                </TD>
                <TD>{am.job(s.jobId)?.title ?? s.jobId}</TD>
                <TD>{am.recruiter(s.recruiterId)?.name ?? "Account Manager"}</TD>
                <TD>{s.hiredAt ?? "—"}</TD>
                <TD align="right" mono>
                  {s.bounty ? moneyExact(s.bounty) : "—"}
                </TD>
                <TD>
                  <StatusBadge tone={s.payoutStatus === "paid" ? "success" : "warning"} dot>
                    {s.payoutStatus ?? "pending"}
                  </StatusBadge>
                </TD>
              </TR>
            ))}
          </tbody>
        </TableShell>
      ) : null}

      {tab === "activity" ? (
        <div className="bg-surface px-4 py-5 sm:px-6">
          <TimelineList
            items={activity.map((a) => ({
              label: `${a.action} ${a.object}`,
              at: a.at,
              by: a.actor,
              ...(a.from && a.to ? { note: `${a.from} → ${a.to}` } : {}),
            }))}
          />
        </div>
      ) : null}
    </AmShell>
  );
}
