# `deride/vitest` — vitest matchers

Opt-in `toHaveBeenCalled*` matcher family that integrates deride's spy API with vitest's `expect`. Import once — typically from a `setupFiles` — and the matchers become available globally on every spy and `MockedFunction`.

## Install & register

deride declares `vitest` as an optional peer dependency. If you're using vitest you already have it installed.

Register the matchers by importing the sub-path. The import runs `expect.extend(...)` as a side effect:

```typescript
// vitest.setup.ts
import 'deride/vitest'
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

Or import directly in a specific test file if you only want it there.

## Available matchers

| Matcher | Meaning |
|---------|---------|
| `toHaveBeenCalled()` | At least one call recorded |
| `toHaveBeenCalledTimes(n)` | Exactly `n` calls |
| `toHaveBeenCalledOnce()` | Exactly 1 call |
| `toHaveBeenCalledWith(...args)` | Any call's args match (matcher-aware, partial) |
| `toHaveBeenLastCalledWith(...args)` | The last call's args match |
| `toHaveBeenNthCalledWith(n, ...args)` | The **1-indexed** `n`-th call's args match |

All support `.not` inversion:

```typescript
expect(mock.spy.greet).not.toHaveBeenCalledWith('wrong')
```

## Usage

### On a method spy

```typescript
import { describe, it, expect } from 'vitest'
import 'deride/vitest'
import { stub } from 'deride'

interface Svc {
  greet(name: string): string
}

describe('Svc', () => {
  it('records calls', () => {
    const mock = stub<Svc>(['greet'])
    mock.greet('alice')

    expect(mock.spy.greet).toHaveBeenCalledOnce()
    expect(mock.spy.greet).toHaveBeenCalledWith('alice')
  })
})
```

### On a MockedFunction directly

```typescript
import { func } from 'deride'

const fn = func<(x: number) => number>()
fn(5)

expect(fn).toHaveBeenCalledOnce()
expect(fn).toHaveBeenCalledWith(5)
```

No need for `fn.spy` — the matcher detects the MockedFunction proxy's underlying spy automatically.

### With matchers

All the `match.*` helpers work inside vitest matcher arguments:

```typescript
import { match } from 'deride'

expect(mock.spy.log).toHaveBeenCalledWith(match.string)
expect(mock.spy.save).toHaveBeenCalledWith(match.objectContaining({ id: 1 }))
expect(mock.spy.sum).toHaveBeenCalledWith(match.number, match.number)
```

### N-th call (1-indexed)

`toHaveBeenNthCalledWith` uses 1-based indexing to match jest's convention:

```typescript
mock.greet('first')
mock.greet('second')

expect(mock.spy.greet).toHaveBeenNthCalledWith(1, 'first')
expect(mock.spy.greet).toHaveBeenNthCalledWith(2, 'second')
```

If you prefer 0-based access, reach for `mock.spy.greet.calls[i].args` or `mock.expect.greet.invocation(i)`.

## Error messages

Failures come from deride's matcher implementation but vitest's diff renderer formats them. Both positive and negative paths produce sensible messages:

```
expected mock to have been called with the given args
```

```
expected mock not to have been called (actual: 3)
```

## Interaction with `vi.useFakeTimers()`

The vitest matchers only read from `mock.spy.*` — they don't involve timers. You can use vitest's fake timers alongside deride:

```typescript
vi.useFakeTimers()
mock.setup.fetch.toResolveAfter(100, 'data')
const p = mock.fetch()
vi.advanceTimersByTime(100)
await p

expect(mock.spy.fetch).toHaveBeenCalledOnce()
```

Or use deride's own [`deride/clock`](/integrations/clock) if you'd rather not pull vitest's fake timers into a given test.

## Coexistence with vitest's built-in `vi.fn()` matchers

vitest's `toHaveBeenCalledWith` treats a regular `vi.fn()` via its internal `mock.calls` structure. deride's matchers treat `mock.spy.*` / `MockedFunction` via the deride CallRecord structure. Both coexist: vitest uses the first that matches the `received` shape, so you can mix `vi.fn()` and `deride.func()` in the same test file without conflict.

## Opting out / removing

If you decide you don't want the matchers after all, simply remove the `import 'deride/vitest'` line — there's no `unregister` call needed because vitest starts each test process fresh.

## Implementation notes

The integration is implemented in `src/vitest.ts` — around 70 lines. It reads from `mock.spy.*.calls`, computes a boolean match against the expected args using the same `hasMatch` helper that powers `expect.called.withArgs`, and wraps the result in vitest's `MatchResult` shape. No reflection, no runtime type hacks.

## Troubleshooting

- **"expected a MethodSpy or MockedFunction"** — you passed something else to `expect(...)`. The matcher duck-types via `calls: readonly unknown[]` and `callCount: number`; make sure you're passing `mock.spy.method` (not `mock.expect.method`) or a MockedFunction directly.
- **Matchers undefined in a test** — ensure `'deride/vitest'` is loaded by the same process. A `setupFiles` entry is the most reliable way.
