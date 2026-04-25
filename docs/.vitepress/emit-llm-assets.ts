/**
 * VitePress buildEnd hook — emits three classes of machine-readable artefact
 * into `dist/` alongside the built HTML:
 *
 *  1. A `.md` copy of every source page (so consumers can fetch the Markdown
 *     directly by appending `.md` to any URL).
 *  2. `/llms.txt` — the llmstxt.org-format short index: project description
 *     plus a linked list of every page with a one-line summary.
 *  3. `/llms-full.txt` — every page's markdown, concatenated with section
 *     separators, stripped of YAML frontmatter. For agents that want to load
 *     the whole docs in one fetch.
 *
 * No runtime deps beyond `node:fs` / `node:path` / `node:url`.
 */
import fs from 'node:fs'
import path from 'node:path'
import type { SiteConfig } from 'vitepress'

interface PageRecord {
  /** Repo-relative source path, e.g. "docs/guide/quick-start.md" */
  src: string
  /** URL-facing route under the site base, e.g. "/guide/quick-start" */
  route: string
  /** Filename path under dist, e.g. "guide/quick-start.md" */
  distRelative: string
  /** First-line title (from the first `# ` header, falling back to route). */
  title: string
  /** Frontmatter description if present, else first paragraph. */
  summary: string
  /** Full source markdown, frontmatter removed. */
  body: string
}

const BASE = process.env.DERIDE_BASE ?? '/deride/'
const SITE_URL = 'https://guzzlerio.github.io/deride'

/** Strip leading YAML frontmatter (`---\n...\n---\n`). */
function stripFrontmatter(md: string): { body: string; frontmatter: Record<string, string> } {
  const match = md.match(/^---\n([\s\S]*?)\n---\n/)
  if (!match) return { body: md, frontmatter: {} }
  const frontmatter: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/)
    if (m) frontmatter[m[1]] = m[2].trim()
  }
  return { body: md.slice(match[0].length), frontmatter }
}

