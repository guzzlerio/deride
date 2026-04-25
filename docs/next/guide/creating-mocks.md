# Creating mocks

Five factories cover every shape of test double deride supports. Pick the one that matches what you have.

| Factory | Use when |
|---------|----------|
| [`stub<T>(methodNames)`](#stub-from-method-names) | You have an interface or type; list the methods to mock |
| [`stub(obj)`](#stub-from-an-existing-object) | You have an existing object; mirror its methods |
| [`stub(MyClass)`](#stub-from-a-class) | You have a class; walk its prototype |
| [`stub.class<typeof C>()`](#stub-class-mock-the-constructor) | You need to mock `new MyClass(...)` |
| [`wrap(obj)`](#wrap-an-existing-object) | You want the real method to run by default (partial mock) |
| [`wrap(fn)` / `func(original?)`](#standalone-functions) | You want a standalone mocked function |

All five return the same `Wrapped<T>`-shaped object — with `setup`, `expect`, `spy`, `called.reset()`, `snapshot()`, `restore()`, and an EventEmitter bolted on.

## `stub` from method names {#stub-from-method-names}

The cleanest pattern when you have an interface:

```typescript
interface Database {
  query(sql: string): Promise<unknown[]>
  findById(id: number): Promise<unknown>
}

const mockDb = stub<Database>(['query', 'findById'])
mockDb.setup.query.toResolveWith([])
```

Methods default to returning `undefined` until configured. Every method on `T` must appear in the array; TypeScript checks it.

### With extra properties

The second argument attaches PropertyDescriptors if your interface has non-method fields:

```typescript
const bob = stub<Person & { age: number }>(
  ['greet'],
  [{ name: 'age', options: { value: 25, enumerable: true } }]
)
bob.age  // 25
```

## `stub` from an existing object {#stub-from-an-existing-object}

Hand deride an instance; it auto-discovers the methods by walking own + prototype-chain keys:

```typescript
const realPerson = {
  greet(name: string) { return `hi ${name}` },
  echo(value: string) { return value },
}

const bob = stub(realPerson)
bob.setup.greet.toReturn('mocked')
bob.greet('alice')                 // 'mocked'
bob.expect.greet.called.once()
```

Note: **all methods are stubbed.** Use `wrap` instead if you want the real implementation to run by default.

## `stub` from a class {#stub-from-a-class}

Pass a constructor directly — deride walks the prototype chain (inheritance-aware), skipping `constructor` and accessor properties:

```typescript
class Greeter {
  greet(name: string) { return `hi ${name}` }
  shout(name: string) { return `HI ${name.toUpperCase()}` }
  static version() { return '1.0' }
}

const mock = stub(Greeter)
mock.setup.greet.toReturn('mocked')
mock.greet('x')   // 'mocked'
```

Static methods are excluded by default. Opt in with `{ static: true }`:

```typescript
const staticMock = stub(Greeter, undefined, {
  debug: { prefix: 'deride', suffix: 'stub' },
  static: true,
})
staticMock.setup.version.toReturn('mocked-v')
```

## `stub.class` — mock the constructor {#stub-class-mock-the-constructor}

When code does `new Database(connString)` inside the function under test, you need to replace the constructor itself. `stub.class<typeof C>()` returns a `new`-able proxy:

```typescript
const MockedDb = stub.class(Database)

const instance = new MockedDb('conn-string')
instance.setup.query.toResolveWith([])

MockedDb.expect.constructor.called.once()
MockedDb.expect.constructor.called.withArg('conn-string')
```

### Apply setups to every instance

`setupAll(fn)` runs `fn(instance)` for every instance created now and in the future:

```typescript
MockedDb.setupAll(inst => inst.setup.query.toResolveWith([]))

const a = new MockedDb()
const b = new MockedDb()
await a.query('x')   // []
await b.query('y')   // []
```

### Inspect the instances list

```typescript
MockedDb.instances  // readonly array of every constructed Wrapped<Db>
```

## `wrap` an existing object {#wrap-an-existing-object}

If you want a **partial mock** — real implementations by default, overridden per-method — use `wrap`:

```typescript
const real = {
  greet(name: string) { return `hello ${name}` },
  shout(name: string) { return `HEY ${name.toUpperCase()}` },
}

const wrapped = wrap(real)

// shout() still calls the real implementation
wrapped.shout('alice')   // 'HEY ALICE'

// greet() overridden
wrapped.setup.greet.toReturn('mocked')
wrapped.greet('alice')   // 'mocked'
```

### Wrap works with frozen objects and ES6 classes

This is the killer feature. Composition means deride doesn't need to mutate your object:

```typescript
const frozen = Object.freeze({
  greet(name: string) { return `hello ${name}` },
})

const wrapped = wrap(frozen)
wrapped.greet('alice')   // 'hello alice' — real method still works
wrapped.expect.greet.called.withArg('alice')
```

ES6 classes, prototype-based objects, and objects whose methods reference private fields all work because `wrap` never touches them.

## Standalone functions {#standalone-functions}

For the case where the dependency **is** a function, not an object:

```typescript
import { func } from 'deride'

// Blank mock function
const fn = func<(x: number) => number>()
fn.setup.toReturn(42)
fn(10)                              // 42
fn.expect.called.withArg(10)

// Wrap an existing function
const doubler = func((x: number) => x * 2)
doubler(5)                          // 10
doubler.setup.toReturn(99)
doubler(5)                          // 99
```

`wrap(fn)` is the same thing — it delegates to `func(fn)` internally.

Standalone mocked functions expose `setup`, `expect`, and `spy` **directly** (no `.methodName` indirection), because there's only one method:

```typescript
fn.setup.toReturn(42)   // not fn.setup.anything.toReturn
fn.expect.called.once()
fn.spy.callCount
```

## What you get back

Every factory returns an object with this shape:

```typescript
type Wrapped<T> = T & {
  setup:  { [K in keyof T]: TypedMockSetup<...> }
  expect: { [K in keyof T]: MockExpect }
  spy:    { [K in keyof T]: MethodSpy }
  called: { reset(): void }
  snapshot(): Record<string, MockSnapshot>
  restore(snap: Record<string, MockSnapshot>): void
  on(event: string, listener: ...): EventEmitter
  once(event: string, listener: ...): EventEmitter
  emit(event: string, ...args): boolean
}
```

Full type reference: [Types](../api/types).
