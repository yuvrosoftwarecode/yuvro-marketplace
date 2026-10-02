import { useEffect } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/clients/$clientId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/jobs/$jobId/pipeline",
      params: { jobId: params.clientId },
    });
  },
  component: ClientRedirectPage,
});

function ClientRedirectPage() {
  const { clientId } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    navigate({
      to: "/jobs/$jobId/pipeline",
      params: { jobId: clientId },
      replace: true,
    });
  }, [clientId, navigate]);

  return null;
}
