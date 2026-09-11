import { PAGES, type Page } from "./pages";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "./site";

export type SitemapEntry = { url: string; lastmod?: string };

/** A bullet list of every page, used by `llms.txt` and the 404 body. */
export function pageList(pages: readonly Page[] = PAGES): string {
  return pages
    .map((page) =>
      page.description
        ? `- [${page.title}](${page.url}): ${page.description}`
        : `- [${page.title}](${page.url})`,
    )
    .join("\n");
}

export function llmsTxt(pages: readonly Page[] = PAGES): string {
  return `# ${SITE_NAME} // Hack Club

> ${SITE_DESCRIPTION}

Every page is also available as Markdown from its canonical URL by sending
\`Accept: text/markdown\` (see https://acceptmarkdown.com).

## Guide

${pageList(pages)}

## Elsewhere

- [Hack Club](https://hackclub.com): the nonprofit that we are actually explaining
- [Join the Hack Club Slack](https://slack.hackclub.com/): where the community lives.
- [Sitemap](${absoluteUrl("/sitemap.xml")}): every indexable URL on this site.
- [Source code](https://github.com/hackclub/readme): the repository behind this site.
`;
}

/** Markdown body for a 404, pointing agents at somewhere useful. */
export function notFoundMarkdown(
  pathname: string,
  pages: readonly Page[] = PAGES,
): string {
  return `# 404 - Page not found

\`${pathname}\` is not a page on ${SITE_URL}.

## Every page on this site

${pageList(pages)}

## Machine-readable entry points

- [${absoluteUrl("/llms.txt")}](${absoluteUrl("/llms.txt")}) - index of the whole guide.
- [${absoluteUrl("/sitemap.xml")}](${absoluteUrl("/sitemap.xml")}) - every indexable URL.
- [${absoluteUrl("/robots.txt")}](${absoluteUrl("/robots.txt")}) - crawl policy.

Send \`Accept: text/markdown\` to any page URL to get this Markdown
representation instead of HTML.
`;
}

export function robotsTxt(): string {
  return `User-agent: *
Allow: /

Sitemap: ${absoluteUrl("/sitemap.xml")}
`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Sitemaps XML format 0.9 - https://www.sitemaps.org/protocol.html */
export function sitemapXml(entries: readonly SitemapEntry[]): string {
  const urls = entries
    .map(({ url, lastmod }) => {
      const lines = [`    <loc>${escapeXml(url)}</loc>`];
      if (lastmod) lines.push(`    <lastmod>${escapeXml(lastmod)}</lastmod>`);
      return `  <url>\n${lines.join("\n")}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
