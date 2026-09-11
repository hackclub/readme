/**
 * The request-time half of Accept negotiation, kept free of Astro imports so
 * it can be exercised directly in tests. `src/middleware.ts` is a thin wrapper
 * around {@link negotiateResponse}.
 */

import {
  MARKDOWN,
  appendVaryAccept,
  negotiate,
  notAcceptableBody,
} from "./accept";
import { notFoundMarkdown } from "./docs";
import { renderMarkdownDocument } from "./mdx";
import { findPage, normalizePath } from "./pages";
import { SITE_URL } from "./site";

/** Browsers revalidate; Vercel's CDN keeps a copy of each negotiated variant. */
export const PAGE_CACHE_CONTROL =
  "public, max-age=0, must-revalidate, s-maxage=600, stale-while-revalidate=86400";

const ERROR_CACHE_CONTROL = "public, max-age=0, must-revalidate";

function markdownResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      Vary: "Accept",
      "Cache-Control": status === 200 ? PAGE_CACHE_CONTROL : ERROR_CACHE_CONTROL,
    },
  });
}

function notAcceptableResponse(accept: string | null): Response {
  return new Response(notAcceptableBody(accept), {
    status: 406,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      Vary: "Accept",
      "Cache-Control": "no-store",
    },
  });
}

export async function negotiateResponse(
  request: Request,
  next: () => Promise<Response>,
): Promise<Response> {
  const accept = request.headers.get("accept");
  const chosen = negotiate(accept);
  const pathname = normalizePath(new URL(request.url).pathname);
  const page = findPage(pathname);

  if (page) {
    if (chosen === null) return notAcceptableResponse(accept);
    if (chosen === MARKDOWN) {
      return markdownResponse(
        renderMarkdownDocument(page.source, {
          title: page.title,
          description: page.description,
          url: page.url,
          siteUrl: SITE_URL,
        }),
        200,
      );
    }
    const response = await next();
    appendVaryAccept(response.headers);
    // RFC 8288 link to the other representation of this same URL.
    response.headers.append(
      "Link",
      `<${page.url}>; rel="alternate"; type="text/markdown"`,
    );
    if (!response.headers.has("Cache-Control")) {
      response.headers.set("Cache-Control", PAGE_CACHE_CONTROL);
    }
    return response;
  }

  const response = await next();
  const contentType = response.headers.get("content-type") ?? "";
  // Only HTML documents (the 404 page in practice) are negotiable; static
  // assets and the prerendered text endpoints pass straight through.
  if (!contentType.toLowerCase().startsWith("text/html")) return response;

  if (chosen === null) return notAcceptableResponse(accept);
  if (chosen === MARKDOWN) {
    return markdownResponse(notFoundMarkdown(pathname), response.status);
  }

  appendVaryAccept(response.headers);
  return response;
}
