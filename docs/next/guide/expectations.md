# Writing expectations

Every mocked method exposes an `.expect.<method>` handle with **three** branches:

| Branch | Meaning |
|--------|---------|
| `.called.*` | At-least-one assertions — "at least one call matched" |
| `.everyCall.*` | All-call assertions — "every recorded call matched" (throws on zero calls — no vacuous-true) |
| `.invocation(i)` | Per-call assertions — "the i-th call matched" |

All assertions **throw** on mismatch with a message that includes the full recorded call history. Framework-agnostic: any test runner that catches errors will report them as failures.

## Call counts

```typescript
mock.expect.greet.called.times(2)
mock.expect.greet.called.once()
mock.expect.greet.called.twice()
mock.expect.greet.called.never()
```

### Comparisons

```typescript
mock.expect.greet.called.lt(5)
mock.expect.greet.called.lte(4)
mock.expect.greet.called.gt(0)
mock.expect.greet.called.gte(1)
```

## Argument matching

### `withArg(arg)` — any invocation had this arg

Partial deep match, matcher-aware:

```typescript
mock.greet('alice', { name: 'bob', a: 1 })
mock.expect.greet.called.withArg({ name: 'bob' })     // partial object match
mock.expect.greet.called.withArg(match.string)         // matcher
```

### `withArgs(...args)` — all these args in one call

Every listed arg must appear in the same recorded call:

```typescript
mock.greet('alice', 'bob')
mock.expect.greet.called.withArgs('alice', 'bob')
```

### `withMatch(regex)` — regex search

Searches strings and nested object values for a regex match:

```typescript
mock.greet('The quick brown fox')
mock.expect.greet.called.withMatch(/quick.*fox/)

mock.greet({ message: 'hello world' })
mock.expect.greet.called.withMatch(/hello/)
```

### `matchExactly(...args)` — strict deep equal, matcher-aware

Unlike `withArgs`, this enforces **exact arg list** (same length, same order, deep-equal at every position):

```typescript
mock.greet('alice', ['carol'], 123)
mock.expect.greet.called.matchExactly('alice', ['carol'], 123)
mock.expect.greet.called.matchExactly(match.string, match.array, match.number)
```

## Return / this / throw

### `withReturn(expected)`

Assert at least one call returned `expected`. Works with values or matchers; for async methods the resolved value is NOT awaited — you're asserting against the literal return, which is the Promise:

```typescript
mock.setup.sum.toReturn(42)
mock.sum(1, 2)

mock.expect.sum.called.withReturn(42)
mock.expect.sum.called.withReturn(match.gte(40))
mock.expect.sum.called.withReturn(match.number)
```

`withReturn(undefined)` matches calls that returned `undefined`:

```typescript
mock.fire()
mock.expect.fire.called.withReturn(undefined)   // fire() returned nothing
```

### `calledOn(target)`

Identity-check the `this` binding for at least one call:

```typescript
const target = { tag: 'target' }
const fn = func<(x: number) => number>()
fn.call(target, 1)
fn.expect.called.calledOn(target)
```

### `threw(expected?)`

Assert at least one call threw. The argument can be:

- Omitted — any throw passes
- A `string` — matches `Error.message`
- An `Error` class — sugar for `match.instanceOf(ErrorClass)`
- A matcher — e.g. `match.objectContaining({ code: 1 })` for non-`Error` throws

```typescript
mock.setup.fail.toThrow('bang')
try { mock.fail() } catch {}

mock.expect.fail.called.threw()                                    // any
mock.expect.fail.called.threw('bang')                              // message
mock.expect.fail.called.threw(Error)                               // class
mock.expect.fail.called.threw(match.instanceOf(Error))             // matcher
mock.expect.fail.called.threw(match.objectContaining({ code: 1 })) // structural
```

## `everyCall.*` — all calls must match

Mirrors `called.*` but asserts **every** recorded call matches. Throws if the method was never called (no vacuous truths):

