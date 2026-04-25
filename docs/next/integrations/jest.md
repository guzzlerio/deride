# `deride/jest` — jest matchers

Same matcher set as `deride/vitest`, registered via jest's `expect.extend`. Import once (ideally from `setupFilesAfterEach`) and the matchers become available on every test.

## Install & register

deride declares `jest` as an optional peer dependency. If you're using jest you already have it installed (plus `@jest/globals` for ESM projects).

```typescript
// jest.setup.ts
import 'deride/jest'
```

```javascript
// jest.config.js
module.exports = {
  setupFilesAfterEach: ['./jest.setup.ts'],
}
```

## Available matchers

| Matcher | Meaning |
|---------|---------|
| `toHaveBeenCalled()` | At least one call recorded |
| `toHaveBeenCalledTimes(n)` | Exactly `n` calls |
| `toHaveBeenCalledOnce()` | Exactly 1 call |
| `toHaveBeenCalledWith(...args)` | Any call's args match (matcher-aware, partial) |
| `toHaveBeenLastCalledWith(...args)` | The last call's args match |
| `toHaveBeenNthCalledWith(n, ...args)` | The **1-indexed** `n`-th call's args match |

All support `.not`:

```typescript
expect(mock.spy.greet).not.toHaveBeenCalledWith('wrong')
```

## Usage

The API is identical to the vitest integration:

```typescript
import 'deride/jest'
import { stub, match } from 'deride'

describe('Svc', () => {
  it('records calls', () => {
    const mock = stub<Svc>(['greet'])
    mock.greet('alice')

    expect(mock.spy.greet).toHaveBeenCalledOnce()
    expect(mock.spy.greet).toHaveBeenCalledWith('alice')
    expect(mock.spy.greet).toHaveBeenCalledWith(match.string)
  })
})
```

For MockedFunctions (from `func()` or `wrap(fn)`), pass the function directly — no `.spy` indirection needed:

```typescript
const fn = func<(x: number) => number>()
fn(5)
expect(fn).toHaveBeenCalledOnce()
expect(fn).toHaveBeenCalledWith(5)
```

## Coexistence with jest's built-in matchers

jest's `toHaveBeenCalled*` family works on `jest.fn()` via `.mock.calls`. deride's family works on `mock.spy.*` / `MockedFunction` via `CallRecord[]`. Both can be used in the same test — jest delegates to whichever matcher's `received` shape is satisfied.

## Guarded install

The sub-path checks for `expect.extend` before registering, so importing it in an environment where jest isn't in scope (e.g. if you accidentally load it in a build) is harmless — it becomes a no-op instead of throwing.

## ESM note

In jest ESM projects, you may need `@jest/globals` for `expect` to be in scope. deride's `jest.ts` doesn't import jest itself — it looks for a global `expect` at runtime. If `expect` isn't globally available (which can happen in some ESM configs), import it explicitly in your setup file:

```typescript
import { expect } from '@jest/globals'
import 'deride/jest'
```

## Troubleshooting

- **Matcher not found** — make sure the import ran. Put it in `setupFilesAfterEach` (not `setupFiles`, which runs before `expect` is wired up).
- **"expected a MethodSpy or MockedFunction"** — pass `mock.spy.method`, not `mock.expect.method`.

See the [vitest integration](./vitest) for the same matcher set with slightly different error-message formatting. The underlying implementation is shared — `src/matchers-runtime.ts`.
