import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'deride',
  description:
    'TypeScript-first mocking library that wraps rather than monkey-patches. Works with frozen objects, sealed classes, and any coding style.',
  lang: 'en-GB',

  // GitHub Pages will serve under /deride/ — override via env if publishing elsewhere.
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
    // Per-theme logos — real assets, no CSS invert hack.
    logo: {
      light: '/logo-icon.png',
      dark: '/logo-icon-white.png',
      alt: 'deride',
    },
    siteTitle: 'deride',

    nav: [
      { text: 'Guide', link: '/guide/introduction', activeMatch: '^/guide/' },
      { text: 'Integrations', link: '/integrations/vitest', activeMatch: '^/integrations/' },
      { text: 'API', link: '/api/', activeMatch: '^/api/' },
      { text: 'Recipes', link: '/recipes/module-mocking', activeMatch: '^/recipes/' },
      {
        text: 'Links',
        items: [
          { text: 'GitHub', link: 'https://github.com/guzzlerio/deride' },
          { text: 'npm', link: 'https://www.npmjs.com/package/deride' },
          { text: 'Changelog', link: 'https://github.com/guzzlerio/deride/blob/develop/CHANGELOG.md' },
          { text: 'Issues', link: 'https://github.com/guzzlerio/deride/issues' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          collapsed: false,
          items: [
            { text: 'Introduction', link: '/guide/introduction' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start', link: '/guide/quick-start' },
            { text: 'Philosophy', link: '/guide/philosophy' },
          ],
        },
        {
          text: 'Core Concepts',
          collapsed: false,
          items: [
            { text: 'Creating mocks', link: '/guide/creating-mocks' },
            { text: 'Configuring behaviour', link: '/guide/configuring-behaviour' },
            { text: 'Writing expectations', link: '/guide/expectations' },
            { text: 'Argument matchers', link: '/guide/matchers' },
            { text: 'Spy inspection', link: '/guide/spy' },
          ],
        },
        {
          text: 'Advanced',
          collapsed: false,
          items: [
            { text: 'Cross-mock ordering', link: '/guide/ordering' },
            { text: 'Lifecycle management', link: '/guide/lifecycle' },
            { text: 'Diagnostics', link: '/guide/diagnostics' },
            { text: 'TypeScript', link: '/guide/typescript' },
            { text: 'Migrating', link: '/guide/migrating' },
          ],
        },
      ],
      '/integrations/': [
        {
          text: 'Integrations',
          items: [
            { text: 'deride/vitest', link: '/integrations/vitest' },
            { text: 'deride/jest', link: '/integrations/jest' },
            { text: 'deride/clock', link: '/integrations/clock' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'stub', link: '/api/stub' },
            { text: 'wrap', link: '/api/wrap' },
            { text: 'func', link: '/api/func' },
            { text: 'match', link: '/api/match' },
            { text: 'inOrder', link: '/api/in-order' },
            { text: 'sandbox', link: '/api/sandbox' },
            { text: 'Types', link: '/api/types' },
          ],
        },
      ],
      '/recipes/': [
        {
          text: 'Recipes',
          items: [
            { text: 'Module mocking', link: '/recipes/module-mocking' },
            { text: 'Class mocking', link: '/recipes/class-mocking' },
            { text: 'Async & Promises', link: '/recipes/async-mocking' },
            { text: 'Fluent APIs', link: '/recipes/chainable-apis' },
            { text: 'Time & timers', link: '/recipes/time-and-timers' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/guzzlerio/deride' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/deride' },
    ],

    editLink: {
      pattern: 'https://github.com/guzzlerio/deride/edit/develop/docs/:path',
      text: 'Edit this page on GitHub',
    },

    search: {
      provider: 'local',
      options: {
        detailedView: true,
      },
    },

    footer: {
      message: 'Released under the <a href="https://github.com/guzzlerio/deride/blob/develop/LICENSE-MIT">MIT License</a>.',
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
})
