# Canonical examples

One blessed idiomatic snippet per common task. **Use these verbatim**; they're the shape the library is designed around. If an agent-generated solution strays from these patterns, assume the agent is confused and redirect to the closest pattern here.

## 1. Mock an async service, inject, assert

**Task:** test a service that depends on a database.

```typescript
import { describe, it, expect } from 'vitest'
import { stub, match } from 'deride'

interface Database {
  query(sql: string): Promise<unknown[]>
  findById(id: number): Promise<unknown>
}

class UserService {
  constructor(private db: Database) {}
  async listActive() { return this.db.query("SELECT * FROM users WHERE active") }
}

describe('UserService', () => {
  it('queries the active users', async () => {
    const mockDb = stub<Database>(['query', 'findById'])
    mockDb.setup.query.toResolveWith([{ id: 1, name: 'alice' }])

    const service = new UserService(mockDb)
    const users = await service.listActive()

    expect(users).toHaveLength(1)
    mockDb.expect.query.called.once()
    mockDb.expect.query.called.withArg(match.regex(/active/i))
  })
})
```

## 2. Different returns per call

**Task:** a paginated fetch where each call returns the next page.

```typescript
mock.setup.fetchPage.toResolveInOrder(
  { page: 1, rows: ['a'] },
  { page: 2, rows: ['b'] },
  { page: 3, rows: ['c'] },
)
// 4th call: sticky-last (page 3 again)
// OR explicit fallback:
mock.setup.fetchPage.toResolveInOrder(
  [{ page: 1 }, { page: 2 }],
  { then: null },
)
```

## 3. Conditional behaviour on args

**Task:** return different data depending on what the code under test asks for.

```typescript
mock.setup.findById.when(1).toResolveWith({ id: 1, name: 'alice' })
mock.setup.findById.when(match.gte(9999)).toRejectWith(new Error('not found'))
// Default fallthrough — any other id returns undefined
```

## 4. Error / timeout paths

**Task:** verify the code handles a timeout or rejection correctly.

```typescript
// Rejected promise
mock.setup.fetch.toRejectWith(new Error('network'))
await expect(service.loadData()).rejects.toThrow('network')

// Never-settling promise — for testing timeout logic
mock.setup.fetch.toHang()
const result = await Promise.race([
  service.loadData(),
  new Promise((r) => setTimeout(() => r('TIMEOUT'), 100)),
])
```

## 5. Fluent / chainable API (query builder, etc.)

**Task:** mock a chain-of-methods API.

```typescript
interface Query {
  where(s: string): Query
  orderBy(s: string): Query
  execute(): Promise<unknown[]>
}

const q = stub<Query>(['where', 'orderBy', 'execute'])
q.setup.where.toReturnSelf()
q.setup.orderBy.toReturnSelf()
q.setup.execute.toResolveWith([{ id: 1 }])

const rows = await q.where('active').orderBy('name').execute()
```

## 6. Mock a constructor call (`new X(...)`)

**Task:** code under test does `new Database(conn)` and you need to intercept both the construction and the instance's methods.

```typescript
import { stub } from 'deride'
import { Database } from './database'

const MockedDb = stub.class(Database)
MockedDb.setupAll((inst) => inst.setup.query.toResolveWith([]))

// Substitute the constructor at import time — test-runner specific
vi.mock('./database', () => ({ Database: MockedDb }))

// ... run code under test ...

MockedDb.expect.constructor.called.withArg('my-conn-string')
MockedDb.instances[0].expect.query.called.once()
```

## 7. Partial mock — real methods by default, override one

**Task:** spy on some methods of a real object while keeping others running.

```typescript
const realLogger = { info: (m: string) => console.log(m), error: (m: string) => console.error(m) }

const wrapped = wrap(realLogger)
wrapped.info('hello')                           // runs real console.log
wrapped.setup.error.toDoThis(() => {})          // silence errors in the test
wrapped.error('boom')                           // no output; recorded
wrapped.expect.error.called.withArg('boom')
```

## 8. Standalone mocked function (callback or fetcher)

**Task:** the code under test takes a function as a parameter.

```typescript
import { func } from 'deride'

const onTick = func<(frame: number) => void>()
animator.subscribe(onTick)
animator.step()
animator.step()

onTick.expect.called.twice()
onTick.expect.invocation(0).withArg(0)
onTick.expect.invocation(1).withArg(1)
```

## 9. Cross-mock call ordering

**Task:** assert a specific sequence of calls across multiple mocks.

```typescript
import { inOrder } from 'deride'

await repository.load()

inOrder(
  db.spy.connect,
  db.spy.query,
  logger.spy.info,
)
```

For strict interleave (no other calls on listed spies between them), use `inOrder.strict(...)`.

## 10. Read a captured return value forward

**Task:** the code returned a Promise; you want to await its settled value in the test.

```typescript
mock.setup.fetch.toResolveWith({ id: 1 })
mock.fetch('/x')

const data = await mock.spy.fetch.lastCall!.returned as Promise<{ id: number }>
expect(await data).toEqual({ id: 1 })
```

Note: `expect.called.withReturn({ id: 1 })` asserts the value was returned, but can't hand it back. Use `spy.lastCall.returned` when you need the value for further assertions.

## 11. Sandbox pattern for test lifecycle

**Task:** many mocks per test file, reset between tests, full restore at end.

```typescript
import { sandbox } from 'deride'

const sb = sandbox()

beforeEach(() => {
  mockDb = sb.stub<Database>(['query'])
  mockLog = sb.wrap(realLogger)
})

afterEach(() => sb.reset())       // call history cleared, setups preserved
afterAll(() => sb.restore())      // full wipe (setups + history)
```

## 12. Fake timers for delayed async

**Task:** test a retry loop with backoff.

```typescript
import { useFakeTimers, isFakeTimersActive, restoreActiveClock } from 'deride/clock'
import { afterEach } from 'vitest'

afterEach(() => { if (isFakeTimersActive()) restoreActiveClock() })

it('retries twice then succeeds', async () => {
  const clock = useFakeTimers()
  const fn = func<() => Promise<string>>()
  fn.setup.toRejectInOrder(new Error('1'), new Error('2'))
  fn.setup.toResolveWith('ok')

  const p = withRetry(fn, 5, 100)

  for (let i = 0; i < 3; i++) {
    await clock.flushMicrotasks()
    clock.tick(100)
  }

  expect(await p).toBe('ok')
  fn.expect.called.times(3)
})
```

## 13. Vitest / jest matcher sugar

**Task:** prefer framework-native assertion style.

```typescript
// test-setup.ts (referenced from vitest.config.ts setupFiles)
import 'deride/vitest'

// any test file:
import { stub, match } from 'deride'
const mock = stub<Service>(['handle'])
mock.handle(42)

expect(mock.spy.handle).toHaveBeenCalledOnce()
expect(mock.spy.handle).toHaveBeenCalledWith(match.number)
expect(mock.spy.handle).toHaveBeenLastCalledWith(42)
```

For `jest`: replace `'deride/vitest'` with `'deride/jest'`. Everything else is identical.

---

## What NOT to generate

- Don't `vi.spyOn(x, 'method')` and then try to use deride — pick one.
- Don't mutate `mock.spy.calls[i].args` and expect the mock to "react" — those are records, not controls.
- Don't `await mock.expect.x.called.withReturn(v)` — `expect` returns void, not a Promise.
- Don't squash-merge a deride release PR — see the [CLAUDE.md](https://github.com/guzzlerio/deride/blob/develop/CLAUDE.md) at the repo root.

Full list of anti-patterns and their fixes: [Common mistakes](./common-mistakes).
