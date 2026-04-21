import { isMatcher } from './matchers.js'

/** Namespace prefix for all `debug(...)` loggers and default option values. */
export const PREFIX = 'deride'

/**
 * Copy each named function from `target` onto `source`, wrapping it so the
 * `this` binding stays pointing at `target`. Used by `wrap()` to bolt the
 * EventEmitter API onto a wrapped object without breaking its internal state.
 */
export function proxyFunctions<S>(source: S, target: Partial<S>, functions: (keyof S)[]) {
  function createFunction(functionName: keyof S) {
    return function (...args: any[]) {
      const func = target[functionName] as (...a: any[]) => any
      return func.apply(target, args)
    }
  }
  functions.forEach((functionName) => {
    source[functionName] = createFunction(functionName) as any
  })
}

/**
 * Walk `obj`'s own-property chain and return every property name found on it
 * or any of its prototypes (stopping before `Object.prototype`). Used to
 * auto-discover the methods to stub from a class instance or object.
 */
export function getAllKeys<T extends object>(obj: T) {
  const keys = new Set<keyof T>()

  let current = obj
  while (current && current !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(current)) {
      keys.add(key as keyof T)
    }
    current = Object.getPrototypeOf(current)
  }

  return Array.from<keyof T>(keys)
}

/** Type-narrowing check — is `value` callable? */
export function isFunction(value: unknown): value is (...args: any[]) => any {
  return typeof value === 'function'
}

/**
 * Recursively search `obj` for any string property value that matches `regex`.
 * Circular-reference-safe (relies on `for (key in obj)` + `Object.hasOwn`).
 * Used by `expect.withMatch()`.
 */
export function deepMatch<T extends object>(obj: T, regex: RegExp) {
  for (const key in obj) {
    if (!Object.hasOwn(obj, key)) continue

    const value = obj[key]

    if (typeof value === 'string' && regex.test(value)) {
      return true
    }

    if (typeof value === 'object' && value !== null) {
      if (deepMatch(value, regex)) {
        return true
      }
    }
  }

  return false
}

/**
 * Structural deep clone with cycle protection, preserving symbol keys and
 * passing functions through by reference (rather than cloning their bodies).
 * Used to snapshot argument arrays at invocation time so later mutations by
 * the caller can't corrupt recorded calls.
 */
export function cloneDeep<T>(obj: T): T {
  const seen = new WeakMap()

  function deepClone(value: any): any {
    if (value === null || typeof value !== 'object') return value
    if (typeof value === 'function') return value

    if (seen.has(value)) return seen.get(value)

    if (Array.isArray(value)) {
      const result: any[] = []
      seen.set(value, result)
      for (const item of value) {
        result.push(deepClone(item))
      }
      return result
    }

    const result: Record<string | symbol, any> = {}
    seen.set(value, result)
    for (const key of Reflect.ownKeys(value)) {
      result[key] = deepClone(value[key])
    }

    return result
  }

  return deepClone(obj)
}

/**
 * Returns true when `values` contains at least one element whose properties
 * match the key–value pairs in `expected`. Matcher-aware: if `expected` is a
 * matcher, it is tested against each value; if `expected` is an object with
 * matchers inside, those are tested against the corresponding properties.
 */
export function hasMatch(values: readonly unknown[], expected: unknown): boolean {
  if (isMatcher(expected)) {
    return values.some((v) => expected.test(v))
  }

  const predicate = (item: unknown): boolean => {
    if (expected === null || typeof expected !== 'object') {
      return item === expected
    }
    return (Object.entries(expected as Record<string, unknown>) as [string, unknown][]).every(([k, v]) => {
      const actual = (item as Record<string, unknown> | null | undefined)?.[k]
      if (isMatcher(v)) return v.test(actual)
      return actual === v
    })
  }

  return values.some(predicate)
}

/** Format an integer as `"once"` / `"twice"` / `"N times"` for readable assertion messages. */
export function humanise(number: number) {
  switch (number) {
    case 1:
      return 'once'
    case 2:
      return 'twice'
    default:
      return number + ' times'
  }
}
