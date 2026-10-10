import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Send } from "lucide-react";
import { AmPageHeader, AmShell } from "@/components/am/am-shell";
import { useAm } from "@/components/am/am-store";
import { Btn, Segmented, textareaCls } from "@/components/am/am-ui";
import { StatusBadge } from "@/components/app/status-badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/am/messages")({
  head: () => ({
    meta: [
      { title: "Messages — Account Manager | Yuvro" },
      {
        name: "description",
        content:
          "One inbox for company, recruiter and candidate conversations, each anchored to the job it belongs to with unread and urgent flags.",
      },
      { property: "og:title", content: "Messages — Account Manager | Yuvro" },
      {
        property: "og:description",
        content: "Company, recruiter and candidate threads in job context.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AmMessagesPage,
});

function AmMessagesPage() {
  const am = useAm();
  const navigate = useNavigate();
  const [kind, setKind] = useState("all");
  const [activeId, setActiveId] = useState(am.state.threads[0]?.id ?? "");
  const [body, setBody] = useState("");

  const threads = am.state.threads.filter((t) => (kind === "all" ? true : t.kind === kind));
  const active = am.state.threads.find((t) => t.id === activeId) ?? threads[0];
  const job = active ? am.job(active.jobId) : undefined;

  return (
    <AmShell>
      <AmPageHeader
        title="Messages"
        description="Every conversation keeps its job context, so you always know which role and candidate is being discussed."
      >
        <Segmented
          options={[
            { id: "all", label: "All", count: am.state.threads.length },
            {
              id: "company",
              label: "Companies",
              count: am.state.threads.filter((t) => t.kind === "company").length,
            },
            {
              id: "recruiter",
              label: "Recruiters",
              count: am.state.threads.filter((t) => t.kind === "recruiter").length,
            },
            {
              id: "candidate",
              label: "Candidates",
              count: am.state.threads.filter((t) => t.kind === "candidate").length,
            },
          ]}
          value={kind}
          onChange={setKind}
        />
      </AmPageHeader>

      <div className="grid bg-surface lg:grid-cols-[320px_minmax(0,1fr)]">
        <ul className="scroll-slim divide-y divide-border border-b border-border lg:max-h-[calc(100vh-13rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
          {threads.map((t) => {
            const j = am.job(t.jobId);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(t.id);
                    am.markThreadRead(t.id);
                  }}
                  className={cn(
                    "block w-full px-4 py-3 text-left transition-colors hover:bg-surface-sunken",
                    active?.id === t.id && "bg-surface-sunken",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-medium text-foreground">
                      {t.participant}
                    </span>
                    {t.unread ? (
                      <span className="num rounded bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-brand-foreground">
                        {t.unread}
                      </span>
                    ) : null}
                  </div>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {t.participantTitle} · {j?.title ?? t.jobId}
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                    {t.messages[t.messages.length - 1]?.body}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex min-h-[460px] flex-col">
          {active ? (
            <>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-foreground">
                    {active.participant} ·{" "}
                    <span className="font-normal text-muted-foreground">
                      {active.participantTitle}
                    </span>
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {job?.title} · {am.companyOfJob(active.jobId).name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {active.urgent ? (
                    <StatusBadge tone="danger" dot>
                      Urgent
                    </StatusBadge>
                  ) : null}
                  <Btn
                    size="sm"
                    onClick={() =>
                      navigate({
                        to: "/am/jobs/$jobId",
                        params: { jobId: active.jobId },
                        search: { tab: "overview" },
                      })
                    }
                  >
                    Open job <ArrowRight className="size-3.5" />
                  </Btn>
                </div>
              </header>

              <ul className="scroll-slim flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
                {active.messages.map((m) => (
                  <li
                    key={m.id}
                    className={cn(
                      "max-w-[600px] rounded-md border px-3 py-2",
                      m.role === "Account Manager"
                        ? "ml-auto border-brand/25 bg-brand-soft/60"
                        : "border-border bg-surface-sunken/60",
                    )}
                  >
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {m.from} · {m.role} · {m.at}
                    </p>
                    <p className="mt-1 text-[13px] leading-6 text-foreground">{m.body}</p>
                  </li>
                ))}
              </ul>

              <form
                className="flex items-end gap-2 border-t border-border px-4 py-3 sm:px-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!body.trim()) return;
                  am.sendMessage(active.id, body.trim());
                  setBody("");
                }}
              >
                <textarea
                  rows={2}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={`Message ${active.participant}`}
                  className={`${textareaCls} min-h-[44px]`}
                />
                <Btn type="submit" variant="primary">
                  <Send className="size-4" /> Send
                </Btn>
              </form>
            </>
          ) : (
            <p className="px-4 py-10 text-center text-[13px] text-muted-foreground sm:px-6">
              No conversations yet.
            </p>
          )}
        </div>
      </div>
    </AmShell>
  );
}
