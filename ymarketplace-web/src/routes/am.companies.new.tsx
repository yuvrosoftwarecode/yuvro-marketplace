import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { AmPageHeader, AmShell } from "@/components/am/am-shell";
import { useAm } from "@/components/am/am-store";
import { Btn, Field, FormSection, inputCls, textareaCls } from "@/components/am/am-ui";
import { api } from "@/lib/api";

export const Route = createFileRoute("/am/companies/new")({
  head: () => ({
    meta: [
      { title: "Add Company — Account Manager | Yuvro" },
      {
        name: "description",
        content:
          "Onboard a new company account: company information, logo, size, funding stage, selling points and leadership contacts.",
      },
      { property: "og:title", content: "Add Company — Account Manager | Yuvro" },
      {
        property: "og:description",
        content: "Structured company onboarding for marketplace accounts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AmNewCompanyPage,
});

type CompanyForm = {
  name: string;
  industry: string;
  website: string;
  hq: string;
  size: string;
  fundingStage: string;
  founded: string;
  logoUrl: string;
  managerName: string;
  managerDesignation: string;
  managerEmail: string;
  managerMobile: string;
  highlights: { title: string; description: string }[];
  leaders: { name: string; title: string; linkedin: string }[];
};

const emptyCompanyForm = (): CompanyForm => ({
  name: "",
  industry: "",
  website: "",
  hq: "",
  size: "",
  fundingStage: "",
  founded: "",
  logoUrl: "",
  managerName: "",
  managerDesignation: "",
  managerEmail: "",
  managerMobile: "",
  highlights: [{ title: "", description: "" }],
  leaders: [{ name: "", title: "", linkedin: "" }],
});

function AmNewCompanyPage() {
  const am = useAm();
  const navigate = useNavigate();
  const [form, setForm] = useState<CompanyForm>(emptyCompanyForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    const validTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/svg+xml",
      "image/gif",
    ];
    if (!validTypes.includes(file.type) && !/\.(png|jpe?g|webp|svg|gif)$/i.test(file.name)) {
      toast.error("Please upload a valid image file (PNG, JPG, WEBP, or SVG).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo file size exceeds the 5MB limit.");
      return;
    }

    setLogoFile(file);
    const localPreview = URL.createObjectURL(file);
    setLogoPreview(localPreview);

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);

      const res = await api.post<{ url: string; key: string }>(
        "/api/marketplace/companies/upload-logo/",
        formData,
      );

      if (res && res.url) {
        setForm((f) => ({ ...f, logoUrl: res.url }));
        toast.success("Logo uploaded to storage");
      }
    } catch (err: unknown) {
      console.error("Logo upload error:", err);
      const msg = err instanceof Error ? err.message : "Failed to upload logo to storage.";
      toast.error(msg);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
    setForm((f) => ({ ...f, logoUrl: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const submit = async () => {
    if (isUploadingLogo) {
      toast.error("Please wait for the logo upload to finish.");
      return;
    }

    const missing = (
      [
        ["Company name", form.name],
        ["Website", form.website],
        ["Company size", form.size],
        ["Funding stage", form.fundingStage],
        ["Founded year", form.founded],
        ["Manager name", form.managerName],
        ["Manager designation", form.managerDesignation],
        ["Manager email", form.managerEmail],
        ["Manager mobile", form.managerMobile],
      ] as const
    ).filter(([, v]) => !v.trim());
    if (missing.length) {
      toast.error(`Required: ${missing.map(([l]) => l).join(", ")}`);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.managerEmail.trim())) {
      toast.error("Please enter a valid work email for the company manager.");
      return;
    }

    setIsSubmitting(true);
    try {
      await am.createCompany({
        name: form.name.trim(),
        industry: form.industry.trim() || "—",
        website: form.website.trim(),
        hq: form.hq.trim() || "—",
        size: form.size.trim(),
        fundingStage: form.fundingStage.trim(),
        founded: form.founded.trim(),
        logoUrl: form.logoUrl.trim(),
        logoFile: logoFile || undefined,
        managerName: form.managerName.trim(),
        managerDesignation: form.managerDesignation.trim(),
        managerEmail: form.managerEmail.trim(),
        managerMobile: form.managerMobile.trim(),
        highlights: form.highlights.filter((h) => h.title.trim() || h.description.trim()),
        leaders: form.leaders.filter((l) => l.name.trim()),
      });
      toast.success(`${form.name} added to your accounts`);
      navigate({ to: "/am/companies" });
    } catch (err: unknown) {
      console.error("Create company error:", err);
      const msg = err instanceof Error ? err.message : "Failed to create company.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AmShell>
      <AmPageHeader
        title="Add company"
        description="Onboard a new account. It stays in onboarding until the first job goes live."
        actions={
          <>
            <Btn onClick={() => navigate({ to: "/am/companies" })} disabled={isSubmitting}>
              Cancel
            </Btn>
            <Btn variant="primary" onClick={submit} disabled={isSubmitting || isUploadingLogo}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create company"
              )}
            </Btn>
          </>
        }
      />

      <div className="max-w-4xl px-4 py-6 sm:px-6">
        <FormSection
          title="Company information"
          description="Core account identity used across jobs and reporting."
        >
          <Field label="Company name *" className="sm:col-span-2">
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field
            label="Company logo"
            hint="Upload a logo image (PNG, JPG, WEBP, or SVG up to 5MB)."
            className="sm:col-span-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />

            {logoPreview || form.logoUrl.trim() ? (
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex size-12 shrink-0 items-center justify-center rounded-md border border-border bg-surface-sunken p-1 overflow-hidden">
                    <img
                      src={logoPreview || form.logoUrl}
                      alt="Company logo preview"
                      className="size-full object-contain"
                    />
                    {isUploadingLogo && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-md bg-background/70 backdrop-blur-xs">
                        <Loader2 className="size-4 animate-spin text-brand" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-medium text-foreground">
                        {logoFile?.name || "Company Logo"}
                      </span>
                      {isUploadingLogo ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          <Loader2 className="size-2.5 animate-spin" /> Uploading...
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-2.5" /> Stored
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground font-mono">
                      {form.logoUrl || "Uploading to storage..."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Btn
                    type="button"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingLogo || isSubmitting}
                  >
                    Replace
                  </Btn>
                  <Btn
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={removeLogo}
                    disabled={isUploadingLogo || isSubmitting}
                    className="size-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Remove logo"
                    aria-label="Remove logo"
                  >
                    <X className="size-4" />
                  </Btn>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className={`group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-6 text-center transition-all ${
                  isDragging
                    ? "border-brand bg-brand/5 scale-[1.005]"
                    : "border-border hover:border-brand/60 hover:bg-surface-sunken/40"
                }`}
              >
                <div className="grid size-10 place-items-center rounded-full bg-surface-sunken group-hover:bg-brand/10 transition-colors">
                  <UploadCloud className="size-5 text-muted-foreground group-hover:text-brand transition-colors" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[13px] font-medium text-foreground">
                    <span className="text-brand">Click to upload logo</span> or drag and drop
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    PNG, JPG, WEBP, or SVG (max 5MB)
                  </p>
                </div>
              </div>
            )}
          </Field>
          <Field label="Website *">
            <input
              className={inputCls}
              placeholder="company.com"
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            />
          </Field>
          <Field label="Industry">
            <input
              className={inputCls}
              value={form.industry}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
            />
          </Field>
          <Field label="Company size *">
            <select
              className={inputCls}
              value={form.size}
              onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
            >
              <option value="">Select</option>
              {["1–10", "11–50", "51–200", "201–500", "501–1000", "1000+"].map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Funding stage *">
            <select
              className={inputCls}
              value={form.fundingStage}
              onChange={(e) => setForm((f) => ({ ...f, fundingStage: e.target.value }))}
            >
              <option value="">Select</option>
              {[
                "Bootstrapped",
                "Pre-seed",
                "Seed",
                "Series A",
                "Series B",
                "Series C",
                "Series D+",
                "Public",
              ].map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Founded year *">
            <input
              className={inputCls}
              inputMode="numeric"
              placeholder="2021"
              value={form.founded}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  founded: e.target.value.replace(/[^0-9]/g, "").slice(0, 4),
                }))
              }
            />
          </Field>
          <Field label="Headquarters">
            <input
              className={inputCls}
              value={form.hq}
              onChange={(e) => setForm((f) => ({ ...f, hq: e.target.value }))}
            />
          </Field>
        </FormSection>

        <FormSection
          title="Company manager (Primary contact)"
          description="We will create a company manager account and email temporary sign-in credentials."
        >
          <Field label="Manager name *" hint="Full legal or professional name">
            <input
              className={inputCls}
              placeholder="e.g. Sarah Connor"
              value={form.managerName}
              onChange={(e) => setForm((f) => ({ ...f, managerName: e.target.value }))}
            />
          </Field>
          <Field label="Designation *" hint="Title or role within the company">
            <input
              className={inputCls}
              placeholder="e.g. VP of People / Talent Lead"
              value={form.managerDesignation}
              onChange={(e) => setForm((f) => ({ ...f, managerDesignation: e.target.value }))}
            />
          </Field>
          <Field label="Work email *" hint="Sign-in email and credentials will be sent here">
            <input
              type="email"
              className={inputCls}
              placeholder="sarah@company.com"
              value={form.managerEmail}
              onChange={(e) => setForm((f) => ({ ...f, managerEmail: e.target.value }))}
            />
          </Field>
          <Field label="Mobile phone *" hint="Direct phone number for outreach">
            <input
              type="tel"
              className={inputCls}
              placeholder="+1 (555) 000-0000"
              value={form.managerMobile}
              onChange={(e) => setForm((f) => ({ ...f, managerMobile: e.target.value }))}
            />
          </Field>
        </FormSection>

        <FormSection
          title={`Why ${form.name.trim() || "[Company]"}?`}
          description="Selling points recruiters can use when pitching candidates."
        >
          <div className="grid gap-3 sm:col-span-2">
            {form.highlights.map((h, i) => (
              <div
                key={i}
                className="grid gap-2 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-2">
                  <input
                    className={inputCls}
                    placeholder="Highlight title"
                    value={h.title}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        highlights: f.highlights.map((x, xi) =>
                          xi === i ? { ...x, title: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                  <button
                    type="button"
                    aria-label="Remove highlight"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        highlights: f.highlights.filter((_, xi) => xi !== i),
                      }))
                    }
                    className="grid size-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <textarea
                  className={textareaCls}
                  placeholder="Description"
                  value={h.description}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      highlights: f.highlights.map((x, xi) =>
                        xi === i ? { ...x, description: e.target.value } : x,
                      ),
                    }))
                  }
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  highlights: [...f.highlights, { title: "", description: "" }],
                }))
              }
              className="justify-self-start text-xs font-semibold text-brand hover:underline"
            >
              + Add highlight
            </button>
          </div>
        </FormSection>

        <FormSection
          title="Leadership"
          description="Key decision makers and their public profiles."
        >
          <div className="grid gap-3 sm:col-span-2">
            {form.leaders.map((l, i) => (
              <div
                key={i}
                className="grid gap-2 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-2">
                  <input
                    className={inputCls}
                    placeholder="Full name"
                    value={l.name}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        leaders: f.leaders.map((x, xi) =>
                          xi === i ? { ...x, name: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                  <button
                    type="button"
                    aria-label="Remove leader"
                    onClick={() =>
                      setForm((f) => ({ ...f, leaders: f.leaders.filter((_, xi) => xi !== i) }))
                    }
                    className="grid size-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <input
                  className={inputCls}
                  placeholder="Co-founder & CEO"
                  value={l.title}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      leaders: f.leaders.map((x, xi) =>
                        xi === i ? { ...x, title: e.target.value } : x,
                      ),
                    }))
                  }
                />
                <input
                  className={inputCls}
                  placeholder="LinkedIn URL"
                  value={l.linkedin}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      leaders: f.leaders.map((x, xi) =>
                        xi === i ? { ...x, linkedin: e.target.value } : x,
                      ),
                    }))
                  }
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  leaders: [...f.leaders, { name: "", title: "", linkedin: "" }],
                }))
              }
              className="justify-self-start text-xs font-semibold text-brand hover:underline"
            >
              + Add leader
            </button>
          </div>
        </FormSection>

        <div className="flex justify-end gap-2 py-5">
          <Btn onClick={() => navigate({ to: "/am/companies" })} disabled={isSubmitting}>
            Cancel
          </Btn>
          <Btn variant="primary" onClick={submit} disabled={isSubmitting || isUploadingLogo}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create company"
            )}
          </Btn>
        </div>
      </div>
    </AmShell>
  );
}
