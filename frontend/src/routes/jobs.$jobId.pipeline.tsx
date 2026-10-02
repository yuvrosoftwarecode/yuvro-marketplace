import { createFileRoute } from "@tanstack/react-router";
import { Panel, PanelHeader } from "@/components/app/primitives";
import { PipelineBoard } from "@/components/app/pipeline";
import { getJob, getPipelineCandidatesForJob, type Job } from "@/lib/data";
import { fetchRecruiterJobById } from "@/lib/recruiter-jobs";
import { useAmOptional } from "@/components/am/am-store";
import { useJobContext } from "@/components/app/job-context";
import { api } from "@/lib/api";
import { useMemo, useEffect, useState } from "react";

export const Route = createFileRoute("/jobs/$jobId/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline — job workspace" },
      { name: "description", content: "Candidate stages for the selected client role." },
      { property: "og:title", content: "Pipeline — job workspace" },
      { property: "og:description", content: "Candidate stages for the selected client role." },
    ],
  }),
  component: PipelineTab,
});

function PipelineTab() {
  const { jobId } = Route.useParams();
  const { job: contextJob } = useJobContext();
  const [job, setJob] = useState<Job | null>(
    () => (contextJob && (contextJob.id === jobId || contextJob.slug === jobId) ? contextJob : getJob(jobId) || null)
  );
  const am = useAmOptional();

  useEffect(() => {
    if (contextJob && (contextJob.id === jobId || contextJob.slug === jobId)) {
      setJob(contextJob);
    }
  }, [contextJob, jobId]);

  useEffect(() => {
    let active = true;
    if (jobId) {
      fetchRecruiterJobById(jobId).then((fetched) => {
        if (active && fetched) setJob(fetched);
      });
    }
    return () => {
      active = false;
    };
  }, [jobId]);

  const refreshSubmissions = am?.refreshSubmissions;
  useEffect(() => {
    refreshSubmissions?.(true);
  }, [refreshSubmissions]);

  const [directSubs, setDirectSubs] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    api
      .get<any>("/api/recruiting/submissions/")
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res) ? res : res.results || res.data || [];
        setDirectSubs(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [jobId]);

  const pipeline = useMemo(() => {
    const targetJobId = job?.id || jobId;
    const targetBackendId = job?.backendId;

    const fromStore = getPipelineCandidatesForJob(
      targetJobId,
      targetBackendId,
      am?.state.submissions,
      am?.state.candidates,
      am?.state.jobs,
      job?.slug,
    );

    if (fromStore.length > 0) {
      return fromStore;
    }

    if (directSubs.length > 0) {
      const mappedSubs = directSubs.map((s) => ({
        id: String(s.id),
        jobId: String(s.application?.job?.id || s.job_id || ""),
        jobSlug: String(s.application?.job?.slug || s.job_slug || ""),
        candidateId: String(s.candidate?.id || s.candidate_id || ""),
        stage: s.stage,
        status: s.status,
        submittedAt: s.submitted_at,
        lastActivity: s.updated_at,
        candidate: s.candidate,
        recruiterNotes: s.recruiter_notes,
        decisionNote: s.decision_note,
        rejectionReason: s.rejection_reason,
      }));
      const mappedCands = directSubs.map((s) => ({
        id: String(s.candidate?.id || ""),
        name:
          s.candidate?.full_name ||
          `${s.candidate?.first_name || ""} ${s.candidate?.last_name || ""}`.trim() ||
          "Candidate",
        currentRole: s.candidate?.current_title || "—",
        currentCompany: s.candidate?.current_company || "—",
        location: s.candidate?.current_location || "—",
      }));
      return getPipelineCandidatesForJob(
        targetJobId,
        targetBackendId,
        mappedSubs,
        mappedCands,
        am?.state.jobs,
        job?.slug,
      );
    }

    return fromStore;
  }, [
    job,
    jobId,
    am?.state.submissions,
    am?.state.candidates,
    am?.state.jobs,
    directSubs,
  ]);

  return (
    <div className="p-4 sm:p-6">
      <Panel className="overflow-hidden">
        <PanelHeader
          title="Stage board"
          meta={`${pipeline.length} candidate${pipeline.length === 1 ? "" : "s"} on this role`}
        />
        <PipelineBoard candidates={pipeline} job={job || undefined} compact={false} fullWidth={true} />
      </Panel>
    </div>
  );
}
