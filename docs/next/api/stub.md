# `stub`

Build a test double from method names, an object, or a class.

## Signatures

```typescript
stub<I>(cls: new (...args: never[]) => I): Wrapped<I>
stub<T>(obj: T): Wrapped<T>
stub<T>(methodNames: (keyof T)[]): Wrapped<T>
stub<T>(
  methodNames: string[],
  properties?: { name: PropertyKey; options: PropertyDescriptor }[],
  options?: StubOptions
): Wrapped<T>
```

## Parameters

### `target` (first arg)

Can be:

- **Array of method names** — TypeScript inference drives typing via `stub<T>([...])`.
- **Existing object** — all own + inherited function-typed keys become stubbed methods.
- **Class constructor** — walks the prototype chain (not statics, unless `{ static: true }`).

### `properties` (optional second arg)

Array of `{ name, options }` descriptors to attach non-method fields. Useful for interfaces that mix methods and data:

```typescript
stub<Person & { age: number }>(
  ['greet'],
  [{ name: 'age', options: { value: 25, enumerable: true } }]
)
```

### `options` (optional third arg)

```typescript
interface StubOptions extends Options {
  static?: boolean                  // include static methods when stubbing a class
  debug: {
    prefix: string | undefined      // defaults to 'deride'
    suffix: string | undefined      // defaults to 'stub'
  }
}
```

`debug.prefix` and `debug.suffix` namespace the `debug` logger for this mock — useful when multiple mocks exist and you want to filter per-mock logs.

## Returns

A `Wrapped<T>` — your original type augmented with `setup`, `expect`, `spy`, `called`, `snapshot`, `restore`, and EventEmitter methods. See [Types](./types).

## Examples

### From method names

```typescript
interface Database {
  query(sql: string): Promise<unknown[]>
}
const mock = stub<Database>(['query'])
mock.setup.query.toResolveWith([])
```

### From an existing instance

```typescript
const real = { greet: (n: string) => `hi ${n}` }
const mock = stub(real)
mock.setup.greet.toReturn('mocked')
mock.greet('x')   // 'mocked'
```

### From a class

```typescript
class Greeter {
  greet(name: string) { return `hi ${name}` }
  static version() { return '1.0' }
}

const mock = stub(Greeter)                        // prototype methods only
const staticMock = stub<typeof Greeter>(Greeter, undefined, {
  debug: { prefix: 'deride', suffix: 'stub' },
  static: true,                                    // statics only
})
```

### With property descriptors

```typescript
const bob = stub<Person & { age: number }>(
  ['greet'],
  [{ name: 'age', options: { value: 25, enumerable: true, writable: false } }]
)
bob.age   // 25
```

## `stub.class` — constructor mocking {#stub-class}

```typescript
stub.class<C extends new (...args: any[]) => object>(
  ctor?: C,
  opts?: { methods?: string[]; static?: boolean }
): MockedClass<C>
```

Returns a `new`-able proxy that:

- Records constructor calls (`MockedClass.expect.constructor.*`)
- Produces a fresh `Wrapped<InstanceType<C>>` per `new` call
- Maintains an `instances[]` array of every constructed mock
- Provides `setupAll(fn)` to apply setups across existing and future instances

### Example

```typescript
class Database {
  constructor(public conn: string) {}
  async query(sql: string): Promise<unknown[]> { return [] }
}

const MockedDb = stub.class(Database)
MockedDb.setupAll(inst => inst.setup.query.toResolveWith([]))

const a = new MockedDb('conn-a')
const b = new MockedDb('conn-b')

MockedDb.expect.constructor.called.twice()
MockedDb.instances.length   // 2
await a.query('x')          // []
```

### Signatures on the returned `MockedClass`

```typescript
interface MockedClass<C> {
  new (...args: ConstructorParameters<C>): Wrapped<InstanceType<C>>
  readonly expect: { constructor: MockExpect }
  readonly spy:    { constructor: MethodSpy }
  readonly instances: readonly Wrapped<InstanceType<C>>[]
  setupAll(fn: (instance: Wrapped<InstanceType<C>>) => void): void
}
```

## See also

- [Creating mocks](../guide/creating-mocks) — when to reach for `stub` vs `wrap` vs `func`
- [Types](./types) — full `Wrapped<T>` shape
