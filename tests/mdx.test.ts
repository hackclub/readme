import { describe, expect, it } from "vitest";
import {
  mdxBodyToMarkdown,
  parseFrontmatter,
  renderMarkdownDocument,
} from "../src/lib/mdx";
import { PAGES } from "../src/lib/pages";
import { SITE_URL } from "../src/lib/site";

const convert = (body: string) => mdxBodyToMarkdown(body, SITE_URL);

describe("parseFrontmatter", () => {
  it("splits frontmatter from the body", () => {
    const { data, body } = parseFrontmatter(
      '---\nlayout: ../layouts/page.astro\ntitle: "Hello"\n---\n\nhi\n',
    );
    expect(data).toEqual({ layout: "../layouts/page.astro", title: "Hello" });
    expect(body).toBe("\nhi\n");
  });

  it("passes through a document without frontmatter", () => {
    expect(parseFrontmatter("# hi")).toEqual({ data: {}, body: "# hi" });
  });
});

describe("mdxBodyToMarkdown", () => {
  it("drops module imports", () => {
    expect(
      convert(
        'import Emoji from "../components/emoji.astro";\nimport "./x.css"\n\ntext',
      ),
    ).toBe("text");
  });

  it("turns Emoji components into their shortcode", () => {
    expect(convert('funded by <Emoji name="github" /> GitHub')).toBe(
      "funded by :github: GitHub",
    );
  });

  it("renders a standalone Prism block as a fenced code block", () => {
    expect(convert("run\n\n<Prism lang=\"shell\" code={`brew install wget`} />")).toBe(
      "run\n\n```shell\nbrew install wget\n```",
    );
  });

  it("renders an inline Prism as inline code", () => {
    expect(convert("run <Prism code={`git status`} lang=\"shell\"/> now")).toBe(
      "run `git status` now",
    );
  });

  it("keeps absolute images and drops build-time ones", () => {
    expect(
      convert('<img src="https://example.com/a.gif" alt="a gif" class="breakout" />'),
    ).toBe("![a gif](https://example.com/a.gif)");
    expect(convert("<img src={shroud.src} alt=\"shroud\"/>")).toBe("");
    expect(convert("![HQ](../assets/images/hq.png)")).toBe("");
  });

  it("decodes non-breaking spaces", () => {
    expect(convert('<Emoji name="github" />&nbsp;GitHub')).toBe(":github: GitHub");
  });

  it("converts anchors and headings", () => {
    expect(convert('<a href="https://a.test" target="_blank">code</a>')).toBe(
      "[code](https://a.test)",
    );
    expect(convert("<h1>Orpheus</h1>")).toBe("# Orpheus");
    expect(convert('<h3 class="x">Heidi</h3>')).toBe("### Heidi");
  });

  it("unwraps layout markup and unindents the prose inside it", () => {
    expect(
      convert(
        '<div class="flex">\n    <div class="col">\n        <h1>Orpheus</h1>\n        <span class="pb-4">Rawr!</span>\n    </div>\n</div>',
      ),
    ).toBe("# Orpheus\n\nRawr!");
  });

  it("removes layout-only components entirely", () => {
    expect(
      convert(
        'text\n\n<FooterNavigation backlink="/" backtitle="Home" forwardlink="/slack" forwardtitle="Slack"></FooterNavigation>',
      ),
    ).toBe("text");
  });

  it("strips nutshell markers from links and headings", () => {
    expect(convert("- [:What's a grant?](/nutshells#whats-a-grant)")).toBe(
      `- [What's a grant?](${SITE_URL}/nutshells#whats-a-grant)`,
    );
    expect(convert("## : component: clubs")).toBe("## component: clubs");
  });

  it("makes root-relative links absolute and leaves external ones alone", () => {
    expect(convert("[Slack](/slack) and [HC](https://hackclub.com/)")).toBe(
      `[Slack](${SITE_URL}/slack) and [HC](https://hackclub.com/)`,
    );
  });

  it("preserves list indentation and fenced code", () => {
    expect(convert("- a\n  - b\n\n```js\n  indented\n```")).toBe(
      "- a\n  - b\n\n```js\n  indented\n```",
    );
  });
});

describe("renderMarkdownDocument", () => {
  it("adds a title, summary and source footer", () => {
    const doc = renderMarkdownDocument(
      '---\ntitle: "Slack"\ndescription: "About Slack"\n---\n\nbody text\n',
      {
        title: "Slack",
        description: "About Slack",
        url: `${SITE_URL}/slack`,
        siteUrl: SITE_URL,
      },
    );
    expect(doc).toBe(
      `# Slack\n\n> About Slack\n\nbody text\n\n---\n\nSource: ${SITE_URL}/slack · [All pages](${SITE_URL}/llms.txt) · [Sitemap](${SITE_URL}/sitemap.xml)\n`,
    );
  });
});

describe("every real page converts cleanly", () => {
  for (const page of PAGES) {
    it(`${page.path} has no leftover markup or build-time scaffolding`, () => {
      const doc = renderMarkdownDocument(page.source, {
        title: page.title,
        description: page.description,
        url: page.url,
        siteUrl: SITE_URL,
      });
      expect(doc.startsWith(`# ${page.title}`)).toBe(true);
      expect(doc.length).toBeGreaterThan(200);
      // No JSX/HTML tags, no module statements, no unresolved expressions.
      expect(doc).not.toMatch(/<\/?[A-Za-z][A-Za-z0-9]*[\s/>]/);
      expect(doc).not.toMatch(/^\s*import\s+.*from\s+["']/m);
      expect(doc).not.toMatch(/\{[A-Za-z]+\.src\}/);
      expect(doc).not.toMatch(/\]\(\/(?!\/)/);
      expect(doc).not.toMatch(/\[:/);
    });
  }
});
