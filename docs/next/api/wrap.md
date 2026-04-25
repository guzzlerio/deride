# `wrap`

Wrap an existing object (or function) with deride facades. Unlike `stub`, the **real methods still run by default** — `wrap` is the tool for partial mocking.

## Signatures

```typescript
wrap<T extends object>(obj: T, options?: Options): Wrapped<T>
wrap<F extends (...args: any[]) => any>(fn: F, options?: Options): MockedFunction<F>
```

## Parameters

### `obj` (or `fn`)

- If `obj` is an object — its methods are discovered via `getAllKeys(obj)` (own + prototype chain, excluding `Object.prototype`). All become wrapped.
- If `obj` is a function — delegates to [`func(fn)`](./func).

### `options`

```typescript
interface Options {
  debug: {
    prefix: string | undefined      // default 'deride'
    suffix: string | undefined      // default 'wrap'
  }
}
```

## Behaviour

- **Real implementations run by default.** Call `mock.setup.method.fallback()` to clear any configured behaviour and revert to the real method.
- **Works with frozen objects.** `Object.freeze(obj)` doesn't prevent `wrap(obj)` from building a composed mock — the original isn't mutated.
- **Works with ES6 classes.** Prototype-chain methods are discovered and wrapped without touching the class.
- **Non-function properties are copied** onto the wrapped object so the shape matches the original.
- **EventEmitter methods** (`on`, `once`, `emit`) are attached to the wrapped object for `setup.toEmit` support.

## Examples

### Partial mock — override one method, keep the rest

```typescript
const real = {
  greet(name: string) { return `hello ${name}` },
  shout(name: string) { return `HEY ${name.toUpperCase()}` },
}

const wrapped = wrap(real)
wrapped.shout('alice')   // 'HEY ALICE' — real method

wrapped.setup.greet.toReturn('mocked')
wrapped.greet('alice')   // 'mocked' — override
```

### Frozen objects

```typescript
const frozen = Object.freeze({
  greet(name: string) { return `hello ${name}` },
})

const wrapped = wrap(frozen)
wrapped.greet('alice')                    // 'hello alice'
wrapped.expect.greet.called.withArg('alice')   // ✓
```

### ES6 classes

```typescript
class Greeter {
  greet(name: string) { return `hi ${name}` }
}

const wrapped = wrap(new Greeter())
wrapped.setup.greet.toReturn('mocked')
wrapped.greet('x')   // 'mocked'
```

### Wrap a standalone function

Delegates to [`func(fn)`](./func):

```typescript
function greet(name: string) { return `hello ${name}` }
const wrapped = wrap(greet)

wrapped('world')                      // 'hello world' — real
wrapped.expect.called.withArg('world')

wrapped.setup.toReturn('overridden')
wrapped('x')                          // 'overridden'
```

## Non-function property copying

`wrap` copies non-function own + prototype-chain properties onto the returned object:

```typescript
const real = { name: 'alice', greet: () => 'hi' }
const wrapped = wrap(real)
wrapped.name   // 'alice'
```

Mutations to `real.name` after wrapping are **not** reflected — the copy is taken once at wrap time.

## See also

- [`stub`](./stub) — for objects you don't want to run real implementations against
- [`func`](./func) — for standalone functions
- [Creating mocks](../guide/creating-mocks)
