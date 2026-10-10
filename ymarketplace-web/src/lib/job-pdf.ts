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

    type StyledWord = { text: string; bold: boolean };

    const tokenizeMarkdownInline = (text: string): StyledWord[] => {
      const words: StyledWord[] = [];
      const segments = text.split(/(\*\*[\s\S]*?\*\*|__[\s\S]*?__)/g);

      for (const seg of segments) {
        if (!seg) continue;
        let isBold = false;
        let raw = seg;
        if (
          (raw.startsWith("**") && raw.endsWith("**") && raw.length >= 4) ||
          (raw.startsWith("__") && raw.endsWith("__") && raw.length >= 4)
        ) {
          isBold = true;
          raw = raw.slice(2, -2);
        }
        raw = raw.replace(/`([^`]+)`/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
        const splitWords = raw.split(/\s+/).filter(Boolean);
        for (const w of splitWords) {
          const cleaned = clean(w.replace(/\*\*/g, "").replace(/__/g, ""));
          if (cleaned) {
            words.push({ text: cleaned, bold: isBold });
          }
        }
      }
      return words;
    };

    const renderStyledWords = (
      words: StyledWord[],
      x: number,
      w: number,
      size = 9.5,
      color: RGB = BODY
    ) => {
      if (words.length === 0) return;
      const lh = size * 1.45;

      type LineWord = { text: string; bold: boolean };
      const lines: LineWord[][] = [];
      let currentLine: LineWord[] = [];
      let currentLineWidth = 0;

      for (const word of words) {
        font(size, word.bold ? "bold" : "normal", color);
        const wordWidth = doc.getTextWidth(word.text);
        const spaceWidth = doc.getTextWidth(" ");
        const needed = currentLine.length === 0 ? wordWidth : currentLineWidth + spaceWidth + wordWidth;

        if (currentLine.length > 0 && needed > w) {
          lines.push(currentLine);
          currentLine = [word];
          font(size, word.bold ? "bold" : "normal", color);
          currentLineWidth = doc.getTextWidth(word.text);
        } else {
          currentLine.push(word);
          currentLineWidth = needed;
        }
      }
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }

      for (const line of lines) {
        ensure(lh);
        let curX = x;
        for (let i = 0; i < line.length; i++) {
          const seg = line[i];
          font(size, seg.bold ? "bold" : "normal", color);
          doc.text(seg.text, curX, y + size);
          curX += doc.getTextWidth(seg.text);
          if (i < line.length - 1) {
            curX += doc.getTextWidth(" ");
          }
        }
        y += lh;
      }
    };

    const sub = (s: string) => {
      ensure(30);
      y += 8;
      font(11.5, "bold", INK);
      doc.text(clean(s), X, y + 11.5);
      y += 18;
    };

    const item = (s: string, n?: number) => {
      ensure(14);
      font(9.5, n ? "bold" : "normal", MUTED);
      doc.text(n ? `${n}.` : "\u2022", X + 4, y + 9.5);
      const words = tokenizeMarkdownInline(s);
      renderStyledWords(words, n ? X + 18 : X + 16, n ? TW - 18 : TW - 16, 9.5, BODY);
      y += 2.5;
    };

    const renderMarkdownContent = (rawMarkdown: string) => {
      if (!rawMarkdown || !rawMarkdown.trim()) return;

      const normalized = rawMarkdown
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/([^\n])\s+(#{1,4}\s+)/g, "$1\n\n$2")
        .replace(/([^\n])\s+([*•\-]\s+)/g, "$1\n$2")
        .replace(/([^\n])\s+(\d+\.\s+)/g, "$1\n$2");

      const lines = normalized.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed) {
          y += 3;
          continue;
        }

        if (trimmed.startsWith("# ")) {
          ensure(32);
          y += 8;
          font(13.5, "bold", INK);
          const t = clean(trimmed.slice(2).replace(/\*\*/g, "").trim());
          doc.text(t, X, y + 13.5);
          y += 20;
        } else if (trimmed.startsWith("## ")) {
          ensure(26);
          y += 6;
          font(11.5, "bold", INK);
          const t = clean(trimmed.slice(3).replace(/\*\*/g, "").trim());
          doc.text(t, X, y + 11.5);
          y += 18;
        } else if (trimmed.startsWith("### ") || trimmed.startsWith("#### ")) {
          ensure(22);
          y += 4;
          font(10.5, "bold", INK);
          const t = clean(trimmed.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim());
          doc.text(t, X, y + 10.5);
          y += 16;
        } else if (/^[-*•+]\s+/.test(trimmed)) {
          const bulletText = trimmed.replace(/^[-*•+]\s+/, "").trim();
          item(bulletText);
        } else if (/^\d+\.\s+/.test(trimmed)) {
          const match = trimmed.match(/^(\d+)\.\s+(.+)$/);
          if (match) {
            item(match[2].trim(), Number(match[1]));
          } else {
            const words = tokenizeMarkdownInline(trimmed);
            renderStyledWords(words, X, TW, 9.5, BODY);
            y += 3.5;
          }
        } else {
          const words = tokenizeMarkdownInline(trimmed);
          renderStyledWords(words, X, TW, 9.5, BODY);
          y += 3.5;
        }
      }
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
      renderMarkdownContent(companyBlurb);
    }

    const roleContent =
      job.jobDescription ||
      aboutList
        .filter((s) => !s?.heading?.toLowerCase().includes("company"))
        .map((s) => (s?.heading && !s.heading.toLowerCase().includes("overview") ? `## ${s.heading}\n\n${s.body}` : s?.body || ""))
        .join("\n\n");

    if (roleContent && roleContent.trim()) {
      renderMarkdownContent(roleContent);
    } else {
      for (const s of aboutList.filter((s) => !s?.heading?.toLowerCase().includes("company"))) {
        if (!s) continue;
        if (!s.heading?.toLowerCase().includes("overview")) {
          sub(s.heading || "Details");
        }
        renderMarkdownContent(s.body || "");
      }
    }

    const reqs =
      (Array.isArray(job.mustHaves) && job.mustHaves.length > 0 ? job.mustHaves : job.requirements) ||
      [];
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
      bens.forEach((b) => {
        const rawItems = Array.isArray(b.items) ? b.items : [b.items];
        const items = rawItems
          .flatMap((it) => {
            const s = String(it ?? "").trim();
            if (s.includes("\n")) return s.split("\n");
            if (s.includes(" · ")) return s.split(" · ");
            if (s.includes("•")) return s.split("•");
            if (s.includes(";")) return s.split(";");
            return [s];
          })
          .map((x) => x.trim().replace(/^[-*•]\s*/, ""))
          .filter(Boolean);

        if (b.group && b.group !== "Company Benefits" && b.group !== "Perks") {
          ensure(18);
          font(10, "bold", INK);
          doc.text(clean(b.group), X + 4, y + 10);
          y += 14;
        }

        items.forEach((benefit) => {
          item(benefit);
        });
      });
    }

    // ---------- Footer ----------
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setDrawColor(...LINE);
      doc.line(M, H - 34, W - M, H - 34);
      font(8, "normal", MUTED);
      doc.text(`Page ${p} of ${pages}`, M, H - 22);
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
