import { unzlibSync, inflateSync, unzipSync } from "fflate";

export interface ParsedResume {
  fileName: string;
  fileSize: number;
  text: string;
  email?: string;
  phone?: string;
  name?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

/**
 * Parses a File (PDF or DOCX) and returns extracted contact details and text.
 */
export async function parseResumeFile(file: File): Promise<ParsedResume> {
  const fileName = file.name;
  const fileSize = file.size;
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  let extractedText = "";
  let uriLinks: string[] = [];
  let rawPdfText = "";

  try {
    const arrayBuffer = await file.arrayBuffer();

    if (ext === "docx") {
      const docxResult = await extractFromDocx(arrayBuffer);
      extractedText = docxResult.text;
      uriLinks = docxResult.links;
    } else if (ext === "pdf") {
      const pdfResult = await extractFromPdf(arrayBuffer);
      extractedText = pdfResult.text;
      uriLinks = pdfResult.links;
      rawPdfText = pdfResult.rawText || "";
    } else {
      const decoder = new TextDecoder("utf-8", { fatal: false });
      extractedText = decoder.decode(arrayBuffer);
    }
  } catch (err) {
    console.warn("Error parsing resume file buffer:", err);
  }

  // Combine extracted text with URI links and raw PDF text for comprehensive parsing
  const combinedCorpus = [extractedText, ...uriLinks, rawPdfText].join("\n");

  const email = extractEmail(combinedCorpus);
  const phone =
    extractPhone(combinedCorpus) ||
    extractPhone(extractedText) ||
    extractPhone(rawPdfText);
  const name =
    extractPossibleName(extractedText, fileName) ||
    extractPossibleName(rawPdfText, fileName);
  const linkedin = extractLinkedIn(combinedCorpus);
  const github = extractGitHub(combinedCorpus);
  const portfolio = extractPortfolio(combinedCorpus, uriLinks);

  return {
    fileName,
    fileSize,
    text: extractedText,
    email,
    phone,
    name,
    linkedin,
    github,
    portfolio,
  };
}

// ==========================================
// PDF EXTRACTION ENGINE
// ==========================================

async function extractFromPdf(buffer: ArrayBuffer): Promise<{ text: string; links: string[]; rawText: string }> {
  const bytes = new Uint8Array(buffer);
  const chunks: string[] = [];
  const links: string[] = [];

  // 1. Extract URI annotations from raw PDF (mailto, linkedin, github, tel, etc.)
  const latin1Decoder = new TextDecoder("latin1");
  const rawLatin1 = latin1Decoder.decode(bytes);

  const uriRegex = /\/URI\s*\(([^)]+)\)/gi;
  let uriMatch: RegExpExecArray | null;
  while ((uriMatch = uriRegex.exec(rawLatin1)) !== null) {
    if (uriMatch[1]) {
      const decodedUri = decodePdfString(uriMatch[1]);
      if (decodedUri) links.push(decodedUri);
    }
  }

  // Also extract hex-encoded URIs: /URI <68747470...>
  const hexUriRegex = /\/URI\s*<([0-9a-fA-F]+)>/gi;
  let hexUriMatch: RegExpExecArray | null;
  while ((hexUriMatch = hexUriRegex.exec(rawLatin1)) !== null) {
    if (hexUriMatch[1]) {
      const decoded = decodeHexPdfString(hexUriMatch[1]);
      if (decoded) links.push(decoded);
    }
  }

  // Also extract raw direct URLs and tel links from raw PDF stream
  const rawUrlRegex = /https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s<>"')]+/gi;
  let rawUrlMatch: RegExpExecArray | null;
  while ((rawUrlMatch = rawUrlRegex.exec(rawLatin1)) !== null) {
    links.push(rawUrlMatch[0]);
  }
  const rawTelRegex = /tel:([+0-9\s().-]{8,22})/gi;
  let rawTelMatch: RegExpExecArray | null;
  while ((rawTelMatch = rawTelRegex.exec(rawLatin1)) !== null) {
    links.push(rawTelMatch[0]);
  }

  // 2. Locate and decompress binary streams by exact byte offsets
  const streamMarkers = findStreamByteOffsets(bytes);
  const decompressedStreams: string[] = [];

  for (const { start, end } of streamMarkers) {
    const slice = bytes.subarray(start, end);
    const decompressedStr = decompressStreamSlice(slice);
    if (decompressedStr) {
      decompressedStreams.push(decompressedStr);
    }
  }

