export type Frontmatter = Record<string, string>;

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/;

export function parseFrontmatter(source: string): {
  data: Frontmatter;
  body: string;
} {
  const match = source.match(FRONTMATTER);
  if (!match) return { data: {}, body: source };

  const data: Frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!pair) continue;
    let value = pair[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }
    data[pair[1]] = value;
  }
  return { data, body: source.slice(match[0].length) };
}

function attribute(attributes: string, name: string): string | null {
  const match = attributes.match(
    new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i"),
  );
  return match ? match[1] : null;
}

/** True when the match sits alone on its line (so it can become a block). */
function isOwnLine(source: string, start: number, end: number): boolean {
  const before = source.slice(source.lastIndexOf("\n", start - 1) + 1, start);
  const lineEnd = source.indexOf("\n", end);
  const after = source.slice(end, lineEnd === -1 ? source.length : lineEnd);
  return before.trim() === "" && after.trim() === "";
}

/** `import x from "y"` / `export const x = ...` module scaffolding. */
function stripModuleStatements(body: string): string {
  return body
    .replace(/^[ \t]*import\s+[^\n]*?from\s*["'][^"']+["'];?[ \t]*$/gm, "")
    .replace(/^[ \t]*import\s+["'][^"']+["'];?[ \t]*$/gm, "");
}

function replacePrism(body: string): string {
  return body.replace(/<Prism\b([\s\S]*?)\/>/g, (match, attributes, offset) => {
    const lang = attribute(attributes, "lang") ?? "";
    const code = attributes.match(/code\s*=\s*\{`([\s\S]*?)`\}/);
    const source = code ? code[1].trim() : "";
    if (!source) return "";
    return isOwnLine(body, offset, offset + match.length)
      ? `\`\`\`${lang}\n${source}\n\`\`\``
      : `\`${source}\``;
  });
}

function replaceImages(body: string): string {
  return body.replace(/<img\b([^>]*?)\/?>/gi, (_match, attributes: string) => {
    const src = attribute(attributes, "src");
    const alt = attribute(attributes, "alt") ?? "";
    // `src={someImport.src}` only resolves at build time, and relative asset
    // paths are rewritten to hashed URLs, so only absolute sources survive.
    if (!src || !/^https?:\/\//i.test(src)) return "";
    return `![${alt}](${src})`;
  });
}

/** Drop Markdown images whose target is not an absolute URL. */
function dropRelativeImages(body: string): string {
  return body.replace(
    /!\[[^\]]*\]\((?!https?:\/\/)[^)]*\)/g,
    "",
  );
}

function replaceAnchors(body: string): string {
  return body.replace(
    /<a\b([^>]*)>([\s\S]*?)<\/a>/gi,
    (_match, attributes: string, text: string) => {
      const href = attribute(attributes, "href");
      const label = text.trim();
      if (!href) return label;
      return `[${label}](${href})`;
    },
  );
}

function replaceHeadings(body: string): string {
  return body.replace(
    /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi,
    (_match, level: string, text: string) =>
      `\n${"#".repeat(Number(level))} ${text.trim()}\n`,
  );
}

/**
 * Nutshell markers: `[:Label](/path#anchor)` is an inline expandable link and
 * `## : heading` declares the nutshell it expands to. Both render as plain
 * text/links, so the leading colon is noise in Markdown.
 */
function stripNutshellMarkers(body: string): string {
  return body
    .replace(/\[:\s*([^\]]+)\]\(/g, "[$1](")
    .replace(/^(#{1,6})[ \t]*:[ \t]*/gm, "$1 ");
}

/** Make root-relative links absolute so the Markdown stands on its own. */
function absolutizeLinks(body: string, siteUrl: string): string {
  return body.replace(
    /\]\((\/[^)\s]*)\)/g,
    (_match, path: string) => `](${siteUrl}${path})`,
  );
}

function stripRemainingTags(body: string): string {
  return body
    .replace(/<([A-Z][A-Za-z0-9]*)\b[\s\S]*?<\/\1>/g, "")
    .replace(/<[A-Z][A-Za-z0-9]*\b[^>]*\/>/g, "")
    .replace(/<\/?[A-Za-z][A-Za-z0-9]*\b[^>]*>/g, "");
}

const LIST_ITEM = /^(?:[-*+]\s|\d+[.)]\s|>)/;

/**
 * Normalise whitespace. Prose that was nested inside layout `<div>`s keeps the
 * markup's indentation once the tags are gone, and four or more leading spaces
 * would turn it into an indented code block - so unindent anything that is not
 * a list item and not inside a fenced code block.
 */
function tidy(body: string): string {
  let fenced = false;
  const lines = body.split(/\r?\n/).map((raw) => {
    const line = raw.replace(/[ \t]+$/, "");
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      return line.trimStart();
    }
    if (fenced) return line;
    const trimmed = line.trimStart();
    if (trimmed === "" || LIST_ITEM.test(trimmed)) return line;
    return trimmed;
  });
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export type MarkdownOptions = {
  title: string;
  description?: string;
  url: string;
  siteUrl: string;
};

/** Convert one MDX body (frontmatter already removed) to Markdown. */
export function mdxBodyToMarkdown(body: string, siteUrl: string): string {
  let out = stripModuleStatements(body);
  out = out.replace(
    /<Emoji\b[^>]*?name\s*=\s*"([^"]*)"[^>]*\/>/gi,
    (_match, name: string) => `:${name}:`,
  );
  out = replacePrism(out);
  out = replaceImages(out);
  out = replaceAnchors(out);
  out = replaceHeadings(out);
  out = stripRemainingTags(out);
  out = dropRelativeImages(out);
  out = stripNutshellMarkers(out);
  out = absolutizeLinks(out, siteUrl);
  // The pages use `&nbsp;` to keep an emoji glued to the word after it; plain
  // Markdown has no markup to preserve, so a normal space is the right output.
  out = out.replace(/&nbsp;/g, " ");
  return tidy(out);
}

/** Render a full Markdown document for one page. */
export function renderMarkdownDocument(
  source: string,
  options: MarkdownOptions,
): string {
  const { body } = parseFrontmatter(source);
  const content = mdxBodyToMarkdown(body, options.siteUrl);
  const parts = [`# ${options.title}`];
  if (options.description) parts.push(`> ${options.description}`);
  if (content) parts.push(content);
  parts.push(
    "---",
    `Source: ${options.url} · [All pages](${options.siteUrl}/llms.txt) · [Sitemap](${options.siteUrl}/sitemap.xml)`,
  );
  return `${parts.join("\n\n")}\n`;
}
