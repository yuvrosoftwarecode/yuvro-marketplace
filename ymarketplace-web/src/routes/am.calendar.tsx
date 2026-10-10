import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AmPageHeader, AmShell } from "@/components/am/am-shell";
import { useAm } from "@/components/am/am-store";
import { Btn, Segmented } from "@/components/am/am-ui";
import { StatusBadge } from "@/components/app/status-badge";

export const Route = createFileRoute("/am/calendar")({
  head: () => ({
    meta: [
      { title: "Interview Calendar — Account Manager | Yuvro" },
      {
        name: "description",
        content:
          "Every interview, company meeting, recruiter call and job deadline across managed accounts, grouped by day with full job context.",
      },
      { property: "og:title", content: "Interview Calendar — Account Manager | Yuvro" },
      {
        property: "og:description",
        content: "Interviews, meetings and deadlines across every managed job.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AmCalendarPage,
});

const types = [
  "All",
  "Interview",
  "Company meeting",
  "Recruiter call",
  "Follow-up",
  "Deadline",
] as const;

const tone = (t: string) =>
  t === "Interview"
    ? "brand"
    : t === "Deadline"
      ? "danger"
      : t === "Company meeting"
        ? "info"
        : "neutral";

function AmCalendarPage() {
  const { state, candidate, recruiter, job, companyOfJob } = useAm();
  const navigate = useNavigate();
  const [type, setType] = useState<string>("All");

  const events = state.events.filter((e) => type === "All" || e.type === type);
  const days = [...new Set(events.map((e) => e.date))];

  return (
    <AmShell>
      <AmPageHeader
        title="Calendar"
        description="Scheduled activity across every managed job. Each entry keeps its candidate, recruiter and company context."
      >
        <Segmented
          options={types.map((t) => ({
            id: t,
            label: t,
            count:
              t === "All" ? state.events.length : state.events.filter((e) => e.type === t).length,
          }))}
          value={type}
          onChange={setType}
        />
      </AmPageHeader>

      <div className="bg-surface">
        {days.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-muted-foreground sm:px-6">
            Nothing scheduled.
          </p>
        ) : null}
        {days.map((day) => (
          <section key={day}>
            <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-y border-border bg-surface-sunken/95 px-4 py-2 backdrop-blur sm:px-6">
              <h2 className="text-[13px] font-semibold tracking-tight text-foreground">{day}</h2>
              <span className="num text-[11px] text-muted-foreground">
                {events.filter((e) => e.date === day).length} entries
              </span>
            </header>
            <ul className="divide-y divide-border">
              {events
                .filter((e) => e.date === day)
                .map((e) => {
                  const j = job(e.jobId);
                  const cand = e.candidateId ? candidate(e.candidateId) : undefined;
                  const rec = e.recruiterId ? recruiter(e.recruiterId) : undefined;
                  return (
                    <li
                      key={e.id}
                      className="grid gap-2 px-4 py-3 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:items-center sm:px-6"
                    >
                      <span className="num text-[13px] font-semibold text-foreground">
                        {e.time}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[13px] font-medium text-foreground">
                            {cand ? `${cand.name} — ${e.title}` : e.title}
                          </p>
                          <StatusBadge tone={tone(e.type)} dot>
                            {e.stage ?? e.type}
                          </StatusBadge>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {j ? `${j.title} · ${companyOfJob(j.id).name}` : e.jobId}
                          {rec ? ` · recruiter ${rec.name}` : ""}
                        </p>
                      </div>
                      {j ? (
                        <Btn
                          size="sm"
                          className="justify-self-start sm:justify-self-end"
                          onClick={() =>
                            navigate({
                              to: "/am/jobs/$jobId",
                              params: { jobId: j.id },
                              search: { tab: "calendar" },
                            })
                          }
                        >
                          Open job <ArrowRight className="size-3.5" />
                        </Btn>
                      ) : null}
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
      </div>
    </AmShell>
  );
}
