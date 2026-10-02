import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  Github,
  Linkedin,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/app/status-badge";
import { MetaRow } from "@/components/app/primitives";
import { cn } from "@/lib/utils";
import type { CandidateStage } from "@/lib/am-data";
import {
  allowedTargets,
  normalizeUrl,
  rejectionReasons,
  signedInCompanyUser,
  stageLabel,
  type ReviewRow,
} from "@/lib/company-review";
import { stageToneOf } from "@/components/company/review-bits";

export function CandidateReviewDrawer({
  row,
  onClose,
  onMove,
}: {
  row: ReviewRow | null;
  onClose: () => void;
  onMove: (to: CandidateStage, extra: { reason?: string; note?: string }) => void;
}) {
  const [target, setTarget] = useState<CandidateStage | null>(null);
  const [reason, setReason] = useState(rejectionReasons[0]!);
  const [note, setNote] = useState("");
  const [showResume, setShowResume] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setTarget(null);
    setReason(rejectionReasons[0]!);
    setNote("");
    setShowResume(false);
    setConfirming(false);
  }, [row?.submission.id]);

  const targets = useMemo(() => (row ? allowedTargets(row.stage) : []), [row]);
  if (!row) return null;

  const { candidate, job, recruiter, submission, stage } = row;
  const links = [
    candidate.linkedin ? { label: "LinkedIn", href: normalizeUrl(candidate.linkedin), icon: Linkedin } : null,
    candidate.github ? { label: "GitHub", href: normalizeUrl(candidate.github), icon: Github } : null,
    candidate.portfolio ? { label: "Portfolio", href: normalizeUrl(candidate.portfolio), icon: ExternalLink } : null,
  ].filter((l): l is { label: string; href: string; icon: typeof Linkedin } => l !== null);

  const commit = () => {
    if (!target) return;
    onMove(target, {
      ...(target === "rejected" ? { reason } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    toast.success(
      target === "rejected" ? `${candidate.name} rejected` : `${candidate.name} moved to ${stageLabel(target)}`,
      { description: `${job.title} · by ${signedInCompanyUser}` },
    );
    onClose();
  };

  return (
    <Sheet open onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[640px]">
        <SheetTitle className="sr-only">{candidate.name} review</SheetTitle>

        <header className="border-b border-border px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[15px] font-semibold tracking-tight text-foreground">{candidate.name}</h2>
              <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                {candidate.currentRole} · {candidate.currentCompany}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {job.title} · {candidate.location}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge tone={stageToneOf(stage)} dot>
                {stageLabel(stage)}
              </StatusBadge>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-sunken hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
          <section className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-brand" />
              <p className="text-[13px] font-semibold tracking-tight text-foreground">Yuvro match</p>
              <span className="num ml-auto text-[13px] font-semibold text-foreground">{submission.match}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
              <div className="h-full rounded-full bg-brand" style={{ width: `${submission.match}%` }} />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Bullets title="Strengths" items={submission.ai.strengths} icon="good" />
              <Bullets title="Gaps" items={submission.ai.gaps} icon="warn" />
            </div>
            {submission.ai.redFlags.length ? (
              <div className="mt-3 rounded-md border border-destructive/25 bg-danger-soft px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-destructive">Red flags</p>
                <ul className="mt-1 space-y-0.5 text-[13px] leading-5 text-destructive">
                  {submission.ai.redFlags.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section className="border-b border-border px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowResume((v) => !v)}>
                <FileText className="size-4" /> {showResume ? "Hide resume" : "View resume"}
              </Button>
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-[13px] font-medium text-foreground transition-colors hover:border-border-strong"
                >
                  <l.icon className="size-3.5" /> {l.label}
                </a>
              ))}
            </div>
            {showResume ? (
              <div className="mt-3 rounded-md border border-border bg-surface-sunken">
                {/^https?:\/\//i.test(candidate.resume) ? (
                  <iframe src={candidate.resume} title="Resume" className="h-[420px] w-full rounded-md" />
                ) : (
                  <div className="px-4 py-4">
                    <p className="num text-xs text-muted-foreground">{candidate.resume}</p>
                    <dl className="mt-2">
                      <MetaRow label="Experience" value={candidate.experience} />
                      <MetaRow label="Skills" value={candidate.skills.join(", ")} />
                      <MetaRow label="Compensation" value={candidate.compensation} />
                      <MetaRow label="Availability" value={candidate.availability} />
                      <MetaRow label="Work authorization" value={candidate.visa} />
                    </dl>
                  </div>
                )}
              </div>
            ) : null}
          </section>

          <section className="border-b border-border px-5 py-4">
            <p className="label-caps">Candidate details</p>
            <dl className="mt-1">
              <MetaRow label="Location" value={candidate.location} />
              <MetaRow label="Experience" value={candidate.experience} />
              {candidate.currentCompensation && candidate.currentCompensation !== "Not provided" ? (
                <MetaRow label="Current compensation" value={candidate.currentCompensation} />
              ) : null}
              <MetaRow label="Expected compensation" value={candidate.expectedCompensation || candidate.compensation} />
              <MetaRow label="Notice period" value={candidate.noticePeriod || candidate.availability} />
              <MetaRow label="Work authorization" value={candidate.visaStatus || candidate.visa} />
              <MetaRow label="Submitted by" value={recruiter ? recruiter.name : "Yuvro sourcing"} />
            </dl>
          </section>

          {submission.recommendation ? (
            <section className="border-b border-border px-5 py-4">
              <p className="label-caps">Recruiter recommendation</p>
              <p className="mt-1.5 max-w-[70ch] text-[13.5px] leading-6 text-muted-foreground">
                {submission.recommendation}
              </p>
            </section>
          ) : null}

          {submission.answers.length ? (
            <section className="border-b border-border px-5 py-4">
              <p className="label-caps">Screening answers</p>
              <div className="mt-2 space-y-3">
                {submission.answers.map((a) => (
                  <div key={a.q}>
                    <p className="text-[13px] font-semibold text-foreground">{a.q}</p>
                    <p className="mt-0.5 max-w-[70ch] text-[13px] leading-5 text-muted-foreground">{a.a}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="px-5 py-4">
            <p className="label-caps">History</p>
            <ol className="mt-2 space-y-2.5">
              {submission.timeline.map((t) => (
                <li key={`${t.label}-${t.at}`} className="grid grid-cols-[auto_minmax(0,1fr)] gap-2.5">
                  <span className="mt-1.5 size-1.5 rounded-full bg-border-strong" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground">{t.label}</p>
                    <p className="num text-xs text-muted-foreground">
                      {t.at} · {t.by}
                    </p>
                    {t.note ? <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">{t.note}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <footer className="border-t border-border bg-surface px-5 py-3.5">
          {targets.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              This candidate is {stageLabel(stage).toLowerCase()} — no further action needed.
            </p>
          ) : confirming && target ? (
            <div className="space-y-2.5">
              <p className="text-[13px] font-semibold text-foreground">
                {target === "rejected"
                  ? `Reject ${candidate.name}?`
                  : `Move ${candidate.name} to ${stageLabel(target)}?`}
              </p>
              {target === "rejected" ? (
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-surface px-2.5 text-[13px] font-medium outline-none"
                >
                  {rejectionReasons.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              ) : null}
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note for your Account Manager (optional)"
                className="min-h-[64px] text-[13px]"
              />
              <div className="flex items-center gap-2">
                <Button size="sm" variant={target === "rejected" ? "destructive" : "default"} onClick={commit}>
                  Confirm
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                  Back
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Move to</span>
              {targets.map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={t === "rejected" ? "outline" : "default"}
                  className={cn(t === "rejected" && "text-destructive hover:text-destructive")}
                  onClick={() => {
                    setTarget(t);
                    setConfirming(true);
                  }}
                >
                  {stageLabel(t)}
                  {t === "rejected" ? null : <ArrowRight className="size-3.5" />}
                </Button>
              ))}
            </div>
          )}
        </footer>
      </SheetContent>
    </Sheet>
  );
}

function Bullets({ title, items, icon }: { title: string; items: string[]; icon: "good" | "warn" }) {
  if (!items.length) return null;
  const Icon = icon === "good" ? CheckCircle2 : AlertTriangle;
  return (
    <div>
      <p className="label-caps">{title}</p>
      <ul className="mt-1.5 space-y-1">
        {items.map((i) => (
          <li key={i} className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 text-[13px] leading-5 text-muted-foreground">
            <Icon className={cn("mt-0.5 size-3.5 shrink-0", icon === "good" ? "text-success" : "text-warning")} />
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
