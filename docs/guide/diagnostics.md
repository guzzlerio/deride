# Diagnostics

When an assertion fails, you want to see **what actually happened** — not just that it didn't match. deride's failure messages include the full recorded call history, with indices.

## Failure message format

`withArg`, `withArgs`, `withReturn`, and every `everyCall.*` assertion produce output like this:

```
AssertionError [ERR_ASSERTION]: Expected greet to be called with: 'carol'
  actual calls:
  #0 ('alice')
  #1 ('bob')
  #2 (42, { deep: true })
```

Each call is numbered by invocation index so you can refer to it with `expect.greet.invocation(N)` if needed, and its arg list is rendered via `node:util`'s `inspect()` (depth 3, so nested objects stay readable).

## Zero-call case

If the method was never called, the message is explicit rather than a silent "no match found":

```
Expected greet to be called with: 'alice'
  (no calls recorded)
```

## When a throw happened

If a recorded call threw, the history shows it too:

```
greet: 2 call(s)
  #0 greet('alice') -> 'hello alice'
  #1 greet(42) -> threw Error: invalid input
```

This form is the output of `spy.method.printHistory()` — drop it into a `console.log` while debugging and you'll see every call plus its return or throw.

## Improving readability while debugging

If an assertion's standard message isn't enough, the `.spy` surface gives you multiple angles on the same data:

```typescript
// Full formatted history
console.log(mock.spy.greet.printHistory())

// Raw CallRecord array — structured, non-throwing
console.table(mock.spy.greet.calls.map(c => ({
  args: JSON.stringify(c.args),
  returned: c.returned,
  threw: c.threw,
})))

// Snapshot-serialise to a stable shape
console.log(JSON.stringify(mock.spy.greet.serialize(), null, 2))
```

## Snapshot testing the call log

For integration-style tests where exact call history is the assertion:

```typescript
expect(mock.spy.greet.serialize()).toMatchSnapshot()
```

`.serialize()` produces deterministic output: keys sorted alphabetically, no timestamps, circular refs rendered as `[Circular]`, functions as `[Function: name]`, Dates as ISO strings, Maps/Sets as tagged objects. Safe for snapshot diffs across CI runs.

## Node util inspect depth

Arguments are rendered with `inspect(arg, { depth: 3 })` — deep enough to show useful structure in a typical call, shallow enough not to dump a whole ORM graph. If you have a call with genuinely huge args and want more, use `.spy.greet.calls[i].args` directly to explore in a debugger.

## Colour and TTY detection

Failure messages don't apply ANSI colours — the output goes through Node's `assert` module and respects whatever the surrounding test runner does with its reporter. Vitest, jest, and `node:test` all colour-render their own error output from these messages.

## Tests that help future-you

A few habits that pay off:

1. **Prefer `withArg(match.*)` over raw values** when asserting on args that vary — the matcher's `description` field appears in failure messages, so `Expected save to be called with: objectContaining({ id: number })` is far more useful than a literal dump.
2. **Use `invocation(i)` for per-call assertions** when testing call sequences; the index in the message makes it obvious which call was the culprit.
3. **Drop `printHistory()` into a flake**; the output is copy-pasteable and the full history often reveals whether the call count or the args were the real mismatch.
4. **Snapshot-serialise the call log** for tests asserting on rich interaction patterns; a diff is clearer than N separate `expect(...)` statements.
