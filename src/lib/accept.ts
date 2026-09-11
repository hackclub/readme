/**
 * RFC 9110 §12.5.1 proactive content negotiation for the two representations
 * this site can produce: `text/html` and `text/markdown`.
 *
 * See https://acceptmarkdown.com/guides/accept-parsing and
 * https://acceptmarkdown.com/guides/returning-406.
 */

export const HTML = "text/html";
export const MARKDOWN = "text/markdown";
export const PRODUCES = [HTML, MARKDOWN] as const;

export type Representation = (typeof PRODUCES)[number];

type AcceptEntry = {
  type: string;
  q: number;
  specificity: number;
};

export function parseAccept(header: string): AcceptEntry[] {
  return header
    .split(",")
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      const parts = raw.split(";").map((part) => part.trim());
      const type = parts[0].toLowerCase();
      let q = 1;
      for (const param of parts.slice(1)) {
        const [name, value] = param.split("=").map((piece) => piece.trim());
        if (name?.toLowerCase() !== "q") continue;
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) q = Math.max(0, Math.min(1, parsed));
      }
      const specificity = type === "*/*" ? 0 : type.endsWith("/*") ? 1 : 2;
      return { type, q, specificity };
    })
    .filter((entry) => entry.type.includes("/"));
}

function matches(entry: AcceptEntry, candidate: string): boolean {
  if (entry.type === "*/*") return true;
  if (entry.type.endsWith("/*")) {
    return candidate.startsWith(entry.type.slice(0, -1));
  }
  return entry.type === candidate;
}

/**
 * Pick the representation to serve, or `null` when the client explicitly
 * accepts none of them (the only case where `406` is correct).
 *
 * A missing or empty `Accept` header means "no constraint", not "nothing
 * works" - it resolves to the server default.
 */
export function negotiate(
  header: string | null | undefined,
  produces: readonly string[] = PRODUCES,
): string | null {
  if (!header || !header.trim()) return produces[0] ?? null;

  const entries = parseAccept(header);
  if (entries.length === 0) return produces[0] ?? null;

  let best: string | null = null;
  let bestQ = -1;
  let bestPosition = Infinity;

  for (const candidate of produces) {
    // RFC 9110 §12.5.1: the most specific matching range wins regardless of
    // q, so `text/html;q=0, */*` still rejects HTML.
    let matched: AcceptEntry | null = null;
    let matchedPosition = Infinity;
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      if (!matches(entry, candidate)) continue;
      if (
        matched === null ||
        entry.specificity > matched.specificity ||
        (entry.specificity === matched.specificity && index < matchedPosition)
      ) {
        matched = entry;
        matchedPosition = index;
      }
    }
    if (matched === null || matched.q <= 0) continue;

    // Across candidates: highest q wins, ties break on client ordering so
    // `Accept: text/markdown, text/html` picks Markdown.
    if (
      matched.q > bestQ ||
      (matched.q === bestQ && matchedPosition < bestPosition)
    ) {
      bestQ = matched.q;
      bestPosition = matchedPosition;
      best = candidate;
    }
  }

  return best;
}

/** Add `Accept` to an existing `Vary` header without duplicating it. */
export function appendVaryAccept(headers: Headers): void {
  const existing = headers.get("Vary");
  if (!existing) {
    headers.set("Vary", "Accept");
    return;
  }
  const tokens = existing.split(",").map((token) => token.trim().toLowerCase());
  if (tokens.includes("*") || tokens.includes("accept")) return;
  headers.set("Vary", `${existing}, Accept`);
}

/**
 * RFC 9110 §15.5.7 recommends listing the available representations so the
 * client can retry with an `Accept` it can use.
 */
export function notAcceptableBody(requested: string | null): string {
  const lines = [
    "406 Not Acceptable",
    "",
    "This resource is available in:",
    ...PRODUCES.map((type) => `- ${type}`),
  ];
  if (requested) lines.push("", `You requested: ${requested}`);
  lines.push("");
  return lines.join("\n");
}
