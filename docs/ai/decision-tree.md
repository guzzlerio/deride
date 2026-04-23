# Decision tree

Which API to reach for, by task. Tables, not prose. If your question isn't answered below, it's either not a common task or you need the full [Guide](/guide/introduction).

## "I want to mock X" → which factory?

| What you have | Factory | Example |
|---------------|---------|---------|
| A TypeScript interface or type, no instance | `stub<T>(['method1', 'method2'])` | `stub<Database>(['query'])` |
| An existing object instance | `stub(obj)` | `stub(new Logger())` |
| A class (want prototype methods auto-discovered) | `stub(MyClass)` | `stub(Greeter)` |
| A class (want static methods instead) | `stub(MyClass, undefined, { debug:{prefix:'deride',suffix:'stub'}, static:true })` | `stub(Greeter, undefined, {…, static:true})` |
| Code that does `new MyClass(...)` somewhere and you want to intercept | `stub.class(MyClass)` | `stub.class(Database)` |
| An existing object where **real methods should run by default** | `wrap(obj)` | `wrap(realLogger)` |
| An existing standalone function | `wrap(fn)` or `func(fn)` (identical) | `wrap(handler)` |
| A brand-new standalone function from scratch | `func<F>()` | `func<(x: number) => number>()` |

**Rules of thumb:**
- `stub` replaces, `wrap` preserves real behaviour until overridden.
- `stub.class` is only for `new`-call interception. If you control the call site, inject a `stub(...)` instance instead.
- Use `func()` when the dependency is **itself** a function (callback, handler, fetcher).

## "I want the method to return X" → which setup?

