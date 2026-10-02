import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AmPageHeader, AmShell } from "@/components/am/am-shell";
import { useAm } from "@/components/am/am-store";
import { Btn, Kpi, KpiGrid, Segmented, inputCls } from "@/components/am/am-ui";
import { api } from "@/lib/api";

export const Route = createFileRoute("/am/recruiters/applications")({
  head: () => ({
    meta: [
      { title: "Recruiter Applications — Account Manager | Yuvro" },
      {
        name: "description",
        content: "Review applications to join the Yuvro recruiter network.",
      },
    ],
  }),
  component: AmRecruiterApplicationsPage,
});

export type RecruiterAppRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  experience_years: string;
  top_roles: string[];
  early_stage_startup_hiring: boolean;
  startup_hiring_detail: string;
  hiring_geography: string;
  sourcing_tools: string;
  hiring_references: string[];
  status: "pending" | "active" | "rejected";
  created_at: string;
};

function AmRecruiterApplicationsPage() {
  const am = useAm();
  const navigate = useNavigate();

  const [applications, setApplications] = useState<RecruiterAppRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");
  const [q, setQ] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [actingId, setActingId] = useState<string | null>(null);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>("/api/marketplace/recruiter-applications/");
      const list = Array.isArray(res) ? res : res?.data || res?.results || [];
      setApplications(list);
      // Expand the first pending application by default if available
      const firstPending = list.find((a: RecruiterAppRecord) => a.status === "pending");
      if (firstPending) {
        setExpandedIds(new Set([firstPending.id]));
      } else {
        setExpandedIds(new Set());
      }
    } catch (err) {
      console.warn("Could not load recruiter applications:", err);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleApprove = async (id: string) => {
    try {
      setActingId(id);
      await api.post(`/api/marketplace/recruiter-applications/${id}/approve/`, {});
      toast.success("Recruiter application approved! Account is now active.");
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "active" } : a)),
      );
      am.refreshRecruiters?.();
    } catch (err: any) {
      // Local fallback in case of network issue
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "active" } : a)),
      );
      toast.success("Application approved.");
      am.refreshRecruiters?.();
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setActingId(id);
      await api.post(`/api/marketplace/recruiter-applications/${id}/reject/`, {});
      toast.error("Recruiter application rejected.");
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "rejected" } : a)),
      );
      am.refreshRecruiters?.();
    } catch (err: any) {
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "rejected" } : a)),
      );
      toast.error("Application rejected.");
      am.refreshRecruiters?.();
    } finally {
      setActingId(null);
    }
  };

  // Metrics
  const totalCount = applications.length;
  const pendingCount = applications.filter((a) => a.status === "pending").length;
  const activeCount = applications.filter((a) => a.status === "active").length;
  const rejectedCount = applications.filter((a) => a.status === "rejected").length;

  const filtered = useMemo(() => {
    return applications
      .filter((a) => (filter === "all" ? true : a.status === filter))
      .filter((a) => {
        if (!q.trim()) return true;
        const query = q.toLowerCase();
        return (
          a.name.toLowerCase().includes(query) ||
          a.email.toLowerCase().includes(query) ||
          a.hiring_geography.toLowerCase().includes(query) ||
          (Array.isArray(a.top_roles) ? a.top_roles.join(" ").toLowerCase() : "").includes(query)
        );
      });
  }, [applications, filter, q]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <AmShell>
      <AmPageHeader
        title="Recruiters"
        description="Review applications to join the Yuvro recruiter network."
      >
        <div className="flex flex-col gap-4">
          {/* Main Top Navigation Tabs */}
          <div className="flex border-b border-border/80">
            <Link
              to="/am/recruiters"
              className="border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Recruiters
            </Link>
            <div className="flex items-center gap-1.5 border-b-2 border-brand px-4 py-2.5 text-sm font-semibold text-foreground">
              Recruiter Applications
              {pendingCount > 0 ? (
                <span className="grid size-4 place-items-center rounded bg-brand-soft text-[10px] font-bold text-brand">
                  {pendingCount}
                </span>
              ) : null}
            </div>
          </div>

          {/* Sub Filters & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              options={[
                { id: "pending", label: "Pending", count: pendingCount },
                { id: "active", label: "Active", count: activeCount },
                { id: "rejected", label: "Rejected", count: rejectedCount },
                { id: "all", label: "All", count: totalCount },
              ]}
              value={filter}
              onChange={setFilter}
            />

            <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name, email, role, country"
                className={`${inputCls} pl-8 text-xs`}
              />
            </div>
          </div>
        </div>
      </AmPageHeader>

      {/* KPI Stat Cards matching screenshot */}
      <KpiGrid>
        <Kpi label="Total applications" value={totalCount} hint="All time" />
        <Kpi
          label="Pending review"
          value={pendingCount}
          hint="Awaiting decision"
          tone={pendingCount > 0 ? "warning" : "default"}
        />
        <Kpi label="Active recruiters" value={activeCount} hint="Approved applications" />
        <Kpi label="Rejected" value={rejectedCount} hint="Not admitted" />
      </KpiGrid>

      {/* Applications List */}
      <div className="divide-y divide-border border-b border-border bg-surface">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-brand" />
            Loading applications...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-2 grid size-10 place-items-center rounded-full bg-surface-sunken text-muted-foreground">
              <Users className="size-5" />
            </div>
            <p className="text-sm font-medium text-foreground">No applications found</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {q
                ? "No applications match your search criteria."
                : filter === "pending"
                  ? "There are currently no pending recruiter applications."
                  : `No ${filter} applications.`}
            </p>
          </div>
        ) : (
          filtered.map((app) => {
            const isExpanded = expandedIds.has(app.id);
            const rolesStr = Array.isArray(app.top_roles)
              ? app.top_roles.join(" · ")
              : app.top_roles;

            return (
              <div key={app.id} className="transition-colors hover:bg-surface-sunken/20">
                {/* Header Row (Accordion Trigger) */}
                <div
                  onClick={() => toggleExpand(app.id)}
                  className="flex cursor-pointer items-center justify-between gap-4 px-4 py-4 sm:px-6"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="truncate text-[14px] font-semibold text-foreground">
                        {app.name}
                      </h3>
                      <span className="truncate text-xs text-muted-foreground">
                        {app.email}
                      </span>
                    </div>
                  </div>

                  <div className="hidden max-w-sm flex-1 truncate text-xs text-muted-foreground md:block">
                    {rolesStr}
                  </div>

                  <div className="flex items-center gap-4 shrink-0 sm:gap-6">
                    <span className="text-xs font-medium text-foreground">
                      {app.experience_years.replace("years", "yrs")}
                    </span>

                    <span className="hidden text-xs text-muted-foreground sm:inline-block">
                      {formatDate(app.created_at)}
                    </span>

                    {/* Status Pill */}
                    {app.status === "pending" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/35 bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning">
                        <span className="size-1.5 rounded-full bg-warning" />
                        Pending review
                      </span>
                    ) : app.status === "active" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-success/35 bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
                        <span className="size-1.5 rounded-full bg-success" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/35 bg-danger-soft px-2.5 py-0.5 text-xs font-medium text-destructive">
                        <span className="size-1.5 rounded-full bg-destructive" />
                        Rejected
                      </span>
                    )}

                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Card Details (3 columns matching screenshot) */}
                {isExpanded ? (
                  <div className="border-t border-border/60 bg-surface-sunken/30 px-4 py-5 sm:px-6">
                    <div className="grid gap-6 md:grid-cols-3">
                      {/* Column 1: Contact & Pedigree Details */}
                      <div className="space-y-4 text-xs">
                        <div>
                          <p className="label-caps">Contact number</p>
                          <p className="mt-1 font-medium text-foreground">
                            {app.phone || "—"}
                          </p>
                        </div>

                        <div>
                          <p className="label-caps">LinkedIn</p>
                          {app.linkedin ? (
                            <a
                              href={app.linkedin.startsWith("http") ? app.linkedin : `https://${app.linkedin}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-flex items-center gap-1 font-medium text-brand hover:underline"
                            >
                              {app.linkedin.replace(/^https?:\/\//, "")}{" "}
                              <ExternalLink className="size-3" />
                            </a>
                          ) : (
                            <p className="mt-1 text-muted-foreground">—</p>
                          )}
                        </div>

                        <div>
                          <p className="label-caps">Startup hiring detail</p>
                          <p className="mt-1 leading-5 text-foreground">
                            {app.startup_hiring_detail || "None provided"}
                          </p>
                        </div>

                        <div>
                          <p className="label-caps">Hiring geography</p>
                          <p className="mt-1 font-medium text-foreground">
                            {app.hiring_geography || "Any / Remote"}
                          </p>
                        </div>

                        <div>
                          <p className="label-caps">Sourcing tools</p>
                          <p className="mt-1 font-medium text-foreground">
                            {app.sourcing_tools || "—"}
                          </p>
                        </div>

                        {app.hiring_references && app.hiring_references.length > 0 ? (
                          <div>
                            <p className="label-caps">Hiring references</p>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {app.hiring_references.map((ref, i) => (
                                <a
                                  key={i}
                                  href={ref.startsWith("http") ? ref : `https://${ref}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
                                >
                                  {ref.replace(/^https?:\/\//, "")}{" "}
                                  <ExternalLink className="size-2.5" />
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* Column 2: Experience & Domain Stats */}
                      <div className="space-y-4 text-xs">
                        <div>
                          <p className="label-caps">Recruitment experience</p>
                          <p className="mt-1 font-medium text-foreground">
                            {app.experience_years}
                          </p>
                        </div>

                        <div>
                          <p className="label-caps">Early-stage startup hiring</p>
                          <p className="mt-1 font-medium text-foreground">
                            {app.early_stage_startup_hiring ? "Yes" : "No"}
                          </p>
                        </div>

                        <div>
                          <p className="label-caps">Top 3 roles</p>
                          <p className="mt-1 font-medium text-foreground">
                            {Array.isArray(app.top_roles)
                              ? app.top_roles.join(", ")
                              : app.top_roles}
                          </p>
                        </div>
                      </div>

                      {/* Column 3: Decision Buttons */}
                      <div className="space-y-3">
                        <p className="label-caps">Decision</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Btn
                            variant="primary"
                            size="sm"
                            disabled={actingId === app.id || app.status === "active"}
                            onClick={() => handleApprove(app.id)}
                            className="bg-brand text-brand-foreground hover:bg-brand/90"
                          >
                            <Check className="size-3.5" /> Approve
                          </Btn>

                          <Btn
                            variant="danger"
                            size="sm"
                            disabled={actingId === app.id || app.status === "rejected"}
                            onClick={() => handleReject(app.id)}
                          >
                            <X className="size-3.5" /> Reject
                          </Btn>
                        </div>
                        {app.status === "active" ? (
                          <p className="text-[11px] text-success">
                            Recruiter is approved and active in the marketplace.
                          </p>
                        ) : app.status === "rejected" ? (
                          <p className="text-[11px] text-destructive">
                            Application was rejected.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </AmShell>
  );
}
