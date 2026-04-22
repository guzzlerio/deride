# `match`

Namespace of composable argument matchers. Usable everywhere a value can appear: `setup.when`, `expect.*.withArg`, `withArgs`, `matchExactly`, `withReturn`, `threw`, and nested inside objects/arrays at any depth.

```typescript
import { match, type Matcher, MATCHER_BRAND, isMatcher } from 'deride'
```

## Overview

A matcher is a brand-tagged object:

```typescript
interface Matcher<T = unknown> {
  readonly [MATCHER_BRAND]: true
  readonly description: string
  test(value: T): boolean
}
```

The brand (`Symbol.for('deride.matcher')`) is globally registered — matchers from different deride versions installed side-by-side in the same tree still recognise each other.

## Type matchers

```typescript
match.any         // Matcher<unknown>   — accepts everything
match.defined     // Matcher<unknown>   — rejects only undefined
match.nullish     // Matcher<unknown>   — only null and undefined
match.string      // Matcher<unknown>   — typeof === 'string'
match.number      // Matcher<unknown>   — typeof === 'number' (NaN passes)
match.boolean     // Matcher<unknown>   — typeof === 'boolean'
match.bigint      // Matcher<unknown>   — typeof === 'bigint'
match.symbol      // Matcher<unknown>   — typeof === 'symbol'
match.function    // Matcher<unknown>   — typeof === 'function'
match.array       // Matcher<unknown>   — Array.isArray
match.object      // Matcher<unknown>   — non-null non-array object
```

## Structural matchers

### `match.instanceOf(Ctor)`

```typescript
match.instanceOf<C>(ctor: C): Matcher<unknown>
```

Passes when `value instanceof Ctor`. Subclasses match too.

### `match.objectContaining(partial)`

```typescript
match.objectContaining<T extends object>(partial: T): Matcher<unknown>
```

Partial deep match — the value must contain every key from `partial` with a matching value. Extra keys allowed. Nested matchers work.

```typescript
match.objectContaining({ id: match.number, name: match.string })
```

### `match.arrayContaining(items)`

```typescript
match.arrayContaining<T>(items: T[]): Matcher<unknown>
```

Every item in `items` must appear somewhere in the candidate array. Nested matchers work.

### `match.exact(value)`

```typescript
match.exact<T>(value: T): Matcher<unknown>
```

Strict deep equal — extra keys or different types cause failure.

## Comparators

```typescript
match.gt <N extends number | bigint>(n: N): Matcher<number | bigint>
match.gte<N extends number | bigint>(n: N): Matcher<number | bigint>
match.lt <N extends number | bigint>(n: N): Matcher<number | bigint>
match.lte<N extends number | bigint>(n: N): Matcher<number | bigint>
match.between<N extends number | bigint>(low: N, high: N): Matcher<number | bigint>
```

Mixed number/bigint comparisons reject. `NaN` never passes.

## String matchers

```typescript
match.regex(pattern: RegExp): Matcher<string>     // resets lastIndex for /g and /y
match.startsWith(prefix: string): Matcher<string>
match.endsWith(suffix: string): Matcher<string>
match.includes(needle: string): Matcher<string>
```

All reject non-string inputs — no coercion.

## Logic combinators

### `match.not(m)`

```typescript
match.not<T>(m: Matcher<T>): Matcher<unknown>
```

### `match.allOf(...matchers)`

```typescript
match.allOf(...matchers: Matcher<unknown>[]): Matcher<unknown>
```

Every matcher must pass. **Empty list is vacuously true** — be careful with spread patterns.

### `match.oneOf(...matchers)`

```typescript
match.oneOf(...matchers: Matcher<unknown>[]): Matcher<unknown>
```

At least one matcher must pass. Empty list is vacuously false.

### `match.anyOf(...values)`

```typescript
match.anyOf(...values: unknown[]): Matcher<unknown>
```

Equality OR matcher-match against each listed value.

## Escape hatch

### `match.where(predicate, description?)`

```typescript
match.where<T>(predicate: (value: T) => boolean, description?: string): Matcher<T>
```

For one-off predicates. A thrown predicate is caught and treated as a non-match. Optional `description` appears in failure messages.

## Shape utilities

### `isMatcher(value)`

```typescript
isMatcher(value: unknown): value is Matcher
```

Type guard. Useful if you're writing custom helpers that should recognise matchers the same way deride does.

### `MATCHER_BRAND`

```typescript
const MATCHER_BRAND: unique symbol
```

The global symbol brand. Hand-written matchers can set `[MATCHER_BRAND]: true` to integrate with deride's matcher-aware comparisons:

```typescript
import { MATCHER_BRAND, type Matcher } from 'deride'

const isUUID: Matcher = {
  [MATCHER_BRAND]: true,
  description: 'UUID v4',
  test: (v) => typeof v === 'string' && /^[0-9a-f-]{36}$/.test(v),
}
```

## See also

- [Matchers guide](/guide/matchers) — detailed examples and composition patterns
