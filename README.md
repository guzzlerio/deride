# deride

A TypeScript-first mocking library that works with frozen objects, sealed classes, and any coding style — no monkey-patching required.

**Why deride?**

- Works with `Object.freeze`, ES6 classes, and prototype-based objects
- Composition-based — wraps objects rather than mutating them
- Framework-agnostic — works with vitest, jest, node:test, or anything that catches thrown errors
- Type-safe — setup methods are constrained to your method signatures
- Zero config — no decorators, no DI container, no babel plugins
- Sub-path integrations (`deride/vitest`, `deride/jest`, `deride/clock`) are opt-in, so the core stays small

```typescript
import { stub } from 'deride'

const mockDb = stub<Database>(['query', 'findById'])
mockDb.setup.query.toResolveWith([{ id: 1, name: 'alice' }])

const result = await mockDb.query('SELECT * FROM users')
mockDb.expect.query.called.once()
mockDb.expect.query.called.withArg('SELECT * FROM users')
```

## Getting Started

```bash
npm install deride
```

```typescript
import deride from 'deride'
// or use named exports
import { stub, wrap, func, match, inOrder, sandbox } from 'deride'
```

## API

### Creating mocks

- [`deride.stub(methods)`](#stub-methods) — create a stub from method names
- [`deride.stub(obj)`](#stub-obj) — create a stub from an existing object
- [`deride.stub(Class)`](#stub-class) — create a stub from a class (auto-discovers prototype methods)
- [`deride.stub.class<typeof C>()`](#stub-class-constructor) — mock a constructor, track `new` calls, produce per-instance stubs
- [`deride.wrap(obj)`](#wrap) — wrap an existing object (works with frozen objects)
- [`deride.wrap(fn)`](#wrap-fn) — wrap a standalone function
- [`deride.func(original?)`](#func) — create a standalone mocked function
- [`deride.sandbox()`](#sandbox) — create a scope with fan-out reset/restore

### Setup (configure behavior)

Return-value behaviours:

- [`setup.method.toReturn(value)`](#setup-toreturn)
- [`setup.method.toReturnSelf()`](#setup-toreturnself)
- [`setup.method.toReturnInOrder(...values)`](#setup-toreturninorder) — sequential returns
- [`setup.method.toDoThis(fn)`](#setup-todothis)
- [`setup.method.toThrow(message)`](#setup-tothrow)

Async behaviours:

- [`setup.method.toResolveWith(value)`](#setup-toresolvewith)
- [`setup.method.toResolve()`](#setup-toresolve)
- [`setup.method.toRejectWith(error)`](#setup-torejectwith)
- [`setup.method.toResolveInOrder(...values)`](#setup-toresolveinorder)
- [`setup.method.toRejectInOrder(...errors)`](#setup-torejectinorder)
- [`setup.method.toResolveAfter(ms, value)`](#setup-toresolveafter) — delayed resolve
- [`setup.method.toRejectAfter(ms, error)`](#setup-torejectafter)
- [`setup.method.toHang()`](#setup-tohang) — never settles

Iterator behaviours:

- [`setup.method.toYield(...values)`](#setup-toyield)
- [`setup.method.toAsyncYield(...values)`](#setup-toasyncyield)
- [`setup.method.toAsyncYieldThrow(error, ...valuesBefore)`](#setup-toasyncyieldthrow)

Callbacks, events, and interception:

- [`setup.method.toCallbackWith(...args)`](#setup-tocallbackwith)
- [`setup.method.toEmit(event, ...args)`](#setup-toemit)
- [`setup.method.toIntercept(fn)`](#setup-tointercept)
- [`setup.method.toTimeWarp(ms)`](#setup-totimewarp)

Routing and lifecycle:

- [`setup.method.when(value | matcher | predicate)`](#setup-when)
- [`setup.method.once()` / `twice()` / `times(n)`](#setup-times)
- [`setup.method.toReturn(...).twice().and.then.toReturn(...)`](#setup-chaining)
- [`setup.method.fallback()`](#setup-fallback)

### Argument matchers

- [`match.*` namespace](#matchers) — reusable matchers for `when()` and `expect.*`

### Expectations (verify calls)

Count and argument assertions:

- [`expect.method.called.times(n)` / `once()` / `twice()` / `never()`](#called-counts)
- [`expect.method.called.lt(n)` / `lte(n)` / `gt(n)` / `gte(n)`](#called-comparisons)
- [`expect.method.called.withArg(arg)`](#called-witharg)
- [`expect.method.called.withArgs(...args)`](#called-withargs)
- [`expect.method.called.withMatch(regex)`](#called-withmatch)
- [`expect.method.called.matchExactly(...args)`](#called-matchexactly)

Return / this / throw assertions:

- [`expect.method.called.withReturn(expected)`](#called-withreturn)
- [`expect.method.called.calledOn(target)`](#called-calledon)
- [`expect.method.called.threw(expected?)`](#called-threw)

Every-call / invocation / negation:

- [`expect.method.everyCall.*`](#every-call)
- [`expect.method.invocation(i).withArg(arg)`](#invocation)
- [`expect.method.called.not.*`](#called-not) — negated versions
- [`expect.method.called.reset()`](#called-reset)
- [`obj.called.reset()`](#called-reset-all) — reset all methods

### Spy inspection

- [`mock.spy.method.callCount` / `calls` / `firstCall` / `lastCall`](#spy-inspection)
- [`mock.spy.method.calledWith(...)`](#spy-calledwith)
- [`mock.spy.method.printHistory()`](#spy-printhistory)
- [`mock.spy.method.serialize()`](#spy-serialize) — snapshot-friendly output

### Ordering

- [`inOrder(...spies)`](#inorder) — cross-mock call ordering

### Lifecycle

- [`obj.snapshot()` / `obj.restore(snap)`](#snapshot-restore) — per-mock state capture
- [`sandbox().reset()` / `.restore()`](#sandbox) — fan-out across registered mocks

### Integrations

- [`deride/vitest`](#vitest-integration) — toHaveBeenCalled-style matchers
- [`deride/jest`](#jest-integration) — same matchers for jest
- [`deride/clock`](#clock-integration) — lightweight fake timers

### TypeScript

- [Type-safe setup](#type-safe-setup)
- [`as any` escape hatch](#type-safe-setup)

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

<a name="stub-class"></a>

### Creating a stub from a class

Passing a constructor auto-discovers prototype methods (walking inheritance), skipping `constructor` and accessor properties:

```typescript
class Greeter {
  greet(name: string) { return `hi ${name}` }
  shout(name: string) { return `HI ${name.toUpperCase()}` }
  static version() { return '1.0' }
}

const mock = deride.stub(Greeter)
mock.setup.greet.toReturn('mocked')
mock.greet('x') // 'mocked'

// Include static methods instead of prototype methods:
const staticMock = deride.stub(Greeter, undefined, {
  debug: { prefix: 'deride', suffix: 'stub' },
  static: true,
})
staticMock.setup.version.toReturn('mocked-v')
```

<a name="stub-class-constructor"></a>

### Mocking a constructor with `stub.class`

Track `new` invocations AND provide fresh per-instance stubs:

```typescript
const MockedDb = deride.stub.class(Database)

const a = new MockedDb('connection-string')
a.setup.query.toResolveWith([{ id: 1 }])

MockedDb.expect.constructor.called.once()
MockedDb.expect.constructor.called.withArg('connection-string')

// setupAll applies to every instance (past and future):
MockedDb.setupAll((inst) => inst.setup.query.toResolveWith([]))

// List all constructed stubs:
MockedDb.instances // [a, ...]
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

```typescript
// Empty mock
const fn = deride.func()
fn.setup.toReturn(42)
fn('hello') // 42
fn.expect.called.withArg('hello')

// Wrapping an existing function
const fn2 = deride.func((x: number) => x * 2)
fn2.setup.toReturn(99)
fn2(5) // 99
```

<a name="sandbox"></a>

### `sandbox()` — fan-out reset/restore

Group mocks together for bulk cleanup:

```typescript
import { sandbox } from 'deride'

const sb = sandbox()
const mockDb  = sb.stub<Database>(['query'])
const mockLog = sb.wrap(realLogger)

afterEach(() => sb.reset())    // clear call history on all registered mocks
afterAll(() => sb.restore())   // clear behaviours and history
```

Mocks created outside the sandbox are untouched. Nested sandboxes are independent.

---

## Setup

<a name="setup-toreturn"></a>

### `toReturn(value)`

```typescript
bob.setup.greet.toReturn('foobar')
bob.greet('alice') // 'foobar'
```

<a name="setup-toreturnself"></a>

### `toReturnSelf()`

Useful for fluent/chainable APIs (query builders, jQuery-style):

```typescript
const q = deride.stub<QueryBuilder>(['where', 'orderBy', 'execute'])
q.setup.where.toReturnSelf()
q.setup.orderBy.toReturnSelf()
q.setup.execute.toReturn([])

q.where('x').orderBy('y').where('z').execute()
```

<a name="setup-toreturninorder"></a>

### `toReturnInOrder(...values)`

Sequential returns. The last value is sticky:

```typescript
bob.setup.greet.toReturnInOrder('first', 'second', 'third')
bob.greet() // 'first'
bob.greet() // 'second'
bob.greet() // 'third'
bob.greet() // 'third' (sticky-last)

// With explicit fallthrough:
bob.setup.greet.toReturnInOrder(['a', 'b'], { then: 'default' })

// With cycling:
bob.setup.greet.toReturnInOrder(['a', 'b'], { cycle: true })
// a, b, a, b, a, ...
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

<a name="setup-toresolve"></a>

### `toResolve()`

Resolve with `undefined`:

```typescript
bob.setup.save.toResolve()
await bob.save(data) // undefined
```

<a name="setup-torejectwith"></a>

### `toRejectWith(error)`

```typescript
bob.setup.greet.toRejectWith(new Error('network error'))
await bob.greet('alice') // rejects
```

<a name="setup-toresolveinorder"></a>

### `toResolveInOrder(...values)`

```typescript
bob.setup.fetch.toResolveInOrder('first', 'second', 'third')
await bob.fetch() // 'first'
await bob.fetch() // 'second'
```

<a name="setup-torejectinorder"></a>

### `toRejectInOrder(...errors)`

```typescript
bob.setup.fetch.toRejectInOrder(new Error('a'), new Error('b'))
```

<a name="setup-toresolveafter"></a>

### `toResolveAfter(ms, value)`

Delay the resolution — pairs with fake timers (see [`deride/clock`](#clock-integration) or `vi.useFakeTimers()`):

```typescript
bob.setup.fetch.toResolveAfter(100, { data: 42 })
const p = bob.fetch('/x')   // pending
// ...advance time by 100ms...
await p // { data: 42 }
```

<a name="setup-torejectafter"></a>

### `toRejectAfter(ms, error)`

```typescript
bob.setup.fetch.toRejectAfter(100, new Error('timeout'))
```

<a name="setup-tohang"></a>

### `toHang()`

Never-settling promise — ideal for exercising timeout paths:

```typescript
bob.setup.fetch.toHang()
const p = bob.fetch('/x')
// p never resolves. Use Promise.race with a timeout to verify your code handles it.
```

<a name="setup-toyield"></a>

### `toYield(...values)`

Return a fresh sync iterator:

```typescript
bob.setup.stream.toYield(1, 2, 3)
for (const v of bob.stream()) console.log(v) // 1, 2, 3
```

<a name="setup-toasyncyield"></a>

### `toAsyncYield(...values)`

```typescript
bob.setup.streamAsync.toAsyncYield(1, 2, 3)
for await (const v of bob.streamAsync()) console.log(v) // 1, 2, 3
```

<a name="setup-toasyncyieldthrow"></a>

### `toAsyncYieldThrow(error, ...valuesBefore)`

```typescript
bob.setup.streamAsync.toAsyncYieldThrow(new Error('drained'), 1, 2)
// yields 1, 2, then throws
```

<a name="setup-tocallbackwith"></a>

### `toCallbackWith(...args)`

Finds the last function argument and invokes it with the provided args:

```typescript
bob.setup.load.toCallbackWith(null, 'data')
bob.load('file.txt', (err, data) => { /* err=null, data='data' */ })
```

<a name="setup-toemit"></a>

### `toEmit(event, ...args)`

```typescript
bob.setup.greet.toEmit('greeted', 'payload')
bob.on('greeted', (data) => { /* data === 'payload' */ })
bob.greet('alice')
```

<a name="setup-tointercept"></a>

### `toIntercept(fn)`

Calls the interceptor with the arguments, then calls the original method:

```typescript
const log: any[] = []
bob.setup.greet.toIntercept((...args) => log.push(args))
bob.greet('alice') // original runs, returns normal result
```

<a name="setup-totimewarp"></a>

### `toTimeWarp(ms)`

Accelerates the timeout — schedules the callback with the given delay instead of the original:

```typescript
bob.setup.foobar.toTimeWarp(0) // immediate callback
bob.foobar(10000, (result) => { /* called immediately */ })
```

<a name="setup-when"></a>

### `when(value | matcher | predicate)`

Apply behavior conditionally:

```typescript
// Match by value (first argument compared with deep equal)
bob.setup.greet.when('alice').toReturn('hi alice')

// Match by predicate
bob.setup.greet.when((args) => args[0].startsWith('Dr')).toReturn('hello doctor')

// Match by matcher
import { match } from 'deride'
bob.setup.greet.when(match.string).toReturn('hello string')
bob.setup.greet.when(match.objectContaining({ id: 1 })).toReturn('found')
```

<a name="setup-times"></a>

### `once()` / `twice()` / `times(n)`

Limit how many times a behavior applies:

```typescript
bob.setup.greet.once().toReturn('first')
bob.setup.greet.toReturn('default')
bob.greet() // 'first'
bob.greet() // 'default'
```

**Dispatch rule:** within the time-limited behaviours, first-registered wins (FIFO). After those exhaust, the **last** unlimited behaviour wins. Use `once()` / `times()` when you need a conditional behaviour to beat a later default.

<a name="setup-chaining"></a>

### Chaining with `.and.then`

```typescript
bob.setup.greet
  .toReturn('alice')
  .twice()
  .and.then
  .toReturn('sally')

bob.greet() // 'alice'
bob.greet() // 'alice'
bob.greet() // 'sally'
```

<a name="setup-fallback"></a>

### `fallback()`

Clear all configured behaviors, revert to the original implementation (or `undefined` for pure stubs).

```typescript
bob.setup.greet.toReturn('mocked')
bob.greet('x') // 'mocked'
bob.setup.greet.fallback()
bob.greet('x') // original value
```

---

<a name="matchers"></a>

## Argument matchers (`match.*`)

Composable, brand-tagged matchers that work in `setup.when()`, `expect.*.withArg()`, `expect.*.withArgs()`, `expect.*.matchExactly()`, `expect.*.invocation(i).withArg()`, `withReturn()`, `threw()`, and inside nested objects.

```typescript
import { match } from 'deride'

// Type matchers
match.any / match.defined / match.nullish
match.string / match.number / match.boolean / match.bigint / match.symbol
match.array / match.object / match.function

// Structure
match.instanceOf(Ctor)
match.objectContaining({ id: 1, tag: match.string })
match.arrayContaining([1, match.number])
match.exact({ a: 1 })   // strict deep equal, rejects extra keys

// Comparators
match.gt(n) / match.gte(n) / match.lt(n) / match.lte(n)
match.between(low, high)   // inclusive

// Strings
match.regex(/pattern/)
match.startsWith('pre') / match.endsWith('post') / match.includes('mid')

// Logic
match.not(m)
match.allOf(a, b, c)       // every matcher must pass
match.oneOf(a, b)          // at least one
match.anyOf(v1, v2, v3)    // equality OR matcher match against each

// Escape hatch
match.where((v) => /* custom predicate */)
```

Usage examples:

```typescript
// In setup — conditional dispatch
mock.setup.fetch.when(match.string).toResolveWith('str')
mock.setup.fetch.when(match.objectContaining({ id: 1 })).toResolveWith(payload)

// In expectations — verification
mock.expect.fetch.called.withArg(match.string)
mock.expect.fetch.called.withArgs(match.string, match.number)
mock.expect.fetch.called.matchExactly(match.any, match.instanceOf(Error))

// In nested structures
mock.expect.save.called.withArg({ id: match.number, name: match.string })
```

---

## Expectations

<a name="called-counts"></a>

### Call counts

```typescript
bob.expect.greet.called.times(2)
bob.expect.greet.called.once()
bob.expect.greet.called.twice()
bob.expect.greet.called.never()
```

<a name="called-comparisons"></a>

### `lt(n)` / `lte(n)` / `gt(n)` / `gte(n)`

```typescript
bob.expect.greet.called.gt(2)
bob.expect.greet.called.gte(3)
bob.expect.greet.called.lt(4)
bob.expect.greet.called.lte(3)
```

<a name="called-witharg"></a>

### `called.withArg(arg)`

Partial deep match across all recorded calls (matcher-aware):

```typescript
bob.greet('alice', { name: 'bob', a: 1 })
bob.expect.greet.called.withArg({ name: 'bob' })
bob.expect.greet.called.withArg(match.string)
```

<a name="called-withargs"></a>

### `called.withArgs(...args)`

All provided args must appear in a single invocation:

```typescript
bob.greet('alice', 'bob')
bob.expect.greet.called.withArgs('alice', 'bob')
```

<a name="called-withmatch"></a>

### `called.withMatch(regex)`

```typescript
bob.greet('The quick brown fox')
bob.expect.greet.called.withMatch(/quick.*fox/)
```

<a name="called-matchexactly"></a>

### `called.matchExactly(...args)`

Strict deep equality of **every** argument (matcher-aware):

```typescript
bob.greet('alice', ['carol'], 123)
bob.expect.greet.called.matchExactly('alice', ['carol'], 123)
bob.expect.greet.called.matchExactly(match.string, match.array, match.number)
```

<a name="called-withreturn"></a>

### `called.withReturn(expected)`

Assert at least one recorded call returned `expected` (value or matcher):

```typescript
mock.setup.sum.toReturn(42)
mock.sum(1, 2)
mock.expect.sum.called.withReturn(42)
mock.expect.sum.called.withReturn(match.gte(40))
```

<a name="called-calledon"></a>

### `called.calledOn(target)`

Identity check on `this` for at least one call:

```typescript
const target = { tag: 'x' }
fn.call(target, 1)
fn.expect.called.calledOn(target)
```

<a name="called-threw"></a>

### `called.threw(expected?)`

Assert at least one call threw. `expected` can be:

- Omitted — any throw passes
- A string — matches `Error.message`
- An `Error` class — sugar for `match.instanceOf(ErrorClass)`
- A matcher (e.g. `match.objectContaining({ code: 1 })` for non-Error throws)

```typescript
mock.setup.fail.toThrow('bang')
try { mock.fail() } catch {}
mock.expect.fail.called.threw('bang')
mock.expect.fail.called.threw(Error)
mock.expect.fail.called.threw(match.instanceOf(Error))
```

<a name="every-call"></a>

### `everyCall.*`

Mirrors `called.*` but asserts every recorded call matches (not just one). Throws if the method was never called (no vacuous-true):

```typescript
bob.greet('a')
bob.greet('b')
bob.expect.greet.everyCall.withArg(match.string)
bob.expect.greet.everyCall.matchExactly(match.string)
bob.expect.greet.everyCall.withReturn(match.string)
```

<a name="invocation"></a>

### `invocation(i)`

Access a specific invocation by zero-based index:

```typescript
bob.greet('first')
bob.greet('second', 'extra')
bob.expect.greet.invocation(0).withArg('first')
bob.expect.greet.invocation(1).withArgs('second', 'extra')
```

<a name="called-not"></a>

### `called.not.*`

Every positive assertion has a negated form:

```typescript
bob.greet('alice')
bob.expect.greet.called.not.never()
bob.expect.greet.called.not.withArg('bob')
bob.expect.greet.called.not.withReturn('goodbye')
bob.expect.greet.called.not.threw()
```

<a name="called-reset"></a>

### `called.reset()` / `obj.called.reset()`

Clear recorded calls (per method or for all methods).

<a name="called-reset-all"></a>

---

<a name="spy-inspection"></a>

## Spy inspection

Every method also exposes a read-only `spy` surface alongside `setup` / `expect`:

```typescript
mock.spy.greet.callCount      // number
mock.spy.greet.calls          // readonly CallRecord[]
mock.spy.greet.firstCall      // CallRecord | undefined
mock.spy.greet.lastCall       // CallRecord | undefined
```

Each `CallRecord` contains `args`, `returned`, `threw`, `thisArg`, `timestamp`, and `sequence`.

### When to use `spy` vs `expect`

**`expect` asserts. `spy` reads.** They overlap for simple "was this called with X?" questions — both `mock.expect.greet.called.withArg('x')` and `mock.spy.greet.calledWith('x')` inspect the same call history — but their contracts differ and so do their use cases.

| Task | Reach for |
|------|-----------|
| Assert a call happened in a test | `expect` — throws on mismatch, test fails |
| Branch on whether a call happened | `spy` — returns a boolean you can `if` on |
| Feed a return value into the next setup | `spy.lastCall.returned` — `expect` can only assert, not hand back the value |
| Inspect `this` or a non-`Error` thrown value | `spy.lastCall.thisArg` / `.threw` — the data, not just a pass/fail |
| Await a captured Promise (e.g. from `toResolveWith`) | `await mock.spy.fetch.lastCall.returned` |
| Snapshot the call log | `expect(mock.spy.greet.serialize()).toMatchSnapshot()` |
| Print the call log while debugging a flaky test | `console.log(mock.spy.greet.printHistory())` |
| Write a custom assertion helper | `spy.calls.some(...)` is clean; wrapping throwing `expect`s is not |
| Build a framework integration | `deride/vitest` / `deride/jest` are built on `spy` — they need structured data to hand to the host matcher |

Rule of thumb: if you're writing `try { mock.expect.X.called... } catch { ... }` you want `spy` instead. If you're writing `assert(mock.spy.X.calledWith(...))` you want `expect` instead.

<a name="spy-calledwith"></a>

### `spy.method.calledWith(...)` — non-throwing boolean

Same matching semantics as `expect.withArgs`, but returns a boolean instead of throwing:

```typescript
if (mock.spy.greet.calledWith('alice')) { /* ... */ }
```

<a name="spy-printhistory"></a>

### `spy.method.printHistory()`

Human-readable dump for debugging:

```typescript
console.log(mock.spy.greet.printHistory())
// greet: 2 call(s)
//   #0 greet('alice') -> 'hello alice'
//   #1 greet('bob')   -> 'hello bob'
```

<a name="spy-serialize"></a>

### `spy.method.serialize()`

Stable snapshot-friendly output — keys sorted, timestamps omitted, circular refs as `[Circular]`, functions as `[Function: name]`:

```typescript
expect(mock.spy.greet.serialize()).toMatchSnapshot()
```

---

<a name="inorder"></a>

## `inOrder(...spies)` — cross-mock ordering

Assert that the first call of each spy happened in the listed order:

```typescript
import { inOrder } from 'deride'

inOrder(mockDb.spy.connect, mockDb.spy.query, mockLogger.spy.info)
```

To order specific invocations rather than first-of-each, use `inOrder.at`:

```typescript
inOrder(inOrder.at(db.spy.query, 0), inOrder.at(db.spy.query, 1))
```

Strict variant rejects interleaved extra calls on any listed spy:

```typescript
inOrder.strict(db.spy.connect, db.spy.query)
```

---

<a name="snapshot-restore"></a>

## Snapshot / restore

Capture a mock's full state (behaviours + call history) and restore later:

```typescript
const snap = bob.snapshot()
bob.setup.greet.toReturn('temporarily different')
bob.greet('x')
bob.restore(snap)
// Behaviours and call history are back to what they were at snapshot()
```

Nested snapshots jump arbitrarily far back in time.

---

<a name="vitest-integration"></a>

## `deride/vitest` — vitest matcher sugar

```typescript
import 'deride/vitest'

const mock = stub<Db>(['query'])
mock.query('select')

expect(mock.spy.query).toHaveBeenCalled()
expect(mock.spy.query).toHaveBeenCalledTimes(1)
expect(mock.spy.query).toHaveBeenCalledOnce()
expect(mock.spy.query).toHaveBeenCalledWith('select')
expect(mock.spy.query).toHaveBeenLastCalledWith('select')
expect(mock.spy.query).toHaveBeenNthCalledWith(1, 'select')

// Works on MockedFunction proxies directly:
const fn = func<(x: number) => number>()
fn(5)
expect(fn).toHaveBeenCalledOnce()
```

<a name="jest-integration"></a>

## `deride/jest` — jest matcher sugar

Same matchers, registered via jest's `expect.extend`:

```typescript
import 'deride/jest'
```

<a name="clock-integration"></a>

## `deride/clock` — fake timers

Lightweight, dependency-free clock. Pairs well with `toResolveAfter` / `toHang` when you don't want to pull in `vi.useFakeTimers()` or sinon's fake timers.

```typescript
import { useFakeTimers } from 'deride/clock'

const clock = useFakeTimers()
setTimeout(() => console.log('later'), 100)
clock.tick(100)   // 'later' fires now
clock.runAll()    // drain any pending timers
clock.flushMicrotasks()
clock.restore()
```

For richer behaviour (ordering-sensitive microtasks, `performance.now`, `setImmediate`), use `vi.useFakeTimers()` or `@sinonjs/fake-timers` instead.

---

## Usage patterns

### Constructor / parameter injection

```typescript
class UserService {
  constructor(private db: Database) {}
  async getAll() { return this.db.query('SELECT * FROM users') }
}

const mockDb = deride.stub<Database>(['query'])
mockDb.setup.query.toResolveWith([{ id: 1, name: 'alice' }])
const service = new UserService(mockDb)
await service.getAll()
mockDb.expect.query.called.once()
```

### Module mocking

Works with whatever your test runner provides:

```typescript
// Vitest
import { vi } from 'vitest'
const mockDb = deride.stub<Database>(['query'])
vi.mock('./database', () => ({ db: mockDb }))
```

```typescript
// Jest
const mockDb = deride.stub<Database>(['query'])
jest.mock('./database', () => ({ db: mockDb }))
```

```typescript
// Node test runner
import { mock } from 'node:test'
mock.module('./database', () => ({
  db: deride.stub<Database>(['query']),
}))
```

---

<a name="type-safe-setup"></a>

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

### Type-safe setup

Setup methods are constrained to the method's return type:

```typescript
service.setup.fetch.toResolveWith('valid string')  // OK
service.setup.fetch.toResolveWith(123)             // Type error!
```

To intentionally return an invalid type (e.g. testing error paths), cast with `as any`:

```typescript
service.setup.fetch.toResolveWith(null as any)
```

---

## Contributing

```bash
pnpm lint         # eslint (src + tests)
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest (watch mode)
pnpm build        # tsup (cjs + esm + types)
```

## License

Copyright (c) 2014 Andrew Rea
Copyright (c) 2014 James Allen

Licensed under the MIT license.
