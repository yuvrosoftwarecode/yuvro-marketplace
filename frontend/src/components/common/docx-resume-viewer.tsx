import { useState } from "react";
import { CheckCheck, Copy, FileText, Globe, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

export function DocxResumeViewer({ text, resumeLink }: { text: string; resumeLink?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Resume text copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Extract name if first line looks like a person's name
  let name = "";
  let contactLine = "";
  let startIndex = 0;

  if (lines.length > 0) {
    const first = lines[0];
    if (
      first.length < 50 &&
      !first.includes("@") &&
      !first.includes("+") &&
      !/^(summary|experience|education|skills|profile)/i.test(first)
    ) {
      name = first;
      startIndex = 1;
    }
  }

  if (lines.length > startIndex) {
    const second = lines[startIndex];
    if (second.includes("@") || second.includes("+") || second.includes("|") || second.includes("http")) {
      contactLine = second;
      startIndex += 1;
    }
  }

  const remainingLines = lines.slice(startIndex);

  // Split contact items
  const contactItems = contactLine
    ? contactLine
        .split("|")
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  const isSectionHeader = (line: string) => {
    const l = line.toLowerCase();
    return (
      line.length < 60 &&
      (line === line.toUpperCase() ||
        /^(professional summary|summary|education|skills|technical skills|key skills|experience|work experience|employment history|projects|academic projects|certifications|awards|languages|interests)/i.test(
          l,
        ))
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Document Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border border-border rounded-t-lg text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 font-semibold text-brand bg-brand/10 px-2.5 py-1 rounded-md">
            <FileText className="size-3.5" /> Microsoft Word (.docx)
          </span>
          <span className="text-muted-foreground hidden sm:inline">
            Formatted Document Preview
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-background hover:bg-accent border border-border text-foreground text-xs font-medium transition-colors"
          >
            {copied ? <CheckCheck className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy text"}
          </button>
        </div>
      </div>

      {/* Paper Sheet Container */}
      <div className="flex-1 overflow-y-auto bg-slate-100/90 dark:bg-zinc-900/90 p-4 sm:p-6 rounded-b-lg border-x border-b border-border shadow-inner max-h-[64vh]">
        <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-950 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-800 p-6 sm:p-10 space-y-5 text-slate-800 dark:text-zinc-200 font-sans">
          {/* Candidate Name Header */}
          {name ? (
            <div className="text-center space-y-2 pb-3 border-b border-border/70">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {name}
              </h1>

              {/* Contact Information Bar */}
              {contactItems.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground pt-1">
                  {contactItems.map((item, idx) => {
                    const isEmail = item.includes("@");
                    const isPhone = item.includes("+") || /^[0-9\s()-]{8,}$/.test(item);
                    const isLink = item.startsWith("http") || item.includes(".com") || item.includes("/") || item.toLowerCase().includes("portfolio");

                    return (
                      <span key={idx} className="inline-flex items-center gap-1.5">
                        {isPhone && <Phone className="size-3 text-brand shrink-0" />}
                        {isEmail && <Mail className="size-3 text-brand shrink-0" />}
                        {!isPhone && !isEmail && isLink && <Globe className="size-3 text-brand shrink-0" />}
                        <span className="font-medium text-foreground/80">{item}</span>
                        {idx < contactItems.length - 1 && <span className="text-muted-foreground/40 hidden sm:inline">·</span>}
                      </span>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Document Content */}
          <div className="space-y-4">
            {remainingLines.map((line, idx) => {
              // Section Header
              if (isSectionHeader(line)) {
                return (
                  <div key={idx} className="pt-3 first:pt-0">
                    <h2 className="text-[13px] font-bold tracking-wider uppercase text-brand flex items-center gap-2 pb-1 border-b border-brand/20">
                      <span>{line}</span>
                    </h2>
                  </div>
                );
              }

              // Key-Value or Skills formatting (e.g. "Programming Languages: Python, Java")
              const colonIndex = line.indexOf(":");
              if (colonIndex > 2 && colonIndex < 35 && !line.startsWith("http")) {
                const category = line.slice(0, colonIndex).trim();
                const rest = line.slice(colonIndex + 1).trim();

                if (rest.includes(",") || category.toLowerCase().includes("skills") || category.toLowerCase().includes("languages") || category.toLowerCase().includes("frameworks")) {
                  const items = rest.split(",").map((s) => s.trim()).filter(Boolean);
                  return (
                    <div key={idx} className="flex flex-wrap items-center gap-1.5 py-0.5">
                      <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100 shrink-0">
                        {category}:
                      </span>
                      <div className="flex flex-wrap items-center gap-1">
                        {items.map((it, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/60 dark:border-zinc-700/60 text-[12px] font-medium text-slate-800 dark:text-zinc-200"
                          >
                            {it}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={idx} className="text-[13px] leading-relaxed py-0.5">
                    <span className="font-semibold text-slate-900 dark:text-zinc-100">{category}: </span>
                    <span className="text-slate-700 dark:text-zinc-300">{rest}</span>
                  </div>
                );
              }

              // Bullet points
              if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*")) {
                const bulletText = line.replace(/^[•\-*]\s*/, "");
                return (
                  <div key={idx} className="flex items-start gap-2 pl-2 text-[13px] leading-relaxed text-slate-700 dark:text-zinc-300">
                    <span className="text-brand font-bold mt-1 shrink-0">•</span>
                    <span>{bulletText}</span>
                  </div>
                );
              }

              // Standard text paragraph
              return (
                <p key={idx} className="text-[13px] leading-relaxed text-slate-700 dark:text-zinc-300">
                  {line}
                </p>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
