# Installation

## Requirements

- **Node.js 20 or later** (deride's published CI matrix is Node 20 / 22 × Ubuntu / macOS / Windows).
- A test runner that catches thrown errors — vitest, jest, mocha, `node:test`, uvu, bun test, etc. deride is framework-agnostic.

## Install

::: code-group

```bash [pnpm]
pnpm add -D deride
```

```bash [npm]
npm install --save-dev deride
```

```bash [yarn]
yarn add -D deride
```

```bash [bun]
bun add -d deride
```

:::

deride itself has a single runtime dependency (`debug`) and ships ESM + CJS + `.d.ts` for every entry point.

## Import

The main entry exports the full API, plus a `deride` convenience namespace:

```typescript
import { stub, wrap, func, match, inOrder, sandbox } from 'deride'
// or
import deride from 'deride'
deride.stub(...)
```

### Sub-paths

Three optional integrations live under sub-paths. They're **opt-in** so the core bundle stays small:

```typescript
import { useFakeTimers } from 'deride/clock'   // fake timers
import 'deride/vitest'                          // vitest matchers (side-effect)
import 'deride/jest'                            // jest matchers (side-effect)
```

The `deride/vitest` and `deride/jest` imports register `toHaveBeenCalled*` matchers on your test runner's `expect`. Load them once — typically from your test-runner's `setupFiles`. Full details in [Integrations](/integrations/vitest).

### Peer dependencies

- `vitest` ≥ 1 if using `deride/vitest`
- `jest` ≥ 29 (and `@jest/globals`) if using `deride/jest`

These are declared as optional peers — install whichever you use.

## TypeScript

All public APIs ship their `.d.ts`. No additional `@types/...` package is required.

```typescript
import { stub, type Wrapped } from 'deride'

interface Service {
  greet(name: string): string
}

const mock: Wrapped<Service> = stub<Service>(['greet'])
mock.setup.greet.toReturn('hello')   // ✓ constrained to string
mock.setup.greet.toReturn(123)       // ✗ type error
```

See the [TypeScript guide](/guide/typescript) for the full story.

## Verifying the install

Drop this into a test file and run your suite:

```typescript
import { describe, it, expect } from 'vitest'   // or jest / node:test
import { func } from 'deride'

describe('deride is installed', () => {
  it('records calls', () => {
    const fn = func<(x: number) => number>()
    fn.setup.toReturn(42)
    expect(fn(1)).toBe(42)
    fn.expect.called.once()
  })
})
```

If it runs green, you're done. On to the [quick start](/guide/quick-start).