  // 3. First pass: extract all ToUnicode CMaps across all streams
  const cmap = new Map<number, string>();
  for (const str of decompressedStreams) {
    if (str.includes("beginbfchar") || str.includes("beginbfrange")) {
      const parsedMap = parseCMap(str);
      for (const [k, v] of parsedMap.entries()) {
        cmap.set(k, v);
      }
    }
  }

  // 4. Second pass: parse content streams using the extracted CMaps
  for (const str of decompressedStreams) {
    if (!str.includes("beginbfchar") && !str.includes("beginbfrange")) {
      const parsedText = parsePdfStreamOperators(str, cmap);
      if (parsedText.trim()) {
        chunks.push(parsedText);
      }
    }
  }

  // 5. Scan uncompressed text blocks in raw Latin1 string (if any)
  const uncompressed = parsePdfStreamOperators(rawLatin1, cmap);
  if (uncompressed.trim()) {
    chunks.push(uncompressed);
  }

  return {
    text: chunks.join("\n"),
    links,
    rawText: rawLatin1,
  };
}

function findStreamByteOffsets(bytes: Uint8Array): { start: number; end: number }[] {
  const results: { start: number; end: number }[] = [];
  const streamSig = [0x73, 0x74, 0x72, 0x65, 0x61, 0x6d]; // "stream"
  const endStreamSig = [0x65, 0x6e, 0x64, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d]; // "endstream"

  let i = 0;
  while (i < bytes.length - 10) {
    let match = true;
    for (let s = 0; s < 6; s++) {
      if (bytes[i + s] !== streamSig[s]) {
        match = false;
        break;
      }
    }

    if (match) {
      let dataStart = i + 6;
      if (bytes[dataStart] === 0x0d && bytes[dataStart + 1] === 0x0a) {
        dataStart += 2;
      } else if (bytes[dataStart] === 0x0a || bytes[dataStart] === 0x0d) {
        dataStart += 1;
      }

      let end = dataStart;
      while (end < bytes.length - 9) {
        let endMatch = true;
        for (let e = 0; e < 9; e++) {
          if (bytes[end + e] !== endStreamSig[e]) {
            endMatch = false;
            break;
          }
        }
        if (endMatch) break;
        end++;
      }

      if (end > dataStart && end < bytes.length) {
        let dataEnd = end;
        if (dataEnd > dataStart && bytes[dataEnd - 1] === 0x0a) dataEnd--;
        if (dataEnd > dataStart && bytes[dataEnd - 1] === 0x0d) dataEnd--;
        results.push({ start: dataStart, end: dataEnd });
        i = end + 9;
        continue;
      }
    }
    i++;
  }

  return results;
}

function decompressStreamSlice(slice: Uint8Array): string {
  if (!slice || slice.length === 0) return "";

  // 1. Try fflate zlib decompression
  try {
    const uncompressed = unzlibSync(slice);
    return new TextDecoder("utf-8", { fatal: false }).decode(uncompressed);
  } catch {}

  // 2. Try raw deflate
  try {
    const uncompressed = inflateSync(slice);
    return new TextDecoder("utf-8", { fatal: false }).decode(uncompressed);
  } catch {}

  // 3. Try raw deflate stripping 2-byte header
  if (slice.length > 2) {
    try {
      const uncompressed = inflateSync(slice.subarray(2));
      return new TextDecoder("utf-8", { fatal: false }).decode(uncompressed);
    } catch {}
  }

  // 4. Try stripping 2-byte header and 4-byte checksum
  if (slice.length > 6) {
    try {
      const uncompressed = inflateSync(slice.subarray(2, slice.length - 4));
      return new TextDecoder("utf-8", { fatal: false }).decode(uncompressed);
    } catch {}
  }

  return "";
}

/**
 * Parses ToUnicode CMap font mapping streams to decode CID fonts correctly.
 */
