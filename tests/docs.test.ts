import { describe, expect, it } from "vitest";
import {
  llmsTxt,
  notFoundMarkdown,
  pageList,
  robotsTxt,
  sitemapXml,
} from "../src/lib/docs";
import { PAGES } from "../src/lib/pages";
import { SITE_URL } from "../src/lib/site";

describe("pageList", () => {
  it("links every page with its description", () => {
    const list = pageList();
    for (const page of PAGES) {
      expect(list).toContain(`[${page.title}](${page.url})`);
      expect(list).toContain(page.description);
    }
  });
});

describe("llmsTxt", () => {
  it("follows the llms.txt shape: H1, blockquote summary, linked sections", () => {
    const text = llmsTxt();
    const lines = text.split("\n");
    expect(lines[0]).toMatch(/^# /);
    expect(lines[2]).toMatch(/^> /);
    expect(text).toContain("## Guide");
    expect(text).toContain(`${SITE_URL}/sitemap.xml`);
    expect(text).toContain("acceptmarkdown.com");
    for (const page of PAGES) expect(text).toContain(page.url);
  });
});

describe("notFoundMarkdown", () => {
  it("names the missing path and points at the recovery routes", () => {
    const body = notFoundMarkdown("/nope");
    expect(body).toMatch(/^# 404/);
    expect(body).toContain("`/nope`");
    expect(body).toContain(`${SITE_URL}/llms.txt`);
    expect(body).toContain(`${SITE_URL}/sitemap.xml`);
    expect(body).toContain(`${SITE_URL}/robots.txt`);
    for (const page of PAGES) expect(body).toContain(page.url);
  });
});

describe("robotsTxt", () => {
  it("allows crawling and advertises the sitemap", () => {
    const text = robotsTxt();
    expect(text).toContain("User-agent: *");
    expect(text).toContain("Allow: /");
    expect(text).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });
});

describe("sitemapXml", () => {
  it("emits a sitemaps.org 0.9 urlset", () => {
    const xml = sitemapXml([
      { url: `${SITE_URL}/`, lastmod: "2026-05-10T15:07:42-04:00" },
      { url: `${SITE_URL}/slack` },
    ]);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true);
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );
    expect(xml).toContain(`<loc>${SITE_URL}/</loc>`);
    expect(xml).toContain("<lastmod>2026-05-10T15:07:42-04:00</lastmod>");
    // A URL without a lastmod simply omits the element.
    expect(xml.match(/<lastmod>/g)).toHaveLength(1);
    expect(xml.match(/<url>/g)).toHaveLength(2);
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
  });

  it("escapes XML-significant characters in URLs", () => {
    const xml = sitemapXml([{ url: `${SITE_URL}/a?b=1&c=2` }]);
    expect(xml).toContain("<loc>https://readme.hackclub.com/a?b=1&amp;c=2</loc>");
  });
});