function extractTitle(body: string, fallback: string): string {
  const m = body.match(/^#\s+(.+)$/m)
  return m ? m[1].trim() : fallback
}

function extractSummary(body: string, frontmatter: Record<string, string>): string {
  if (frontmatter.tagline) return frontmatter.tagline
  if (frontmatter.description) return frontmatter.description
  // First non-heading, non-blank paragraph.
  const paragraphs = body
    .replace(/^---[\s\S]*?---\n/, '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
  for (const p of paragraphs) {
    if (p.startsWith('#')) continue
    if (p.startsWith('```')) continue
    // Strip simple markdown syntax — agents read raw text fine, but
    // a cleaner summary reads better in llms.txt.
    return p
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .split('\n')[0]
      .slice(0, 200)
  }
  return ''
}

/** Walk `srcDir` recursively for `.md` files, excluding internal VitePress dirs. */
function* walkMarkdown(srcDir: string, base = ''): Generator<string> {
  const entries = fs.readdirSync(path.join(srcDir, base), { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue // .vitepress, .obsidian, etc.
    const rel = path.join(base, entry.name)
    const abs = path.join(srcDir, rel)
    if (entry.isDirectory()) {
      yield* walkMarkdown(srcDir, rel)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      yield rel
    }
  }
}

function routeFor(rel: string): string {
  // docs/guide/quick-start.md -> /guide/quick-start
  // docs/index.md -> /
  // docs/api/index.md -> /api/
  let r = rel.replace(/\\/g, '/').replace(/\.md$/, '')
  if (r === 'index') return '/'
  if (r.endsWith('/index')) r = r.slice(0, -'index'.length)
  return '/' + r
}

function collect(srcDir: string): PageRecord[] {
  const pages: PageRecord[] = []
  for (const rel of walkMarkdown(srcDir)) {
    const abs = path.join(srcDir, rel)
    const raw = fs.readFileSync(abs, 'utf8')
    const { body, frontmatter } = stripFrontmatter(raw)
    const route = routeFor(rel)
    const title = frontmatter.title
      ? frontmatter.title
      : frontmatter.name
        ? frontmatter.name
        : extractTitle(body, route)
    const summary = extractSummary(body, frontmatter)
    pages.push({
      src: rel,
      route,
      distRelative: rel.replace(/\\/g, '/'),
      title,
      summary,
      body: body.trim() + '\n',
    })
  }
  // Sort: home first, then alphabetical by route.
  pages.sort((a, b) => {
    if (a.route === '/') return -1
    if (b.route === '/') return 1
    return a.route.localeCompare(b.route)
  })
  return pages
}

function urlFor(route: string, ext: '.md' | '' = ''): string {
  const base = BASE.endsWith('/') ? BASE.slice(0, -1) : BASE
  if (route === '/') return `${SITE_URL}${base}/${ext ? `index${ext}` : ''}`
  if (route.endsWith('/') && ext === '.md') {
    return `${SITE_URL}${base}${route}index${ext}`
  }
  return `${SITE_URL}${base}${route}${ext}`
}

function groupPages(pages: PageRecord[]): Record<string, PageRecord[]> {
  const groups: Record<string, PageRecord[]> = {
    Home: [],
    Guide: [],
    'For Agents': [],
    Integrations: [],
    'API reference': [],
    Recipes: [],
  }
  for (const p of pages) {
    if (p.route === '/') groups.Home.push(p)
    else if (p.route.startsWith('/guide/')) groups.Guide.push(p)
    else if (p.route.startsWith('/ai/')) groups['For Agents'].push(p)
    else if (p.route.startsWith('/integrations/')) groups.Integrations.push(p)
    else if (p.route.startsWith('/api/')) groups['API reference'].push(p)
    else if (p.route.startsWith('/recipes/')) groups.Recipes.push(p)
    else (groups.Home ||= []).push(p)
  }
  return groups
}

function renderLlmsTxt(pages: PageRecord[]): string {
  const groups = groupPages(pages)
  const lines: string[] = []
  lines.push('# deride')
  lines.push('')
  lines.push('> TypeScript-first mocking library that wraps rather than monkey-patches. Works with frozen objects, sealed classes, and any coding style.')
  lines.push('')
  lines.push('Zero runtime dependencies beyond `debug`. Ships ESM + CJS + `.d.ts`. Framework-agnostic; opt-in integrations for vitest / jest / fake timers via sub-paths.')
  lines.push('')
  lines.push('This site also publishes:')
  lines.push('')
  lines.push(`- [\`llms-full.txt\`](${SITE_URL}${BASE}llms-full.txt) — every page concatenated for single-fetch ingestion.`)
  lines.push(`- \`.md\` variants of every page (append \`.md\` to any URL, e.g. ${SITE_URL}${BASE}guide/quick-start.md).`)
  lines.push(`- Decision tree, common mistakes, and canonical examples under the [For Agents](${SITE_URL}${BASE}ai/) section.`)
  lines.push('')
  for (const [heading, items] of Object.entries(groups)) {
    if (items.length === 0 || heading === 'Home') continue
    lines.push(`## ${heading}`)
    lines.push('')
    for (const p of items) {
      const summary = p.summary ? `: ${p.summary}` : ''
      lines.push(`- [${p.title}](${urlFor(p.route, '.md')})${summary}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

function renderLlmsFullTxt(pages: PageRecord[]): string {
  const groups = groupPages(pages)
  const parts: string[] = []
  parts.push('# deride — complete documentation')
  parts.push('')
  parts.push('> TypeScript-first mocking library that wraps rather than monkey-patches. Works with frozen objects, sealed classes, and any coding style.')
  parts.push('')
  parts.push('This file concatenates every documentation page. For the structured index, see `llms.txt`. For individual pages as markdown, append `.md` to any URL.')
  parts.push('')
  for (const [heading, items] of Object.entries(groups)) {
    if (items.length === 0) continue
    parts.push('═'.repeat(78))
    parts.push(`# ${heading}`)
    parts.push('═'.repeat(78))
    parts.push('')
    for (const p of items) {
      parts.push('─'.repeat(78))
      parts.push(`# ${p.title}`)
      parts.push(`Source: ${urlFor(p.route, '.md')}`)
      parts.push('─'.repeat(78))
      parts.push('')
      // The body already has its own `# Title` heading — dedupe by stripping the first one if present.
      const body = p.body.replace(/^#\s+.+\n+/, '')
      parts.push(body)
      parts.push('')
    }
  }
  return parts.join('\n')
}

/**
 * Main entry — called from config.ts's `buildEnd` hook with the resolved SiteConfig.
 */
export async function emitLlmAssets(siteConfig: SiteConfig): Promise<void> {
  const srcDir = siteConfig.srcDir
  const outDir = siteConfig.outDir

  const pages = collect(srcDir)
  if (pages.length === 0) return

  // 1. Write .md copies of every source page next to the HTML.
  for (const p of pages) {
    const dest = path.join(outDir, p.distRelative)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, p.body, 'utf8')
  }

  // 2. llms.txt — index for agents
  fs.writeFileSync(path.join(outDir, 'llms.txt'), renderLlmsTxt(pages), 'utf8')

  // 3. llms-full.txt — concatenated body of every page
  fs.writeFileSync(path.join(outDir, 'llms-full.txt'), renderLlmsFullTxt(pages), 'utf8')

  // eslint-disable-next-line no-console
  console.log(
    `  [llm-assets] wrote ${pages.length} .md variants, llms.txt (${(fs.statSync(path.join(outDir, 'llms.txt')).size / 1024).toFixed(1)} KB), llms-full.txt (${(fs.statSync(path.join(outDir, 'llms-full.txt')).size / 1024).toFixed(1)} KB)`
  )
}
