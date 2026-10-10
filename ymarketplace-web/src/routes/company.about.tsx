import { useEffect, useRef, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  Check,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Sparkles,
  UploadCloud,
  User,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { CompanySection, CompanyShell } from "@/components/company/company-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { inputCls, textareaCls } from "@/components/am/am-ui";
import { api } from "@/lib/api";
import { signedInCompany } from "@/lib/company-review";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/company/about")({
  head: () => ({
    meta: [
      { title: "About Company — Job Post Setup | Yuvro" },
      {
        name: "description",
        content:
          "Company profile used across job posts: size, funding, highlights and leadership.",
      },
      { property: "og:title", content: "About Company — Job Post Setup | Yuvro" },
      {
        property: "og:description",
        content: "Keep your company profile current so every job post stays compelling.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AboutCompanyPage,
});

type Highlight = {
  title: string;
  description: string;
};

type Leader = {
  name: string;
  title: string;
  linkedin_url?: string;
  linkedin?: string;
};

type CompanyManagerDetail = {
  id?: string;
  name: string;
  designation: string;
  email: string;
  mobile: string;
};

type CompanyData = {
  id?: string;
  slug?: string;
  name: string;
  industry: string;
  website: string;
  headquarters: string;
  company_size: string;
  funding_stage: string;
  founded_year: string | number;
  logo?: string;
  logo_url?: string;
  overview?: string;
  company_manager_detail?: CompanyManagerDetail | null;
  manager_name?: string;
  manager_designation?: string;
  manager_email?: string;
  manager_mobile?: string;
  why_company?: Highlight[] | string;
  leadership?: Leader[];
};

type FormState = {
  name: string;
  industry: string;
  website: string;
  headquarters: string;
  company_size: string;
  funding_stage: string;
  founded_year: string;
  overview: string;
  logo_url: string;
  manager_name: string;
  manager_designation: string;
  manager_email: string;
  manager_mobile: string;
  why_company: Highlight[];
  leadership: { name: string; title: string; linkedin_url: string }[];
};

function parseHighlights(val: unknown): Highlight[] {
  if (Array.isArray(val)) {
    return val.map((item) => {
      if (typeof item === "string") return { title: item, description: "" };
      return {
        title: item?.title || "",
        description: item?.description || "",
      };
    });
  }
  if (typeof val === "string" && val.trim()) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parseHighlights(parsed);
    } catch {
      return [{ title: "About us", description: val }];
    }
  }
  return [];
}

function parseLeaders(val: unknown): { name: string; title: string; linkedin_url: string }[] {
  if (Array.isArray(val)) {
    return val.map((item) => ({
      name: item?.name || "",
      title: item?.title || "",
      linkedin_url: item?.linkedin_url || item?.linkedin || "",
    }));
  }
  if (typeof val === "string" && val.trim()) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parseLeaders(parsed);
    } catch {
      // not json
    }
  }
  return [];
}

function initFormState(data?: CompanyData | null): FormState {
  if (!data) {
    return {
      name: "",
      industry: "",
      website: "",
      headquarters: "",
      company_size: "",
      funding_stage: "",
      founded_year: "",
      overview: "",
      logo_url: "",
      manager_name: "",
      manager_designation: "",
      manager_email: "",
      manager_mobile: "",
      why_company: [{ title: "", description: "" }],
      leadership: [{ name: "", title: "", linkedin_url: "" }],
    };
  }

  const highlights = parseHighlights(data.why_company);
  const leaders = parseLeaders(data.leadership);
  const mgr = data.company_manager_detail;

  return {
    name: data.name || "",
    industry: data.industry || "",
    website: data.website || "",
    headquarters: data.headquarters || "",
    company_size: data.company_size || "",
    funding_stage: data.funding_stage || "",
    founded_year: data.founded_year ? String(data.founded_year) : "",
    overview: data.overview || "",
    logo_url: data.logo_url || data.logo || "",
    manager_name: mgr?.name || data.manager_name || "",
    manager_designation: mgr?.designation || data.manager_designation || "",
    manager_email: mgr?.email || data.manager_email || "",
    manager_mobile: mgr?.mobile || data.manager_mobile || "",
    why_company: highlights.length > 0 ? highlights : [{ title: "", description: "" }],
    leadership: leaders.length > 0 ? leaders : [{ name: "", title: "", linkedin_url: "" }],
  };
}

const COMPANY_SIZE_OPTIONS = [
  "1–10",
  "11–50",
  "51–200",
  "201–500",
  "501–1000",
  "1000+",
];

const FUNDING_STAGE_OPTIONS = [
  "Bootstrapped",
  "Pre-seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C",
  "Series D+",
  "Public",
];

