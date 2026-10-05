import type { Job } from "@/lib/data";

type RGB = [number, number, number];
const INK: RGB = [18, 26, 48];
const BODY: RGB = [55, 62, 78];
const MUTED: RGB = [120, 126, 140];
const LINE: RGB = [222, 226, 234];
const TINT: RGB = [238, 241, 250];
const SHADE: RGB = [246, 247, 250];
const NAVY: RGB = [22, 33, 62];
const LINK: RGB = [37, 78, 170];

const clean = (s?: unknown) =>
  String(s ?? "")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/·/g, "-")
    .replace(/[^\x20-\x7E\n]/g, "");

async function loadLogoImage(url: string): Promise<string | null> {
  if (typeof window === "undefined" || !url) return null;
  if (url.startsWith("data:image/png") || url.startsWith("data:image/jpeg")) return url;

  const resolvedUrl = url.includes("minio:9000")
    ? url.replace("minio:9000", "localhost:9000")
    : url;

  const toPngViaImage = (src: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width || 96;
          canvas.height = img.naturalHeight || img.height || 96;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
            return;
          }
        } catch {
          // If canvas is tainted or context unavailable
        }
        resolve(null);
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  };

  try {
    const res = await fetch(resolvedUrl);
    if (res.ok) {
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const png = await toPngViaImage(objectUrl);
      URL.revokeObjectURL(objectUrl);
      if (png) return png;
    }
  } catch {
    // Fall back to direct image loading
  }

  return await toPngViaImage(resolvedUrl);
}

let cachedJsPDF: any = null;
if (typeof window !== "undefined") {
  import("jspdf").then((m) => {
    cachedJsPDF = m.jsPDF;
  }).catch(() => {});
}

const logoDataUrlCache = new Map<string, string>();

function getRenderedLogoDataUrl(url: string): string | null {
  if (typeof document === "undefined" || !url) return null;
  const imgs = Array.from(document.querySelectorAll<HTMLImageElement>("img"));
  const matched = imgs.find(
    (img) =>
      img.src === url ||
      img.currentSrc === url ||
      (url && img.src && (img.src.includes(url) || url.includes(img.src)))
  );
  if (matched && matched.complete && matched.naturalWidth > 0) {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = matched.naturalWidth;
      canvas.height = matched.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(matched, 0, 0);
        return canvas.toDataURL("image/png");
      }
    } catch {
      // tainted canvas or other error
    }
  }
  return null;
}

export async function preloadJobLogo(url?: string): Promise<string | null> {
  if (!url) return null;
  const cached = logoDataUrlCache.get(url);
  if (cached) return cached;
  const dataUrl = await loadLogoImage(url);
  if (dataUrl) {
    logoDataUrlCache.set(url, dataUrl);
  }
  return dataUrl;
}

