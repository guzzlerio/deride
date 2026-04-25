# Migrating

Common patterns from other mocking libraries, translated to deride.

## From sinon

### `sinon.stub`

```typescript
// sinon — monkey-patches the object
const spy = sinon.stub(database, 'query').resolves(rows)

// deride — wrap creates a new object
const wrapped = wrap(database)
wrapped.setup.query.toResolveWith(rows)
```

If `database` is shared across tests (e.g. a module singleton), use `vi.mock` / `jest.mock` to substitute the deride wrapper at import time — see [Module mocking](/recipes/module-mocking).

### `sinon.spy`

```typescript
// sinon
const spy = sinon.spy()
target.on('event', spy)
target.trigger('event', 'x')
sinon.assert.calledWith(spy, 'x')

// deride
const fn = func<(arg: string) => void>()
target.on('event', fn)
target.trigger('event', 'x')
fn.expect.called.withArg('x')
```

### `stub.returns(...)` for sequential values

```typescript
// sinon
const s = sinon.stub()
s.onCall(0).returns('a')
s.onCall(1).returns('b')
s.returns('default')

// deride
mock.setup.method.toReturnInOrder('a', 'b', { then: 'default' })
```

### Matchers

```typescript
// sinon
sinon.assert.calledWith(spy, sinon.match.string)

// deride
mock.expect.method.called.withArg(match.string)
```

The full catalogue lives in [Matchers](/guide/matchers).

### Call history

```typescript
// sinon
spy.getCall(0).args       // → [...]
spy.lastCall.returnValue

// deride
mock.spy.method.calls[0].args
mock.spy.method.lastCall?.returned
```

## From Jest / vitest `vi.fn()`

### Creating a mock function

```typescript
// vitest / jest
const fn = vi.fn()
fn.mockReturnValue(42)
fn.mockResolvedValue('ok')
fn.mockRejectedValue(new Error('no'))

// deride
const fn = func<(x: number) => number>()
fn.setup.toReturn(42)
fn.setup.toResolveWith('ok')
fn.setup.toRejectWith(new Error('no'))
```

### Mocked implementations

```typescript
// vitest / jest
fn.mockImplementation((x) => x * 2)
fn.mockImplementationOnce((x) => x + 1)

// deride
fn.setup.toDoThis((x) => x * 2)
fn.setup.once().toDoThis((x) => x + 1)
```

### Sequential returns

```typescript
// jest
fn.mockReturnValueOnce('a').mockReturnValueOnce('b')

// deride
fn.setup.toReturnInOrder('a', 'b')
```

### Assertions

```typescript
// vitest / jest
expect(fn).toHaveBeenCalled()
expect(fn).toHaveBeenCalledTimes(2)
expect(fn).toHaveBeenCalledWith('x')
expect(fn).toHaveBeenLastCalledWith('y')
expect(fn).toHaveBeenNthCalledWith(1, 'z')

// deride — framework-agnostic
fn.expect.called.times(2)
fn.expect.called.withArg('x')
fn.expect.invocation(fn.spy.callCount - 1).withArg('y')
fn.expect.invocation(0).withArg('z')

// deride — vitest/jest matchers (opt-in)
import 'deride/vitest'
expect(fn).toHaveBeenCalledOnce()
expect(fn).toHaveBeenCalledWith('x')
expect(fn).toHaveBeenLastCalledWith('y')
expect(fn).toHaveBeenNthCalledWith(1, 'z')
```

See [`deride/vitest`](/integrations/vitest) and [`deride/jest`](/integrations/jest) for the matcher set.

### Reading call history

```typescript
// vitest / jest
fn.mock.calls            // unknown[][]
fn.mock.calls[0][0]      // args
fn.mock.results[0].value // return

// deride
fn.spy.calls             // readonly CallRecord[]
fn.spy.calls[0].args[0]
fn.spy.calls[0].returned
```

### Clearing / resetting

```typescript
// vitest / jest
fn.mockClear()           // calls only
fn.mockReset()           // calls + implementation

// deride
fn.expect.called.reset()       // calls only
fn.setup.fallback()            // clear behaviours
// Or use sandbox():
const sb = sandbox()
const fn = sb.func<...>()
afterEach(() => sb.reset())   // clear calls on every registered mock
```

## From `jest.mock` / `vi.mock`

These tools mock whole *modules*, not objects — they're orthogonal to what deride does. Use them **together**: deride creates the mock, and the runner substitutes it at import time.

```typescript
import { vi } from 'vitest'
import { stub } from 'deride'
import type { Database } from './database'

const mockDb = stub<Database>(['query'])
mockDb.setup.query.toResolveWith([])

vi.mock('./database', () => ({ db: mockDb }))

// Code under test imports './database' and uses the mock
import { userService } from './user-service'
```

See [Module mocking](/recipes/module-mocking) for the full pattern.

## From `testdouble.js`

```typescript
// testdouble
const db = td.object<Database>()
td.when(db.query('select')).thenResolve(rows)
td.verify(db.query('select'))

// deride
const db = stub<Database>(['query'])
db.setup.query.when('select').toResolveWith(rows)
db.expect.query.called.withArg('select')
```

testdouble's partial matchers map directly to deride's matchers:

- `td.matchers.anything()` → `match.any`
- `td.matchers.isA(String)` → `match.string`
- `td.matchers.contains({ id: 1 })` → `match.objectContaining({ id: 1 })`

## Behaviour differences worth knowing

### Composition vs monkey-patching

sinon, testdouble, and `vi.spyOn` **mutate** the real object. deride **wraps** — you get a fresh object back. If your code imports a singleton and calls methods on it, you'll need `vi.mock`/`jest.mock` to substitute the wrapper at the module boundary. See [Module mocking](/recipes/module-mocking).

### No implicit restore

sinon requires `sandbox.restore()` in `afterEach` to undo the patching. deride has no patches to undo — but if you want to reset call history between tests, use `sandbox().reset()` or `mock.called.reset()`.

### Throws vs returns-match-result

deride's `expect.*` throws on mismatch; jest's matcher returns a match result. If you're writing custom assertion helpers, prefer deride's `spy.method.calledWith(...)` — it's non-throwing and returns a boolean.
