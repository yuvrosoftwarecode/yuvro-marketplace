import type { ReactNode } from "react";
import { AppShell } from "./app-shell";
import { EmptyState, PageHeader, Panel } from "./primitives";

export function WorkspacePage({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string | undefined;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AppShell>
      <PageHeader
        title={title}
        {...(description ? { description } : {})}
        {...(actions ? { actions } : {})}
      />
      <div className="p-4 sm:p-6">{children}</div>
    </AppShell>
  );
}

export function ComingSoonPanel({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <Panel>
      <EmptyState icon={icon} title={title} description={description} />
    </Panel>
  );
}
