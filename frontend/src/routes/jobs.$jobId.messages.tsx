import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { EmptyState, Panel, PanelHeader } from "@/components/app/primitives";
import { messages } from "@/lib/data";

export const Route = createFileRoute("/jobs/$jobId/messages")({
  head: () => ({
    meta: [
      { title: "Messages — job workspace" },
      { name: "description", content: "Client conversation for the selected role." },
      { property: "og:title", content: "Messages — job workspace" },
      { property: "og:description", content: "Client conversation for the selected role." },
    ],
  }),
  component: MessagesTab,
});

function MessagesTab() {
  const { jobId } = Route.useParams();
  const thread = messages.filter((m) => m.jobId === jobId);

  return (
    <div className="p-4 sm:p-6">
      <Panel>
        <PanelHeader
          title="Client messages"
          meta={`${thread.length} on this role`}
          actions={
            <Link to="/messages" className="text-xs font-semibold text-brand hover:underline">
              Open inbox
            </Link>
          }
        />
        {thread.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="size-5" />}
            title="No messages yet"
            description="Client updates on this role will appear here."
          />
        ) : (
          <ul className="divide-y divide-border">
            {thread.map((m) => (
              <li key={m.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-[13px] font-semibold text-foreground">
                    {m.from} · <span className="font-normal text-muted-foreground">{m.company}</span>
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">{m.time}</span>
                </div>
                <p className="mt-1 text-[13px] leading-5 text-muted-foreground">{m.preview}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
