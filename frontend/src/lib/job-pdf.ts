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

const clean = (s: string) =>
  s.replace(/[–—]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/·/g, "-").replace(/[^\x20-\x7E\n]/g, "");

export async function downloadJobPdf(job: Job) {
  try {
    const jspdfModule = "jspdf";
    const { jsPDF } = await import(/* @vite-ignore */ jspdfModule);
    const doc = new jsPDF({ unit: "pt", format: "a4" });
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

    // Header band
    const bandH = 84;
    doc.setFillColor(...TINT);
    doc.rect(0, 0, W, bandH, "F");
    doc.setFillColor(...NAVY);
    doc.roundedRect(M, 18, 48, 48, 8, 8, "F");
    font(14, "bold", [255, 255, 255]);
    doc.text(clean(job.companyShort || job.company.slice(0, 2)).toUpperCase(), M + 24, 47, { align: "center" });
    font(20, "bold", INK);
    doc.text(doc.splitTextToSize(clean(job.title), CW - 70)[0] as string, M + 64, 40);
    font(10.5, "normal", MUTED);
    doc.text(clean(job.company + (job.formerly ? ` (formerly ${job.formerly})` : "")), M + 64, 58);
    y = bandH + 16;

    // Company stats strip
    const stats: [string, string, boolean?][] = [
      ["STAGE", job.fundingStage || "-"],
      ["WEBSITE", job.website || "-", true],
      ["TEAM SIZE", job.companySize || "-"],
      ["FOUNDED", String(job.founded || "-")],
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
    });
    y += 64;

    // Key Job Info table
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
      ["Head Count", `${job.openings} role${job.openings === 1 ? "" : "s"}`],
      ["Bounty", `${job.reward} - ${job.rewardPct} - 30-60-90`],
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

    // Job Description
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

    const companyBlurb = job.about?.find((s) => s.heading.toLowerCase().includes("company"))?.body ?? job.repeatFounders;
    sub(`About ${job.company}`);
    if (companyBlurb) para(companyBlurb, X, TW);

    for (const s of (job.about || []).filter((s) => !s.heading.toLowerCase().includes("company"))) {
      sub(s.heading);
      if (/responsib|own/i.test(s.heading)) {
        s.body.split(/\.\s+/).map((x) => x.replace(/\.$/, "").trim()).filter(Boolean).forEach((t) => item(t));
      } else para(s.body, X, TW);
    }

    if (job.requirements?.length) {
      sub("Must-Have");
      job.requirements.forEach((r, i) => item(r, i + 1));
    }

    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setDrawColor(...LINE);
      doc.line(M, H - 34, W - M, H - 34);
      font(8, "normal", MUTED);
      doc.text(`Page ${p} of ${pages}`, M, H - 22);
      doc.text("Generated by Yuvro", W - M, H - 22, { align: "right" });
    }

    const slug = `${job.companyShort || job.company}-${job.title}`.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
    doc.save(`${slug}_JD.pdf`);
  } catch {
    window.print();
  }
}
