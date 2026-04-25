# Quick Start

A five-minute tour of the API through a realistic scenario: testing a `UserService` that depends on a `Database`.

## The code under test

```typescript
// src/user-service.ts
export interface Database {
  query(sql: string): Promise<User[]>
  findById(id: number): Promise<User | undefined>
}

export interface User {
  id: number
  name: string
}

export class UserService {
  constructor(private db: Database) {}

  async listActive(): Promise<User[]> {
    return this.db.query("SELECT * FROM users WHERE active = true")
  }

  async getOne(id: number): Promise<User> {
    const user = await this.db.findById(id)
    if (!user) throw new Error(`User ${id} not found`)
    return user
  }
}
```

## Step 1 — Create a mock

`stub<T>(methodNames)` builds a fresh object with the shape of `T` and the methods you list:

```typescript
import { stub } from 'deride'
import type { Database } from '../src/user-service'

const mockDb = stub<Database>(['query', 'findById'])
```

`mockDb` is callable like the real thing. All methods return `undefined` until you configure them.

## Step 2 — Configure behaviour

Every method has a `.setup` handle. The most common setups return a value, throw, resolve a promise, or reject:

```typescript
mockDb.setup.query.toResolveWith([
  { id: 1, name: 'alice' },
  { id: 2, name: 'bob' },
])

mockDb.setup.findById.when(1).toResolveWith({ id: 1, name: 'alice' })
mockDb.setup.findById.when(99).toResolveWith(undefined)
```

`.when(value)` gates the next behaviour on the first argument. deride's [matchers](./matchers) let you gate on more expressive conditions:

```typescript
import { match } from 'deride'

mockDb.setup.findById.when(match.gte(1000)).toRejectWith(new Error('too big'))
```

## Step 3 — Use the mock

Inject the mock where the real `Database` would go. Your service runs exactly as it would in production:

```typescript
import { UserService } from '../src/user-service'

const service = new UserService(mockDb)

const users = await service.listActive()
// users == [{ id: 1, ... }, { id: 2, ... }]

const alice = await service.getOne(1)
// alice == { id: 1, name: 'alice' }
```

## Step 4 — Assert

Every method has a `.expect.<method>.called` handle. Assertions throw on mismatch:

```typescript
mockDb.expect.query.called.once()
mockDb.expect.query.called.withArg("SELECT * FROM users WHERE active = true")

mockDb.expect.findById.called.twice()
mockDb.expect.findById.called.withArg(1)
mockDb.expect.findById.invocation(0).withArg(1)
```

`.everyCall.*` asserts that **every** recorded call matches (not just one):

```typescript
mockDb.expect.findById.everyCall.withArg(match.number)
```

## Step 5 — Inspect (optional)

For anything `.expect` can't do — branching on call history, feeding a captured value forward, snapshot testing — use the `.spy` surface. It's non-throwing and returns data:

```typescript
console.log(mockDb.spy.query.printHistory())
// query: 1 call(s)
//   #0 query('SELECT * FROM users WHERE active = true') -> Promise {...}

const last = mockDb.spy.findById.lastCall
console.log(last?.args, last?.returned)
```

More on the split in [Spy inspection](./spy).

## The complete test

```typescript
import { describe, it } from 'vitest'
import { stub, match } from 'deride'
import { UserService, type Database } from '../src/user-service'

describe('UserService', () => {
  it('lists active users from the database', async () => {
    const mockDb = stub<Database>(['query', 'findById'])
    mockDb.setup.query.toResolveWith([
      { id: 1, name: 'alice' },
      { id: 2, name: 'bob' },
    ])

    const service = new UserService(mockDb)
    const users = await service.listActive()

    mockDb.expect.query.called.once()
    mockDb.expect.query.called.withArg(match.regex(/active = true/))
  })

  it('throws when getOne cannot find the user', async () => {
    const mockDb = stub<Database>(['query', 'findById'])
    mockDb.setup.findById.toResolveWith(undefined)

    const service = new UserService(mockDb)
    await expect(service.getOne(42)).rejects.toThrow('User 42 not found')

    mockDb.expect.findById.called.withArg(42)
  })
})
```

## Where to go next

- **[Philosophy](./philosophy)** — why deride composes instead of monkey-patches, and the dispatch rule.
- **[Creating mocks](./creating-mocks)** — `stub` vs `wrap` vs `func` vs `stub.class`.
- **[Configuring behaviour](./configuring-behaviour)** — every `setup.*` method with examples.
- **[Matchers](./matchers)** — the full `match.*` catalogue.
- **[Integrations](../integrations/vitest)** — using deride with vitest / jest / fake timers.
