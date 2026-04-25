# Agent-ready feeds

All documentation is published in three machine-friendly forms in addition to the regular HTML site. Use these when configuring an AI agent / IDE extension / MCP server / RAG pipeline.

## `/llms.txt`

A short, llmstxt.org-format index of every documentation page. About 3 KB. Fits trivially in any context window. Each entry has a one-line summary and a link to the `.md` variant.

**URL:** <https://guzzlerio.github.io/deride/llms.txt>

```text
# deride

> TypeScript-first mocking library that wraps rather than monkey-patches.

## Guide
- [Introduction](https://guzzlerio.github.io/deride/guide/introduction.md): …
- [Quick Start](https://guzzlerio.github.io/deride/guide/quick-start.md): …

## For Agents
- [Overview](https://guzzlerio.github.io/deride/ai/index.md): …
…
```

## `/llms-full.txt`

Every page concatenated, frontmatter stripped, with visible section separators. Around 80 KB at the time of writing — well within any modern long-context window. Give this to the agent once and it has the entire docs in memory.

**URL:** <https://guzzlerio.github.io/deride/llms-full.txt>

## Per-page `.md` variants

Every documentation page is also served as plain Markdown at the same URL with `.md` appended. No HTML parsing needed.

**Examples:**

- <https://guzzlerio.github.io/deride/guide/quick-start.md>
- <https://guzzlerio.github.io/deride/ai/decision-tree.md>
- <https://guzzlerio.github.io/deride/api/stub.md>
- <https://guzzlerio.github.io/deride/integrations/vitest.md>

## How to wire it up

### Claude Code / Claude Desktop

Point Claude at the docs via a [custom system prompt](https://docs.claude.com/en/docs/claude-code) or a fetched context block:

```
Before writing tests that use deride, fetch
https://guzzlerio.github.io/deride/llms-full.txt
and apply its patterns. Prefer the canonical examples at
https://guzzlerio.github.io/deride/ai/canonical-examples.md
and avoid the anti-patterns at
https://guzzlerio.github.io/deride/ai/common-mistakes.md
```

### Cursor

Add an entry to `.cursor/rules/deride.mdc` in your project:

````markdown
---
description: Use deride for mocking in tests
globs: **/*.test.ts, **/*.test.tsx, **/*.spec.ts
---

When writing tests that use deride, follow the patterns at
https://guzzlerio.github.io/deride/ai/canonical-examples.md
and avoid the anti-patterns at
https://guzzlerio.github.io/deride/ai/common-mistakes.md

Decision tree for which API to reach for:
https://guzzlerio.github.io/deride/ai/decision-tree.md
````

### OpenAI / GPT Custom Instructions

Add to your Custom Instructions:

```
When writing TypeScript test code, if deride is available
(check package.json for the "deride" dependency), follow
https://guzzlerio.github.io/deride/llms.txt
```

### MCP servers

If you're running an MCP docs server (e.g. [docs MCP servers](https://github.com/modelcontextprotocol/servers)), `llms.txt` can be used as the index and the `.md` variants as the crawlable content.

### RAG pipelines

For embedding-based retrieval, the `.md` variants are ideal input — no HTML to strip, no navigation chrome, no JS-rendered content. Crawl the sitemap (`/sitemap.xml`) and fetch each URL with a `.md` suffix.

## How these feeds are maintained

A VitePress `buildEnd` hook in [`docs/.vitepress/emit-llm-assets.ts`](https://github.com/guzzlerio/deride/blob/develop/docs/.vitepress/emit-llm-assets.ts) walks the source markdown, strips frontmatter, and writes:

- `dist/<page>.md` — a clean Markdown copy of every page
- `dist/llms.txt` — the llmstxt.org index
- `dist/llms-full.txt` — everything concatenated

The hook runs on every `pnpm docs:build` and every GitHub Pages deploy via `.github/workflows/docs.yml`. Adding a new page under `docs/` picks up automatically — no extra build config required.

## Staying current

When deride's source API changes, the [Decision tree](./decision-tree), [Canonical examples](./canonical-examples), and [Common mistakes](./common-mistakes) pages must be updated alongside the main guide. The repo's `CLAUDE.md` lists this as a project rule; CI doesn't enforce it, so drift is possible. If you notice the agent-facing pages have fallen out of sync with the primary docs, open an issue or PR.
