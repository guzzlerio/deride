/**
 * Fetches GitHub Releases for guzzlerio/deride and writes a VitePress-ready
 * `docs/changelog.md`. Called before the VitePress build so the page is
 * available as a normal doc page.
 *
 * Falls back to a placeholder if the API call fails (rate limiting, offline).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = 'guzzlerio/deride'
const API_URL = `https://api.github.com/repos/${REPO}/releases`
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT = path.resolve(__dirname, '../changelog.md')

interface GitHubRelease {
  tag_name: string
  name: string
  published_at: string
  body: string
  html_url: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export async function generateChangelog(): Promise<void> {
  let releases: GitHubRelease[]

  try {
    const res = await fetch(API_URL, {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) throw new Error(`GitHub API ${res.status}`)
    releases = (await res.json()) as GitHubRelease[]
  } catch (err) {
    console.warn(`[changelog] Failed to fetch releases: ${err}. Using placeholder.`)
    fs.writeFileSync(
      OUTPUT,
      [
        '# Changelog',
        '',
        `See the [GitHub Releases page](https://github.com/${REPO}/releases) for the full changelog.`,
        '',
      ].join('\n')
    )
    return
  }

  const lines: string[] = [
    '---',
    'title: Changelog',
    'aside: false',
    '---',
    '',
    '# Changelog',
    '',
  ]

  for (const release of releases) {
    const date = formatDate(release.published_at)
    const title = release.name || release.tag_name
    lines.push(`## [${title}](${release.html_url}) <Badge type="info" text="${date}" />`)
    lines.push('')
    if (release.body) {
      lines.push(release.body.trim())
      lines.push('')
    }
  }

  fs.writeFileSync(OUTPUT, lines.join('\n'))
  console.log(`[changelog] Wrote ${releases.length} releases to changelog.md`)
}
