# `func`

Create a standalone mocked function. If `original` is supplied, the mock falls back to calling it when no behaviour matches; otherwise the unconfigured mock returns `undefined`.

## Signatures

```typescript
func<F extends (...args: any[]) => any>(original?: F): MockedFunction<F>
```

## Returns

A `MockedFunction<F>` — callable like `F`, with `.setup`, `.expect`, and `.spy` properties attached.

```typescript
interface MockedFunction<F> extends F {
  setup: TypedMockSetup<Args, Return>    // directly on the function, not .setup.method
  expect: MockExpect
  spy: MethodSpy
}
```

Because there's only one "method" on a standalone function, the facades are reached directly — **no method name indirection**.

## Examples

### Blank mock function

```typescript
const fn = func<(x: number) => number>()
fn.setup.toReturn(42)
fn(10)                            // 42
fn.expect.called.withArg(10)
```

### Wrapping an existing function

```typescript
const doubler = func((x: number) => x * 2)
doubler(5)                        // 10 — original
doubler.setup.toReturn(99)
doubler(5)                        // 99 — overridden
doubler.setup.fallback()
doubler(5)                        // 10 — back to original
```

### Async

```typescript
const fetchMock = func<(url: string) => Promise<string>>()
fetchMock.setup.toResolveWith('payload')
await fetchMock('/x')             // 'payload'
```

### With `this` context

`func` uses a Proxy to capture `this` through the apply trap:

```typescript
const fn = func<(x: number) => number>()
const target = { tag: 'ctx' }

fn.call(target, 1)
fn.expect.called.calledOn(target)
fn.spy.lastCall?.thisArg          // target
```

## Interaction with `bind`, `call`, `apply`

The function proxy forwards through Proxy apply traps, so all of these work:

```typescript
fn(1, 2)                          // direct call
fn.call(obj, 1, 2)                // this = obj
fn.apply(obj, [1, 2])             // this = obj
fn.bind(obj)(1, 2)                // this = obj
```

Each records a `CallRecord` with `thisArg` populated.

## `wrap(fn)` is the same thing

For consistency, `wrap(fn)` delegates to `func(fn)`. Use whichever reads better in context:

```typescript
// These are equivalent:
const a = func(handler)
const b = wrap(handler)
```

## Differences vs method-level mocks

| | `stub<T>([...])` method | `func()` |
|-|--|--|
| Setup | `mock.setup.method.toReturn(...)` | `fn.setup.toReturn(...)` |
| Expect | `mock.expect.method.called.once()` | `fn.expect.called.once()` |
| Spy | `mock.spy.method.callCount` | `fn.spy.callCount` |
| Called via | `mock.method(...)` | `fn(...)` |

## See also

- [Creating mocks](/guide/creating-mocks#standalone-functions) — when to use func vs stub vs wrap
- [Types](/api/types) — `MockedFunction` type