export async function downloadJobPdf(job: Job) {
  try {
    const jsPdfClass = cachedJsPDF || (await import("jspdf")).jsPDF;
    const doc = new jsPdfClass({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 40;
    const CW = W - M * 2;
    const BOTTOM = H - 48;
    let y = 0;

    const font = (size: number, style: "normal" | "bold" = "normal", color: RGB = BODY) => {
      doc.setFont("helvetica", style);
      doc.setFontSize(size);
      doc.setTextColor(...color);
    };
    const ensure = (h: number) => {
      if (y + h > BOTTOM) {
        doc.addPage();
        y = M;
      }
    };
    const para = (s: string, x: number, w: number, size = 9.5, style: "normal" | "bold" = "normal", color: RGB = BODY) => {
      font(size, style, color);
      const lh = size * 1.5;
      for (const l of doc.splitTextToSize(clean(s), w) as string[]) {
        ensure(lh);
        doc.text(l, x, y + size);
        y += lh;
      }
    };

    // ---------- Header band ----------
    const bandH = 84;
    doc.setFillColor(...TINT);
    doc.rect(0, 0, W, bandH, "F");

    const logoCandidate =
      job.logoUrl ||
      (job as any).logo_url ||
      (job as any).logo ||
      (job as any).company?.logo_url ||
      (job as any).company?.logo;

    let logoDataUrl: string | null = null;
    if (logoCandidate) {
      logoDataUrl =
        logoDataUrlCache.get(logoCandidate) ||
        getRenderedLogoDataUrl(logoCandidate);

      if (!logoDataUrl) {
        logoDataUrl = await loadLogoImage(logoCandidate);
        if (logoDataUrl) {
          logoDataUrlCache.set(logoCandidate, logoDataUrl);
        }
      }
    }

    if (logoDataUrl) {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...LINE);
      doc.roundedRect(M, 18, 48, 48, 8, 8, "FD");
      try {
        doc.addImage(logoDataUrl, "PNG", M + 4, 22, 40, 40, undefined, "FAST");
      } catch (err) {
        console.warn("Could not render logo in PDF, falling back to text:", err);
        doc.setFillColor(...NAVY);
        doc.roundedRect(M, 18, 48, 48, 8, 8, "F");
        font(14, "bold", [255, 255, 255]);
        doc.text(clean(job.companyShort || (job.company || "CO").slice(0, 2)).toUpperCase(), M + 24, 47, { align: "center" });
      }
    } else {
      doc.setFillColor(...NAVY);
      doc.roundedRect(M, 18, 48, 48, 8, 8, "F");
      font(14, "bold", [255, 255, 255]);
      doc.text(clean(job.companyShort || (job.company || "CO").slice(0, 2)).toUpperCase(), M + 24, 47, { align: "center" });
    }

    font(20, "bold", INK);
    doc.text(doc.splitTextToSize(clean(job.title || "Job Title"), CW - 70)[0] as string, M + 64, 40);
    font(10.5, "normal", MUTED);
    doc.text(clean((job.company || "Company") + (job.formerly ? ` (formerly ${job.formerly})` : "")), M + 64, 58);
    y = bandH + 16;

    // ---------- Company stats strip ----------
    const rawFounded =
      job.founded && job.founded !== "—" && job.founded !== "-"
        ? String(job.founded)
        : (job as any).founded_year
        ? String((job as any).founded_year)
        : (job as any).company?.founded_year
        ? String((job as any).company?.founded_year)
        : "-";
    const foundedVal = rawFounded && rawFounded.trim() ? rawFounded.trim() : "-";

    const stats: [string, string, boolean?][] = [
      ["STAGE", job.fundingStage || "-"],
      ["WEBSITE", job.website || "-", true],
      ["TEAM SIZE", job.companySize || "-"],
      ["FOUNDED", clean(foundedVal)],
    ];
    const sw = CW / stats.length;
    doc.setDrawColor(...LINE);
    doc.setFillColor(...SHADE);
    doc.rect(M, y, CW, 44, "FD");
    stats.forEach(([l, v, link], i) => {
      const cx = M + sw * i + sw / 2;
      if (i) doc.line(M + sw * i, y + 8, M + sw * i, y + 36);
      font(7, "bold", MUTED);
      doc.text(l, cx, y + 16, { align: "center" });
      font(9.5, "bold", link ? LINK : INK);
      const val = clean(v);
      doc.text(val, cx, y + 31, { align: "center" });
      if (link && v && String(v).startsWith("http")) doc.link(cx - doc.getTextWidth(val) / 2, y + 22, doc.getTextWidth(val), 12, { url: String(v) });
    });
    y += 64;

    // ---------- Key Job Info table ----------
    font(13, "bold", INK);
    doc.text("Key Job Info", M, y + 12);
    y += 24;
    const info: [string, string][] = [
      ["Location", job.location || "Not specified"],
      ["Work Type", job.workModel || "Not specified"],
      ["Employment", job.employmentType || "Not specified"],
      ["Experience", job.experience || "Not specified"],
      ["Salary Range", (job.salary || "Not specified") + (job.equity ? ` + equity ${job.equity}` : "")],
      ["Visa Sponsorship", job.visaSponsorship || "Not specified"],
    ];
    const half = CW / 2;
    const labW = 92;
    for (let i = 0; i < info.length; i += 2) {
      font(9, "normal", BODY);
      const rows = [info[i], info[i + 1]].map((c) => (c ? (doc.splitTextToSize(clean(c[1]), half - labW - 16) as string[]) : []));
      const rh = Math.max(26, Math.max(...rows.map((r) => r.length)) * 13 + 13);
      ensure(rh);
      [info[i], info[i + 1]].forEach((c, k) => {
        if (!c) return;
        const x = M + k * half;
        doc.setDrawColor(...LINE);
        doc.setFillColor(...SHADE);
        doc.rect(x, y, labW, rh, "FD");
        doc.rect(x + labW, y, half - labW, rh, "S");
        font(8.5, "bold", INK);
        doc.text(c[0], x + 8, y + 16);
        font(9, "normal", BODY);
        rows[k]!.forEach((l, j) => doc.text(l, x + labW + 8, y + 16 + j * 13));
      });
      y += rh;
    }
    y += 22;

    // ---------- Job Description ----------
    ensure(40);
    font(13, "bold", INK);
    doc.text("Job Description", M, y + 12);
    doc.setDrawColor(...LINE);
    doc.line(M, y + 20, W - M, y + 20);
    y += 30;
    const X = M + 10;
    const TW = CW - 20;
    const sub = (s: string) => {
      ensure(34);
      y += 6;
      font(11, "bold", INK);
      doc.text(clean(s), X, y + 11);
      y += 20;
    };
    const item = (s: string, n?: number) => {
      font(9.5, "normal", MUTED);
      ensure(14);
      doc.text(n ? `${n}.` : "\u2022", X + 4, y + 9.5);
      para(s, X + 18, TW - 18);
      y += 2;
    };

    const aboutList = Array.isArray(job.about) ? job.about : [];
    const rawBlurb =
      aboutList.find((s) => s?.heading?.toLowerCase().includes("company"))?.body ||
      job.companyOverview ||
      (job.repeatFounders && job.repeatFounders !== "—" && job.repeatFounders !== "-"
        ? job.repeatFounders
        : "");
    const companyBlurb =
      rawBlurb && rawBlurb !== "—" && rawBlurb !== "-" ? rawBlurb.trim() : "";

    if (companyBlurb) {
      sub(`About ${job.company || "Company"}`);
      para(companyBlurb, X, TW);
    }

    for (const s of aboutList.filter((s) => !s?.heading?.toLowerCase().includes("company"))) {
      if (!s) continue;
      sub(s.heading || "Details");
      if (/responsib|own/i.test(s.heading || "")) {
        String(s.body || "").split(/\.\s+/).map((x) => x.replace(/\.$/, "").trim()).filter(Boolean).forEach((t) => item(t));
      } else para(s.body || "", X, TW);
    }

    const reqs = Array.isArray(job.requirements) ? job.requirements : [];
    if (reqs.length) {
      sub("Must-Have");
      reqs.forEach((r, i) => item(r, i + 1));
    }
    const nice = Array.isArray(job.greenFlags) ? job.greenFlags : [];
    if (nice.length) {
      sub("Nice-to-Have");
      nice.forEach((r) => item(r));
    }
    const bens = Array.isArray(job.benefits) ? job.benefits : [];
    if (bens.length) {
      sub("Benefits & Perks");
      bens.forEach((b) => item(`${b.group || "Perks"}: ${Array.isArray(b.items) ? b.items.join(", ") : b.items || ""}`));
    }

    // ---------- Footer ----------
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setDrawColor(...LINE);
      doc.line(M, H - 34, W - M, H - 34);
      font(8, "normal", MUTED);
      doc.text(`Page ${p} of ${pages}`, M, H - 22);
      doc.text("Generated by Yuvro", W - M, H - 22, { align: "right" });
    }

    const slug = `${clean(job.companyShort || job.company || "Job")}-${clean(job.title || "JD")}`.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
    const filename = `${slug || "Job"}_JD.pdf`;

    try {
      const blob = doc.output("blob");
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        } catch {
          // cleanup
        }
      }, 500);
    } catch {
      doc.save(filename);
    }
  } catch (err) {
    console.error("Failed to generate job PDF:", err);
  }
}
