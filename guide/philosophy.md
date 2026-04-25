# Philosophy

deride is built on one idea: **composition, not monkey-patching.** This page explains what that means, why it matters, and the two subtler design rules that fall out of it — the dispatch model, and the expect/spy split.

## Composition, not monkey-patching

Most JavaScript mocking libraries mutate the object you hand them. They swap a method on the real object for a spy wrapper, then rely on you (or their `afterEach`) to restore it later:

```typescript
// The monkey-patch approach — NOT what deride does
const spy = sinon.stub(database, 'query').returns(rows)
// database.query is now a different function
// ...
spy.restore()   // miss this, or throw mid-test, and the real database.query is broken forever
```

This has real failure modes:

1. **Frozen objects reject the mutation.** `Object.freeze(api); sinon.stub(api, 'method', ...)` throws.
2. **ES2015 classes with private fields** can't be patched at runtime.
3. **Forgotten `restore()` calls** leak state into other tests, producing order-dependent failures.
4. **Shared modules** — if two tests patch the same singleton, the order they run in matters.

deride takes the other path. `stub()`, `wrap()`, and `func()` all **build a fresh object** with the same shape as your dependency:

```typescript
const mockDb = deride.stub<Database>(['query'])
// mockDb is a brand new object — your real `database` module is untouched
```

You inject the mock where the real thing would go (constructor, factory arg, DI container). Nothing is mutated. No `restore()` is required because there's nothing to unwind.

## The dispatch rule

Once you configure multiple behaviours on the same method, deride has to pick which one runs. The rule is:

> **Time-limited behaviours first, in registration order (FIFO). When none match, the *last* unlimited behaviour wins.**

A "time-limited" behaviour is one bounded by `.once()`, `.twice()`, or `.times(n)`. Once it's been consumed, it's no longer eligible.

### Example

```typescript
mock.setup.greet.once().toReturn('first')       // time-limited (1)
mock.setup.greet.when('admin').toReturn('hi admin')  // unlimited (matches only 'admin')
mock.setup.greet.toReturn('default')            // unlimited (matches everything)

mock.greet('alice')   // → 'first'       (first time-limited behaviour consumed)
mock.greet('admin')   // → 'default'     (last unlimited wins; the 'admin' behaviour is shadowed)
mock.greet('alice')   // → 'default'     (last unlimited wins)
```

### Why "last unlimited wins"

Because it lets you override a general default with a more specific condition:

```typescript
mock.setup.greet.toReturn('default')
mock.setup.greet.when('admin').toReturn('hi admin')  // this wins for 'admin'
```

`when('admin')` is registered *after* `toReturn('default')`, so when both match, `when('admin')` wins. If you want the general default to override — set it up *last*.

### When the dispatch rule surprises you

If you want a `when(...)` to genuinely beat a later default, time-limit it:

```typescript
mock.setup.greet.when('admin').toReturn('hi admin').once()
mock.setup.greet.toReturn('default')

mock.greet('admin')   // → 'hi admin'   (time-limited wins on first call)
mock.greet('admin')   // → 'default'    (time-limited exhausted, last unlimited wins)
```

## The expect/spy split

deride has two parallel surfaces on every mock:

- **`expect.*`** — assertions. Throws on mismatch, returns `void`. Test-framework-agnostic.
- **`spy.*`** — reads. Returns data, never throws.

They overlap on simple "was this called with X?" questions, but their contracts are different on purpose.

### When to use `expect`

Any time you want a test to fail if a call didn't happen the way you expected:

```typescript
mock.expect.greet.called.once()
mock.expect.greet.called.withArg('alice')
```

Assertion failures produce useful messages that include the full call history (see [Diagnostics](/guide/diagnostics)).

### When to use `spy`

Any time you need the *data*:

- **Feed a captured return value forward**: `await mock.spy.fetch.lastCall.returned`
- **Branch on call history**: `if (mock.spy.db.calledWith('SELECT')) { … }`
- **Snapshot test the call log**: `expect(mock.spy.x.serialize()).toMatchSnapshot()`
- **Debug a failing test**: `console.log(mock.spy.x.printHistory())`
- **Build a custom assertion helper** on top of `.calls.some(...)` / `.every(...)`

See the [spy guide](/guide/spy) for the full contrast and examples.

### Rule of thumb

- If you're writing `try { mock.expect.X.called... } catch { ... }` → you want `spy`.
- If you're writing `assert(mock.spy.X.calledWith(...))` → you want `expect`.

## Why these design rules together?

1. **Composition** means your mock has no side effects on real code, so tests are order-independent and safe.
2. **Dispatch last-wins unlimited** means the setup DSL reads top-to-bottom like an override cascade: defaults first, specifics last.
3. **Expect throws, spy reads** means both concerns are first-class without ambiguity — no `.try.*` escape hatch, no overloaded methods with two meanings.

Every other feature in the library — matchers, sandbox, inOrder, snapshots — is built on these three rules.