function parseCMap(cmapText: string): Map<number, string> {
  const map = new Map<number, string>();

  // 1. beginbfchar ... endbfchar
  const bfcharRegex = /beginbfchar([\s\S]*?)endbfchar/g;
  let m: RegExpExecArray | null;
  while ((m = bfcharRegex.exec(cmapText)) !== null) {
    const lines = m[1].trim().split(/\r?\n/);
    for (const l of lines) {
      const match = l.match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/);
      if (match) {
        const src = parseInt(match[1], 16);
        const dstHex = match[2];
        let dstStr = "";
        for (let i = 0; i < dstHex.length; i += 4) {
          dstStr += String.fromCharCode(parseInt(dstHex.substring(i, i + 4), 16));
        }
        map.set(src, dstStr);
      }
    }
  }

  // 2. beginbfrange ... endbfrange
  const bfrangeRegex = /beginbfrange([\s\S]*?)endbfrange/g;
  while ((m = bfrangeRegex.exec(cmapText)) !== null) {
    const lines = m[1].trim().split(/\r?\n/);
    for (const l of lines) {
      const match1 = l.match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/);
      if (match1) {
        const start = parseInt(match1[1], 16);
        const end = parseInt(match1[2], 16);
        let dst = parseInt(match1[3], 16);
        for (let code = start; code <= end; code++, dst++) {
          map.set(code, String.fromCharCode(dst));
        }
        continue;
      }
      const match2 = l.match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*\[([\s\S]*?)\]/);
      if (match2) {
        const start = parseInt(match2[1], 16);
        const end = parseInt(match2[2], 16);
        const dsts = match2[3].match(/<([0-9a-fA-F]+)>/g) || [];
        for (let idx = 0; idx < dsts.length && start + idx <= end; idx++) {
          const dHex = dsts[idx].replace(/[<>]/g, "");
          let dstStr = "";
          for (let i = 0; i < dHex.length; i += 4) {
            dstStr += String.fromCharCode(parseInt(dHex.substring(i, i + 4), 16));
          }
          map.set(start + idx, dstStr);
        }
      }
    }
  }

  return map;
}

/**
 * Parses PDF text operators (Tj, TJ, ', ") and decodes strings and hex codes with CMap support.
 */