| Behaviour | Setup |
|-----------|-------|
| Return a fixed value | `.toReturn(value)` |
| Return the mock itself (fluent APIs) | `.toReturnSelf()` |
| Run custom logic with access to args | `.toDoThis((a, b) => …)` |
| Throw an Error(msg) | `.toThrow(message)` |
| Return a resolved Promise with a value | `.toResolveWith(value)` (use `.toResolveWith<T>(value)` if the method's return type collapses to `void` — see [common mistake #12](./common-mistakes#_12-fighting-toresolvewith-when-the-inferred-return-type-is-void)) |
| Return a resolved Promise with no value | `.toResolve()` |
| Return a rejected Promise | `.toRejectWith(error)` |
| Resolve after N ms (use with fake timers) | `.toResolveAfter(ms, value)` |
| Reject after N ms | `.toRejectAfter(ms, error)` |
| Return a Promise that never settles | `.toHang()` |
| Return each value in a sequence (sticky-last) | `.toReturnInOrder(a, b, c)` |
| Same for promises | `.toResolveInOrder(…)` / `.toRejectInOrder(…)` |
| Return a fresh sync iterator | `.toYield(1, 2, 3)` |
| Return a fresh async iterator | `.toAsyncYield(1, 2, 3)` |
| Async iterator that throws partway | `.toAsyncYieldThrow(err, v1, v2)` |
| Invoke the last callback argument | `.toCallbackWith(err, data)` |
| Emit an event on the wrapped object | `.toEmit(eventName, …args)` |
| Run a side-effect then run the real method | `.toIntercept((…args) => { … })` |
| Accelerate a callback-based timeout | `.toTimeWarp(ms)` |
| Clear all configured behaviours | `.fallback()` |

## "I want to gate a behaviour" → which modifier?

| Condition | Modifier (chain BEFORE the behaviour) |
|-----------|---------------------------------------|
| Only when first arg equals X | `.when(X)` |
| Only when first arg passes matcher | `.when(match.string)` |
| Only when multiple positional args match | `.when(match.string, match.number)` |
| Only when custom predicate on args returns true | `.when((args) => …)` |
| Only the next call | `.once()` |
| Only the next 2 calls | `.twice()` |
| Only the next N calls | `.times(n)` |

Chain multiple behaviours in sequence:

```typescript
mock.setup.greet
  .when('alice').toReturn('hi alice')
  .once()
  .and.then
  .toReturn('default')
```

## "I want to match an argument" → which matcher?

Import from `deride`: `import { match } from 'deride'`

| Assertion | Matcher |
|-----------|---------|
| Any value, including nullish | `match.any` |
| Not undefined (null OK) | `match.defined` |
| Exactly null or undefined | `match.nullish` |
| typeof string / number / boolean / bigint / symbol / function | `match.string` / `match.number` / etc. |
| Is an array | `match.array` |
| Is a plain object (non-null, non-array) | `match.object` |
| `instanceof` some class | `match.instanceOf(Ctor)` |
| Object containing these keys with these values (matcher-aware) | `match.objectContaining({ id: match.number })` |
| Array containing these items (any order) | `match.arrayContaining([1, 2])` |
| Strict deep equal, no extra keys | `match.exact(value)` |
| Number / bigint > < >= <= | `match.gt(n)` / `match.gte(n)` / `match.lt(n)` / `match.lte(n)` |
| Number / bigint in range, inclusive | `match.between(low, high)` |
| String matches regex | `match.regex(/pattern/)` |
| String starts/ends/includes | `match.startsWith(s)` / `match.endsWith(s)` / `match.includes(s)` |
| NOT matching m | `match.not(m)` |
| ALL of (m1, m2, …) | `match.allOf(m1, m2)` |
| AT LEAST ONE of matcher list | `match.oneOf(m1, m2)` |
| Equal to OR matches any of these values | `match.anyOf(v1, v2, …)` |
| Custom predicate, named | `match.where(v => …, 'description')` |

Matchers compose and nest — use them inside `objectContaining`, `arrayContaining`, `exact`, or anywhere a value goes.

## "I want to assert how it was called" → which expect?

| Question | Assertion |
|----------|-----------|
| Was it called exactly N times? | `.called.times(n)` / `.once()` / `.twice()` / `.never()` |
| Call count < / <= / > / >= N | `.called.lt(n)` / `.lte(n)` / `.gt(n)` / `.gte(n)` |
| Any call had this arg (partial deep match) | `.called.withArg(arg)` |
| Any call had these args (all present) | `.called.withArgs(a, b)` |
| Any call's args matched a regex (deep) | `.called.withMatch(/regex/)` |
| Any call had EXACTLY these args (strict deep equal) | `.called.matchExactly(a, b)` |
| Any call returned this value (or matcher) | `.called.withReturn(value)` |
| Any call was made on this `this` | `.called.calledOn(target)` |
| Any call threw (optional: Error message / class / matcher) | `.called.threw(expected?)` |
| The i-th call included this arg | `.invocation(i).withArg(arg)` |
| EVERY call matched (each of the above) | `.everyCall.withArg(…)` etc. |
| Negate any of the above | `.called.not.withArg(...)` |

**Decision rule:** if you want a test to fail when the assertion fails, use `expect.called.*`. If you want a boolean / data / to branch, use `spy.*`.

## "I want to read call history" → spy surface

| Need | Reach for |
|------|-----------|
| "Was it called with X?" as a boolean | `mock.spy.method.calledWith(x)` |
| Total call count | `mock.spy.method.callCount` |
| All recorded calls | `mock.spy.method.calls` |
| First / last recorded call | `mock.spy.method.firstCall` / `lastCall` |
| A captured return value | `mock.spy.method.lastCall?.returned` |
| A captured `this` binding | `mock.spy.method.lastCall?.thisArg` |
| A captured sync throw | `mock.spy.method.lastCall?.threw` |
| Pretty-print the full call log for debugging | `mock.spy.method.printHistory()` |
| Stable snapshot-friendly dump | `mock.spy.method.serialize()` |

For async return values, `lastCall.returned` is the Promise. `await` it to get the settled value.

## "I need to assert cross-mock ordering" → inOrder

| Need | Reach for |
|------|-----------|
| Assert spies fired in this order (first call of each) | `inOrder(a.spy.x, b.spy.y, c.spy.z)` |
| Order a specific invocation of a spy | `inOrder(inOrder.at(a.spy.x, 0), b.spy.y)` |
| Strict: no extra calls on listed spies between | `inOrder.strict(a.spy.x, b.spy.y)` |

## "I need test lifecycle helpers" → sandbox / snapshot

| Need | Reach for |
|------|-----------|
| Reset call history on every mock between tests | `sandbox().reset()` in `afterEach` |
| Full wipe (history + behaviours) | `sandbox().restore()` in `afterAll` |
| Save/restore a single mock's state mid-test | `mock.snapshot()` / `mock.restore(snap)` |
| Reset ONE mock's history | `mock.called.reset()` |

## "I need fake timers" → deride/clock

```typescript
import { useFakeTimers, isFakeTimersActive, restoreActiveClock } from 'deride/clock'
```

| Need | Reach for |
|------|-----------|
| Install fake Date / setTimeout / setInterval / queueMicrotask | `const clock = useFakeTimers()` |
| Advance time by N ms and fire due timers | `clock.tick(ms)` |
| Drain all pending timers | `clock.runAll()` (throws if setInterval would loop) |
| Drain microtasks | `clock.flushMicrotasks()` |
| Read captured callback errors | `clock.errors` |
| Restore native globals | `clock.restore()` |
| Safety net in `afterEach` | `if (isFakeTimersActive()) restoreActiveClock()` |

## "I need framework matchers" → deride/vitest or deride/jest

```typescript
import 'deride/vitest'   // or 'deride/jest' — side-effect import, registers matchers
```

| Matcher | Semantics |
|---------|-----------|
| `expect(mock.spy.x).toHaveBeenCalled()` | >= 1 call |
| `.toHaveBeenCalledTimes(n)` | exactly N |
| `.toHaveBeenCalledOnce()` | exactly 1 |
| `.toHaveBeenCalledWith(...args)` | any call's args match |
| `.toHaveBeenLastCalledWith(...args)` | last call's args match |
| `.toHaveBeenNthCalledWith(n, ...args)` | n is **1-indexed** |

Works on a `MethodSpy` (`mock.spy.greet`) or a `MockedFunction` proxy directly.
