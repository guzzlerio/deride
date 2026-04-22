# Class mocking

Three patterns, in order of preference.

## 1. Inject an instance — no class mocking needed

If your code accepts the dependency via constructor, you never need to mock the class itself:

```typescript
class UserService {
  constructor(private db: Database) {}
  async getAll() { return this.db.query(...) }
}

// Test:
const mockDb = stub<Database>(['query'])
const service = new UserService(mockDb)
```

This is the deride-native style. Reach for it first.

## 2. `stub(MyClass)` — auto-discover from the prototype

When you already have a class but want a per-test fresh instance:

```typescript
class Greeter {
  greet(name: string) { return `hi ${name}` }
  shout(name: string) { return `HI ${name.toUpperCase()}` }
}

const mock = stub(Greeter)
mock.setup.greet.toReturn('mocked')
```

deride walks the prototype chain (inheritance-aware), excludes `constructor` and accessors. Static methods are opt-in:

```typescript
const staticMock = stub(Greeter, undefined, {
  debug: { prefix: 'deride', suffix: 'stub' },
  static: true,
})
```

## 3. `stub.class<typeof C>()` — mock the constructor itself

When the code under test does `new MyClass(...)` and you need to intercept:

```typescript
// production code
class UserService {
  createRepo(conn: string) {
    return new Database(conn)   // ← we need to mock THIS
  }
}

// test
const MockedDb = stub.class(Database)

const service = new UserService()
const repo = service.createRepo('conn-string')

MockedDb.expect.constructor.called.withArg('conn-string')
MockedDb.instances.length   // 1
```

::: warning Module substitution required
`stub.class` produces a newable stand-in, but you still need to substitute it where the real constructor is imported. That means `vi.mock('./database', () => ({ Database: MockedDb }))` (or jest's equivalent). See [Module mocking](/recipes/module-mocking).
:::

### Apply setup across every constructed instance

```typescript
const MockedDb = stub.class(Database)
MockedDb.setupAll(inst => inst.setup.query.toResolveWith([]))

const a = new MockedDb()
const b = new MockedDb()
await a.query('x')   // []
await b.query('y')   // []
```

`setupAll` applies to every existing instance and every future one — new instances run the callback at construction.

### Inspect all instances

```typescript
MockedDb.instances   // readonly array of all Wrapped<Database> constructed so far
```

Useful for:

- Asserting "exactly one instance was created and queried"
- Pulling a specific instance out for per-test setup overrides
- Cleaning up (`MockedDb.instances.forEach(i => i.called.reset())`)

::: warning Instances accumulate
The `instances[]` array grows unbounded across tests. If you construct many instances per test suite, consider wrapping the class mock in a `sandbox()` and resetting between tests, or manually clearing with `MockedDb.instances.length = 0` (though this is read-as-readonly at the type level).
:::

## Mocking abstract classes / interfaces without the real class

If you don't have a concrete class to pass to `stub.class` — or you don't want to — just build a hand-shaped mock:

```typescript
interface IUserRepo {
  findById(id: number): Promise<User | undefined>
  save(user: User): Promise<void>
}

const repo = stub<IUserRepo>(['findById', 'save'])
repo.setup.findById.when(1).toResolveWith({ id: 1, name: 'alice' })
```

## Mocking subclasses

`stub` walks the full prototype chain, so inherited methods are picked up automatically:

```typescript
class Animal {
  speak() { return 'generic noise' }
}
class Dog extends Animal {
  bark() { return 'woof' }
}

const mock = stub(Dog)
mock.setup.speak.toReturn('mocked-speak')  // inherited
mock.setup.bark.toReturn('mocked-bark')    // own
```

## Mocking class-based event emitters

`wrap` preserves the full shape — including `on`/`emit`/`addEventListener`. Use `setup.toEmit` to trigger listener callbacks:

```typescript
const emitter = wrap(new EventEmitter())
emitter.setup.emit.toEmit('ready', 'payload')

emitter.on('ready', (data) => console.log(data))
emitter.emit('ready', 'ignored')   // logs 'payload' (the setup wins)
```

## See also

- [`stub`](/api/stub) / [`stub.class`](/api/stub#stub-class) — signatures
- [Creating mocks](/guide/creating-mocks) — wider context
- [Module mocking](/recipes/module-mocking) — substituting mock classes at import time
