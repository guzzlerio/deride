# `sandbox`

Create a scope that registers every mock created through its factories. `reset()` clears call history on all of them; `restore()` clears behaviours too.

## Signature

```typescript
function sandbox(): Sandbox

interface Sandbox {
  stub: typeof stub           // same signatures, registers with this sandbox
  wrap: typeof wrap           // same signatures, registers with this sandbox
  func: typeof func           // same signatures, registers with this sandbox
  reset(): void               // clear call history on every registered mock
  restore(): void             // clear behaviours AND call history
  readonly size: number       // count of registered mocks
}
```

## Example

```typescript
import { afterEach, afterAll, beforeEach, describe, it } from 'vitest'
import { sandbox } from 'deride'

const sb = sandbox()

beforeEach(() => {
  // sb.stub, sb.wrap, sb.func register each new mock
  mockDb = sb.stub<Database>(['query'])
  mockLog = sb.wrap(realLogger)
})

afterEach(() => sb.reset())        // clear history between tests
afterAll(() => sb.restore())       // full wipe at the end
```

## `reset()` vs `restore()`

| Method | Call history | Behaviours |
|--------|:-:|:-:|
| `sb.reset()` | ✓ cleared | preserved |
| `sb.restore()` | ✓ cleared | ✓ cleared |

Typical pattern:

- **`afterEach`** → `sb.reset()` — leaves configured behaviours in place so shared setup survives between tests.
- **`afterAll`** → `sb.restore()` — clean break; next file's `beforeEach` will set things up fresh.

## Sandboxes are independent

Two sandboxes never share state:

```typescript
const a = sandbox()
const b = sandbox()

const m1 = a.stub<Foo>(['x'])
const m2 = b.stub<Foo>(['x'])

m1.x()
m2.x()

a.reset()                       // clears m1 only
m1.expect.x.called.never()      // ✓
m2.expect.x.called.once()       // ✓
```

Nested sandboxes (creating a second sandbox inside the lifecycle of the first) are independent too — the parent doesn't know about the child's mocks and vice versa.

## Scoping by test file

If you have many test files, the idiomatic pattern is a sandbox at the top of each file:

```typescript
// user-service.test.ts
const sb = sandbox()

describe('UserService', () => {
  beforeEach(() => { /* register via sb */ })
  afterEach(() => sb.reset())
})
```

The sandbox is process-local but file-local in test-runner terms (each test file is typically its own module context in vitest/jest).

## `sb.size`

Useful for test-utility assertions that want to confirm a fixture set up the right number of mocks:

```typescript
const sb = sandbox()
setupFixture(sb)
expect(sb.size).toBe(4)
```

## See also

- [Lifecycle management](../guide/lifecycle) — broader context, snapshots, reset/restore patterns
- [Types](./types) — `Sandbox` type
