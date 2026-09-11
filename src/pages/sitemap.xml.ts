import type { APIRoute } from "astro";
import { sitemapXml } from "../lib/docs";
import { lastModified } from "../lib/lastmod";
import { PAGES } from "../lib/pages";

export const prerender = true;

export const GET: APIRoute = () => {
  const buildTime = new Date();
  const body = sitemapXml(
    PAGES.map((page) => ({
      url: page.url,
      lastmod: lastModified(page.file, buildTime),
    })),
  );
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
};
