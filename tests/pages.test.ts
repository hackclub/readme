import { describe, expect, it } from "vitest";
import { PAGES, findPage, normalizePath } from "../src/lib/pages";
import { ORGANIZATION_SCHEMA, absoluteUrl } from "../src/lib/site";

describe("PAGES", () => {
  it("includes every MDX page exactly once", () => {
    const paths = PAGES.map((page) => page.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toContain("/");
    expect(paths).toContain("/nutshells");
    expect(paths.length).toBeGreaterThanOrEqual(10);
  });

  it("starts in reading order", () => {
    expect(PAGES.slice(0, 4).map((page) => page.path)).toEqual([
      "/",
      "/hack-club",
      "/slack",
      "/ysws",
    ]);
  });

  it("gives every page a title, a description and an absolute URL", () => {
    for (const page of PAGES) {
      expect(page.title).not.toBe("");
      expect(page.description.length).toBeGreaterThan(20);
      expect(page.url).toBe(absoluteUrl(page.path));
      expect(page.file).toMatch(/^src\/pages\/.+\.mdx$/);
    }
  });
});

describe("normalizePath", () => {
  it("strips trailing slashes but keeps the root", () => {
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath("/slack/")).toBe("/slack");
    expect(normalizePath("/slack")).toBe("/slack");
    expect(normalizePath("slack")).toBe("/slack");
  });
});

describe("findPage", () => {
  it("resolves page URLs with or without a trailing slash", () => {
    expect(findPage("/")?.path).toBe("/");
    expect(findPage("/slack/")?.path).toBe("/slack");
    expect(findPage("/nope")).toBeUndefined();
  });
});

describe("ORGANIZATION_SCHEMA", () => {
  it("carries the fields an agent needs to verify the organization", () => {
    expect(ORGANIZATION_SCHEMA["@type"]).toBe("Organization");
    expect(ORGANIZATION_SCHEMA.name).toBe("Hack Club");
    expect(ORGANIZATION_SCHEMA.address["@type"]).toBe("PostalAddress");
    expect(ORGANIZATION_SCHEMA.address.addressLocality).toBe("Burlington");
    expect(ORGANIZATION_SCHEMA.address.addressCountry).toBe("US");
    expect(ORGANIZATION_SCHEMA.contactPoint["@type"]).toBe("ContactPoint");
    expect(ORGANIZATION_SCHEMA.contactPoint.contactType).not.toBe("");
    expect(ORGANIZATION_SCHEMA.contactPoint.email).toContain("@");
    expect(ORGANIZATION_SCHEMA.contactPoint.telephone).toMatch(/^\+\d/);
    expect(ORGANIZATION_SCHEMA.sameAs.length).toBeGreaterThan(0);
  });
});
