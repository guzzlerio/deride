# deride — brand

Logo and brand assets for [deride](../README.md).

## Files

| File | Purpose | Recommended size |
|------|---------|------------------|
| [`logo.svg`](./logo.svg) | Icon-only mark, 64×64 viewBox | 32–512 px |
| [`logo-wordmark.svg`](./logo-wordmark.svg) | Icon + "deride" wordmark, 280×64 viewBox | 120–600 px wide |
| [`favicon.svg`](./favicon.svg) | Simplified mark for 16–32 px contexts | 16–48 px |

## The mark

**`⟨d⟩` with a composition dot.** The angle brackets evoke code / wrapping; the lowercase "d" in the middle is framed by them. The bowl of the d is drawn as a **ring** around a **filled dot** — the ring is the wrapper, the dot is the original object inside it. Two separate shapes with a visible gap: *composition, not monkey-patching*, rendered literally.

The simplified `favicon.svg` drops the inner dot (it disappears below ~20 px anyway) so the d stays legible at tab scale.

## Theming

Every stroke and fill is set to `currentColor`, so a single file works on light AND dark backgrounds — just inherit the surrounding text colour:

```css
.deride-logo {
  color: #111; /* any colour, any theme */
  width: 120px;
}
```

```html
<div class="deride-logo">
  <img src="brand/logo.svg" alt="deride" />
</div>
```

Or inline-SVG the file to make the colour CSS-controllable without wrapping:

```html
<svg class="deride-logo">
  <use href="brand/logo.svg#root" />
</svg>
```

## Usage guidelines

- Maintain the built-in padding (the viewBox already leaves ~8 px clear space). Don't crop the artwork tight.
- Don't recolour with multiple fills — the mark is deliberately monochrome; use `currentColor` and let the surrounding theme choose.
- Don't distort the aspect ratio. SVGs are scalable; preserve the ratio.
- Don't add drop shadows or effects — the mark is designed to be flat.

## Licence

Released under the same [MIT licence](../LICENSE-MIT) as the deride library itself.
