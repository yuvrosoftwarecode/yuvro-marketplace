import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes a LinkedIn URL into a canonical identifier suitable for exact matching.
 * e.g. "https://www.linkedin.com/in/john-doe?src=1#ref" -> "john-doe"
 */
export function normalizeLinkedinUrl(url: string): string {
  if (!url) return "";
  let clean = url.trim().toLowerCase();
  clean = clean.replace(/^https?:\/\//, "");
  clean = clean.replace(/^(www\.|[a-z]{2}\.)?linkedin\.com\//, "");
  clean = clean.replace(/^(in|pub|profile)\//, "");
  clean = clean.split("?")[0].split("#")[0];
  return clean.replace(/\/+$/, "");
}

