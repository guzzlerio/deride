# Cross-mock ordering

Sometimes it's not enough to assert that a call happened — you need to assert that it happened *before* or *after* another call on a different mock. `inOrder(...)` is the tool.

## Basic usage

Each argument is a spy (`mock.spy.method`). `inOrder` asserts that the **first recorded call** of each fired in the listed order:

```typescript
import { inOrder, stub } from 'deride'

const db = stub<Database>(['connect', 'query', 'disconnect'])
const log = stub<Logger>(['info', 'error'])

// Code under test:
await repository.load()
// which internally does: db.connect() -> db.query(...) -> log.info(...)

inOrder(db.spy.connect, db.spy.query, log.spy.info)
```

No asserting order twice — `inOrder` does it once, atomically. Failure messages name the offending spy:

```
Error: inOrder: `log.info` (seq 8) fired before `db.query` (seq 12)
```

## Ordering invocations, not just spies

If you care about the order of specific invocations on the same spy, use `inOrder.at(spy, index)`:

```typescript
db.query('select 1')   // invocation 0
db.query('select 2')   // invocation 1

inOrder(
  inOrder.at(db.spy.query, 0),
  inOrder.at(db.spy.query, 1),
)
```

Out-of-range invocations throw:

```typescript
inOrder(inOrder.at(db.spy.query, 99))
// throws: inOrder: `db.query` invocation 99 was never called
```

## Strict variant — no interleaved extras

By default `inOrder` is **relaxed**: it checks first-call-of-each ordering but allows unrelated calls to happen in between. For stricter interleave-checking, use `inOrder.strict`:

```typescript
db.connect()
db.query('a')
// these two are the only calls on these spies
inOrder.strict(db.spy.connect, db.spy.query)   // passes
```

Strict fails if either spy has **extra** calls between the listed positions:

```typescript
db.connect()
db.query('a')
db.connect()                                   // extra!
inOrder.strict(db.spy.connect, db.spy.query)
// throws: inOrder.strict: extra calls on listed spies break the expected interleave
```

Strict also rejects never-called spies:

```typescript
db.connect()
inOrder.strict(db.spy.connect, log.spy.info)
// throws: inOrder.strict: `log.info` was never called
```

## How it works

Every `CallRecord` carries a **monotonic global sequence number** assigned at invocation time. `inOrder` reads the sequence of the first call on each spy, confirms they're in ascending order matching the argument sequence, and throws otherwise. No clock/timer involvement — just a counter.

This means:

- **Sub-millisecond ordering works.** Two calls that happen in the same tick get different sequence numbers.
- **Across sync and async.** Async gaps don't break ordering — the sequence advances with every `invoke`, wherever it happens.
- **Per-worker scope.** Vitest workers each load their own module copy, so the counter is per-worker, not shared globally.

## Common patterns

### Startup/shutdown

```typescript
await service.start()
await service.stop()

inOrder(
  serviceMock.spy.initialise,
  serviceMock.spy.connect,
  serviceMock.spy.listen,
  serviceMock.spy.drain,
  serviceMock.spy.close,
)
```

### "Query before log" in error paths

```typescript
await repo.find(missingId)   // expected to log a warning after a failed query

inOrder(dbMock.spy.query, loggerMock.spy.warn)
```

### Assert one call happened before another on the same spy

```typescript
const ledger = stub<Ledger>(['append'])
ledger.append('A')
ledger.append('B')

inOrder(
  inOrder.at(ledger.spy.append, 0),
  inOrder.at(ledger.spy.append, 1),
)
```

## Edge cases

- **Zero args throws.** `inOrder()` / `inOrder.strict()` with no spies fails loudly — almost always a bug.
- **Single spy passes if it was called at least once.** Trivially ordered.
- **A spy passed in that was never called throws** (both relaxed and strict variants).
- **Non-spy arguments throw.** `inOrder` duck-types via `Array.isArray(t.calls) && typeof t.callCount === 'number'` and rejects anything else.
