import { inspect, isDeepStrictEqual } from 'node:util'

export const MATCHER_BRAND: unique symbol = Symbol.for('deride.matcher')

export interface Matcher<T = unknown> {
  readonly [MATCHER_BRAND]: true
  readonly description: string
  test(value: T): boolean
}

export function isMatcher(value: unknown): value is Matcher {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { [MATCHER_BRAND]?: unknown })[MATCHER_BRAND] === true &&
    typeof (value as { test?: unknown }).test === 'function'
  )
}

function make<T>(description: string, test: (value: T) => boolean): Matcher<T> {
  return { [MATCHER_BRAND]: true, description, test } as Matcher<T>
}

function isPlainishObject(v: unknown): v is Record<PropertyKey, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Matcher-aware strict comparison. Used for matchExactly semantics and
 * inside nested structures where a matcher may appear at any depth.
 */
export function matchValue(actual: unknown, expected: unknown): boolean {
  if (isMatcher(expected)) return expected.test(actual)
  if (expected !== null && typeof expected === 'object') {
    if (actual === null || typeof actual !== 'object') return false
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual)) return false
      if (actual.length !== expected.length) return false
      return expected.every((v, i) => matchValue((actual as unknown[])[i], v))
    }
    if (Array.isArray(actual)) return false
    const expectedKeys = Reflect.ownKeys(expected)
    const actualKeys = Reflect.ownKeys(actual)
    if (expectedKeys.length !== actualKeys.length) return false
    for (const key of expectedKeys) {
      if (!matchValue((actual as Record<PropertyKey, unknown>)[key], (expected as Record<PropertyKey, unknown>)[key])) {
        return false
      }
    }
    return true
  }
  return isDeepStrictEqual(actual, expected)
}

export const match = {
  any: make<unknown>('any', () => true),
  defined: make<unknown>('defined', (v) => v !== undefined),
  nullish: make<unknown>('nullish', (v) => v === null || v === undefined),
  string: make<unknown>('string', (v) => typeof v === 'string'),
  number: make<unknown>('number', (v) => typeof v === 'number'),
  boolean: make<unknown>('boolean', (v) => typeof v === 'boolean'),
  bigint: make<unknown>('bigint', (v) => typeof v === 'bigint'),
  symbol: make<unknown>('symbol', (v) => typeof v === 'symbol'),
  function: make<unknown>('function', (v) => typeof v === 'function'),
  array: make<unknown>('array', (v) => Array.isArray(v)),
  object: make<unknown>('object', (v) => typeof v === 'object' && v !== null && !Array.isArray(v)),

  instanceOf<C extends new (...args: never[]) => unknown>(ctor: C): Matcher<unknown> {
    return make<unknown>(`instanceOf(${ctor.name || '<anon>'})`, (v) => v instanceof ctor)
  },

  objectContaining<T extends object>(partial: T): Matcher<unknown> {
    return make<unknown>(`objectContaining(${inspect(partial)})`, (v) => {
      if (!isPlainishObject(v)) return false
      for (const key of Reflect.ownKeys(partial)) {
        if (!Object.hasOwn(v as object, key)) return false
        if (!matchValue(v[key], (partial as Record<PropertyKey, unknown>)[key])) return false
      }
      return true
    })
  },

  arrayContaining<T>(items: T[]): Matcher<unknown> {
    return make<unknown>(`arrayContaining(${inspect(items)})`, (v) => {
      if (!Array.isArray(v)) return false
      return items.every((item) => v.some((actual) => matchValue(actual, item)))
    })
  },

  exact<T>(value: T): Matcher<unknown> {
    return make<unknown>(`exact(${inspect(value)})`, (v) => isDeepStrictEqual(v, value))
  },

  gt<N extends number | bigint>(n: N): Matcher<number | bigint> {
    return make<number | bigint>(`> ${String(n)}`, (v) => typeof v === typeof n && (v as N) > n)
  },
  gte<N extends number | bigint>(n: N): Matcher<number | bigint> {
    return make<number | bigint>(`>= ${String(n)}`, (v) => typeof v === typeof n && (v as N) >= n)
  },
  lt<N extends number | bigint>(n: N): Matcher<number | bigint> {
    return make<number | bigint>(`< ${String(n)}`, (v) => typeof v === typeof n && (v as N) < n)
  },
  lte<N extends number | bigint>(n: N): Matcher<number | bigint> {
    return make<number | bigint>(`<= ${String(n)}`, (v) => typeof v === typeof n && (v as N) <= n)
  },
  between<N extends number | bigint>(low: N, high: N): Matcher<number | bigint> {
    return make<number | bigint>(`between(${String(low)}, ${String(high)})`, (v) => {
      if (typeof v !== typeof low) return false
      if (typeof v === 'number' && Number.isNaN(v)) return false
      return (v as N) >= low && (v as N) <= high
    })
  },

  regex(pattern: RegExp): Matcher<string> {
    return make<string>(`regex(${pattern})`, (v) => {
      if (typeof v !== 'string') return false
      if (pattern.global || pattern.sticky) pattern.lastIndex = 0
      return pattern.test(v)
    })
  },
  startsWith(prefix: string): Matcher<string> {
    return make<string>(`startsWith(${JSON.stringify(prefix)})`, (v) => typeof v === 'string' && v.startsWith(prefix))
  },
  endsWith(suffix: string): Matcher<string> {
    return make<string>(`endsWith(${JSON.stringify(suffix)})`, (v) => typeof v === 'string' && v.endsWith(suffix))
  },
  includes(needle: string): Matcher<string> {
    return make<string>(`includes(${JSON.stringify(needle)})`, (v) => typeof v === 'string' && v.includes(needle))
  },

  not<T>(m: Matcher<T>): Matcher<unknown> {
    return make<unknown>(`not(${m.description})`, (v) => !m.test(v as T))
  },
  allOf(...matchers: Matcher<unknown>[]): Matcher<unknown> {
    const desc = matchers.length === 0 ? 'allOf()' : `allOf(${matchers.map((m) => m.description).join(', ')})`
    return make<unknown>(desc, (v) => matchers.every((m) => m.test(v)))
  },
  oneOf(...matchers: Matcher<unknown>[]): Matcher<unknown> {
    const desc = matchers.length === 0 ? 'oneOf()' : `oneOf(${matchers.map((m) => m.description).join(', ')})`
    return make<unknown>(desc, (v) => matchers.some((m) => m.test(v)))
  },
  anyOf(...values: unknown[]): Matcher<unknown> {
    return make<unknown>(`anyOf(${values.map((v) => inspect(v)).join(', ')})`, (v) =>
      values.some((expected) => matchValue(v, expected))
    )
  },

  where<T>(predicate: (value: T) => boolean, description = 'where(<predicate>)'): Matcher<T> {
    return make<T>(description, (v) => {
      try {
        return predicate(v)
      } catch {
        return false
      }
    })
  },
}

export type MatchNamespace = typeof match
