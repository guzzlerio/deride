import { EventEmitter } from 'node:events'
import { MethodSpy, TypedMockSetup, MockExpect, MockSnapshot } from './method-mock.js'

/** Map each method of T to a TypedMockSetup constrained to that method's signature. */
export type SetupMethods<T extends object> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? TypedMockSetup<A, R>
    : TypedMockSetup<any[], any>
}

/** Map each method of T to a MockExpect surface. */
export type ExpectMethods<T extends object> = Record<keyof T, MockExpect>

/** Map each method of T to a read-only MethodSpy surface. */
export type SpyMethods<T extends object> = Record<keyof T, MethodSpy>

/**
 * The type produced by `stub()` / `wrap()`. Your original `T` is preserved —
 * callable just like the real object — with the deride facades (`setup`,
 * `expect`, `spy`, `called`, `snapshot`, `restore`) plus an `EventEmitter`
 * layered on top.
 */
export type Wrapped<T extends object> = T & {
  /** Reset every method's call history at once. */
  called: {
    /** Clear recorded calls for every method (behaviours are preserved). */
    reset: () => void
  }
  /** Per-method behaviour configuration. */
  setup: SetupMethods<T>
  /** Per-method assertion surface. */
  expect: ExpectMethods<T>
  /** Per-method read-only inspection surface. */
  spy: SpyMethods<T>
  /** Capture behaviours + call history for all methods. */
  snapshot: () => Record<string, MockSnapshot>
  /** Roll back behaviours + call history for all methods. */
  restore: (snap: Record<string, MockSnapshot>) => void
  /** Register an event listener (EventEmitter passthrough). */
  on: (eventName: string, listener: (...args: any[]) => void) => EventEmitter
  /** Register a one-shot event listener (EventEmitter passthrough). */
  once: (eventName: string, listener: (...args: any[]) => void) => EventEmitter
  /** Emit an event on the wrapped object (EventEmitter passthrough). */
  emit: (eventName: string, ...args: any[]) => boolean
}

/** Configuration options for `stub()` / `wrap()` — customises debug output. */
export type Options = {
  /** Debug namespace prefix/suffix used for `debug(...)` loggers. */
  debug: {
    /** Prefix segment, defaulting to `'deride'`. */
    prefix: string | undefined
    /** Suffix segment, defaulting to `'stub'` or `'wrap'`. */
    suffix: string | undefined
  }
}
