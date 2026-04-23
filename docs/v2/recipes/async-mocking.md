# Async & Promises

Patterns for mocking async APIs: resolving with data, rejecting, delaying, hanging, and asserting against the captured Promise.

## Resolve / reject

```typescript
mock.setup.fetch.toResolveWith({ data: 42 })
mock.setup.fetch.toResolve()                         // resolves with undefined
mock.setup.fetch.toRejectWith(new Error('network'))
```

## Sequential results

Multiple calls, each with a different resolved value. Last-sticky by default:

```typescript
mock.setup.fetch.toResolveInOrder(
  { page: 1, rows: ['a'] },
  { page: 2, rows: ['b'] },
  { page: 3, rows: ['c'] },
)

await mock.fetch()   // { page: 1, rows: ['a'] }
await mock.fetch()   // { page: 2, rows: ['b'] }
await mock.fetch()   // { page: 3, rows: ['c'] }
await mock.fetch()   // sticky-last: { page: 3, rows: ['c'] }
```

Fall back to a different value:

```typescript
mock.setup.fetch.toResolveInOrder([{ a: 1 }, { b: 2 }], { then: null })
```

Or cycle:

```typescript
mock.setup.fetch.toResolveInOrder([{ a: 1 }, { b: 2 }], { cycle: true })
```

## Mix resolve and reject

Use the sequence-aware setups — no need to manually stage `once()` chains:

```typescript
mock.setup.fetch.toRejectInOrder(new Error('first'), new Error('second'))
```

Or interleave with `when`:

```typescript
mock.setup.fetch.when('/healthy').toResolveWith({ ok: true })
mock.setup.fetch.when('/broken').toRejectWith(new Error('500'))
```

## Timeouts — `toResolveAfter` / `toRejectAfter`

Delay the resolution. Pairs with fake timers (vitest, jest, or `deride/clock`):

```typescript
mock.setup.fetch.toResolveAfter(100, { data: 42 })

const p = mock.fetch('/x')   // pending
// ... advance time by 100ms ...
await p                       // { data: 42 }
```

::: details Vitest fake timers
```typescript
import { vi } from 'vitest'
vi.useFakeTimers()

mock.setup.fetch.toResolveAfter(1000, 'ok')
const p = mock.fetch()
await vi.advanceTimersByTimeAsync(1000)
expect(await p).toBe('ok')

vi.useRealTimers()
```
:::

::: details deride/clock
```typescript
import { useFakeTimers } from 'deride/clock'

const clock = useFakeTimers()
try {
  mock.setup.fetch.toResolveAfter(1000, 'ok')
  const p = mock.fetch()
  clock.tick(1000)
  clock.flushMicrotasks()
  expect(await p).toBe('ok')
} finally {
  clock.restore()
}
```
:::

## `toHang()` — never-settling Promise

For testing timeout/cancellation code paths:

```typescript
mock.setup.fetch.toHang()

const result = await Promise.race([
  mock.fetch('/slow'),
  new Promise<string>(resolve => setTimeout(() => resolve('timeout'), 500)),
])
expect(result).toBe('timeout')
```

Under fake timers, `runAll()` does **not** force `toHang()` Promises to resolve — they genuinely don't settle.

## Awaiting the captured Promise

`expect.called.withReturn(x)` asserts the return exists but can't hand it back. For follow-up operations, read from the spy:

```typescript
mock.setup.fetch.toResolveWith({ id: 1 })
mock.fetch('/x')

const result = await mock.spy.fetch.lastCall!.returned
// result === { id: 1 }
```

Useful when:

- The test needs to assert against the *resolved* value in multiple ways
- A helper needs to forward the captured value to another setup
- Debugging: `await mock.spy.x.lastCall?.returned` often reveals what the code actually received

## Asserting on thrown / rejected Promises

Synchronous throws are captured in `CallRecord.threw`:

```typescript
mock.setup.save.toThrow('bang')
try { mock.save() } catch {}

mock.expect.save.called.threw()
mock.expect.save.called.threw('bang')
mock.expect.save.called.threw(Error)
```

**Promise rejections are NOT captured** in `threw` — they're captured as the resolved value (the rejected Promise). If you want to assert on the rejection:

```typescript
mock.setup.fetch.toRejectWith(new Error('oops'))
mock.fetch()   // returns a rejected Promise, but no sync throw

// The Promise IS recorded in CallRecord.returned
const promise = mock.spy.fetch.lastCall!.returned as Promise<unknown>
await expect(promise).rejects.toThrow('oops')
```

## Async iterators

For code that iterates with `for await`:

```typescript
mock.setup.stream.toAsyncYield(1, 2, 3)

for await (const v of mock.stream()) {
  console.log(v)   // 1, 2, 3
}
```

Throw partway through:

```typescript
mock.setup.stream.toAsyncYieldThrow(new Error('drained'), 1, 2)

const collected: number[] = []
try {
  for await (const v of mock.stream()) collected.push(v)
} catch (err) {
  expect((err as Error).message).toBe('drained')
}
expect(collected).toEqual([1, 2])
```

## Node-style callbacks

For APIs that take a callback as the last argument:

```typescript
mock.setup.load.toCallbackWith(null, 'data')

mock.load('file.txt', (err, data) => {
  // err === null, data === 'data'
})
```

`toCallbackWith` finds the last function argument and invokes it with the provided args.

## Time-warp legacy callbacks

For callback APIs with long built-in timeouts that you want to accelerate without fake timers:

```typescript
mock.setup.pollWithRetry.toTimeWarp(0)

mock.pollWithRetry(10_000, (result) => {
  // callback fires immediately rather than after 10s
})
```

## See also

- [Configuring behaviour](../guide/configuring-behaviour) — full `setup.*` reference
- [`deride/clock`](../integrations/clock) — fake timers sub-path
- [Time & timers recipes](./time-and-timers)
