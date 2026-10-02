import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AmProvider } from "@/components/am/am-store";

export const Route = createFileRoute("/am")({
  component: AmLayout,
});

function AmLayout() {
  return <Outlet />;
}
