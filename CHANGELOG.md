# Changelog

All notable changes to this project are documented in the **[GitHub releases page](https://github.com/guzzlerio/deride/releases)**, generated automatically by [semantic-release](https://github.com/semantic-release/semantic-release) from [Conventional Commits](https://www.conventionalcommits.org/).

This file preserves the historical v2.0.0 notes only; check the releases page for everything from v2.1 onwards.

## 2.0.0

Complete rewrite from JavaScript to TypeScript.

### Breaking Changes

- **Minimum Node.js version is now 18** (now 20+ on CI for vitest 4)
- Package is now ESM-first (`"type": "module"`) with CJS fallback
- Import style changed: `import deride from 'deride'` or `import { stub, wrap, func } from 'deride'`
- `toCallbackWith` now invokes the **last** function argument (previously first)
- `toEmit` signature simplified — the emitter is the wrapped object itself, not passed as an argument

### New Features

- Full TypeScript support with generics and exported types (`Wrapped<T>`, `MockSetup`, `MockExpect`, etc.)
- `deride.func(original?)` — create standalone mocked functions with setup/expect
- `setup.when(value | predicate)` — conditional behavior routing
- `setup.times(n)` / `once()` / `twice()` — limit behavior to N invocations
- `setup.toRejectWith(error)` — return a rejected promise
- `setup.toIntercept(fn)` — inspect arguments without replacing original behavior
- `setup.toTimeWarp(ms)` — accelerate timeouts
- `setup.fallback()` — clear all behaviors, revert to original
- `expect.called.not.*` — negated expectations for all assertion methods
- `expect.called.twice()` — convenience method
- `expect.called.lt(n)` / `lte(n)` / `gt(n)` / `gte(n)` — comparison operators
- `expect.invocation(i).withArgs(...)` — verify multiple args on specific invocation
- Named exports: `import { stub, wrap, func } from 'deride'`
- JSDoc on all public interfaces for IDE tooltips
- Conditional `exports` map in package.json for proper ESM/CJS resolution
- `sideEffects: false` for tree-shaking support

### Internal

- Single `MethodMock` class as the core engine (replaces separate Setup/Expectations factories)
- Proxy-based function mocking for clean callable + property access
- Behavior routing via ordered `StubBehavior[]` array (last registered wins)
- Build: tsup (CJS + ESM + .d.ts)
- Test: vitest with 90% coverage thresholds
- Lint: ESLint 9 flat config + typescript-eslint + prettier
- CI: GitHub Actions (Node 20/22 matrix)
- Zero runtime dependencies beyond `debug`