function parsePdfStreamOperators(streamText: string, cmap?: Map<number, string>): string {
  if (!streamText) return "";
  let out = "";

  const regex =
    /(BT|ET|T\*)|(?:(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(?:Td|TD))|(?:(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+Tm)|\(((?:\\\(|\\\)|[^)])*)\)\s*(?:Tj|'|")|<([0-9a-fA-F\s]+)>\s*(?:Tj|'|")|\[([\s\S]*?)\]\s*TJ/g;

  let m: RegExpExecArray | null;
  while ((m = regex.exec(streamText)) !== null) {
    if (m[1]) {
      out += " ";
    } else if (m[2] !== undefined && m[3] !== undefined) {
      const dy = parseFloat(m[3]);
      const dx = parseFloat(m[2]);
      if (Math.abs(dy) > 1 || dx < -80) {
        out += "\n";
      }
    } else if (m[4] !== undefined) {
      out += "\n";
    } else if (m[10] !== undefined) {
      out += decodePdfString(m[10]);
    } else if (m[11] !== undefined) {
      out += decodePdfHex(m[11], cmap);
    } else if (m[12] !== undefined) {
      const inside = m[12];
      const itemRegex = /\(((?:\\\(|\\\)|[^)])*)\)|<([0-9a-fA-F\s]+)>|(-?\d+(?:\.\d+)?)/g;
      let itemMatch: RegExpExecArray | null;
      while ((itemMatch = itemRegex.exec(inside)) !== null) {
        if (itemMatch[1] !== undefined) {
          out += decodePdfString(itemMatch[1]);
        } else if (itemMatch[2] !== undefined) {
          out += decodePdfHex(itemMatch[2], cmap);
        } else if (itemMatch[3] !== undefined) {
          const kerning = parseFloat(itemMatch[3]);
          if (kerning < -100) out += " ";
        }
      }
    }
  }

  // Fallback: If tokenized stream didn't yield text, match Tj / TJ broadly
  if (!out.trim()) {
    const pieces: string[] = [];
    const tjRegex = /\(((?:\\\(|\\\)|[^)])*)\)\s*(?:Tj|'|")/g;
    while ((m = tjRegex.exec(streamText)) !== null) {
      if (m[1]) {
        const decoded = decodePdfString(m[1]);
        if (decoded.trim()) pieces.push(decoded);
      }
    }
    const hexTjRegex = /<([0-9a-fA-F\s]+)>\s*(?:Tj|'|")/g;
    while ((m = hexTjRegex.exec(streamText)) !== null) {
      const decoded = decodePdfHex(m[1], cmap);
      if (decoded.trim()) pieces.push(decoded);
    }
    out = pieces.join(" ");
  }

  return out;
}

function decodePdfString(input: string): string {
  if (!input) return "";
  return input
    // Octal character escapes: \053 -> '+', \040 -> ' ', etc.
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    // Standard escaped characters
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\([()\\/+-])/g, "$1");
}

function decodePdfHex(rawHex: string, cmap?: Map<number, string>): string {
  const hex = rawHex.replace(/\s+/g, "");
  if (!hex) return "";
  let res = "";

  if (cmap && cmap.size > 0) {
    if (hex.length % 4 === 0) {
      let allMapped = true;
      for (let i = 0; i < hex.length; i += 4) {
        const code = parseInt(hex.substring(i, i + 4), 16);
        if (cmap.has(code)) {
          res += cmap.get(code);
        } else if (code >= 32 && code <= 126) {
          res += String.fromCharCode(code);
        } else {
          allMapped = false;
        }
      }
      if (allMapped || res.length > 0) return res;
    }
    if (hex.length % 2 === 0) {
      res = "";
      for (let i = 0; i < hex.length; i += 2) {
        const code = parseInt(hex.substring(i, i + 2), 16);
        if (cmap.has(code)) {
          res += cmap.get(code);
        } else if (code >= 32 && code <= 126) {
          res += String.fromCharCode(code);
        }
      }
      if (res.length > 0) return res;
    }
  }

  // Fallback: UTF-16BE or standard ASCII
  res = "";
  if (hex.length >= 4 && (hex.startsWith("00") || hex.toLowerCase().startsWith("feff"))) {
    for (let i = 0; i < hex.length - 3; i += 4) {
      const code = parseInt(hex.substring(i, i + 4), 16);
      if (code >= 32 && code < 65535) res += String.fromCharCode(code);
    }
  } else {
    for (let i = 0; i < hex.length - 1; i += 2) {
      const code = parseInt(hex.substring(i, i + 2), 16);
      if (code >= 32 && code < 127) res += String.fromCharCode(code);
    }
  }
  return res;
}

// ==========================================
// DOCX EXTRACTION ENGINE (ZIP & XML)
// ==========================================

export async function extractFromDocx(buffer: ArrayBuffer): Promise<{ text: string; links: string[] }> {
  const bytes = new Uint8Array(buffer);
  const textPieces: string[] = [];
  const links: string[] = [];

  try {
    let entries: Map<string, Uint8Array> = new Map();
    try {
      const unzipped = unzipSync(bytes);
      for (const [fn, content] of Object.entries(unzipped)) {
        entries.set(fn, content);
      }
    } catch {
      entries = await extractAllZipEntries(bytes);
    }

    for (const [filename, contentBytes] of entries.entries()) {
      const fnLower = filename.toLowerCase();

      // Parse document, headers, footers
      if (
        fnLower.includes("word/document.xml") ||
        fnLower.includes("word/header") ||
        fnLower.includes("word/footer")
      ) {
        const xmlStr = new TextDecoder("utf-8").decode(contentBytes);
        const parsed = parseDocxXml(xmlStr);
        if (parsed.trim()) textPieces.push(parsed);
      }

      // Parse relationships for hyperlinks (mailto:, tel:, https://...)
      if (fnLower.includes("word/_rels/")) {
        const relsXml = new TextDecoder("utf-8").decode(contentBytes);
        const targetRegex = /Target="([^"]+)"/gi;
        let tMatch: RegExpExecArray | null;
        while ((tMatch = targetRegex.exec(relsXml)) !== null) {
          if (tMatch[1]) {
            links.push(tMatch[1]);
          }
        }
      }
    }
  } catch (err) {
    console.warn("DOCX parsing warning:", err);
  }

  // Fallback: scan raw utf-8 stream for XML tags
  if (textPieces.length === 0) {
    const rawDecoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const parsed = parseDocxXml(rawDecoded);
    if (parsed.trim()) textPieces.push(parsed);
  }

  return {
    text: textPieces.join("\n"),
    links,
  };
}