```typescript
mock.greet('a')
mock.greet('b')
mock.greet('c')

mock.expect.greet.everyCall.withArg(match.string)
mock.expect.greet.everyCall.matchExactly(match.string)
mock.expect.greet.everyCall.withReturn(match.string)
mock.expect.greet.everyCall.threw(SomeError)
```

If the method was never called:

```typescript
mock.expect.greet.everyCall.withArg('x')
// throws: Expected every call of greet but it was never called
```

Use `.called.never()` if you want the opposite assertion ("it must never have been called").

## `invocation(i)` — target a specific call

Zero-indexed. Returns a smaller API with just `withArg` / `withArgs`:

```typescript
mock.greet('first')
mock.greet('second', 'extra')

mock.expect.greet.invocation(0).withArg('first')
mock.expect.greet.invocation(1).withArg('second')
mock.expect.greet.invocation(1).withArgs('second', 'extra')
```

Out-of-range indexes throw immediately:

```typescript
mock.greet('only')
mock.expect.greet.invocation(1).withArg('nope')
// throws: invocation out of range
```

## Fluent chaining

Assertions can be chained fluently. Count assertions (`once`, `twice`, `times`, `lt`, `gt`, etc.) return an arg-assertion object, so you can follow a count check with argument or return checks:

```typescript
mock.greet('alice')
mock.expect.greet.called.once().withArg('alice')
mock.expect.greet.called.once().withReturn('hi')
```

Arg assertions chain with each other:

```typescript
mock.expect.greet.called.withArg('alice').withReturn('hi')
```

The type system prevents invalid chains — you cannot follow a count with another count:

```typescript
mock.expect.greet.called.once().twice()  // compile error
```

`never()` is terminal and returns `void` — nothing can follow it:

```typescript
mock.expect.greet.called.never()         // no chaining
```

## Negation — `.not.*`

Every positive `called.*` assertion has a `.not` counterpart at the `expect.method.not` level. It passes when the positive would have thrown:

```typescript
mock.greet('alice')

mock.expect.greet.not.called.never()              // it WAS called
mock.expect.greet.not.called.twice()              // it was called once, not twice
mock.expect.greet.not.called.withArg('bob')       // 'bob' was never passed
mock.expect.greet.not.called.withReturn('goodbye')
mock.expect.greet.not.called.threw()
```

Negated **arg** assertions chain with each other:

```typescript
mock.expect.greet.not.called.withArg('bob').withReturn('goodbye')
```

Negated **count** methods (`once()`, `twice()`, `times()`, `lt()`, `gt()`, etc.) are **terminal** — they return `void` and cannot be chained. This prevents confusing semantics where each link would be negated independently:

```typescript
// ✅ Two separate assertions — clear intent
mock.expect.greet.not.called.once()          // was not called exactly once
mock.expect.greet.called.withArg('alice')    // was called with alice

// ❌ Compile error — negated count is terminal
mock.expect.greet.not.called.once().withArg('alice')
```

::: warning Deprecated: `called.not`
The older `mock.expect.greet.called.not.*` form still works at runtime but is deprecated (planned removal in v3). Prefer `mock.expect.greet.not.called.*`.
:::

## Resetting

### Per-method

```typescript
mock.expect.greet.called.reset()   // clear only greet's history
```

### All methods at once

```typescript
mock.called.reset()                // clear history on every method of this mock
```

Reset leaves behaviours (from `setup`) intact. To wipe both behaviours and history, use `mock.restore(mock.snapshot())` at an earlier "clean" state, or see [Lifecycle](./lifecycle#snapshot-restore).

## Failure messages

Every failure includes the recorded call history. Example:

```
AssertionError [ERR_ASSERTION]: Expected greet to be called with: 'carol'
  actual calls:
  #0 ('alice')
  #1 ('bob')
  #2 (42, { deep: true })
```

This is true for `withArg`, `withArgs`, `withReturn`, and the `everyCall.*` variants. See [Diagnostics](./diagnostics) for more on improving failure output.
