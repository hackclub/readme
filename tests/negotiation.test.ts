import { describe, expect, it } from "vitest";
import { PAGE_CACHE_CONTROL, negotiateResponse } from "../src/lib/negotiation";
import { SITE_URL } from "../src/lib/site";

const html = (status = 200, headers: Record<string, string> = {}) =>
  new Response("<!doctype html><html><body>hi</body></html>", {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", ...headers },
  });

async function request(
  path: string,
  accept?: string,
  next: () => Promise<Response> = async () => html(),
) {
  return negotiateResponse(
    new Request(`${SITE_URL}${path}`, {
      headers: accept ? { Accept: accept } : {},
    }),
    next,
  );
}

describe("a page URL", () => {
  it("serves HTML by default, with Vary and an alternate Link", async () => {
    const response = await request("/slack");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(response.headers.get("Vary")).toBe("Accept");
    expect(response.headers.get("Link")).toBe(
      `<${SITE_URL}/slack>; rel="alternate"; type="text/markdown"`,
    );
    expect(response.headers.get("Cache-Control")).toBe(PAGE_CACHE_CONTROL);
  });

  it("serves HTML to a browser Accept header", async () => {
    const response = await request(
      "/",
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    );
    expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(response.headers.get("Vary")).toBe("Accept");
  });

  it("serves Markdown for Accept: text/markdown", async () => {
    const response = await request("/slack", "text/markdown");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/markdown; charset=utf-8",
    );
    expect(response.headers.get("Vary")).toBe("Accept");
    expect(response.headers.get("Cache-Control")).toBe(PAGE_CACHE_CONTROL);
    const body = await response.text();
    expect(body.startsWith("# Slacking off on Slack")).toBe(true);
    expect(body).not.toContain("<");
  });

  it("does not render HTML when Markdown wins", async () => {
    let called = false;
    await request("/slack", "text/markdown", async () => {
      called = true;
      return html();
    });
    expect(called).toBe(false);
  });

  it("resolves a trailing slash and the site root", async () => {
    expect(
      (await request("/slack/", "text/markdown")).headers.get("Content-Type"),
    ).toBe("text/markdown; charset=utf-8");
    const root = await request("/", "text/markdown");
    expect((await root.text()).startsWith("# Hello, World")).toBe(true);
  });

  it("preserves a Vary header the page already set", async () => {
    const response = await request("/slack", undefined, async () =>
      html(200, { Vary: "Accept-Encoding" }),
    );
    expect(response.headers.get("Vary")).toBe("Accept-Encoding, Accept");
  });

  it("answers 406 when neither representation is acceptable", async () => {
    const response = await request("/slack", "application/pdf");
    expect(response.status).toBe(406);
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("Vary")).toBe("Accept");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.text()).toContain("- text/markdown");
  });
});

describe("an unknown URL", () => {
  const missing = async () => html(404);

  it("keeps the 404 status for HTML clients and varies on Accept", async () => {
    const response = await request("/nope", undefined, missing);
    expect(response.status).toBe(404);
    expect(response.headers.get("Vary")).toBe("Accept");
  });

  it("returns a Markdown 404 that points agents somewhere useful", async () => {
    const response = await request("/nope", "text/markdown", missing);
    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toBe(
      "text/markdown; charset=utf-8",
    );
    expect(response.headers.get("Vary")).toBe("Accept");
    const body = await response.text();
    expect(body).toMatch(/^# 404/);
    expect(body).toContain("`/nope`");
    expect(body).toContain(`${SITE_URL}/llms.txt`);
    expect(body).toContain(`${SITE_URL}/sitemap.xml`);
    expect(body).toContain(`${SITE_URL}/slack`);
  });

  it("answers 406 when neither representation is acceptable", async () => {
    const response = await request("/nope", "application/pdf", missing);
    expect(response.status).toBe(406);
  });
});

describe("non-HTML responses", () => {
  it("pass straight through untouched", async () => {
    const asset = () =>
      Promise.resolve(
        new Response("body{}", {
          headers: { "Content-Type": "text/css", "Cache-Control": "immutable" },
        }),
      );
    const response = await request("/_astro/app.css", "text/markdown", asset);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/css");
    expect(response.headers.get("Vary")).toBeNull();
    expect(await response.text()).toBe("body{}");
  });

  it("leave an existing Cache-Control alone on pages", async () => {
    const response = await request("/slack", undefined, async () =>
      html(200, { "Cache-Control": "private, no-store" }),
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