function parseDocxXml(xml: string): string {
  if (!xml) return "";
  const paragraphs = xml.match(/<w:p\b[\s\S]*?<\/w:p>/gi);
  if (paragraphs && paragraphs.length > 0) {
    const lines = paragraphs
      .map((pXml) => {
        const textMatches = pXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi);
        if (!textMatches) return "";
        return textMatches
          .map((m) =>
            m
              .replace(/<[^>]+>/g, "")
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
          )
          .join("");
      })
      .filter((l) => l.trim().length > 0);
    if (lines.length > 0) return lines.join("\n");
  }

  const textMatches = xml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi);
  if (textMatches && textMatches.length > 0) {
    const textPieces = textMatches.map((m) =>
      m.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    );
    return textPieces.join(" ");
  }
  const clean = xml
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ");
  return clean.length > 30 ? clean : "";
}

/**
 * Robust ZIP entry parser that reads both Central Directory and Local File Headers.
 */
async function extractAllZipEntries(zipBytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  const map = new Map<string, Uint8Array>();
  const view = new DataView(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength);

  // 1. Scan Local File Headers (0x04034b50)
  let offset = 0;
  while (offset < zipBytes.length - 30) {
    if (view.getUint32(offset, true) === 0x04034b50) {
      const compMethod = view.getUint16(offset + 8, true);
      let compSize = view.getUint32(offset + 18, true);
      const fnLen = view.getUint16(offset + 26, true);
      const extraLen = view.getUint16(offset + 28, true);

      const fnBytes = zipBytes.subarray(offset + 30, offset + 30 + fnLen);
      const fn = new TextDecoder("utf-8").decode(fnBytes);
      const dataStart = offset + 30 + fnLen + extraLen;

      if (compSize === 0) {
        let next = dataStart;
        while (next < zipBytes.length - 4) {
          const sig = view.getUint32(next, true);
          if (sig === 0x04034b50 || sig === 0x02014b50 || sig === 0x08074b50) {
            break;
          }
          next++;
        }
        compSize = next - dataStart;
      }

      if (compSize > 0 && dataStart + compSize <= zipBytes.length) {
        const compData = zipBytes.subarray(dataStart, dataStart + compSize);
        if (compMethod === 0) {
          map.set(fn, compData);
        } else if (compMethod === 8 && typeof DecompressionStream !== "undefined") {
          try {
            const ds = new DecompressionStream("deflate-raw");
            const writer = ds.writable.getWriter();
            writer.write(compData).catch(() => {});
            writer.close().catch(() => {});
            const res = new Response(ds.readable);
            const buf = await res.arrayBuffer();
            map.set(fn, new Uint8Array(buf));
          } catch {}
        }
      }

      offset = dataStart + Math.max(1, compSize);
      continue;
    }
    offset++;
  }

  // 2. Scan Central Directory Headers (0x02014b50) for any missing entries
  let cdOffset = 0;
  while (cdOffset < zipBytes.length - 46) {
    if (view.getUint32(cdOffset, true) === 0x02014b50) {
      const compMethod = view.getUint16(cdOffset + 10, true);
      const compSize = view.getUint32(cdOffset + 20, true);
      const fnLen = view.getUint16(cdOffset + 28, true);
      const extraLen = view.getUint16(cdOffset + 30, true);
      const commentLen = view.getUint16(cdOffset + 32, true);
      const localHeaderOffset = view.getUint32(cdOffset + 42, true);

      const fnBytes = zipBytes.subarray(cdOffset + 46, cdOffset + 46 + fnLen);
      const fn = new TextDecoder("utf-8").decode(fnBytes);

      if (!map.has(fn) && compSize > 0 && localHeaderOffset < zipBytes.length - 30) {
        const localFnLen = view.getUint16(localHeaderOffset + 26, true);
        const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
        const dataStart = localHeaderOffset + 30 + localFnLen + localExtraLen;

        if (dataStart + compSize <= zipBytes.length) {
          const compData = zipBytes.subarray(dataStart, dataStart + compSize);
          if (compMethod === 0) {
            map.set(fn, compData);
          } else if (compMethod === 8 && typeof DecompressionStream !== "undefined") {
            try {
              const ds = new DecompressionStream("deflate-raw");
              const writer = ds.writable.getWriter();
              writer.write(compData).catch(() => {});
              writer.close().catch(() => {});
              const res = new Response(ds.readable);
              const buf = await res.arrayBuffer();
              map.set(fn, new Uint8Array(buf));
            } catch {}
          }
        }
      }

      cdOffset += 46 + fnLen + extraLen + commentLen;
      continue;
    }
    cdOffset++;
  }

  return map;
}

