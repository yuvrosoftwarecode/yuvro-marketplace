import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { AmPageHeader, AmShell } from "@/components/am/am-shell";
import { useAm } from "@/components/am/am-store";
import {
  Btn,
  Field,
  Kpi,
  KpiGrid,
  Segmented,
  SideDrawer,
  DrawerBlock,
  DrawerHeader,
  TableShell,
  TD,
  TH,
  THead,
  TR,
  inputCls,
} from "@/components/am/am-ui";
import { StatusBadge } from "@/components/app/status-badge";
import { money } from "@/lib/am-data";
import { api } from "@/lib/api";

export const Route = createFileRoute("/am/recruiters/")({
  head: () => ({
    meta: [
      { title: "Recruiters — Account Manager | Yuvro" },
      {
        name: "description",
        content:
          "Directory of marketplace recruiters and agencies with verification state, active jobs, submission quality, interview conversion and payout history.",
      },
      { property: "og:title", content: "Recruiters — Account Manager | Yuvro" },
      {
        property: "og:description",
        content: "Recruiter and agency directory with quality and payout signals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AmRecruitersPage,
});

const statusTone = {
  active: "success",
  pending: "warning",
  suspended: "danger",
  inactive: "neutral",
} as const;

function AmRecruitersPage() {
  const am = useAm();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    agency: "",
    location: "",
    specializations: "",
  });

  const [pendingAppsCount, setPendingAppsCount] = useState<number>(0);

  useEffect(() => {
    am.refreshRecruiters();
    api.get<any>("/api/marketplace/recruiter-applications/")
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || res?.results || [];
        const count = list.filter((a: any) => a.status === "pending").length;
        setPendingAppsCount(count);
      })
      .catch(() => {});
  }, []);

  const rows = am.state.recruiters
    .filter((r) => (status === "all" ? true : r.status === status))
    .filter((r) =>
      q
        ? `${r.name} ${r.agency} ${r.email} ${(Array.isArray(r.specializations) ? r.specializations : []).join(" ")}`
            .toLowerCase()
            .includes(q.toLowerCase())
        : true,
    )
    .map((r) => {
      const subs = am.state.submissions.filter((s) => s.recruiterId === r.id);
      return {
        r,
        activeJobs: am.state.requests.filter(
          (x) => x.recruiterId === r.id && x.status === "approved",
        ).length,
        pending: am.state.requests.filter((x) => x.recruiterId === r.id && x.status === "pending")
          .length,
        submissions: subs.length,
        interviews: subs.filter((s) => ["interview", "final", "offer", "hired"].includes(s.stage))
          .length,
        hires: subs.filter((s) => s.stage === "hired").length,
        paid: am.state.payouts
          .filter((p) => p.recruiterId === r.id)
          .reduce((a, p) => a + p.recruiterShare, 0),
      };
    });


  return (
    <AmShell>
      <AmPageHeader
        title="Recruiters"
        description="Independent recruiters and agencies working your jobs, with verification, quality and payout history."
        actions={
          <Btn variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> Add recruiter
          </Btn>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex border-b border-border/80">
            <div className="border-b-2 border-brand px-4 py-2.5 text-sm font-semibold text-foreground">
              Recruiters
            </div>
            <Link
              to="/am/recruiters/applications"
              className="flex items-center gap-1.5 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Recruiter Applications
              {pendingAppsCount > 0 && (
                <span className="grid size-4 place-items-center rounded bg-brand-soft text-[10px] font-bold text-brand">
                  {pendingAppsCount}
                </span>
              )}
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              options={[
                { id: "all", label: "All", count: am.state.recruiters.length },
                ...(["active", "pending", "suspended", "inactive"] as const).map((s) => ({
                  id: s,
                  label: s[0]!.toUpperCase() + s.slice(1),
                  count: am.state.recruiters.filter((r) => r.status === s).length,
                })),
              ]}
              value={status}
              onChange={setStatus}
            />
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name, agency, specialization"
                className={`${inputCls} pl-8`}
              />
            </div>
          </div>
        </div>
      </AmPageHeader>

      <KpiGrid>
        <Kpi label="Recruiters" value={am.state.recruiters.length} hint="On your desk" />
        <Kpi
          label="Agencies"
          value={am.state.recruiters.filter((r) => r.type === "Agency").length}
          hint="Multi-seat suppliers"
        />
        <Kpi
          label="Pending access requests"
          value={am.state.requests.filter((r) => r.status === "pending").length}
          tone="warning"
          hint="Across all jobs"
        />
        <Kpi
          label="Avg quality score"
          value={Math.round(
            am.state.recruiters.reduce((a, r) => a + r.qualityScore, 0) /
              Math.max(1, am.state.recruiters.length),
          )}
          hint="Submission quality"
        />
        <Kpi
          label="Paid to recruiters"
          value={money(am.state.payouts.reduce((a, p) => a + p.recruiterShare, 0))}
          tone="success"
          hint="All time"
        />
      </KpiGrid>

      <TableShell className="bg-surface">
        <THead>
          <TH>Recruiter</TH>
          <TH>Type</TH>
          <TH>Status</TH>
          <TH>Verification</TH>
          <TH align="right">Active jobs</TH>
          <TH align="right">Pending</TH>
          <TH align="right">Submissions</TH>
          <TH align="right">Interviews</TH>
          <TH align="right">Hires</TH>
          <TH align="right">Quality</TH>
          <TH align="right">Response</TH>
          <TH align="right">Paid</TH>
        </THead>
        <tbody>
          {rows.length === 0 ? (
            <TR>
              <TD colSpan={12} className="py-12 text-center text-muted-foreground">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Users className="size-8 text-muted-foreground/50" />
                  <p className="text-sm font-medium">No recruiters found</p>
                  <p className="text-xs text-muted-foreground">
                    {q || status !== "all"
                      ? "Try adjusting your search or filter criteria."
                      : "Add your first recruiter to get started."}
                  </p>
                </div>
              </TD>
            </TR>
          ) : (
            rows.map(({ r, ...m }) => {
              const verified = Object.values(r.verification).filter(Boolean).length;
              const recruiterKey = (r as any).slug || r.id;
              return (
                <TR
                  key={r.id}
                  onClick={() =>
                    navigate({
                      to: "/am/recruiters/$recruiterId",
                      params: { recruiterId: recruiterKey },
                    })
                  }
                >
                  <TD>
                    <span className="block truncate font-medium">{r.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {r.email} · {r.location}
                    </span>
                  </TD>
                  <TD>
                    <span className="block truncate">{r.type}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {r.type === "Agency" ? r.agency : r.experience}
                    </span>
                  </TD>
                  <TD>
                    <StatusBadge tone={statusTone[r.status]} dot>
                      {r.status}
                    </StatusBadge>
                  </TD>
                  <TD mono>{verified}/5</TD>
                  <TD align="right" mono>
                    {m.activeJobs}
                  </TD>
                  <TD align="right" mono className={m.pending ? "text-warning" : ""}>
                    {m.pending}
                  </TD>
                  <TD align="right" mono>
                    {m.submissions}
                  </TD>
                  <TD align="right" mono>
                    {m.interviews}
                  </TD>
                  <TD align="right" mono className={m.hires ? "text-success" : ""}>
                    {m.hires}
                  </TD>
                  <TD align="right" mono>
                    {r.qualityScore}
                  </TD>
                  <TD align="right" mono>
                    {r.responseRate}%
                  </TD>
                  <TD align="right" mono>
                    {money(m.paid)}
                  </TD>
                </TR>
              );
            })
          )}
        </tbody>
      </TableShell>

      <SideDrawer
        open={createOpen}
        onOpenChange={(isOpen) => {
          if (!isSubmitting) setCreateOpen(isOpen);
        }}
        title="Add recruiter"
        width="narrow"
        footer={
          <>
            <Btn disabled={isSubmitting} onClick={() => setCreateOpen(false)}>
              Cancel
            </Btn>
            <Btn
              variant="primary"
              disabled={isSubmitting}
              onClick={async () => {
                if (!form.name.trim() || !form.email.trim()) {
                  toast.error("Name and email are required.");
                  return;
                }
                setIsSubmitting(true);
                try {
                  const created = await am.createRecruiter({
                    name: form.name.trim(),
                    email: form.email.trim(),
                    password: form.password.trim(),
                    agency: form.agency.trim(),
                    location: form.location.trim(),
                    specializations: form.specializations
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                    type: form.agency.trim() ? "Agency" : "Independent",
                  });
                  toast.success(`${form.name} invited to the marketplace`);
                  setCreateOpen(false);
                  setForm({ name: "", email: "", password: "", agency: "", location: "", specializations: "" });
                  if (created) {
                    const targetId = (created as any).slug || created.id;
                    navigate({
                      to: "/am/recruiters/$recruiterId",
                      params: { recruiterId: targetId },
                    });
                  }
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : "Failed to invite recruiter";
                  toast.error(msg);
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              {isSubmitting ? "Inviting..." : "Send invite"}
            </Btn>
          </>
        }
      >

        <DrawerHeader
          eyebrow="Recruiter onboarding"
          title="Invite a recruiter or agency"
          subtitle={
            <span className="text-[13px] text-muted-foreground">
              They start as pending until verification completes.
            </span>
          }
        />
        <DrawerBlock title="Details">
          <div className="grid gap-3">
            <Field label="Full name">
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Field>
            <Field label="Email">
              <input
                className={inputCls}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </Field>
            <Field label="Password" hint="Initial login password for this recruiter.">
              <input
                type="password"
                className={inputCls}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </Field>
            <Field label="Agency" hint="Leave empty for independent recruiters.">
              <input
                className={inputCls}
                value={form.agency}
                onChange={(e) => setForm((f) => ({ ...f, agency: e.target.value }))}
              />
            </Field>
            <Field label="Location">
              <input
                className={inputCls}
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </Field>
            <Field label="Specializations" hint="Comma separated">
              <input
                className={inputCls}
                value={form.specializations}
                onChange={(e) => setForm((f) => ({ ...f, specializations: e.target.value }))}
              />
            </Field>
          </div>
        </DrawerBlock>
      </SideDrawer>
    </AmShell>
  );
}
