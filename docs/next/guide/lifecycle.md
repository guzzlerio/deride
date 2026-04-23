# Lifecycle management

Two concerns live here: **resetting call history** between tests, and **snapshotting/restoring** a mock's full state (behaviours + calls) to roll back in-test changes.

## Resetting call history

### Per method

```typescript
mock.expect.greet.called.reset()
```

Clears the call history for just `greet`. Any behaviours configured via `setup` stay intact.

### All methods on a mock

```typescript
mock.called.reset()
```

Clears call history across every method on this mock.

### Typical `afterEach`

```typescript
afterEach(() => {
  mockDb.called.reset()
  mockLogger.called.reset()
})
```

This works but doesn't scale — every new mock needs adding to the list. For that, use `sandbox()`.

## `sandbox()` — fan-out reset/restore

A **sandbox** is a scope that registers every mock created through its factories. `reset()` on the sandbox clears history on all of them at once; `restore()` clears behaviours too.

```typescript
import { sandbox } from 'deride'
import type { Database, Logger } from './app'

const sb = sandbox()
const mockDb = sb.stub<Database>(['query'])
const mockLog = sb.wrap(realLogger)
const mockFetch = sb.func<typeof fetch>()

afterEach(() => sb.reset())   // clear history on all three
afterAll(() => sb.restore())  // clear history AND behaviours
```

### The three factories

```typescript
sb.stub<T>(methodNames)
sb.wrap(obj)
sb.func<F>()
```

Each is a proxy over the top-level factory — it registers the created mock with the sandbox and otherwise behaves identically.

### Sandboxes are independent

Two sandboxes never interfere:

```typescript
const a = sandbox()
const b = sandbox()

const m1 = a.stub<Foo>(['x'])
const m2 = b.stub<Foo>(['x'])

m1.x()
m2.x()

a.reset()                  // clears m1 only
m1.expect.x.called.never() // ✓
m2.expect.x.called.once()  // ✓
```

### Sandbox size

```typescript
sb.size   // number of mocks registered in this sandbox
```

Handy for assertions in test utilities.

### `reset()` vs `restore()`

| Method | Clears history | Clears behaviours |
|--------|----------------|-------------------|
| `sb.reset()` | ✓ | — |
| `sb.restore()` | ✓ | ✓ |

`reset` is for the common test-loop case (clean slate, same configured behaviours). `restore` is the harder wipe — useful in `afterAll` or when you deliberately want mocks to revert to "nothing configured".

## Snapshot / restore

When you need to **temporarily change** a mock's state and roll back, use `snapshot()` / `restore(snap)`:

```typescript
mock.setup.greet.toReturn('v1')
const snap = mock.snapshot()

mock.setup.greet.toReturn('v2')
mock.greet('x')   // 'v2'

mock.restore(snap)
mock.greet('x')   // 'v1' (the setup at snapshot time, AND calls before snapshot)
```

Snapshots capture **both**:

- The behaviour list (`.setup.*` configured actions)
- The call history (`.spy.*.calls`)

Any changes made *after* `snapshot()` are reversed by `restore(snap)` — including brand-new behaviours *and* new calls that accumulated in history.

### Nested snapshots

Snapshots stack arbitrarily:

```typescript
mock.setup.greet.toReturn('A')
const snapA = mock.snapshot()

mock.setup.greet.toReturn('B')
const snapB = mock.snapshot()

mock.setup.greet.toReturn('C')
mock.restore(snapB)   // back to B
mock.greet()          // 'B'

mock.restore(snapA)   // jump straight back to A
mock.greet()          // 'A'
```

### When to reach for snapshots

- A single test needs to **alter setup mid-flow**, then revert (rare — usually suggest refactoring to two separate tests).
- You have a **scoped helper** that modifies a shared mock; snapshot before, restore at the end of the helper.
- You want a **deterministic reset point** that's not "fully empty" — snapshots let you mark "this is my baseline".

For run-of-the-mill test isolation, `sandbox().reset()` is simpler.

### Implementation notes

The snapshot value is opaque — it's `{ __brand: 'deride.snapshot', behaviors, calls }` under the hood, but the type is intentionally not introspectable so callers don't grow dependencies on its shape. Passing something that isn't a deride snapshot to `restore()` throws.

## Putting it together

A typical test file:

```typescript
import { afterEach, beforeEach, describe, it } from 'vitest'
import { sandbox } from 'deride'
import { UserService, type Database } from '../src/user-service'

const sb = sandbox()
let mockDb: Wrapped<Database>
let service: UserService

beforeEach(() => {
  mockDb = sb.stub<Database>(['query', 'findById'])
  service = new UserService(mockDb)
})

afterEach(() => sb.reset())

describe('UserService', () => {
  it('lists users', async () => {
    mockDb.setup.query.toResolveWith([{ id: 1, name: 'alice' }])
    const users = await service.listActive()
    mockDb.expect.query.called.once()
  })

  // Between tests, sb.reset() clears history — configured behaviours carry forward
  // unless you set them up fresh in beforeEach (which is what this file does).
})
```
