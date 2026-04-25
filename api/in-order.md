# `inOrder`

Assert that spies fired in a relative order.

## Signatures

```typescript
function inOrder(...entries: (MethodSpy | InvocationHandle)[]): void

inOrder.at(spy: MethodSpy, index: number): InvocationHandle
inOrder.strict(...entries: (MethodSpy | InvocationHandle)[]): void
```

## `inOrder(...)` — first-of-each ordering

Compares the **first recorded call** of each spy by its monotonic sequence number, asserting they match the argument order.

```typescript
inOrder(db.spy.connect, db.spy.query, log.spy.info)
```

Throws:

- `inOrder: at least one spy is required` — zero args
- `inOrder: each argument must be a MethodSpy ...` — non-spy arg
- `inOrder: \`db.query\` was never called` — listed spy has no calls
- `inOrder: \`log.info\` (seq N) fired before \`db.query\` (seq M)` — wrong order

## `inOrder.at(spy, index)`

Wraps a spy into a handle that points at the N-th (0-indexed) recorded call, rather than the first.

```typescript
inOrder(
  inOrder.at(db.spy.query, 0),    // first query
  inOrder.at(db.spy.query, 1),    // then second query
)
```

Out-of-range indices throw:

```typescript
inOrder(inOrder.at(db.spy.query, 99))
// throws: `db.query` invocation 99 was never called
```

Mix and match with plain spies:

```typescript
inOrder(
  db.spy.connect,
  inOrder.at(db.spy.query, 2),
  log.spy.info,
)
```

## `inOrder.strict(...)`

Like `inOrder`, but fails if any listed spy has **extra** calls beyond the ones being ordered.

```typescript
db.connect()
db.query('a')
inOrder.strict(db.spy.connect, db.spy.query)   // ✓

db.connect()
db.query('a')
db.connect()
inOrder.strict(db.spy.connect, db.spy.query)   // ✗ — extras break the interleave
```

Use `.strict` when you want to assert **exactly** the listed sequence happened with no interleaving on the listed spies.

## How ordering is determined

Every `CallRecord` carries a monotonic `sequence` number assigned at invocation time (via a module-level counter). `inOrder` reads each entry's sequence and checks strict ascending order against the argument order.

- **Sub-millisecond resolution.** Two calls in the same tick get different sequences.
- **Per-worker scope.** Vitest workers each load their own module copy, so the counter is per-worker.

## See also

- [Cross-mock ordering guide](/guide/ordering) — worked examples and patterns
- [Types](/api/types) — `MethodSpy`, `CallRecord`
