# Argument matchers

deride's `match.*` namespace gives you composable, brand-tagged predicates that work in **every** place a value can appear:

- `setup.method.when(...)` — gating behaviour
- `expect.method.called.withArg(...)` — assertions
- `expect.method.called.withArgs(...)` — positional assertions
- `expect.method.called.matchExactly(...)` — strict deep-equal assertions
- `expect.method.invocation(i).withArg(...)` — per-call assertions
- `expect.method.called.withReturn(...)` — return-value assertions
- `expect.method.called.threw(...)` — thrown-value assertions
- **Nested inside objects and arrays** at any depth

```typescript
import { match } from 'deride'
```

## Type matchers

| Matcher | Passes when |
|---------|-------------|
| `match.any` | Anything, including `null` and `undefined` |
| `match.defined` | Not `undefined` (but `null` passes) |
| `match.nullish` | `null` or `undefined` only |
| `match.string` | `typeof value === 'string'` |
| `match.number` | `typeof value === 'number'` (including `NaN`) |
| `match.boolean` | `typeof value === 'boolean'` |
| `match.bigint` | `typeof value === 'bigint'` |
| `match.symbol` | `typeof value === 'symbol'` |
| `match.function` | `typeof value === 'function'` |
| `match.array` | `Array.isArray(value)` |
| `match.object` | non-null non-array object |

```typescript
mock.setup.log.when(match.string).toReturn(undefined)
mock.expect.log.called.withArg(match.string)
```

## Structural matchers

### `match.instanceOf(Ctor)`

```typescript
class Animal {}
class Dog extends Animal {}

mock.expect.handle.called.withArg(match.instanceOf(Animal))  // matches Dog too
```

### `match.objectContaining(partial)`

Partial deep match — the value must have each listed key with a matching value. Extra keys are allowed. Nested matchers work:

```typescript
mock.expect.save.called.withArg(
  match.objectContaining({ id: match.number, name: match.string })
)
```

Distinguishes `{ x: undefined }` from `{}`:

```typescript
match.objectContaining({ x: undefined }).test({})            // false
match.objectContaining({ x: undefined }).test({ x: undefined }) // true
```

### `match.arrayContaining(items)`

Every listed item must appear somewhere in the array (any order):

```typescript
match.arrayContaining([1, 2]).test([1, 2, 3])   // true
match.arrayContaining([4]).test([1, 2, 3])       // false
```

Works with nested matchers:

```typescript
match.arrayContaining([match.objectContaining({ id: 1 })]).test([
  { id: 1, name: 'alice' },
  { id: 2 }
])   // true
```

### `match.exact(value)`

Strict deep equality — extra keys cause failure:

```typescript
match.exact({ a: 1 }).test({ a: 1 })         // true
match.exact({ a: 1 }).test({ a: 1, b: 2 })   // false — extra key
```

## Comparators

For numbers and bigints (mixed types reject):

```typescript
match.gt(5)              // > 5
match.gte(5)             // >= 5
match.lt(5)              // < 5
match.lte(5)             // <= 5
match.between(1, 10)     // 1 <= x <= 10 (inclusive at both bounds)
```

`NaN` never passes a comparator.

```typescript
match.gt(5).test(6)      // true
match.gte(5n).test(5n)   // true (bigint)
match.gt(5n).test(6)     // false (mixed)
match.between(0, 10).test(NaN)  // false
```

## String matchers

All reject non-string inputs — no coercion:

```typescript
match.regex(/foo/)                 // regex test, lastIndex reset for /g and /y
match.startsWith('foo')            // value.startsWith(...)
match.endsWith('bar')              // value.endsWith(...)
match.includes('mid')              // value.includes(...)
```

```typescript
mock.expect.log.called.withArg(match.startsWith('[ERROR]'))
```

## Logic combinators

### `match.not(m)`

```typescript
match.not(match.nullish).test(null)   // false
match.not(match.nullish).test(0)      // true
```

### `match.allOf(...matchers)`

Every matcher must pass:

```typescript
match.allOf(match.string, match.startsWith('a')).test('abc')   // true
match.allOf(match.string, match.startsWith('a')).test('bc')    // false
```

Empty list is **vacuously true** — `match.allOf().test(anything)` returns `true`. Watch for spreading an empty array by mistake.

### `match.oneOf(...matchers)`

At least one matcher must pass:

```typescript
match.oneOf(match.string, match.number).test(1)       // true
match.oneOf(match.string, match.number).test(true)    // false
```

Empty list is **vacuously false**.

### `match.anyOf(...values)`

Equality OR matcher-match against each value:

```typescript
match.anyOf(1, 2, 3).test(2)                      // true
match.anyOf(1, 2, 3).test(4)                      // false
match.anyOf('admin', 'root', match.regex(/sys/)).test('system')   // true
```

## Escape hatch — `match.where`

For one-off predicates:

```typescript
match.where<number>(n => n > 100 && n % 2 === 0)
```

A thrown predicate is caught and treated as a non-match:

```typescript
match.where(() => { throw new Error('x') }).test(undefined)   // false
```

Optional description for readable failure messages:

```typescript
match.where<User>(u => u.roles.includes('admin'), 'user with admin role')
```

## Composition

Matchers nest arbitrarily. This works anywhere:

```typescript
mock.setup.save.when(
  match.objectContaining({
    user: match.objectContaining({
      email: match.regex(/@corp\.com$/),
      roles: match.arrayContaining(['admin']),
    }),
    timestamp: match.gte(Date.now() - 60_000),
  })
).toResolve()
```

## Writing your own matcher

Matchers are just objects with a brand symbol, a description, and a `test` function. The easiest way to produce one is `match.where(predicate, description)`. For deeper customisation:

```typescript
import { isMatcher, MATCHER_BRAND, type Matcher } from 'deride'

function isUUID(): Matcher<unknown> {
  return {
    [MATCHER_BRAND]: true,
    description: 'UUID v4',
    test: (v: unknown) =>
      typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v),
  }
}

mock.expect.create.called.withArg(match.objectContaining({ id: isUUID() }))
```

`isMatcher(v)` type-guards any value as a matcher.

## Summary table

| Category | Members |
|----------|---------|
| Types | `any`, `defined`, `nullish`, `string`, `number`, `boolean`, `bigint`, `symbol`, `function`, `array`, `object` |
| Structure | `instanceOf(Ctor)`, `objectContaining(partial)`, `arrayContaining(items)`, `exact(value)` |
| Comparators | `gt`, `gte`, `lt`, `lte`, `between` |
| Strings | `regex`, `startsWith`, `endsWith`, `includes` |
| Logic | `not`, `allOf`, `oneOf`, `anyOf` |
| Escape | `where(predicate, description?)` |
