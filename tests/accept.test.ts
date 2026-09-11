import { describe, expect, it } from "vitest";
import {
  HTML,
  MARKDOWN,
  appendVaryAccept,
  negotiate,
  notAcceptableBody,
  parseAccept,
} from "../src/lib/accept";

describe("parseAccept", () => {
  it("reads q-values and ranks specificity", () => {
    expect(parseAccept("text/markdown;q=0.9, text/*;q=0.5, */*;q=0.1")).toEqual([
      { type: "text/markdown", q: 0.9, specificity: 2 },
      { type: "text/*", q: 0.5, specificity: 1 },
      { type: "*/*", q: 0.1, specificity: 0 },
    ]);
  });

  it("defaults q to 1 and clamps out-of-range values", () => {
    expect(parseAccept("text/html, text/markdown;q=5, text/plain;q=-1")).toEqual([
      { type: "text/html", q: 1, specificity: 2 },
      { type: "text/markdown", q: 1, specificity: 2 },
      { type: "text/plain", q: 0, specificity: 2 },
    ]);
  });

  it("ignores junk entries", () => {
    expect(parseAccept("text/html, , garbage")).toEqual([
      { type: "text/html", q: 1, specificity: 2 },
    ]);
  });
});

describe("negotiate", () => {
  it("serves the default when Accept is missing or unconstrained", () => {
    expect(negotiate(null)).toBe(HTML);
    expect(negotiate("")).toBe(HTML);
    expect(negotiate("*/*")).toBe(HTML);
  });

  it("serves Markdown when it is asked for", () => {
    expect(negotiate("text/markdown")).toBe(MARKDOWN);
    expect(negotiate("text/markdown, */*;q=0.1")).toBe(MARKDOWN);
    expect(negotiate("TEXT/MARKDOWN")).toBe(MARKDOWN);
  });

  it("serves HTML to a browser", () => {
    expect(
      negotiate(
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      ),
    ).toBe(HTML);
  });

  it("honours q-values across candidates", () => {
    expect(negotiate("text/html;q=0.2, text/markdown;q=0.8")).toBe(MARKDOWN);
    expect(negotiate("text/html;q=0.8, text/markdown;q=0.2")).toBe(HTML);
  });

  it("breaks q ties on client order", () => {
    expect(negotiate("text/markdown, text/html")).toBe(MARKDOWN);
    expect(negotiate("text/html, text/markdown")).toBe(HTML);
  });

  it("honours q=0 as an explicit rejection, even under a wildcard", () => {
    expect(negotiate("text/html;q=0, */*")).toBe(MARKDOWN);
    expect(negotiate("text/markdown;q=0, */*")).toBe(HTML);
  });

  it("matches type wildcards", () => {
    expect(negotiate("text/*")).toBe(HTML);
    expect(negotiate("text/html;q=0, text/*")).toBe(MARKDOWN);
  });

  it("returns null only when nothing is acceptable", () => {
    expect(negotiate("application/pdf")).toBeNull();
    expect(negotiate("text/html;q=0, text/markdown;q=0")).toBeNull();
    expect(negotiate("image/png, application/json")).toBeNull();
  });
});

describe("appendVaryAccept", () => {
  it("sets Vary when absent", () => {
    const headers = new Headers();
    appendVaryAccept(headers);
    expect(headers.get("Vary")).toBe("Accept");
  });

  it("appends to an existing Vary", () => {
    const headers = new Headers({ Vary: "Accept-Encoding" });
    appendVaryAccept(headers);
    expect(headers.get("Vary")).toBe("Accept-Encoding, Accept");
  });

  it("does not duplicate Accept", () => {
    const headers = new Headers({ Vary: "accept, Accept-Encoding" });
    appendVaryAccept(headers);
    expect(headers.get("Vary")).toBe("accept, Accept-Encoding");
  });

  it("leaves a wildcard Vary alone", () => {
    const headers = new Headers({ Vary: "*" });
    appendVaryAccept(headers);
    expect(headers.get("Vary")).toBe("*");
  });
});

describe("notAcceptableBody", () => {
  it("lists the available representations and what was asked for", () => {
    const body = notAcceptableBody("application/pdf");
    expect(body).toContain("406 Not Acceptable");
    expect(body).toContain("- text/html");
    expect(body).toContain("- text/markdown");
    expect(body).toContain("You requested: application/pdf");
  });
});