// ==========================================
// REGEX EXTRACTION ENGINE (EMAIL, PHONE, LINKS)
// ==========================================

export function extractEmail(text: string): string | undefined {
  if (!text) return undefined;
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi);
  if (!matches || matches.length === 0) return undefined;

  const filtered = matches.filter((e) => {
    const lower = e.toLowerCase();
    return (
      !lower.includes("example.com") &&
      !lower.includes("w3.org") &&
      !lower.includes("schemas.openxmlformats.org") &&
      !lower.includes("schemas.microsoft.com") &&
      !lower.includes("github.com") &&
      !lower.includes("adobe.com")
    );
  });

  return filtered[0] || matches[0];
}

/**
 * Universal High-Accuracy Phone Extractor.
 * Robust scanner across all country codes (+91, +1, +44, etc.), spacing variations,
 * icons, and 10-digit mobile standards.
 */
export function extractPhone(text: string): string | undefined {
  if (!text) return undefined;

  // 1. Check for tel: links
  const telMatch = text.match(/tel:([+0-9\s\u00A0().-]{8,22})/i);
  if (telMatch && telMatch[1]) {
    const clean = telMatch[1].trim();
    if (isValidPhoneNumber(clean)) return formatPhoneClean(clean);
  }

  // 2. Space-separated digit sequences (e.g. "+ 9 1 9 8 7 6 5 4 3 2 1 0" or "9 8 7 6 5 4 3 2 1 0")
  const spacedPlus91 = text.match(/(?:\+\s*9\s*1|\(\s*\+\s*9\s*1\s*\))[\s\u00A0.-]*(?:[6-9][\s\u00A0.-]*)(?:[0-9][\s\u00A0.-]*){8}[0-9]/);
  if (spacedPlus91) {
    const d = spacedPlus91[0].replace(/\D/g, "");
    if (d.length >= 10 && isValidPhoneNumber(d)) return formatPhoneClean(d);
  }
  const spaced10 = text.match(/(?:^|\s|[^\w+])([6-9](?:\s+[0-9]){9})(?=$|\s|[^\w])/);
  if (spaced10 && spaced10[1]) {
    const d = spaced10[1].replace(/\D/g, "");
    if (d.length === 10 && isValidPhoneNumber(d)) return formatPhoneClean(d);
  }

  // 3. Explicit +91 / 91 Indian phone numbers (+91 7659032531, +91-7659032531, +917659032531)
  const plus91Regex = /(?:\+91|(?:\b91\b))[\s\u00A0.:#-]*([6-9]\d{4}[\s\u00A0.-]?\d{5}|[6-9]\d{9})/g;
  let p91Match: RegExpExecArray | null;
  while ((p91Match = plus91Regex.exec(text)) !== null) {
    const full = p91Match[0].trim();
    if (isValidPhoneNumber(full)) return formatPhoneClean(full);
  }

  // 4. Preceded by phone keywords (Phone:, Mobile:, Mob:, Tel:, Cell:, Contact:, Ph:, WhatsApp:)
  const labeledRegex = /\b(?:phone|mobile|mob|tel|cell|call|contact|ph|whatsapp|wa)[\s\u00A0.:#-]*([+(]?[0-9\s\u00A0().-]{8,25}[0-9])/gi;
  let labelMatch: RegExpExecArray | null;
  while ((labelMatch = labeledRegex.exec(text)) !== null) {
    const cand = (labelMatch[1] || "").trim();
    if (isValidPhoneNumber(cand)) return formatPhoneClean(cand);
  }

  // 5. Unicode phone icons (📞, 📱, ☎, FontAwesome icons \uF095, \uF3CD)
  const iconMatch = text.match(/[\u260E\u260F\u2706\uF095\uF3CD\u{1F4DE}\u{1F4F1}][\s\u00A0.:#-]*([+(]?[0-9\s\u00A0().-]{8,25}[0-9])/u);
  if (iconMatch && iconMatch[1]) {
    const cand = iconMatch[1].trim();
    if (isValidPhoneNumber(cand)) return formatPhoneClean(cand);
  }

  // 6. Scan for international numbers (+91 XXXXXXXXXX, +1 ..., +44 ...)
  const intlPattern = /(?:\+[\d\s\u00A0().-]{1,6})(?:[0-9][\s\u00A0().-]*){9,14}[0-9]/g;
  const intlMatches = text.match(intlPattern);
  if (intlMatches) {
    for (const m of intlMatches) {
      const clean = m.trim();
      if (isValidPhoneNumber(clean)) {
        return formatPhoneClean(clean);
      }
    }
  }

  // 7. Scan for 10-digit Indian mobile numbers (starts with 6, 7, 8, or 9)
  const indianPattern = /(?:^|\s|[^\w+])((?:\+?91[\s\u00A0.-]?)?[6-9]\d{4}[\s\u00A0.-]?\d{5}|[6-9]\d{2}[\s\u00A0.-]?\d{3}[\s\u00A0.-]?\d{4}|[6-9]\d{9})(?=$|\s|[^\w])/g;
  let indMatch: RegExpExecArray | null;
  while ((indMatch = indianPattern.exec(text)) !== null) {
    const cand = (indMatch[1] || "").trim();
    if (isValidPhoneNumber(cand)) {
      return formatPhoneClean(cand);
    }
  }

  // 8. Scan for standard North American / UK patterns
  const standardPattern = /\b(?:\(\d{3}\)[\s.-]?|\d{3}[\s.-])\d{3}[\s.-]\d{4}\b/g;
  const stdMatches = text.match(standardPattern);
  if (stdMatches) {
    for (const m of stdMatches) {
      if (isValidPhoneNumber(m)) return formatPhoneClean(m);
    }
  }

  // 9. General 10-12 digit numbers in candidate header
  const genPattern = /(?:^|\s|[|•·,])([+(]?\d{1,4}[)\s\u00A0.-]?\d{3,5}[\s\u00A0.-]?\d{4,6})(?=$|\s|[|•·,])/g;
  let genMatch: RegExpExecArray | null;
  while ((genMatch = genPattern.exec(text)) !== null) {
    const cand = (genMatch[1] || "").trim();
    if (isValidPhoneNumber(cand)) return formatPhoneClean(cand);
  }

  return undefined;
}

function formatPhoneClean(str: string): string {
  const clean = str.trim();
  const digits = clean.replace(/\D/g, "");

  if ((digits.length === 12 && digits.startsWith("91")) || (clean.startsWith("+91") && digits.length === 12)) {
    const last10 = digits.slice(-10);
    return `+91 ${last10}`;
  }
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+91 ${digits}`;
  }
  if (digits.length === 10 && /^[2-9]/.test(digits)) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    const d = digits.slice(1);
    return `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return clean.replace(/\s+/g, " ");
}

function isValidPhoneNumber(str: string): boolean {
  const clean = str.trim();
  const digits = clean.replace(/\D/g, "");

  // Must be between 9 and 15 digits
  if (digits.length < 9 || digits.length > 15) return false;

  // Reject PDF xref table patterns or numbers containing 00000
  if (clean.includes("00000") || clean.includes("0000")) return false;
  if (/^00\d+/.test(clean) && !/^\+/.test(clean)) return false;

  // Reject timestamps (e.g. 20260629...)
  if (digits.startsWith("202") || digits.startsWith("201") || digits.startsWith("199")) {
    if (digits.length >= 12) return false;
  }

  // Reject date ranges like 2020-2024 or 2022/2026
  if (/^\d{4}[-/.]\d{2,4}(?:[-/.]\d{2,4})?$/.test(clean)) return false;

  // Reject all identical digits (e.g. 1111111111)
  if (/^(\d)\1+$/.test(digits)) return false;

  return true;
}

export function extractPortfolio(text: string, links: string[] = []): string | undefined {
  if (!text && (!links || links.length === 0)) return undefined;

  // 1. Check explicit portfolio/website keywords (Portfolio: ..., Website: ..., Projects: ...)
  const explicitPattern = /(?:portfolio|website|web|personal website|site|projects)[\s|:•·-]+((?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s)"]*)?)/i;
  const expMatch = text.match(explicitPattern);
  if (expMatch && expMatch[1]) {
    const url = cleanPortfolioUrl(expMatch[1]);
    if (isValidPortfolioUrl(url)) return url;
  }

  // 2. Check all URLs in links and text for known portfolio/personal host domains
  const allUrls: string[] = [...links];
  const urlRegex = /https?:\/\/[^\s<>"')]+/gi;
  let uMatch: RegExpExecArray | null;
  while ((uMatch = urlRegex.exec(text)) !== null) {
    allUrls.push(uMatch[0]);
  }

  // Also match bare domains like "username.vercel.app" or "username.github.io"
  const bareHostRegex = /\b([a-zA-Z0-9-]+\.(?:vercel\.app|netlify\.app|github\.io|gitlab\.io|pages\.dev|web\.app|firebaseapp\.com|surge\.sh|render\.com|notion\.site|me|dev)(?:\/[^\s)"]*)?)\b/gi;
  let bMatch: RegExpExecArray | null;
  while ((bMatch = bareHostRegex.exec(text)) !== null) {
    allUrls.push(`https://${bMatch[1]}`);
  }

  // Prioritize URLs with "portfolio" or known hosting platforms
  for (const raw of allUrls) {
    const u = cleanPortfolioUrl(raw);
    if (!isValidPortfolioUrl(u)) continue;
    const lower = u.toLowerCase();
    if (
      lower.includes("portfolio") ||
      lower.includes("vercel.app") ||
      lower.includes("netlify.app") ||
      lower.includes("github.io") ||
      lower.includes("gitlab.io") ||
      lower.includes("pages.dev") ||
      lower.includes(".me") ||
      lower.includes(".dev") ||
      lower.includes("behance.net") ||
      lower.includes("dribbble.com")
    ) {
      return u;
    }
  }

  // Fallback: any link in links or header that is not social/system/repo/job
  for (const raw of allUrls) {
    const u = cleanPortfolioUrl(raw);
    if (isValidPortfolioUrl(u)) {
      return u;
    }
  }

  return undefined;
}

function cleanPortfolioUrl(url: string): string {
  let u = url.trim().replace(/[.,;)]+$/, "");
  if (!u.startsWith("http://") && !u.startsWith("https://")) {
    u = `https://${u}`;
  }
  return u;
}

function isValidPortfolioUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  const blocked = [
    "linkedin.com",
    "github.com",
    "gitlab.com",
    "google.com",
    "adobe.com",
    "microsoft.com",
    "apple.com",
    "w3.org",
    "schemas.openxmlformats.org",
    "schemas.microsoft.com",
    "twitter.com",
    "x.com",
    "facebook.com",
    "instagram.com",
    "youtube.com",
    "medium.com",
    "leetcode.com",
    "hackerrank.com",
    "codechef.com",
    "geeksforgeeks.org",
    "stackoverflow.com",
    "npm.org",
    "npmjs.com",
    "example.com",
    "localhost",
  ];
  if (blocked.some((b) => lower.includes(b))) return false;
  return /https?:\/\/[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+/i.test(url);
}

export function extractPossibleName(text: string, fileName: string): string | undefined {
  const lines = text
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (const line of lines.slice(0, 8)) {
    if (
      !/(resume|curriculum|vitae|email|phone|contact|profile|experience|education|skills|summary|software|engineer|developer)/i.test(
        line
      ) &&
      /^[A-Za-z\s.'-]{3,40}$/.test(line)
    ) {
      const words = line.split(/\s+/).filter(Boolean);
      if (words.length >= 2 && words.length <= 4) {
        return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
      }
    }
  }

  const cleanBase = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
  const cleanWords = cleanBase
    .split(/\s+/)
    .filter(
      (w) => !/^(resume|cv|updated|202\d|final|draft|v\d|profile|application|candidate)$/i.test(w)
    );
  if (cleanWords.length >= 2 && cleanWords.length <= 4) {
    return cleanWords
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  return undefined;
}

export function extractLinkedIn(text: string): string | undefined {
  if (!text) return undefined;
  const match = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
  if (match) {
    return match[0].startsWith("http") ? match[0] : `https://${match[0]}`;
  }
  const handleMatch = text.match(/(?:linkedin|in)[\s/:|]*\/([a-zA-Z0-9_-]{3,50})/i);
  if (handleMatch && handleMatch[1]) {
    return `https://linkedin.com/in/${handleMatch[1]}`;
  }
  return undefined;
}

export function extractGitHub(text: string): string | undefined {
  if (!text) return undefined;
  const match = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i);
  if (match) {
    return match[0].startsWith("http") ? match[0] : `https://${match[0]}`;
  }
  const handleMatch = text.match(/(?:github|gh)[\s/:|]*\/([a-zA-Z0-9_-]{3,50})/i);
  if (handleMatch && handleMatch[1]) {
    return `https://github.com/${handleMatch[1]}`;
  }
  return undefined;
}
