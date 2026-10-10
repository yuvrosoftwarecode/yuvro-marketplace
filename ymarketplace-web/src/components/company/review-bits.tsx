import type { Tone } from "@/components/app/status-badge";
import type { CandidateStage } from "@/lib/am-data";

export function stageToneOf(stage: CandidateStage): Tone {
  switch (stage) {
    case "company_review":
      return "warning";
    case "interview":
    case "final":
      return "info";
    case "offer":
      return "brand";
    case "hired":
      return "success";
    case "rejected":
      return "danger";
    default:
      return "neutral";
  }
}
