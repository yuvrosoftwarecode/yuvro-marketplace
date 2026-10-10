import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { WorkspacePage } from "@/components/app/workspace-page";
import { EmptyState, Panel, PanelHeader } from "@/components/app/primitives";
import { StatusBadge } from "@/components/app/status-badge";
import { useAmOptional } from "@/components/am/am-store";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Interview Calendar — Scheduled Client Loops" },
      {
        name: "description",
        content:
          "Upcoming screens, team interviews and final loops across every approved client role.",
      },
      { property: "og:title", content: "Interview Calendar — Scheduled Client Loops" },
      {
        property: "og:description",
        content: "Upcoming screens, team interviews and final loops in one view.",
      },
    ],
  }),
  component: CalendarPage,
});

type CalendarEvent = {
  day: string;
  time: string;
  who: string;
  what: string;
  tone: "brand" | "info" | "success" | "warning";
};

function CalendarPage() {
  const am = useAmOptional();
  // Read any live scheduled events from store, empty by default without mock data
  const events: CalendarEvent[] = (am?.state.events || []).map((e) => ({
    day: e.date,
    time: e.time,
    who: e.title,
    what: `${e.type} · ${e.stage || ""}`,
    tone: "brand",
  }));

  const days = [...new Set(events.map((e) => e.day))];

  return (
    <WorkspacePage
      title="Calendar"
      description="Interviews confirmed by clients, grouped by day in each candidate's time zone."
    >
      {days.length === 0 ? (
        <Panel className="overflow-hidden">
          <EmptyState
            icon={<CalendarDays className="size-5" />}
            title="No interviews scheduled"
            description="Confirmed client interviews, screens and final loops will appear here."
          />
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {days.map((d) => (
            <Panel key={d}>
              <PanelHeader
                title={d}
                meta={`${events.filter((e) => e.day === d).length} scheduled`}
              />
              <ul className="divide-y divide-border">
                {events
                  .filter((e) => e.day === d)
                  .map((e) => (
                    <li
                      key={e.who + e.time}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
                    >
                      <span className="num text-xs text-muted-foreground">{e.time}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-foreground">
                          {e.who}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {e.what}
                        </span>
                      </span>
                      <StatusBadge tone={e.tone} dot>
                        Confirmed
                      </StatusBadge>
                    </li>
                  ))}
              </ul>
            </Panel>
          ))}
        </div>
      )}
    </WorkspacePage>
  );
}
