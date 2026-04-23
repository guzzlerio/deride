# Common mistakes

Anti-patterns agents tend to produce, and the correct shape. Each entry shows the **wrong** version first (the thing we see in the wild) and then the **right** version, with a short note on why.

## 1. Mixing deride with `vi.spyOn` / `jest.spyOn`

**❌ Wrong**

```typescript
const spy = vi.spyOn(realDb, 'query').mockResolvedValue([])
// ... then trying to use deride on the same object ...
realDb.expect.query.called.once()  // TypeError: realDb.expect is undefined
```

**✅ Right**

```typescript
const mockDb = wrap(realDb)
mockDb.setup.query.toResolveWith([])
await mockDb.query('…')
mockDb.expect.query.called.once()
```

**Why:** pick one mocking tool per object. `vi.spyOn` monkey-patches the real object; deride composes a new object. Don't mix.

## 2. Mutating `spy.calls[i].args` and expecting it to stick

**❌ Wrong**

```typescript
mock.spy.greet.calls[0].args[0] = 'hacked'     // pointless — calls are immutable records
mock.greet()                                    // does nothing different
```

**✅ Right**

`spy.calls` is a read-only log. If you want the mock to return a different value, configure it via `setup.*`:

```typescript
mock.setup.greet.when('hacked').toReturn(…)
```

**Why:** `spy` is the **inspection** surface — it records what happened, it doesn't drive what happens next.

## 3. Awaiting `expect.*` calls

**❌ Wrong**

```typescript
await mock.expect.fetch.called.withReturn({ id: 1 })   // returns undefined; await is a no-op
```

**✅ Right**

`expect.*` assertions are **synchronous** and return `void`. Don't `await` them.

```typescript
mock.expect.fetch.called.withReturn({ id: 1 })
```

If you specifically need to await a captured Promise to check its settled value, use `spy`:

```typescript
mock.setup.fetch.toResolveWith({ id: 1 })
mock.fetch('/x')
const promise = mock.spy.fetch.lastCall!.returned as Promise<{ id: number }>
await expect(promise).resolves.toEqual({ id: 1 })
```

## 4. Using `@ts-ignore` or `@ts-expect-error` for intentional type escape hatches

**❌ Wrong**

```typescript
// @ts-ignore
mock.setup.fetch.toResolveWith(null)   // suppresses the type error with no visible marker
```

**✅ Right**

```typescript
mock.setup.fetch.toResolveWith(null as any)   // or: as unknown as string
```

**Why:** deride's idiomatic escape hatch is the `as any` / `as unknown as T` cast. It's grep-able, localised to the one call, and doesn't suppress *other* errors on the same line. `@ts-ignore` is too broad.

## 5. Expecting `toReturn` to match TypeScript-narrowed types

**❌ Wrong**

```typescript
interface Svc {
  get(): Promise<string>
}

const mock = stub<Svc>(['get'])
mock.setup.get.toReturn('value')   // type error — get returns Promise<string>, not string
```

**✅ Right**

Use `toResolveWith` for Promise-returning methods — it unwraps the resolved type for you:

```typescript
mock.setup.get.toResolveWith('value')   // ✓ expects string (unwrapped from Promise<string>)
```

**Why:** `toReturn` takes the raw method return type. For `Promise<T>`-returning methods, `toResolveWith` takes `T`.

## 6. Using `toReturn` when the method expects a Promise rejection

**❌ Wrong**

```typescript
mock.setup.fetch.toReturn(Promise.reject(new Error('x')))   // creates an unhandled rejection
```

**✅ Right**

```typescript
mock.setup.fetch.toRejectWith(new Error('x'))
```

**Why:** `toRejectWith` constructs the rejection internally when the method is invoked, so there's no unhandled-rejection window.

## 7. Forgetting the dispatch rule — later unlimited wins

**❌ Wrong**

```typescript
mock.setup.x.when('admin').toReturn('hi admin')   // registered FIRST
mock.setup.x.toReturn('default')                   // registered LAST — this wins

mock.x('admin')   // returns 'default' (!), not 'hi admin'
```

**✅ Right**

Time-limit the conditional behaviour so it beats the later default:

```typescript
mock.setup.x.when('admin').toReturn('hi admin').once()   // consumed first
mock.setup.x.toReturn('default')                          // fallback after
```

