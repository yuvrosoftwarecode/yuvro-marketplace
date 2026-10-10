import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

type MarkdownContentProps = {
  content?: string | null;
  className?: string;
};

type Block =
  | { type: "h1" | "h2" | "h3" | "h4"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "p"; text: string }
  | { type: "codeblock"; lang?: string; code: string }
  | { type: "blockquote"; text: string }
  | { type: "hr" };

function parseInline(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    // Bold: **text** or __text__
    const boldMatch = remaining.match(/^(\*\*|__)(.+?)\1/);
    if (boldMatch) {
      tokens.push(
        <strong key={`b-${keyIndex++}`} className="font-semibold text-foreground">
          {parseInline(boldMatch[2])}
        </strong>,
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic: *text* or _text_
    const italicMatch = remaining.match(/^(\*|_)(.+?)\1/);
    if (italicMatch && !italicMatch[2].startsWith("*")) {
      tokens.push(
        <em key={`i-${keyIndex++}`} className="italic">
          {parseInline(italicMatch[2])}
        </em>,
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Inline code: `text`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push(
        <code
          key={`c-${keyIndex++}`}
          className="rounded bg-surface-sunken px-1.5 py-0.5 text-[12px] font-mono font-medium text-foreground border border-border/50"
        >
          {codeMatch[1]}
        </code>,
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Link: [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      tokens.push(
        <a
          key={`a-${keyIndex++}`}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="text-brand font-medium underline underline-offset-2 hover:opacity-80 transition-opacity"
        >
          {linkMatch[1]}
        </a>,
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Plain text up to the next special char (*, _, `, [)
    const nextSpecialIndex = remaining.search(/[\*_`\[]/);
    if (nextSpecialIndex === -1) {
      tokens.push(remaining);
      break;
    } else if (nextSpecialIndex === 0) {
      tokens.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      tokens.push(remaining.slice(0, nextSpecialIndex));
      remaining = remaining.slice(nextSpecialIndex);
    }
  }

  return tokens;
}

function parseMarkdownBlocks(rawContent: string): Block[] {
  if (!rawContent || !rawContent.trim()) return [];

  // Normalize newlines and ensure headings/lists clumped together start on fresh lines
  const normalized = rawContent
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Ensure headings have newlines before them even if inline
    .replace(/([^\n])\s+(#{1,4}\s+)/g, "$1\n\n$2")
    // Ensure list items have newlines before them even if inline
    .replace(/([^\n])\s+([*•\-]\s+)/g, "$1\n$2")
    // Ensure numbered lists have newlines before them even if inline
    .replace(/([^\n])\s+(\d+\.\s+)/g, "$1\n$2");

  const lines = normalized.split("\n");
  const blocks: Block[] = [];
  let currentUl: string[] | null = null;
  let currentOl: string[] | null = null;
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockLines: string[] = [];

  const flushLists = () => {
    if (currentUl && currentUl.length > 0) {
      blocks.push({ type: "ul", items: currentUl });
      currentUl = null;
    }
    if (currentOl && currentOl.length > 0) {
      blocks.push({ type: "ol", items: currentOl });
      currentOl = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block toggle
    if (trimmed.startsWith("```")) {
      flushLists();
      if (inCodeBlock) {
        blocks.push({
          type: "codeblock",
          lang: codeBlockLang,
          code: codeBlockLines.join("\n"),
        });
        inCodeBlock = false;
        codeBlockLines = [];
        codeBlockLang = "";
      } else {
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Blank line
    if (!trimmed) {
      flushLists();
      continue;
    }

    // Horizontal rule
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      flushLists();
      blocks.push({ type: "hr" });
      continue;
    }

    // Headings
    const h1Match = trimmed.match(/^#\s+(.+)$/);
    if (h1Match) {
      flushLists();
      blocks.push({ type: "h1", text: h1Match[1] });
      continue;
    }

    const h2Match = trimmed.match(/^##\s+(.+)$/);
    if (h2Match) {
      flushLists();
      blocks.push({ type: "h2", text: h2Match[1] });
      continue;
    }

    const h3Match = trimmed.match(/^###\s+(.+)$/);
    if (h3Match) {
      flushLists();
      blocks.push({ type: "h3", text: h3Match[1] });
      continue;
    }

    const h4Match = trimmed.match(/^####\s+(.+)$/);
    if (h4Match) {
      flushLists();
      blocks.push({ type: "h4", text: h4Match[1] });
      continue;
    }

    // Blockquote
    const quoteMatch = trimmed.match(/^>\s*(.+)$/);
    if (quoteMatch) {
      flushLists();
      blocks.push({ type: "blockquote", text: quoteMatch[1] });
      continue;
    }

    // Bullet lists (*, -, •)
    const bulletMatch = trimmed.match(/^[*•\-]\s+(.+)$/);
    if (bulletMatch) {
      if (currentOl) {
        blocks.push({ type: "ol", items: currentOl });
        currentOl = null;
      }
      if (!currentUl) currentUl = [];
      currentUl.push(bulletMatch[1]);
      continue;
    }

    // Ordered lists (1., 2.)
    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      if (currentUl) {
        blocks.push({ type: "ul", items: currentUl });
        currentUl = null;
      }
      if (!currentOl) currentOl = [];
      currentOl.push(orderedMatch[1]);
      continue;
    }

    // Regular Paragraph
    flushLists();
    blocks.push({ type: "p", text: trimmed });
  }

  flushLists();
  if (inCodeBlock && codeBlockLines.length > 0) {
    blocks.push({
      type: "codeblock",
      lang: codeBlockLang,
      code: codeBlockLines.join("\n"),
    });
  }

  return blocks;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const blocks = useMemo(() => parseMarkdownBlocks(content || ""), [content]);

  if (!content || !content.trim() || blocks.length === 0) {
    return <p className="text-[13px] text-muted-foreground">No description provided.</p>;
  }

  return (
    <div className={cn("markdown-content space-y-3 text-[13.5px] leading-relaxed", className)}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "h1":
            return (
              <h1
                key={idx}
                className="text-base font-bold tracking-tight text-foreground pt-2 pb-1 border-b border-border/60 first:pt-0"
              >
                {parseInline(block.text)}
              </h1>
            );
          case "h2":
            return (
              <h2
                key={idx}
                className="text-[14px] font-semibold tracking-tight text-foreground pt-2.5 pb-0.5 first:pt-0"
              >
                {parseInline(block.text)}
              </h2>
            );
          case "h3":
            return (
              <h3
                key={idx}
                className="text-[13px] font-semibold text-foreground pt-1.5 first:pt-0"
              >
                {parseInline(block.text)}
              </h3>
            );
          case "h4":
            return (
              <h4 key={idx} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1">
                {parseInline(block.text)}
              </h4>
            );
          case "ul":
            return (
              <ul key={idx} className="my-1.5 space-y-1 pl-1">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex gap-2 text-[13px] leading-5 text-foreground">
                    <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-border-strong" />
                    <span className="min-w-0 flex-1">{parseInline(item)}</span>
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={idx} className="my-1.5 space-y-1 pl-1">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex gap-2 text-[13px] leading-5 text-foreground">
                    <span className="mt-0.5 font-mono text-xs font-semibold text-muted-foreground shrink-0 w-4">
                      {itemIdx + 1}.
                    </span>
                    <span className="min-w-0 flex-1">{parseInline(item)}</span>
                  </li>
                ))}
              </ol>
            );
          case "p":
            return (
              <p key={idx} className="text-[13px] leading-5 text-muted-foreground">
                {parseInline(block.text)}
              </p>
            );
          case "blockquote":
            return (
              <blockquote
                key={idx}
                className="border-l-2 border-brand/50 bg-surface-sunken/40 px-3 py-1.5 text-[13px] italic text-muted-foreground rounded-r"
              >
                {parseInline(block.text)}
              </blockquote>
            );
          case "codeblock":
            return (
              <pre
                key={idx}
                className="overflow-x-auto rounded-md border border-border bg-surface-sunken p-2.5 text-xs font-mono text-foreground"
              >
                <code>{block.code}</code>
              </pre>
            );
          case "hr":
            return <hr key={idx} className="border-border/60 my-3" />;
          default:
            return null;
        }
      })}
    </div>
  );
}
