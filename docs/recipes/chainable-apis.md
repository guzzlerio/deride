# Fluent / chainable APIs

Query builders, jQuery-style chains, builder patterns, fluent assertion libraries — all involve methods that return `this`. `toReturnSelf()` is the tool.

## The basic pattern

```typescript
interface QueryBuilder {
  where(clause: string): QueryBuilder
  orderBy(col: string): QueryBuilder
  limit(n: number): QueryBuilder
  execute(): Promise<unknown[]>
}

const q = stub<QueryBuilder>(['where', 'orderBy', 'limit', 'execute'])

q.setup.where.toReturnSelf()
q.setup.orderBy.toReturnSelf()
q.setup.limit.toReturnSelf()
q.setup.execute.toResolveWith([{ id: 1 }])

const rows = await q
  .where('active = true')
  .orderBy('created_at')
  .limit(10)
  .execute()

// rows === [{ id: 1 }]
```

`toReturnSelf()` returns the wrapped mock itself, so chained calls flow through. Every method still records its call history normally:

```typescript
q.expect.where.called.once()
q.expect.where.called.withArg('active = true')
q.expect.orderBy.called.withArg('created_at')
q.expect.limit.called.withArg(10)
q.expect.execute.called.once()
```

## Setting up every chain method at once

Given a long builder interface, typing `toReturnSelf()` N times is noisy. Extract a helper:

```typescript
function chainable<T extends object>(mock: Wrapped<T>, methods: (keyof T)[]) {
  for (const m of methods) {
    (mock.setup as any)[m].toReturnSelf()
  }
}

const q = stub<QueryBuilder>(['where', 'orderBy', 'limit', 'execute'])
chainable(q, ['where', 'orderBy', 'limit'])
q.setup.execute.toResolveWith([])
```

## Combining with `when()`

Override a specific branch of the chain:

```typescript
q.setup.where.toReturnSelf()
q.setup.where.when('block-me').toReturn(null)

q.where('fine').where('block-me').where('never-reached')
// .where('block-me') returns null, breaking the chain
```

## Standalone functions

`toReturnSelf()` on a `MockedFunction` returns the function proxy itself:

```typescript
const fn = func<(x: number) => unknown>()
fn.setup.toReturnSelf()

fn(1)   // returns fn
```

## Asserting chain order

Chains are almost always invoked in a specific order. Use [`inOrder.at`](/guide/ordering) to assert on the sequence:

```typescript
q.where('a')
q.orderBy('b')
q.where('c')
q.execute()

inOrder(
  inOrder.at(q.spy.where, 0),      // 'a'
  q.spy.orderBy,                    // 'b'
  inOrder.at(q.spy.where, 1),      // 'c'
  q.spy.execute,
)
```

## Full worked example — a repository DSL

```typescript
interface UserRepo {
  find(): UserRepo
  byName(name: string): UserRepo
  active(): UserRepo
  limit(n: number): UserRepo
  execute(): Promise<User[]>
}

const repo = stub<UserRepo>(['find', 'byName', 'active', 'limit', 'execute'])

repo.setup.find.toReturnSelf()
repo.setup.byName.toReturnSelf()
repo.setup.active.toReturnSelf()
repo.setup.limit.toReturnSelf()
repo.setup.execute.toResolveWith([{ id: 1, name: 'alice' }])

// Code under test
const users = await repo.find().byName('alice').active().limit(1).execute()

// Then:
repo.expect.byName.called.withArg('alice')
repo.expect.limit.called.withArg(1)
repo.expect.execute.called.once()
```

## See also

- [`toReturnSelf`](/guide/configuring-behaviour#toreturnself) in the setup reference
- [Cross-mock ordering](/guide/ordering) for asserting chain sequence
