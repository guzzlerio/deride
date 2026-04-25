import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import { defineConfig } from 'vitepress'
import { emitLlmAssets } from './emit-llm-assets'
import { generateChangelog } from './generate-changelog'

const require = createRequire(import.meta.url)
const pkg = require('../../package.json') as { version: string }
const major = pkg.version.split('.')[0]

// Generate changelog.md from GitHub Releases before VitePress processes pages.
await generateChangelog()

// Check if docs/next/ differs from docs/v2/ (the released snapshot).
// If identical, the version switcher hides the "Next" option.
let hasNextVersion = false
try {
  execSync('diff -rq docs/next docs/v2', { stdio: 'ignore' })
} catch {
  // diff exits non-zero when directories differ
  hasNextVersion = true
}

// Versions that appear in the sidebar — each maps to a docs subdirectory.
const versions = [
  ...(hasNextVersion ? ['next'] : []),
  'latest',
  `v${major}`,
]

/** Build sidebar config for a given version prefix. */
function versionedSidebar(v: string) {
  const p = `/${v}`
  return {
    [`${p}/guide/`]: [
      {
        text: 'Getting Started',
        collapsed: false,
        items: [
          { text: 'Introduction', link: `${p}/guide/introduction` },
          { text: 'Installation', link: `${p}/guide/installation` },
          { text: 'Quick Start', link: `${p}/guide/quick-start` },
          { text: 'Philosophy', link: `${p}/guide/philosophy` },
        ],
      },
      {
        text: 'Core Concepts',
        collapsed: false,
        items: [
          { text: 'Creating mocks', link: `${p}/guide/creating-mocks` },
          { text: 'Configuring behaviour', link: `${p}/guide/configuring-behaviour` },
          { text: 'Writing expectations', link: `${p}/guide/expectations` },
          { text: 'Argument matchers', link: `${p}/guide/matchers` },
          { text: 'Spy inspection', link: `${p}/guide/spy` },
        ],
      },
      {
        text: 'Advanced',
        collapsed: false,
        items: [
          { text: 'Cross-mock ordering', link: `${p}/guide/ordering` },
          { text: 'Lifecycle management', link: `${p}/guide/lifecycle` },
          { text: 'Diagnostics', link: `${p}/guide/diagnostics` },
          { text: 'TypeScript', link: `${p}/guide/typescript` },
          { text: 'Migrating', link: `${p}/guide/migrating` },
        ],
      },
    ],
    [`${p}/integrations/`]: [
      {
        text: 'Integrations',
        items: [
          { text: 'deride/vitest', link: `${p}/integrations/vitest` },
          { text: 'deride/jest', link: `${p}/integrations/jest` },
          { text: 'deride/clock', link: `${p}/integrations/clock` },
        ],
      },
    ],
    [`${p}/api/`]: [
      {
        text: 'API Reference',
        items: [
          { text: 'Overview', link: `${p}/api/` },
          { text: 'stub', link: `${p}/api/stub` },
          { text: 'wrap', link: `${p}/api/wrap` },
          { text: 'func', link: `${p}/api/func` },
          { text: 'match', link: `${p}/api/match` },
          { text: 'inOrder', link: `${p}/api/in-order` },
          { text: 'sandbox', link: `${p}/api/sandbox` },
          { text: 'Types', link: `${p}/api/types` },
        ],
      },
    ],
    [`${p}/recipes/`]: [
      {
        text: 'Recipes',
        items: [
          { text: 'Module mocking', link: `${p}/recipes/module-mocking` },
          { text: 'Class mocking', link: `${p}/recipes/class-mocking` },
          { text: 'Async & Promises', link: `${p}/recipes/async-mocking` },
          { text: 'Fluent APIs', link: `${p}/recipes/chainable-apis` },
          { text: 'Time & timers', link: `${p}/recipes/time-and-timers` },
        ],
      },
    ],
    [`${p}/ai/`]: [
      {
        text: 'For Agents',
        items: [
          { text: 'Overview', link: `${p}/ai/` },
          { text: 'Decision tree', link: `${p}/ai/decision-tree` },
          { text: 'Canonical examples', link: `${p}/ai/canonical-examples` },
          { text: 'Common mistakes', link: `${p}/ai/common-mistakes` },
          { text: 'Agent-ready feeds', link: `${p}/ai/feeds` },
        ],
      },
    ],
  }
}

export default defineConfig({
  title: 'deride',
  description:
    'TypeScript-first mocking library that wraps rather than monkey-patches. Works with frozen objects, sealed classes, and any coding style.',
  lang: 'en-GB',

  base: process.env.DERIDE_BASE ?? '/deride/',
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/deride/logo-icon.png' }],
    ['meta', { name: 'theme-color', content: '#0a0a0a' }],
    ['meta', { property: 'og:title', content: 'deride' }],
    ['meta', { property: 'og:description', content: 'TypeScript-first mocking that wraps rather than monkey-patches.' }],
    ['meta', { property: 'og:image', content: 'https://guzzlerio.github.io/deride/logo.png' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ],

  themeConfig: {
    hasNextVersion,

    logo: {
      light: '/logo-icon.png',
      dark: '/logo-icon-white.png',
      alt: 'deride',
    },
    siteTitle: 'deride',

    nav: [
      { text: 'Guide', link: '/latest/guide/introduction', activeMatch: '/(latest|next|v\\d+)/guide/' },
      { text: 'Integrations', link: '/latest/integrations/vitest', activeMatch: '/(latest|next|v\\d+)/integrations/' },
      { text: 'API', link: '/latest/api/', activeMatch: '/(latest|next|v\\d+)/api/' },
      { text: 'Recipes', link: '/latest/recipes/module-mocking', activeMatch: '/(latest|next|v\\d+)/recipes/' },
      { text: 'For Agents', link: '/latest/ai/', activeMatch: '/(latest|next|v\\d+)/ai/' },
      {
        text: 'Links',
        items: [
          { text: 'GitHub', link: 'https://github.com/guzzlerio/deride' },
          { text: 'npm', link: 'https://www.npmjs.com/package/deride' },
          { text: 'Changelog', link: '/changelog' },
          { text: 'Issues', link: 'https://github.com/guzzlerio/deride/issues' },
        ],
      },
    ],

    sidebar: Object.assign(
      {},
      ...versions.map((v) => versionedSidebar(v))
    ),

    socialLinks: [
      { icon: 'github', link: 'https://github.com/guzzlerio/deride' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/deride' },
    ],

    editLink: {
      pattern: 'https://github.com/guzzlerio/deride/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    search: {
      provider: 'local',
      options: {
        detailedView: true,
      },
    },

    footer: {
      message: 'Released under the <a href="https://github.com/guzzlerio/deride/blob/main/LICENSE-MIT">MIT License</a>.',
      copyright: 'Copyright © 2014-present Andrew Rea & James Allen',
    },

    outline: {
      level: [2, 3],
      label: 'On this page',
    },

    docFooter: {
      prev: 'Previous page',
      next: 'Next page',
    },
  },

  markdown: {
    theme: { light: 'github-light', dark: 'github-dark' },
    lineNumbers: false,
  },

  async buildEnd(siteConfig) {
    await emitLlmAssets(siteConfig)
  },
})
