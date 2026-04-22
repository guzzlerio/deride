# `deride/clock` — fake timers

A lightweight, dependency-free fake-timers helper. Pairs well with `setup.toResolveAfter` / `toRejectAfter` / `toHang` when you want synchronous control over `Date.now`, `setTimeout`, `setInterval`, and `queueMicrotask` — without pulling in vitest's or sinon's fake timers.

::: tip Scope
`deride/clock` covers the common test-timing needs. If you need richer behaviour — ordering-sensitive microtasks, `performance.now`, `setImmediate`, `process.nextTick`, `Animation` timing — reach for `vi.useFakeTimers()` or `@sinonjs/fake-timers`.
:::

## Quick start

```typescript
import { useFakeTimers } from 'deride/clock'

const clock = useFakeTimers()

setTimeout(() => console.log('later'), 100)

clock.tick(100)            // 'later' fires now
clock.runAll()             // drain any pending timers
clock.flushMicrotasks()    // drain microtasks queued by callbacks

clock.restore()            // restore native Date / timers / queueMicrotask
```

## What gets patched

```
Date.now
globalThis.setTimeout
globalThis.clearTimeout
globalThis.setInterval
globalThis.clearInterval
globalThis.queueMicrotask
```

Everything else (e.g. `performance.now`, `setImmediate`) is untouched.

## The FakeClock API

```typescript
interface FakeClock {
  tick(ms: number): void
  runAll(): void
  flushMicrotasks(): void
  now(): number
  restore(): void
  readonly errors: readonly unknown[]
}
```

### `tick(ms)`

Advance the clock by `ms` milliseconds, firing due timers and draining microtasks between each.

```typescript
setTimeout(() => a(), 50)
setTimeout(() => b(), 100)

clock.tick(50)    // fires a()
clock.tick(50)    // fires b()
```

### `runAll()`

Drain every pending timer, advancing the clock as needed. Useful for "just fire everything and see what happens" style tests.

::: danger runAll can throw
`runAll()` bounds itself to 10 000 iterations to protect against `setInterval` loops. If the guard trips, **it throws without calling `restore()`** — see [Always restore](#always-restore-even-on-throw).
:::

### `flushMicrotasks()`

Drain any `queueMicrotask(fn)` callbacks currently in the queue. Doesn't advance time.

### `now()`

Return the current frozen time (equivalent to `Date.now()` while patched).

### `restore()`

Restore all patched globals to the native versions and clear the `errors` array.

### `errors`

Errors thrown from scheduled callbacks or microtasks are **caught** and pushed to this array instead of propagating out of `tick` / `runAll` / `flushMicrotasks`. Read the array to assert on them:

```typescript
setTimeout(() => { throw new Error('boom') }, 10)
clock.tick(10)

expect(clock.errors).toHaveLength(1)
expect((clock.errors[0] as Error).message).toBe('boom')
```

Cleared on `restore()`.

## Integration with `toResolveAfter` / `toHang`

```typescript
import { useFakeTimers } from 'deride/clock'
import { stub } from 'deride'

const clock = useFakeTimers()
const mock = stub<{ fetch(): Promise<string> }>(['fetch'])
mock.setup.fetch.toResolveAfter(100, 'payload')

const p = mock.fetch()          // pending
let value: string | undefined
p.then(v => { value = v })

clock.tick(100)                  // timer fires, Promise resolves
clock.flushMicrotasks()          // then-callback runs
await p                          // safe to await now

expect(value).toBe('payload')

clock.restore()
```

`toHang()` returns a never-settling Promise — `runAll()` does not force it to resolve, making it ideal for timeout-path tests.

## Always restore (even on throw)

`useFakeTimers()` patches `globalThis` — if a test installs the clock and throws before `restore()` — or if `runAll()` itself throws — the patches persist and the next test inherits a frozen `Date.now()` and fake timers. That causes confusing cascading failures.

Two safe patterns:

### 1. `afterEach` safety net (recommended)

```typescript
import { afterEach } from 'vitest'
import { isFakeTimersActive, restoreActiveClock, useFakeTimers } from 'deride/clock'

afterEach(() => {
  if (isFakeTimersActive()) restoreActiveClock()
})

it('exercises time-dependent code', () => {
  const clock = useFakeTimers()
  // even if this test throws, afterEach restores
})
```

### 2. `try / finally`

```typescript
const clock = useFakeTimers()
try {
  clock.runAll()
} finally {
  clock.restore()
}
```

The same applies to reading `clock.errors` — it clears on restore, so read it first if you need to assert on it.

## Double-install protection

`useFakeTimers()` throws if fake timers are already installed:

```typescript
useFakeTimers()
useFakeTimers()    // throws: fake timers are already installed; call restore() first
```

This catches the common mistake of nested installs.

## Helpers for harnesses

```typescript
import { isFakeTimersActive, restoreActiveClock } from 'deride/clock'

isFakeTimersActive()     // boolean — are patches currently installed?
restoreActiveClock()     // restore the installed clock (no-op if none active)
```

Both are useful in shared test harnesses / `afterEach` guards that need to recover from a test that threw before its own `.restore()`.

## Interaction with `vi.useFakeTimers()` / sinon timers

Don't install two fake-timer systems simultaneously. deride's clock throws if you try to install twice; vitest's / sinon's may silently over-patch. Stick to one per test.

If you're already using `vi.useFakeTimers()` in a project and just need `toResolveAfter` to work, you don't need `deride/clock` at all — vitest's timer advance (`vi.advanceTimersByTimeAsync`) resolves the internal `setTimeout` deride uses.

## Limitations

- **No `performance.now`.** If your code reads it, switch to `vi.useFakeTimers()` or `@sinonjs/fake-timers`.
- **No `setImmediate` / `process.nextTick`.** Same.
- **Single global state.** One active clock per process. Worker-based test runners like vitest have independent module graphs per worker, so each worker can install its own clock.

## See also

- [`toResolveAfter` / `toRejectAfter` / `toHang` setup methods](/guide/configuring-behaviour#toresolveafter-ms-value-torejectafter-ms-error)
- [Time & timers recipes](/recipes/time-and-timers)
