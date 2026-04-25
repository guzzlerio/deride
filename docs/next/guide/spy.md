# Spy inspection

Every mocked method has a `.spy` handle alongside `.setup` and `.expect`. The `spy` API is **read-only** and **never throws** — it gives you the call history as structured data to inspect, feed forward, or snapshot.

```typescript
mock.spy.greet.callCount       // number
mock.spy.greet.calls           // readonly CallRecord[]
mock.spy.greet.firstCall       // CallRecord | undefined
mock.spy.greet.lastCall        // CallRecord | undefined
mock.spy.greet.name            // the method name, e.g. "greet"
```

## `CallRecord`

Each entry in `calls` captures everything deride knows about the invocation:

```typescript
interface CallRecord {
  readonly args: readonly unknown[]     // cloned args at call time
  readonly returned?: unknown            // the value returned (Promise for async)
  readonly threw?: unknown               // synchronous throw, if any
  readonly thisArg?: unknown             // `this` binding
  readonly timestamp: number             // Date.now() at call time
  readonly sequence: number              // monotonic global sequence (powers inOrder)
}
```

All values are structurally-cloned at capture time, so later mutations of the original args don't rewrite history. Date/RegExp/Map/Set/typed arrays retain their type through cloning.

## `calledWith(...)` — non-throwing boolean

Same matching semantics as `expect.called.withArgs`, but returns a boolean instead of throwing:

```typescript
if (mock.spy.greet.calledWith('alice')) { /* do stuff */ }
```

Matcher-aware:

```typescript
if (mock.spy.greet.calledWith(match.string)) { … }
```

## `printHistory()`

A human-readable dump of every recorded call — great for `console.log` while debugging:

```typescript
console.log(mock.spy.greet.printHistory())
```

Output:

```
greet: 3 call(s)
  #0 greet('alice') -> 'hello alice'
  #1 greet('bob') -> 'hello bob'
  #2 greet(42) -> threw Error: invalid input
```

Shows the method name, arg list, and return value (or thrown error) for each call.

## `serialize()`

Stable snapshot-friendly output — keys sorted alphabetically, timestamps omitted, circular refs rendered as `[Circular]`, functions as `[Function: name]`:

```typescript
expect(mock.spy.greet.serialize()).toMatchSnapshot()
```

```typescript
{
  method: 'greet',
  calls: [
    { args: ['alice'], returned: 'hello alice' },
    { args: ['bob'], returned: 'hello bob' },
  ]
}
```

Rendering rules:

| Input | Output |
|-------|--------|
| `Date` | ISO 8601 string |
| `RegExp` | `/pattern/flags` |
| `Error` | `[Name: message]` |
| `Map` | `{ __type: 'Map', entries: [[k, v], …] }` |
| `Set` | `{ __type: 'Set', values: [v, …] }` |
| Typed array | `{ __type: 'Uint8Array', values: [n, …] }` |
| `BigInt` | `123n` suffix string |
| `Symbol` | `Symbol(desc)` |
| Function | `[Function: name]` |
| Circular ref | `[Circular]` |

## When to use `spy` vs `expect`

They overlap on simple "was this called?" questions, but their contracts differ and so do their use cases.

| Task | Reach for |
|------|-----------|
| Assert a call happened in a test | `expect` — throws on mismatch, test fails |
| Branch on whether a call happened | `spy` — returns a boolean you can `if` on |
| Feed a captured return value into the next setup | `spy.lastCall.returned` — `expect` can only assert, not hand back the value |
| Inspect `this` or a non-`Error` thrown value | `spy.lastCall.thisArg` / `.threw` — the data, not just pass/fail |
| Await a captured Promise (e.g. from `toResolveWith`) | `await mock.spy.fetch.lastCall.returned` |
| Snapshot the call log | `expect(mock.spy.greet.serialize()).toMatchSnapshot()` |
| Print the call log while debugging | `console.log(mock.spy.greet.printHistory())` |
| Write a custom assertion helper | `spy.calls.some(...)` is clean; wrapping throwing `expect`s is not |
| Build a framework integration | `deride/vitest` / `deride/jest` are built on `spy` |

**Rule of thumb:**

- Writing `try { mock.expect.X.called... } catch { ... }` → you want `spy` instead.
- Writing `assert(mock.spy.X.calledWith(...))` → you want `expect` instead.

## Concrete scenarios `expect` can't cover

### Awaiting a captured Promise

After `toResolveWith('x')` the mock records the Promise. To `await` the resolved value you need `spy`:

```typescript
mock.setup.fetch.toResolveWith({ data: 42 })
mock.fetch('/x')

const result = await mock.spy.fetch.lastCall.returned
// result === { data: 42 }
```

`expect.called.withReturn({ data: 42 })` asserts the value exists but can't hand it back for further manipulation.

### Custom assertion helpers

```typescript
function assertLoggedError(logger: Wrapped<Logger>, pattern: RegExp) {
  return logger.spy.error.calls.some(c =>
    c.args.some(a => typeof a === 'string' && pattern.test(a))
  )
}
```

Clean on top of `spy`. On top of `expect` you'd be catching exceptions and working against the assertion grain.

### Conditional test fixtures

```typescript
if (mock.spy.query.callCount > 0) {
  // seed the cache
}
```

### Debugging a flake

Drop one line into the failing test:

```typescript
console.log(mock.spy.greet.printHistory())
```

…and get the full call log in one copy-pasteable block. No debug flags, no re-run.

### Snapshot testing

```typescript
expect(mock.spy.greet.serialize()).toMatchSnapshot()
```

Only works because spy produces stable, structured data.

### Framework integration

`deride/vitest`'s `toHaveBeenCalledWith` reads from `spy.calls`, converts to a boolean, and lets vitest produce its own diff. Without a structured spy API the integrations couldn't exist without reaching into engine internals.

## Standalone mocked functions

`func()` proxies expose `spy` directly — no `.methodName` indirection:

```typescript
const fn = func<(x: number) => number>()
fn(5)
fn(10)

fn.spy.callCount        // 2
fn.spy.calls[0].args    // [5]
fn.spy.lastCall?.args   // [10]
```
