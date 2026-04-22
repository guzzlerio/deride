# deride — brand

Logo and brand assets for [deride](../README.md).

## Files

### Primary (with "deride" wordmark)

| File | Background | Ink | Use |
|------|------------|-----|-----|
| [`logo.png`](./logo.png) | solid white | dark | README on GitHub / npm, light backgrounds |
| [`logo-white.png`](./logo-white.png) | transparent | white | overlay on dark surfaces |
| [`logo-full.png`](./logo-full.png) | transparent | dark | hero / marketing on light backgrounds |
| [`logo-full-white.png`](./logo-full-white.png) | transparent | white | hero / marketing on dark backgrounds |

### Icon-only (just the "D" mark)

| File | Background | Ink | Use |
|------|------------|-----|-----|
| [`logo-icon.png`](./logo-icon.png) | transparent | dark | favicons, small navbars on light |
| [`logo-icon-white.png`](./logo-icon-white.png) | transparent | white | favicons, small navbars on dark |

### Source / brand sheet

| File | Contents |
|------|----------|
| [`logo-transparent.png`](./logo-transparent.png) | Original brand sheet (dark ink) — full composition + standalone icon, as supplied |
| [`logo-transparent-white.png`](./logo-transparent-white.png) | Same sheet, white ink, for pulling variants onto dark backgrounds |

## Usage

- In the VitePress docs site, `themeConfig.logo` picks the dark-ink icon on light mode and the white-ink icon on dark mode — no CSS filter tricks. The same pattern is used for the home-page hero image.
- In README.md at the top of the repo, `logo.png` (solid white BG) is used so it reads cleanly on both GitHub's light and dark themes.
- For third-party integrations (blogs, conference slides), start from `logo-full.png` or `logo-full-white.png` — both are tightly trimmed and transparent-backed so they drop into any layout.

## Guidelines

- Maintain the built-in padding around the mark. Don't crop tight.
- Don't recolour with multiple fills — the mark is deliberately flat and monochrome. Use the supplied dark/white variants rather than applying filters.
- Don't distort the aspect ratio.
- Don't add drop shadows or effects.

## Licence

Released under the same [MIT licence](../LICENSE-MIT) as the deride library itself.
