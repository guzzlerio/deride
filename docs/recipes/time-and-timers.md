# Time & timers

Three tools cover the time axis:

1. **`setup.toResolveAfter(ms, v)` / `toRejectAfter(ms, e)` / `toHang()`** — schedule Promise resolution
2. **`setup.toTimeWarp(ms)`** — accelerate a callback's delay
3. **[`deride/clock`](/integrations/clock)** — control `Date.now`, `setTimeout`, `setInterval`, `queueMicrotask`

## Pattern: assert a timeout path fires

```typescript
import { useFakeTimers } from 'deride/clock'
import { stub } from 'deride'

const clock = useFakeTimers()
try {
  const api = stub<Api>(['fetch'])
  api.setup.fetch.toHang()

  const result = await Promise.race([
    api.fetch('/slow'),
    new Promise<string>(resolve => setTimeout(() => resolve('TIMEOUT'), 500)),
  ])
  clock.tick(500)
  clock.flushMicrotasks()
  expect(await result).toBe('TIMEOUT')
} finally {
  clock.restore()
}
```

## Pattern: assert a retry schedule

Code that retries after a delay:

```typescript
async function withRetry(fn: () => Promise<unknown>, attempts: number, delayMs: number) {
  for (let i = 0; i < attempts; i++) {
    try { return await fn() } catch {}
    await new Promise(r => setTimeout(r, delayMs))
  }
  throw new Error('exhausted')
}
```

Test:

```typescript
import { useFakeTimers } from 'deride/clock'
import { func } from 'deride'

const clock = useFakeTimers()
try {
  const fn = func<() => Promise<string>>()
  fn.setup.toRejectInOrder(new Error('1'), new Error('2'))
  fn.setup.toResolveWith('ok')

  const p = withRetry(fn, 5, 100)

  // Exhaust retries
  for (let i = 0; i < 5; i++) {
    await clock.flushMicrotasks()
    clock.tick(100)
  }

  expect(await p).toBe('ok')
  fn.expect.called.times(3)   // two rejects + one resolve
} finally {
  clock.restore()
}
```

## Pattern: assert a setInterval polling

```typescript
function startPolling(fn: () => void, ms: number) {
  return setInterval(fn, ms)
}

const clock = useFakeTimers()
try {
  const fn = func<() => void>()
  const handle = startPolling(fn, 50)

  clock.tick(50)       // fires 1
  clock.tick(50)       // fires 2
  clock.tick(25)       // nothing yet
  clock.tick(25)       // fires 3

  fn.expect.called.times(3)
  clearInterval(handle)
} finally {
  clock.restore()
}
```

::: warning runAll() with intervals
`clock.runAll()` throws when its 10 000-iteration guard trips — which it will with an active `setInterval`. Always `clearInterval` before `runAll`, or use `tick(ms)` explicitly.
:::

## Pattern: freeze Date.now for time-stamp-dependent tests

```typescript
const clock = useFakeTimers(new Date('2024-01-15T10:30:00Z').getTime())
try {
  const record = createRecord()
  expect(record.createdAt).toBe(1705314600000)
} finally {
  clock.restore()
}
```

Or step the clock between operations:

```typescript
const clock = useFakeTimers(0)
try {
  const a = createRecord()
  clock.tick(1000)
  const b = createRecord()

  expect(b.createdAt - a.createdAt).toBe(1000)
} finally {
  clock.restore()
}
```

## Pattern: fire microtasks deterministically

```typescript
const clock = useFakeTimers()
try {
  let resolved = false
  Promise.resolve().then(() => { resolved = true })

  // Microtasks queued via the real Promise aren't caught by the fake clock —
  // they fire on the runtime's own microtask queue. But code that uses
  // queueMicrotask() IS captured:
  let via = false
  queueMicrotask(() => { via = true })

  clock.flushMicrotasks()
  expect(via).toBe(true)
} finally {
  clock.restore()
}
```

::: tip Scope of microtask control
`deride/clock` only patches `queueMicrotask` — Promise `.then` callbacks aren't intercepted. For full ordering control (Promise microtask queue + task queue together) reach for `vi.useFakeTimers()` or `@sinonjs/fake-timers`.
:::

## Pattern: accelerate a callback via `toTimeWarp`

For APIs whose internal timeout is awkward (e.g. a 30-second poll), `toTimeWarp(0)` schedules their found callback with a zero delay — no global clock needed:

```typescript
const client = wrap(realClient)
client.setup.pollWithRetry.toTimeWarp(0)

client.pollWithRetry(30_000, (result) => {
  // runs immediately
})
```

This doesn't affect `Date.now` or other timers — it only shortcuts the callback deep inside the mocked method.

## Interop: vitest's fake timers

If you already use `vi.useFakeTimers()` in your project, you don't need `deride/clock` — vitest's timer advance resolves internal `setTimeout`s. But don't mix them:

```typescript
// ❌ Don't do this — two fake-timer systems fight
vi.useFakeTimers()
const clock = useFakeTimers()   // deride clock throws: "already installed"
```

Pick one per test.

## See also

- [`setup.toResolveAfter` / `toRejectAfter` / `toHang`](/guide/configuring-behaviour#time-shifted-async)
- [`deride/clock`](/integrations/clock) — full API
- [Async & Promises recipes](/recipes/async-mocking)