function CardField({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1", className)}>
      <span className="block text-xs font-medium text-foreground">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function AboutCompanyPage() {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<FormState>(initFormState(null));

  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCompanyData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<CompanyData>("/api/marketplace/companies/my/");
      if (res && res.name) {
        setCompany(res);
        setEditForm(initFormState(res));
        setLogoPreview(res.logo_url || res.logo || "");
      } else {
        throw new Error("No company returned");
      }
    } catch {
      const fallback = signedInCompany();
      if (fallback) {
        const mock: CompanyData = {
          name: fallback.name,
          industry: fallback.industry,
          website: fallback.website,
          headquarters: fallback.hq,
          company_size: fallback.size,
          funding_stage: fallback.fundingStage,
          founded_year: fallback.founded,
          overview: fallback.overview,
          logo_url: fallback.logoUrl || fallback.logo,
          manager_name: fallback.managerName || fallback.contacts?.[0]?.name || "",
          manager_designation: fallback.managerDesignation || fallback.contacts?.[0]?.title || "",
          manager_email: fallback.managerEmail || fallback.contacts?.[0]?.email || "",
          manager_mobile: fallback.managerMobile || fallback.contacts?.[0]?.phone || "",
          why_company: fallback.highlights,
          leadership: fallback.leaders,
        };
        setCompany(mock);
        setEditForm(initFormState(mock));
        setLogoPreview(mock.logo_url || "");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const handleStartEdit = () => {
    setEditForm(initFormState(company));
    setLogoFile(null);
    setLogoPreview(company?.logo_url || company?.logo || "");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditForm(initFormState(company));
    setLogoFile(null);
    setLogoPreview(company?.logo_url || company?.logo || "");
    setIsEditing(false);
  };

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
        setEditForm((f) => ({ ...f, logo_url: res.url }));
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
    setEditForm((f) => ({ ...f, logo_url: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (isUploadingLogo) {
      toast.error("Please wait for the logo upload to finish.");
      return;
    }

    const missing = (
      [
        ["Company name", editForm.name],
        ["Website", editForm.website],
        ["Company size", editForm.company_size],
        ["Funding stage", editForm.funding_stage],
        ["Founded year", editForm.founded_year],
      ] as const
    ).filter(([, v]) => !v.trim());

    if (missing.length > 0) {
      toast.error(`Required: ${missing.map(([l]) => l).join(", ")}`);
      return;
    }

    if (
      editForm.manager_email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.manager_email.trim())
    ) {
      toast.error("Please enter a valid work email for the company manager.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        industry: editForm.industry.trim() || "—",
        website: editForm.website.trim(),
        headquarters: editForm.headquarters.trim() || "—",
        company_size: editForm.company_size.trim(),
        funding_stage: editForm.funding_stage.trim(),
        founded_year: editForm.founded_year ? parseInt(editForm.founded_year, 10) || null : null,
        overview: editForm.overview.trim(),
        logo_url: editForm.logo_url.trim(),
        manager_name: editForm.manager_name.trim(),
        manager_designation: editForm.manager_designation.trim(),
        manager_mobile: editForm.manager_mobile.trim(),
        why_company: editForm.why_company.filter(
          (h) => h.title.trim() || h.description.trim(),
        ),
        leadership: editForm.leadership
          .filter((l) => l.name.trim())
          .map((l) => ({
            name: l.name.trim(),
            title: l.title.trim(),
            linkedin_url: l.linkedin_url.trim(),
          })),
      };

      const res = await api.patch<CompanyData>("/api/marketplace/companies/my/", payload);
      if (res) {
        setCompany(res);
        setEditForm(initFormState(res));
      } else {
        const updated: CompanyData = {
          ...company,
          ...payload,
          founded_year: editForm.founded_year,
          manager_email: editForm.manager_email,
        };
        setCompany(updated);
        setEditForm(initFormState(updated));
      }
      toast.success("Company profile updated successfully!");
      setIsEditing(false);
    } catch (err: unknown) {
      console.error("Save company error:", err);
      const msg = err instanceof Error ? err.message : "Failed to update company profile.";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <CompanyShell
        title="About company"
        description="This profile is attached to every job post recruiters work on."
      >
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-brand" />
            Loading company details...
          </div>
        </div>
      </CompanyShell>
    );
  }

  const highlights = parseHighlights(company?.why_company);
  const leaders = parseLeaders(company?.leadership);
  const mgr = company?.company_manager_detail;
  const mgrName = mgr?.name || company?.manager_name || "Not assigned";
  const mgrDesignation = mgr?.designation || company?.manager_designation || "Company Manager";
  const mgrEmail = mgr?.email || company?.manager_email || "";
  const mgrMobile = mgr?.mobile || company?.manager_mobile || "";

  return (
    <CompanyShell
      title={isEditing ? "Edit company profile" : (company?.name || "About company")}
      description="This profile is attached to every job post recruiters work on."
      actions={
        isEditing ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving || isUploadingLogo}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || isUploadingLogo}
              className="gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  Save changes
                </>
              )}
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={handleStartEdit} className="gap-1.5">
            <Edit3 className="size-3.5" />
            Edit details
          </Button>
        )
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Card 1: Company Information */}
          <CompanySection
            title="Company information"
            meta={isEditing ? "Editing" : "Account details"}
          >
            {isEditing ? (
              <div className="space-y-3.5">
                <CardField label="Company name" required>
                  <input
                    className={inputCls}
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Acme Corp"
                  />
                </CardField>

                <div className="grid gap-3 sm:grid-cols-2">
                  <CardField label="Website" required>
                    <input
                      className={inputCls}
                      placeholder="company.com"
                      value={editForm.website}
                      onChange={(e) => setEditForm((f) => ({ ...f, website: e.target.value }))}
                    />
                  </CardField>
                  <CardField label="Industry">
                    <input
                      className={inputCls}
                      placeholder="e.g. Software & SaaS"
                      value={editForm.industry}
                      onChange={(e) => setEditForm((f) => ({ ...f, industry: e.target.value }))}
                    />
                  </CardField>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <CardField label="Company size" required>
                    <select
                      className={inputCls}
                      value={editForm.company_size}
                      onChange={(e) => setEditForm((f) => ({ ...f, company_size: e.target.value }))}
                    >
                      <option value="">Select size</option>
                      {COMPANY_SIZE_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </CardField>

                  <CardField label="Funding stage" required>
                    <select
                      className={inputCls}
                      value={editForm.funding_stage}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, funding_stage: e.target.value }))
                      }
                    >
                      <option value="">Select stage</option>
                      {FUNDING_STAGE_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </CardField>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <CardField label="Founded year" required>
                    <input
                      className={inputCls}
                      inputMode="numeric"
                      placeholder="2021"
                      value={editForm.founded_year}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          founded_year: e.target.value.replace(/[^0-9]/g, "").slice(0, 4),
                        }))
                      }
                    />
                  </CardField>
                  <CardField label="Headquarters">
                    <input
                      className={inputCls}
                      placeholder="e.g. Bengaluru, India"
                      value={editForm.headquarters}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, headquarters: e.target.value }))
                      }
                    />
                  </CardField>
                </div>

                <CardField label="Overview">
                  <textarea
                    className={textareaCls}
                    rows={3}
                    placeholder="Brief description of what your company builds..."
                    value={editForm.overview}
                    onChange={(e) => setEditForm((f) => ({ ...f, overview: e.target.value }))}
                  />
                </CardField>
              </div>
            ) : (
              <div className="space-y-4">
                <dl className="divide-y divide-border/60 text-xs">
                  <div className="flex items-center justify-between py-2 first:pt-0">
                    <dt className="text-muted-foreground">Company name</dt>
                    <dd className="font-semibold text-foreground">{company?.name || "—"}</dd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-muted-foreground">Website</dt>
                    <dd className="font-medium text-foreground">
                      {company?.website ? (
                        <a
                          href={
                            company.website.startsWith("http")
                              ? company.website
                              : `https://${company.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-brand hover:underline"
                        >
                          {company.website.replace(/^https?:\/\//, "")}
                          <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-muted-foreground">Industry</dt>
                    <dd className="font-medium text-foreground">{company?.industry || "—"}</dd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-muted-foreground">Company size</dt>
                    <dd className="font-medium text-foreground">
                      {company?.company_size ? `${company.company_size} employees` : "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-muted-foreground">Funding stage</dt>
                    <dd className="font-medium text-foreground">
                      {company?.funding_stage ? (
                        <Badge variant="outline" className="text-[11px] font-medium">
                          {company.funding_stage}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-muted-foreground">Founded year</dt>
                    <dd className="font-medium text-foreground">{company?.founded_year || "—"}</dd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-muted-foreground">Headquarters</dt>
                    <dd className="font-medium text-foreground">{company?.headquarters || "—"}</dd>
                  </div>
                </dl>

                {company?.overview ? (
                  <div className="rounded-md border border-border bg-surface-sunken/40 p-3">
                    <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                      {company.overview}
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </CompanySection>

          {/* Card 2: Brand Assets */}
          <CompanySection
            title="Brand assets"
            meta={isEditing ? "Upload & branding" : "Logo & identity"}
          >
            {isEditing ? (
              <div className="space-y-3.5">
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

                {logoPreview || editForm.logo_url.trim() ? (
                  <div className="rounded-lg border border-border bg-surface p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative flex size-14 shrink-0 items-center justify-center rounded-md border border-border bg-surface-sunken p-1.5 overflow-hidden">
                          <img
                            src={logoPreview || editForm.logo_url}
                            alt="Logo"
                            className="size-full object-contain"
                          />
                          {isUploadingLogo ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                              <Loader2 className="size-4 animate-spin text-brand" />
                            </div>
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {logoFile?.name || "Company Logo"}
                          </p>
                          <span className="mt-1 inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                            <CheckCircle2 className="size-2.5" /> Stored
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingLogo || isSaving}
                          className="h-8 text-xs"
                        >
                          Replace
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={removeLogo}
                          disabled={isUploadingLogo || isSaving}
                          className="h-8 text-xs text-destructive hover:bg-destructive/10"
                        >
                          Remove
                        </Button>
                      </div>
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
                    className={cn(
                      "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
                      isDragging
                        ? "border-brand bg-brand/5"
                        : "border-border hover:border-brand/60 hover:bg-surface-sunken/40",
                    )}
                  >
                    <div className="grid size-10 place-items-center rounded-full bg-surface-sunken text-muted-foreground">
                      <UploadCloud className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        <span className="text-brand">Click to upload logo</span> or drag and drop
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        PNG, JPG, WEBP, or SVG up to 5MB
                      </p>
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">
                  The logo is attached to job posts and candidate emails to establish branding.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4 rounded-lg border border-border bg-surface-sunken/30 p-4">
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-border bg-surface p-2 shadow-2xs">
                    {company?.logo_url || company?.logo ? (
                      <img
                        src={company.logo_url || company.logo}
                        alt="Logo"
                        className="size-full object-contain"
                      />
                    ) : (
                      <Building2 className="size-8 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-foreground">
                      {company?.logo_url || company?.logo ? "Active Logo" : "No logo uploaded"}
                    </h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {company?.logo_url || company?.logo
                        ? "Used across the marketplace, candidate portal, and job posts."
                        : "Upload a logo to enhance your brand presence when pitching candidates."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CompanySection>

          {/* Card 3: Primary Contact */}
          <CompanySection
            title="Primary contact"
            meta={isEditing ? "Manager credentials" : "Company manager"}
          >
            {isEditing ? (
              <div className="space-y-3.5">
                <CardField label="Manager name" required>
                  <input
                    className={inputCls}
                    placeholder="e.g. Sarah Connor"
                    value={editForm.manager_name}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, manager_name: e.target.value }))
                    }
                  />
                </CardField>

                <CardField label="Designation" required>
                  <input
                    className={inputCls}
                    placeholder="e.g. VP of People / Talent Lead"
                    value={editForm.manager_designation}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, manager_designation: e.target.value }))
                    }
                  />
                </CardField>

                <div className="grid gap-3 sm:grid-cols-2">
                  <CardField label="Work email">
                    <input
                      type="email"
                      className={cn(inputCls, "opacity-75 bg-surface-sunken cursor-not-allowed")}
                      value={editForm.manager_email}
                      disabled
                      readOnly
                    />
                  </CardField>

                  <CardField label="Mobile phone" required>
                    <input
                      type="tel"
                      className={inputCls}
                      placeholder="+1 (555) 000-0000"
                      value={editForm.manager_mobile}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, manager_mobile: e.target.value }))
                      }
                    />
                  </CardField>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-full bg-brand/10 text-brand">
                    <User className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-foreground">{mgrName}</h3>
                    <p className="text-[11px] text-muted-foreground">{mgrDesignation}</p>
                  </div>
                </div>

                <dl className="divide-y divide-border/60 text-xs">
                  <div className="flex items-center justify-between py-2">
                    <dt className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="size-3.5" /> Work email
                    </dt>
                    <dd className="font-medium">
                      {mgrEmail ? (
                        <a
                          href={`mailto:${mgrEmail}`}
                          className="text-brand hover:underline"
                        >
                          {mgrEmail}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <dt className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="size-3.5" /> Mobile phone
                    </dt>
                    <dd className="font-medium text-foreground">
                      {mgrMobile ? (
                        <a href={`tel:${mgrMobile}`} className="hover:underline">
                          {mgrMobile}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </CompanySection>

          {/* Card 4: Why Work Here */}
          <CompanySection
            title="Why work here"
            meta={`${highlights.length} highlight${highlights.length === 1 ? "" : "s"}`}
          >
            {isEditing ? (
              <div className="space-y-3">
                {editForm.why_company.map((h, i) => (
                  <div
                    key={i}
                    className="space-y-2 rounded-md border border-border bg-surface p-3"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        className={inputCls}
                        placeholder="Highlight title (e.g. Culture, Growth, Benefits)"
                        value={h.title}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            why_company: f.why_company.map((x, xi) =>
                              xi === i ? { ...x, title: e.target.value } : x,
                            ),
                          }))
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEditForm((f) => ({
                            ...f,
                            why_company: f.why_company.filter((_, xi) => xi !== i),
                          }))
                        }
                        className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <textarea
                      className={textareaCls}
                      rows={2}
                      placeholder="Details on what makes your company exceptional..."
                      value={h.description}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          why_company: f.why_company.map((x, xi) =>
                            xi === i ? { ...x, description: e.target.value } : x,
                          ),
                        }))
                      }
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditForm((f) => ({
                      ...f,
                      why_company: [...f.why_company, { title: "", description: "" }],
                    }))
                  }
                  className="gap-1.5 text-xs text-brand"
                >
                  <Plus className="size-3.5" /> Add highlight
                </Button>
              </div>
            ) : (
              <div>
                {highlights.length > 0 ? (
                  <div className="space-y-2.5">
                    {highlights.map((h, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-border bg-surface-sunken/30 p-3"
                      >
                        <h4 className="text-xs font-semibold text-foreground">
                          {h.title || "Company Advantage"}
                        </h4>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {h.description || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Highlights shown to candidates on each job post.
                  </p>
                )}
              </div>
            )}
          </CompanySection>

          {/* Card 5: Leadership */}
          <div className="lg:col-span-2">
            <CompanySection
              title="Leadership"
              meta={`${leaders.length} leader${leaders.length === 1 ? "" : "s"}`}
            >
              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {editForm.leadership.map((l, i) => (
                      <div
                        key={i}
                        className="space-y-2 rounded-md border border-border bg-surface p-3"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            className={inputCls}
                            placeholder="Full name (e.g. Alex Morgan)"
                            value={l.name}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                leadership: f.leadership.map((x, xi) =>
                                  xi === i ? { ...x, name: e.target.value } : x,
                                ),
                              }))
                            }
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setEditForm((f) => ({
                                ...f,
                                leadership: f.leadership.filter((_, xi) => xi !== i),
                              }))
                            }
                            className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                        <input
                          className={inputCls}
                          placeholder="Title / Role (e.g. CEO & Co-founder)"
                          value={l.title}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              leadership: f.leadership.map((x, xi) =>
                                xi === i ? { ...x, title: e.target.value } : x,
                              ),
                            }))
                          }
                        />
                        <input
                          className={inputCls}
                          placeholder="LinkedIn URL"
                          value={l.linkedin_url}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              leadership: f.leadership.map((x, xi) =>
                                xi === i ? { ...x, linkedin_url: e.target.value } : x,
                              ),
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditForm((f) => ({
                        ...f,
                        leadership: [
                          ...f.leadership,
                          { name: "", title: "", linkedin_url: "" },
                        ],
                      }))
                    }
                    className="gap-1.5 text-xs text-brand"
                  >
                    <Plus className="size-3.5" /> Add leader
                  </Button>
                </div>
              ) : (
                <div>
                  {leaders.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {leaders.map((l, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-sunken/30 p-3"
                        >
                          <div className="min-w-0">
                            <h4 className="truncate text-xs font-semibold text-foreground">
                              {l.name || "Leader"}
                            </h4>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {l.title || "Executive"}
                            </p>
                          </div>
                          {l.linkedin_url ? (
                            <a
                              href={
                                l.linkedin_url.startsWith("http")
                                  ? l.linkedin_url
                                  : `https://${l.linkedin_url}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="grid size-7 shrink-0 place-items-center rounded-md border border-border bg-surface text-muted-foreground hover:text-brand transition-colors"
                              title="LinkedIn Profile"
                            >
                              <ExternalLink className="size-3.5" />
                            </a>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Founders and hiring leads with their profile links.
                    </p>
                  )}
                </div>
              )}
            </CompanySection>
          </div>
        </div>

        {/* Bottom Save Bar when editing */}
        {isEditing ? (
          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving || isUploadingLogo}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || isUploadingLogo}
              className="gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving changes...
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  Save changes
                </>
              )}
            </Button>
          </div>
        ) : null}
      </div>
    </CompanyShell>
  );
}
