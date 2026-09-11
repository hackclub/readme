import { parseFrontmatter } from "./mdx";
import { SITE_URL, absoluteUrl } from "./site";

const rawSources = import.meta.glob("../pages/**/*.mdx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const ORDER = [
  "/",
  "/hack-club",
  "/slack",
  "/ysws",
  "/services",
  "/activities",
  "/mascots",
  "/funfacts",
  "/closing",
  "/nutshells",
];

export type Page = {
  /** Site-root-relative path, without a trailing slash (`/` for the home page). */
  path: string;
  /** Repository-relative source file, e.g. `src/pages/slack.mdx`. */
  file: string;
  title: string;
  description: string;
  /** Raw MDX source, frontmatter included. */
  source: string;
  url: string;
};

function toPath(globKey: string): string {
  const slug = globKey.replace(/^\.\.\/pages\//, "").replace(/\.mdx$/, "");
  if (slug === "index") return "/";
  return `/${slug.replace(/\/index$/, "")}`;
}

function toFile(globKey: string): string {
  return globKey.replace(/^\.\.\//, "src/");
}

export const PAGES: Page[] = Object.entries(rawSources)
  .map(([globKey, source]) => {
    const { data } = parseFrontmatter(source);
    const path = toPath(globKey);
    return {
      path,
      file: toFile(globKey),
      title: data.title ?? path,
      description: data.description ?? "",
      source,
      url: absoluteUrl(path),
    };
  })
  .sort((a, b) => {
    const ai = ORDER.indexOf(a.path);
    const bi = ORDER.indexOf(b.path);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.path.localeCompare(b.path);
  });

/** Normalise a request pathname to the form used by {@link PAGES}. */
export function normalizePath(pathname: string): string {
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

export function findPage(pathname: string): Page | undefined {
  const path = normalizePath(pathname);
  return PAGES.find((page) => page.path === path);
}

export { SITE_URL };
