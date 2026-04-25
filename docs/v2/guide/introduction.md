# Introduction

**deride** is a TypeScript-first mocking library that works with frozen objects, sealed classes, and any coding style — because it *composes* rather than monkey-patches.

## What it is

A test-doubles library. You use it to replace collaborators during testing: databases, HTTP clients, loggers, event emitters, clocks, anything. Typical testing-library shape:

```typescript
import { stub } from 'deride'

const mockDb = stub<Database>(['query'])
mockDb.setup.query.toResolveWith(rows)

const service = new UserService(mockDb)  // inject the mock
await service.getAll()

mockDb.expect.query.called.once()
```

## What makes it different

Most JS mocking libraries mutate objects in place — they swap a method on the *real* object with a spy wrapper and rely on restoring it afterwards. That works until it doesn't: frozen objects reject the mutation, ES2015 classes with private fields break, and any test that forgets to call `restore()` leaks state into the next test.

deride doesn't touch your real objects. `stub()`, `wrap()`, and `func()` all **produce a fresh object** with the same shape but independent behaviour. Your production code is never modified during tests.

## What you get

| Capability | What it looks like |
|------------|--------------------|
| Create test doubles from interfaces, instances, classes, or standalone functions | [`stub` / `wrap` / `func`](./creating-mocks) |
| Configure behaviour (return, resolve, throw, yield, sequence…) | [`setup.*`](./configuring-behaviour) |
| Assert how the mock was called | [`expect.*.called`](./expectations) |
| Inspect call history without throwing | [`spy.*`](./spy) |
| Match arguments expressively | [`match.*`](./matchers) |
| Verify cross-mock call order | [`inOrder(...)`](./ordering) |
| Group mocks, snapshot, restore | [`sandbox` / `snapshot`](./lifecycle) |
| Framework integrations | [`deride/vitest`, `deride/jest`, `deride/clock`](../integrations/vitest) |

## When to reach for deride

**Use it** when you want clean, composable, type-safe mocking that doesn't require a `beforeEach`/`afterEach` dance to clean up after itself — especially in codebases with `Object.freeze`, immutable-by-convention objects, or dependency-injected services.

**Reach for something else** if you primarily need module-level mocking (`vi.mock` / `jest.mock`) without injection — deride works alongside those but isn't a replacement for them. See [Module mocking](../recipes/module-mocking) for the preferred pattern.

## Stability & support

- **Node.js 20+** (required for vitest 4; CI tests against Node 20 and 22 on Ubuntu, macOS, and Windows).
- **ESM-first** with CJS fallback.
- Published under **MIT**, maintained at [guzzlerio/deride](https://github.com/guzzlerio/deride).

Next up: [installation](./installation), then a [5-minute quick start](./quick-start).
