# TypeScript

deride is TypeScript-first. Every public API is generic over the shape you're mocking, so setup methods are constrained to the real method signatures and return types.

## Generic inference from an interface

```typescript
interface Service {
  fetch(url: string): Promise<string>
  process(data: string): void
}

const mock = stub<Service>(['fetch', 'process'])

mock.setup.fetch.toResolveWith('response')   // ✓ — string is the resolved type
mock.setup.fetch.toResolveWith(123)          // ✗ — type error: number not assignable to string
mock.setup.process.toReturn(undefined)       // ✓ — void
```

The type `Wrapped<Service>` is inferred automatically. You can annotate explicitly if you prefer:

```typescript
const mock: Wrapped<Service> = stub<Service>(['fetch', 'process'])
```

## `toResolveWith` unwraps `Promise<T>`

For async methods, `toResolveWith(v)` expects the resolved type — not the Promise itself:

```typescript
interface Api {
  get(): Promise<{ id: number }>
}

const mock = stub<Api>(['get'])
mock.setup.get.toResolveWith({ id: 1 })            // ✓
mock.setup.get.toResolveWith(Promise.resolve(...))  // ✗ — expects { id: number }, not Promise
```

## `toDoThis(fn)` constrains the callback signature

```typescript
interface Calc {
  sum(a: number, b: number): number
}

const mock = stub<Calc>(['sum'])
mock.setup.sum.toDoThis((a, b) => a + b)           // ✓ — (a: number, b: number) => number
mock.setup.sum.toDoThis((a, b) => String(a + b))    // ✗ — returns string, expected number
```

## Argument matchers preserve type safety

Matchers in `when()` / `withArg()` / `withArgs()` interleave with typed positional args:

```typescript
mock.setup.sum.when(match.number, match.number).toReturn(0)
mock.expect.sum.called.withArgs(1, match.number)
```

`match.*` matcher types are `Matcher<T>` — you can type-annotate `match.where` with a specific parameter type:

```typescript
mock.setup.log.when(match.where<string>(s => s.startsWith('['))).toReturn(undefined)
```

## Escape hatch — `as any`

For deliberately-wrong values in error-path tests:

```typescript
// You want to test that consumers handle a null response gracefully,
// even though the type says fetch returns string
mock.setup.fetch.toResolveWith(null as any)
```

`as any` is the officially-supported escape hatch. It only affects the one call it annotates.

## Public type exports

Everything you might want is exported from the main entry:

```typescript
import type {
  // Shape of a mocked object
  Wrapped,

  // Setup surface
  TypedMockSetup, MockSetup,

  // Expect surface
  MockExpect, CalledExpect, InvocationExpect,

  // Spy surface
  MethodSpy, CallRecord,

  // Lifecycle
  MockSnapshot, Sandbox,

  // Factories
  MockedFunction, MockedClass,

  // Matchers
  Matcher,

  // Options
  Options,
} from 'deride'
```

Per-method types via index-type lookup:

```typescript
import type { Wrapped } from 'deride'
import type { Service } from '../src/service'

type ServiceSetup = Wrapped<Service>['setup']
type ServiceGetSetup = ServiceSetup['get']
```

## Types for `stub.class`

```typescript
import { stub, type MockedClass } from 'deride'

class Database {
  constructor(public conn: string) {}
  async query(sql: string): Promise<unknown[]> { return [] }
}

const MockedDb: MockedClass<typeof Database> = stub.class(Database)

const inst = new MockedDb('conn-string')   // inst: Wrapped<Database>
MockedDb.expect.constructor.called.once()
MockedDb.instances                          // readonly Wrapped<Database>[]
```

## Using deride with `strict` TypeScript

All of deride's types are designed to work under `strict: true` — including `noImplicitAny`, `strictNullChecks`, and `exactOptionalPropertyTypes`. If you hit a type error that surprises you, check these first:

- **`exactOptionalPropertyTypes`** — `withReturn(undefined)` is valid; but if your method's return type is `string`, TypeScript won't let you pass `undefined`. Use `match.any` or cast `as any`.
- **Generic width** — when passing `stub<Service>` with a heavy union return type, inference can be lazy. Annotating the left-hand side (`const mock: Wrapped<Service> = …`) usually helps.
- **`noUnusedParameters` in `toDoThis`** — use `_` prefixed args: `toDoThis((_a, b) => b + 1)`.

## Type-level testing

deride ships with type-level tests under `test/types.test.ts` exercising the constraints. If you're extending the library or building custom helpers, adding a few type-level assertions is a good idea — e.g. using `tsd` or a hand-rolled `// @ts-expect-error` block:

```typescript
// @ts-expect-error — should reject wrong return type
mock.setup.fetch.toResolveWith(123)
```

## IDE experience

Every public API has JSDoc comments, surfaced by editors as hover-docs:

- `setup.method.toReturn(value: R)` — "Return a fixed value when invoked. Cast `as any` to return an invalid type."
- `expect.method.called.withReturn(expected)` — "Assert at least one call returned a value matching `expected` (value or matcher)."

The `jsdoc/require-jsdoc` lint rule enforces this on every public export, so it stays current as the API evolves.