**Why:** the dispatch rule is "time-limited first (FIFO), then last unlimited wins." Registering a general default AFTER a specific `when(...)` shadows the `when`. See [Philosophy](/guide/philosophy#the-dispatch-rule).

## 8. Constructing `new MockedClass()` in the test without substituting the real import

**❌ Wrong**

```typescript
const MockedDb = stub.class(Database)
const service = new UserService()   // UserService internally does `new Database(conn)` — uses the REAL class
MockedDb.expect.constructor.called.once()   // fails — the real constructor ran
```

**✅ Right**

`stub.class` gives you a mock *constructor*, but your code imports the real one. Substitute at the module boundary:

```typescript
const MockedDb = stub.class(Database)

vi.mock('./database', () => ({ Database: MockedDb }))
// or jest.mock / mock.module for your runner

const service = new UserService()   // now uses MockedDb
MockedDb.expect.constructor.called.once()   // ✓
```

**Why:** `stub.class` is a **drop-in replacement**, but you still need to drop it in.

## 9. `withArg` with a deep-nested matcher that doesn't recurse

**❌ Wrong assumption**

```typescript
mock.x([{ id: 1, nested: { code: 'ok' } }])
mock.expect.x.called.withArg([match.objectContaining({ nested: match.objectContaining({ code: 'ok' }) })])
// THIS works — matchers nest
```

But sometimes agents write:

```typescript
mock.expect.x.called.withArg([{ nested: { code: 'ok' } }])   // deep-equal comparison, no matchers
```

**Both work** — deride's `hasMatch` does deep equality for non-matcher leaves. The pitfall is expecting matchers to *implicitly* appear in nested structures when you used a literal.

**Rule:** if you want matcher behaviour at depth, spell it out. If you want exact equality at depth, pass literals.

## 10. Squash-merging a release PR

**❌ Wrong**

Clicking "Squash and merge" on a `develop` → `master` PR titled `release: v2.1`. The squash collapses every `feat:` / `fix:` into a single commit whose message is the PR title. `release:` isn't a conventional-commit type the release rules recognise → semantic-release says "no release" → nothing publishes.

**✅ Right**

Use **"Create a merge commit"** or **"Rebase and merge"**. Both preserve the individual conventional commits so semantic-release can compute the correct version.

**Why:** semantic-release reads the conventional-commit types from each commit since the last tag. Squash loses them unless you rename the squash commit to a conventional type at merge time.

## 11. Running `deride/vitest` or `deride/jest` without loading them via `setupFiles`

**❌ Wrong**

```typescript
// vitest.config.ts
export default defineConfig({ test: {} })   // nothing imports deride/vitest

// my.test.ts
expect(mock.spy.greet).toHaveBeenCalledOnce()   // matcher not registered — fails with "unknown matcher"
```

**✅ Right**

```typescript
// vitest.setup.ts
import 'deride/vitest'

// vitest.config.ts
export default defineConfig({
  test: { setupFiles: ['./vitest.setup.ts'] }
})
```

**Why:** `deride/vitest` registers matchers via `expect.extend(...)` as a side effect at module load. The matchers live on whatever `expect` was in scope when the import ran. Loading it via `setupFiles` ensures they're available in every test.

## 12. Fighting `toResolveWith` when the inferred return type is `void`

**❌ Wrong**

Heavily overloaded methods (most notably AWS SDK clients) sometimes resolve their return type to `void` instead of the response type. `toResolveWith` then rejects any non-void value:

```typescript
import { SSMClient } from '@aws-sdk/client-ssm'
const mockClient = stub<SSMClient>(['send'])

// TS2345: ... is not assignable to parameter of type 'void'
mockClient.setup.send.toResolveWith({ Parameter: { Value: 'x' } })
```

Don't suppress with `@ts-expect-error` or rewrite to a `SimplifiedClient` interface that throws away type safety on the rest of the surface.

**✅ Right**

`toResolveWith` widens to `unknown` when the inferred return is exactly `void`, so the call above type-checks as-is. To pin the resolved value type explicitly (recommended when you care about test-time intent), pass it as an explicit type parameter:

```typescript
import type { GetParameterCommandOutput } from '@aws-sdk/client-ssm'

mockClient.setup.send.toResolveWith<GetParameterCommandOutput>({
  Parameter: { Value: 'x' },
})
```

The same escape hatch is available on `toResolveAfter<T>(ms, value)` and `toResolveInOrder<T>(...values)`.

**Why:** an overload set with no matching signature collapses to the fallback (`void`) at the type level even though the runtime call resolves to a real response. The widening only triggers on exact `void` — `Promise<T>` methods still strictly check against `T`.

## 13. Forgetting `restoreActiveClock` in `afterEach`

**❌ Wrong**

```typescript
it('does timing stuff', () => {
  const clock = useFakeTimers()
  clock.runAll()   // throws if setInterval loops — restore() never runs
})
it('next test', () => {
  // Date.now is still frozen, setTimeout is still fake
})
```

**✅ Right**

```typescript
import { afterEach } from 'vitest'
import { isFakeTimersActive, restoreActiveClock, useFakeTimers } from 'deride/clock'

afterEach(() => {
  if (isFakeTimersActive()) restoreActiveClock()
})

it('does timing stuff', () => {
  const clock = useFakeTimers()
  clock.runAll()   // even if this throws, afterEach restores
})
```

**Why:** `useFakeTimers()` patches global `Date.now` / `setTimeout` / `setInterval` / `queueMicrotask`. `runAll()` *can* throw (bounded at 10,000 iterations to catch runaway intervals), and that throw escapes before `restore()` would run. The `afterEach` guard catches all of these cases.
