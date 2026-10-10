/** Shared helpers for Account Manager URL state (search params kept optional). */

export const strParam = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : undefined);

export function pickSearch<T extends Record<string, string | undefined>>(
  input: T,
): {
  [K in keyof T]?: string;
} {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) if (v) out[k] = v;
  return out as { [K in keyof T]?: string };
}
