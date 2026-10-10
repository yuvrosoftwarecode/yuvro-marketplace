import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, Send } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { EmptyState, PageHeader, Panel, PanelHeader } from "@/components/app/primitives";
import { StatusBadge } from "@/components/app/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { messages } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Client Messages — Recruiter Inbox" },
      {
        name: "description",
        content:
          "Client threads about candidate stages, interview scheduling and requirement changes in one inbox.",
      },
      { property: "og:title", content: "Client Messages — Recruiter Inbox" },
      {
        property: "og:description",
        content: "Client threads for scheduling, stage updates and requirement changes.",
      },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const [selected, setSelected] = useState(messages[0]?.id || "");
  const thread = messages.find((m) => m.id === selected);
  const [draft, setDraft] = useState("");

  return (
    <AppShell>
      <PageHeader
        title="Client messages"
        description="Threads are scoped to a client role so context stays intact."
      />
      {messages.length === 0 ? (
        <div className="p-4 sm:p-6">
          <Panel className="overflow-hidden">
            <EmptyState
              icon={<MessageSquare className="size-5" />}
              title="No client messages yet"
              description="Conversations regarding role criteria, candidate reviews and interview scheduling will appear here."
            />
          </Panel>
        </div>
      ) : (
        <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Panel className="overflow-hidden">
            <PanelHeader title="Inbox" meta={`${messages.filter((m) => m.unread).length} unread`} />
            <ul className="divide-y divide-border">
              {messages.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => setSelected(m.id)}
                    className={cn(
                      "w-full px-4 py-3 text-left transition-colors hover:bg-surface-sunken",
                      m.id === selected && "bg-surface-sunken",
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-[13px] font-semibold text-foreground">
                        {m.company}
                      </span>
                      <span className="num shrink-0 text-[11px] text-muted-foreground">{m.time}</span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{m.from}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {m.preview}
                    </p>
                    {m.unread ? (
                      <span className="mt-1.5 inline-block">
                        <StatusBadge tone="brand" dot>
                          Unread
                        </StatusBadge>
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          {thread ? (
            <Panel className="flex flex-col overflow-hidden">
              <PanelHeader title={`${thread.company} · ${thread.from}`} meta="Role thread" />
              <div className="flex-1 space-y-3 p-4">
                <div className="max-w-[70ch] rounded-md border border-border bg-surface-sunken p-3 text-[13px] leading-6 text-foreground">
                  {thread.preview}
                  <p className="num mt-2 text-[11px] text-muted-foreground">{thread.time}</p>
                </div>
              </div>
              <form
                className="border-t border-border p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.trim()) return;
                  toast.success("Message sent", { description: `${thread.company} — ${thread.from}` });
                  setDraft("");
                }}
              >
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  placeholder="Write a reply…"
                  className="resize-none text-[13px]"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-3.5 text-[13px] font-semibold text-brand-foreground hover:bg-brand/90"
                  >
                    <Send className="size-3.5" /> Send
                  </button>
                </div>
              </form>
            </Panel>
          ) : (
            <Panel className="flex items-center justify-center p-8">
              <p className="text-xs text-muted-foreground">Select a thread to view messages.</p>
            </Panel>
          )}
        </div>
      )}
    </AppShell>
  );
}
