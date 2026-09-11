# README

hey! you've stumbled across the README... for README. README is a fun, concise guide for new Hack Clubbers covering what it means to be a hacker, the culture here, how our programs work, how to use our Slack, and how to get started with hacking in general!

## Running locally

Clone the repo to your local machine, and run :

```bash
bun install
bun dev
```

```bash
bun run test
```

Runs the unit tests (Vitest) for the Accept negotiation, the MDX to Markdown conversion, and the machine-readable endpoints.

## For agents

This site is built to be readable by agents as well as people:

- **Markdown content negotiation** — This site serves `text/markdown; charset=utf-8` from its canonical URL when the request sends `Accept: text/markdown`, and `text/html` otherwise. See [acceptmarkdown.com](https://acceptmarkdown.com).
- `/llms.txt` — an [llms.txt](https://llmstxt.org) index of every page.
- `/sitemap.xml` — sitemaps.org 0.9 XML, with `lastmod` from git history.
- `/robots.txt` — crawl policy plus the sitemap location.
- `/404` — a real `404` status with a page list and links to the files above to help agents find their way.
