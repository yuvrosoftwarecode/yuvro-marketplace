import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function BrandLockup({ className }: { className?: string }) {
  return (
    <img
      src="/knowledge-tree.png"
      alt="Yuvro Marketplace"
      className={cn("size-7 object-contain", className)}
    />
  );
}

export function AuthLayout({
  title,
  description,
  children,
  footer,
  aside = true,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  aside?: boolean;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-deep px-4 py-10">
      <div className={`w-full ${aside ? "max-w-[420px]" : "max-w-[560px]"}`}>
        <div className="rounded-lg border border-deep-border bg-background p-6 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? (
            <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">{description}</p>
          ) : null}
          <div className="mt-7">{children}</div>
          {footer ? <div className="mt-7 text-[13px] text-muted-foreground">{footer}</div> : null}
        </div>
      </div>
    </main>
  );
}

export function SocialAuthButtons({
  verb = "Continue",
  includeLinkedIn = true,
}: {
  verb?: string;
  includeLinkedIn?: boolean;
}) {
  const providers = [
    { label: `${verb} with Google`, mark: "G" },
    ...(includeLinkedIn ? [{ label: `${verb} with LinkedIn`, mark: "in" }] : []),
  ];

  return (
    <div className="space-y-2">
      {providers.map((p) => (
        <button
          key={p.label}
          type="button"
          className="flex h-10 w-full items-center justify-center gap-2.5 rounded-md border border-border bg-surface text-[13px] font-semibold text-foreground transition-colors hover:bg-surface-sunken"
        >
          <span className="grid size-5 place-items-center rounded border border-border text-[10px] font-bold text-muted-foreground">
            {p.mark}
          </span>
          {p.label}
        </button>
      ))}
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="label-caps">or</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
