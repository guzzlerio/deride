# deride

Mocking library based on composition

The inspiration for this was that my colleague was having a look at other mocking frameworks and mentioned to me that they do not work when using `Object.freeze` in the objects to enforce encapsulation. This library builds on composition to create a mocking library that can work with objects which are frozen.

## Getting Started

```bash
npm install deride
```

```typescript
import deride from 'deride'
// or use named exports
import { stub, wrap, func } from 'deride'
```

## API

### Creating mocks

- [`deride.stub(methods)`](#stub-methods) — create a stub from method names
- [`deride.stub(obj)`](#stub-obj) — create a stub from an existing object
- [`deride.wrap(obj)`](#wrap) — wrap an existing object (works with frozen objects)
- [`deride.wrap(fn)`](#wrap-fn) — wrap a standalone function
- [`deride.func(original?)`](#func) — create a standalone mocked function

### Setup (configure behavior)

- [`obj.setup.method.toReturn(value)`](#setup-toreturn)
- [`obj.setup.method.toDoThis(fn)`](#setup-todothis)
- [`obj.setup.method.toThrow(message)`](#setup-tothrow)
- [`obj.setup.method.toResolveWith(value)`](#setup-toresolvewith)
- [`obj.setup.method.toRejectWith(error)`](#setup-torejectwith)
- [`obj.setup.method.toCallbackWith(...args)`](#setup-tocallbackwith)
- [`obj.setup.method.toEmit(event, ...args)`](#setup-toemit)
- [`obj.setup.method.toIntercept(fn)`](#setup-tointercept)
- [`obj.setup.method.toTimeWarp(ms)`](#setup-totimewarp)
- [`obj.setup.method.when(value | predicate).toReturn(...)`](#setup-when)
- [`obj.setup.method.once().toReturn(...)`](#setup-times)
- [`obj.setup.method.times(n).toReturn(...)`](#setup-times)
- [`obj.setup.method.toReturn(...).twice().and.then.toReturn(...)`](#setup-chaining)
- [`obj.setup.method.fallback()`](#setup-fallback)

### Expectations (verify calls)

- [`obj.expect.method.called.times(n)`](#called-times)
- [`obj.expect.method.called.once()`](#called-once)
- [`obj.expect.method.called.twice()`](#called-twice)
- [`obj.expect.method.called.never()`](#called-never)
- [`obj.expect.method.called.lt(n)` / `lte(n)` / `gt(n)` / `gte(n)`](#called-comparisons)
- [`obj.expect.method.called.withArg(arg)`](#called-witharg)
- [`obj.expect.method.called.withArgs(...args)`](#called-withargs)
- [`obj.expect.method.called.withMatch(regex)`](#called-withmatch)
- [`obj.expect.method.called.matchExactly(...args)`](#called-matchexactly)
- [`obj.expect.method.called.not.*`](#called-not) — negated versions of all above
- [`obj.expect.method.called.reset()`](#called-reset)
- [`obj.expect.method.invocation(i).withArg(arg)`](#invocation)
- [`obj.called.reset()`](#called-reset-all) — reset all methods

---

## Creating mocks

The examples below use this interface:

```typescript
interface Person {
  greet(name: string): string
  echo(value: string): string
}
```

<a name="stub-methods"></a>

### Creating a stub from method names

```typescript
const bob = deride.stub<Person>(['greet', 'echo'])
bob.setup.greet.toReturn('hello')
bob.greet('alice') // 'hello'
bob.expect.greet.called.once()
```

### Creating a stub with properties

```typescript
const bob = deride.stub<Person & { age: number }>(
  ['greet'],
  [{ name: 'age', options: { value: 25, enumerable: true } }]
)
bob.age // 25
```

<a name="stub-obj"></a>

### Creating a stub from an existing object

```typescript
const realPerson: Person = { greet: (n) => `hi ${n}`, echo: (v) => v }
const bob = deride.stub(realPerson)
bob.greet('alice')
bob.expect.greet.called.once()
```

<a name="wrap"></a>

### Wrapping an existing object

Works with `Object.freeze`, ES6 classes, and prototype-based objects:

```typescript
const person = Object.freeze({
  greet(name: string) { return `hello ${name}` },
})

const bob = deride.wrap(person)
bob.greet('alice') // 'hello alice'
bob.expect.greet.called.withArg('alice')
```

<a name="wrap-fn"></a>

### Wrapping a standalone function

`wrap()` also accepts a plain function — it returns a callable mock with `.setup` and `.expect`:

```typescript
function greet(name: string) { return `hello ${name}` }
const wrapped = deride.wrap(greet)
wrapped('world') // 'hello world'
wrapped.expect.called.withArg('world')

wrapped.setup.toReturn('overridden')
wrapped('x') // 'overridden'
```

<a name="func"></a>

### Creating a standalone mocked function

`func()` creates a mock from scratch (optionally wrapping an existing function). This is what `wrap(fn)` delegates to:

```typescript
// Empty mock
const fn = deride.func()
fn.setup.toReturn(42)
fn('hello') // 42
fn.expect.called.withArg('hello')

// Wrapping an existing function
const fn2 = deride.func((x: number) => x * 2)
fn2(5) // 10
fn2.setup.toReturn(99)
fn2(5) // 99
```

---

## Setup

<a name="setup-toreturn"></a>

### `toReturn(value)`

```typescript
bob.setup.greet.toReturn('foobar')
bob.greet('alice') // 'foobar'
```

<a name="setup-todothis"></a>

### `toDoThis(fn)`

```typescript
bob.setup.greet.toDoThis((name) => `yo ${name}`)
bob.greet('alice') // 'yo alice'
```

<a name="setup-tothrow"></a>

### `toThrow(message)`

```typescript
bob.setup.greet.toThrow('BANG')
bob.greet('alice') // throws Error('BANG')
```

<a name="setup-toresolvewith"></a>

### `toResolveWith(value)`

```typescript
bob.setup.greet.toResolveWith('async result')
await bob.greet('alice') // 'async result'
```

<a name="setup-torejectwith"></a>

### `toRejectWith(error)`

```typescript
bob.setup.greet.toRejectWith(new Error('network error'))
await bob.greet('alice') // rejects with Error('network error')
```

<a name="setup-tocallbackwith"></a>

### `toCallbackWith(...args)`

Finds the last function argument and invokes it with the provided args:

```typescript
const bob = deride.stub<{ load: Function }>(['load'])
bob.setup.load.toCallbackWith(null, 'data')
bob.load('file.txt', (err, data) => {
  // err === null, data === 'data'
})
```

When multiple function arguments are passed, the last one is treated as the callback:

```typescript
bob.chuckle('arg', () => { /* ignored */ }, (err, msg) => {
  // this one is called
})
```

<a name="setup-toemit"></a>

### `toEmit(event, ...args)`

Emits an event on the wrapped object when the method is invoked:

```typescript
bob.setup.greet.toEmit('greeted', 'payload')
bob.on('greeted', (data) => {
  // data === 'payload'
})
bob.greet('alice')
```

<a name="setup-tointercept"></a>

### `toIntercept(fn)`

Calls the interceptor with the arguments, then calls the original method:

```typescript
const log: any[] = []
bob.setup.greet.toIntercept((...args) => log.push(args))
bob.greet('alice') // original runs, returns normal result
// log === [['alice']]
```

<a name="setup-totimewarp"></a>

### `toTimeWarp(ms)`

Accelerates the timeout — schedules the callback with the given delay instead of the original:

```typescript
bob.setup.foobar.toTimeWarp(0) // immediate callback
bob.foobar(10000, (result) => {
  // called immediately instead of after 10s
})
```

<a name="setup-when"></a>

### `when(value | predicate)`

Apply behavior conditionally based on arguments:

```typescript
// Match by value (compared against first argument)
bob.setup.greet.when('alice').toReturn('hi alice')
bob.setup.greet.when('bob').toReturn('hi bob')
bob.greet('alice') // 'hi alice'
bob.greet('bob')   // 'hi bob'

// Match by predicate function
bob.setup.greet.when((args) => args[0].startsWith('Dr')).toReturn('hello doctor')
bob.greet('Dr Smith') // 'hello doctor'
```

<a name="setup-times"></a>

### `once()` / `twice()` / `times(n)`

Limit how many times a behavior applies. Use before `toReturn` to set the limit prospectively:

```typescript
bob.setup.greet.once().toReturn('first')
bob.setup.greet.toReturn('default')
bob.greet() // 'first'
bob.greet() // 'default'

bob.setup.echo.times(3).toReturn('limited')
bob.setup.echo.toReturn('fallback')
bob.echo() // 'limited' (x3)
bob.echo() // 'fallback'
```

<a name="setup-chaining"></a>

### Chaining with `.and.then`

Use `.and.then` to define sequential behaviors in a single fluent chain:

```typescript
bob.setup.greet
  .toReturn('alice')
  .twice()
  .and.then
  .toReturn('sally')

bob.greet() // 'alice'
bob.greet() // 'alice'
bob.greet() // 'sally'
bob.greet() // 'sally'
```

Can be combined with `when()`:

```typescript
bob.setup.greet
  .when('simon')
  .toReturn('special')
  .twice()
  .and.then
  .toReturn('default')

bob.greet('simon') // 'special'
bob.greet('simon') // 'special'
bob.greet('simon') // 'default'
```

<a name="setup-fallback"></a>

### `fallback()`

Clear all configured behaviors, revert to the original implementation:

```typescript
bob.setup.greet.toReturn('mocked')
bob.greet('x') // 'mocked'
bob.setup.greet.fallback()
bob.greet('x') // original return value
```

---

## Expectations

<a name="called-times"></a>

### `called.times(n)`

```typescript
bob.greet('alice')
bob.greet('bob')
bob.expect.greet.called.times(2)
```

<a name="called-once"></a>

### `called.once()`

```typescript
bob.greet('alice')
bob.expect.greet.called.once()
```

<a name="called-twice"></a>

### `called.twice()`

```typescript
bob.greet('alice')
bob.greet('bob')
bob.expect.greet.called.twice()
```

<a name="called-never"></a>

### `called.never()`

```typescript
bob.expect.greet.called.never()
```

<a name="called-comparisons"></a>

### `lt(n)` / `lte(n)` / `gt(n)` / `gte(n)`

```typescript
bob.greet('a')
bob.greet('b')
bob.greet('c')

bob.expect.greet.called.gt(2)
bob.expect.greet.called.gte(3)
bob.expect.greet.called.lt(4)
bob.expect.greet.called.lte(3)
```

<a name="called-witharg"></a>

### `called.withArg(arg)`

Assert that any invocation included the given argument (partial deep match):

```typescript
bob.greet('alice', { name: 'bob', a: 1 })
bob.expect.greet.called.withArg({ name: 'bob' })
```

<a name="called-withargs"></a>

### `called.withArgs(...args)`

Assert that all provided arguments were present in a single invocation:

```typescript
bob.greet('alice', 'bob')
bob.expect.greet.called.withArgs('alice', 'bob')
```

<a name="called-withmatch"></a>

### `called.withMatch(regex)`

Match arguments against a regex pattern (searches strings and nested objects):

```typescript
bob.greet('The quick brown fox')
bob.expect.greet.called.withMatch(/quick.*fox/)

bob.greet({ message: 'hello world' })
bob.expect.greet.called.withMatch(/hello/)
```

<a name="called-matchexactly"></a>

### `called.matchExactly(...args)`

Assert strict deep equality of all arguments for a single invocation:

```typescript
bob.greet('alice', ['carol'], 123)
bob.expect.greet.called.matchExactly('alice', ['carol'], 123)
```

<a name="called-not"></a>

### `called.not.*`

All expectation methods can be negated — they pass when the positive assertion would fail:

```typescript
bob.greet('alice')
bob.expect.greet.called.not.never()       // passes (it was called)
bob.expect.greet.called.not.twice()       // passes (called once, not twice)
bob.expect.greet.called.not.withArg('bob') // passes (was called with 'alice')
```

<a name="called-reset"></a>

### `called.reset()`

Reset the call count and recorded arguments for a single method:

```typescript
bob.greet('alice')
bob.expect.greet.called.once()
bob.expect.greet.called.reset()
bob.expect.greet.called.never()
```

<a name="called-reset-all"></a>

### `obj.called.reset()`

Reset all methods at once:

```typescript
bob.greet('alice')
bob.echo('hello')
bob.called.reset()
bob.expect.greet.called.never()
bob.expect.echo.called.never()
```

<a name="invocation"></a>

### `invocation(i)`

Access a specific invocation by zero-based index:

```typescript
bob.greet('first')
bob.greet('second', 'extra')

bob.expect.greet.invocation(0).withArg('first')
bob.expect.greet.invocation(1).withArg('second')
bob.expect.greet.invocation(1).withArgs('second', 'extra')
```

---

## Events

### Emit events directly

```typescript
bob.on('message', (payload) => { /* ... */ })
bob.emit('message', 'hello')
```

### Emit on method invocation

```typescript
bob.setup.greet.toEmit('greeted', 'arg1', { a: 1 })
bob.on('greeted', (a1, a2) => {
  // a1 === 'arg1', a2 === { a: 1 }
})
bob.greet('bob')
```

---

## TypeScript

Full type support with generics:

```typescript
import deride, { Wrapped } from 'deride'

interface MyService {
  fetch(url: string): Promise<string>
  process(data: string): void
}

const service: Wrapped<MyService> = deride.stub<MyService>(['fetch', 'process'])
service.setup.fetch.toResolveWith('response data')
service.process('hello')
service.expect.process.called.withArg('hello')
```

---

## Contributing

```bash
npm run lint      # eslint
npm run test      # vitest (watch mode)
npm run build     # tsup (cjs + esm + types)
```

## License

Copyright (c) 2014 Andrew Rea
Copyright (c) 2014 James Allen

Licensed under the MIT license.
