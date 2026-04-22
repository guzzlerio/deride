import { EventEmitter } from 'node:events'
import { isDeepStrictEqual } from 'node:util'
import { isMatcher } from './matchers.js'

type AnyFunc = (...args: any[]) => any

/**
 * A behaviour registered against a MethodMock — the dispatch loop iterates
 * these in registration order, picking the first time-limited behaviour that
 * matches or falling back to the last-registered unlimited behaviour.
 */
export interface StubBehavior {
  /** Predicate run against the call's args; behaviour is only eligible if this returns true. */
  predicate: (args: any[]) => boolean
  /** The action to run — its return value (or throw) becomes the mock's. */
  action: AnyFunc
  /** If set, the behaviour is consumed this many times before falling back to other matches. */
  times?: number
}

/**
 * Host interface required by the setup factory — the narrow surface
 * `createSetup` needs from a MethodMock without depending on the whole class.
 */
export interface SetupHost {
  /** Append a new behaviour to the ordered behaviour list. */
  pushBehavior(behaviour: StubBehavior): number
  /** Adjust the `times` of a previously pushed behaviour in place. */
  setBehaviorTimes(index: number, times: number | undefined): void
  /** Clear all configured behaviours (does not touch call history). */
  clearBehaviors(): void
  /** Live reference to the `original` function, if any, that the mock was built from. */
  readonly original: AnyFunc | undefined
  /** Live reference to the wrapped object/proxy that owns this mock (used by `toReturnSelf`). */
  readonly self: unknown
  /** Shared EventEmitter, if any, that `toEmit` should fan out through. */
  readonly emitter: EventEmitter | undefined
}

/**
 * Configure the behavior of a mocked method. Constrained to the method's
 * signature; cast `as any` to bypass type checking for error-path tests.
 */
export interface TypedMockSetup<A extends any[] = any[], R = any> {
  /** Return a fixed value when invoked. Cast `as any` to return an invalid type. */
  toReturn(value: R): TypedMockSetup<A, R>
  /** Return the wrapped object itself — useful for fluent/chainable APIs. */
  toReturnSelf(): TypedMockSetup<A, R>
  /** Replace the method body with a custom function. */
  toDoThis(fn: (...args: A) => R): TypedMockSetup<A, R>
  /** Throw an error with the given message when invoked. */
  toThrow(message: string): TypedMockSetup<A, R>
  /** Return a resolved promise with the given value. */
  toResolveWith(value: R extends Promise<infer U> ? U : R): TypedMockSetup<A, R>
  /** Return a resolved promise with no value. */
  toResolve(): TypedMockSetup<A, R>
  /** Return a rejected promise with the given error. */
  toRejectWith(error: unknown): TypedMockSetup<A, R>
  /** Return a promise that resolves with the given value after `ms` milliseconds. */
  toResolveAfter(ms: number, value?: R extends Promise<infer U> ? U : R): TypedMockSetup<A, R>
  /** Return a promise that rejects with the given error after `ms` milliseconds. */
  toRejectAfter(ms: number, error: unknown): TypedMockSetup<A, R>
  /** Return a promise that never resolves or rejects. */
  toHang(): TypedMockSetup<A, R>
  /** Return the supplied values one per call, sticky-last (or cycle/then via options). */
  toReturnInOrder(...values: (R | [R[], { then?: R; cycle?: boolean }])[]): TypedMockSetup<A, R>
  /** Return resolved promises with each value in order. */
  toResolveInOrder(...values: (R extends Promise<infer U> ? U : R)[]): TypedMockSetup<A, R>
  /** Return rejected promises with each error in order. */
  toRejectInOrder(...errors: unknown[]): TypedMockSetup<A, R>
  /** Return a fresh sync iterator yielding each value. */
  toYield(...values: unknown[]): TypedMockSetup<A, R>
  /** Return a fresh async iterator yielding each value. */
  toAsyncYield(...values: unknown[]): TypedMockSetup<A, R>
  /** Return an async iterator that yields `valuesBefore` then throws `error`. */
  toAsyncYieldThrow(error: unknown, ...valuesBefore: unknown[]): TypedMockSetup<A, R>
  /** Invoke the last callback argument with the given args. */
  toCallbackWith(...args: any[]): TypedMockSetup<A, R>
  /** Emit an event on the wrapped object when invoked. */
  toEmit(eventName: string, ...params: any[]): TypedMockSetup<A, R>
  /** Call the interceptor with args, then call the original method. */
  toIntercept(fn: (...args: A) => void): TypedMockSetup<A, R>
  /** Schedule the callback with an accelerated timeout. */
  toTimeWarp(ms: number): TypedMockSetup<A, R>
  /** Apply the next behavior only when args match. Accepts a predicate, or one or more values/matchers matched positionally. */
  when(...expected: unknown[]): TypedMockSetup<A, R>
  /** Apply the next behavior only for the first `n` invocations. */
  times(n: number): TypedMockSetup<A, R>
  /** Apply the next behavior only for the first invocation. */
  once(): TypedMockSetup<A, R>
  /** Apply the next behavior only for the first two invocations. */
  twice(): TypedMockSetup<A, R>
  /** Clear all configured behaviors, revert to original. */
  fallback(): TypedMockSetup<A, R>
  /** Chaining alias — returns the setup object for readability. */
  readonly and: TypedMockSetup<A, R>
  /** Chaining alias — returns the setup object for readability. */
  readonly then: TypedMockSetup<A, R>
}

/** Untyped setup — accepts any value. Used internally and for untyped stubs. */
export type MockSetup = TypedMockSetup<any[], any>

/**
 * Build the setup DSL for a given `MethodMock`-compatible host. The returned
 * object is the `mock.setup.method` surface users interact with.
 *
 * Internally the factory keeps a small piece of mutable state
 * (`currentBehavior`) that lets `.when()` / `.times()` / `.once()` / `.twice()`
 * attach a predicate and usage cap to the NEXT pushed behaviour.
 */
export function createSetup(host: SetupHost): MockSetup {
  let currentBehavior: Partial<StubBehavior> = {}

  function pushWith(action: AnyFunc): MockSetup {
    const predicate = currentBehavior.predicate ?? (() => true)
    const times = currentBehavior.times
    const idx = host.pushBehavior({ predicate, action, times })
    currentBehavior = {}
    return retroView(idx)
  }

  function retroView(lastIdx: number): MockSetup {
    return Object.create(setup, {
      times: {
        value(n: number) {
          host.setBehaviorTimes(lastIdx, n)
          return this
        },
      },
      once: {
        value() {
          return this.times(1)
        },
      },
      twice: {
        value() {
          return this.times(2)
        },
      },
    })
  }

  function sequencedReturn(values: any[], project: (value: any) => any): MockSetup {
    if (values.length === 0) {
      throw new Error('sequenced return requires at least one value')
    }
    let options: { then?: unknown; cycle?: boolean } | undefined
    let list = values
    const last = values[values.length - 1]
    if (
      typeof last === 'object' &&
      last !== null &&
      !Array.isArray(last) &&
      ('then' in (last as object) || 'cycle' in (last as object))
    ) {
      options = last as { then?: unknown; cycle?: boolean }
      const rest = values.slice(0, -1)
      list = rest.length === 1 && Array.isArray(rest[0]) ? rest[0] : rest
    }
    if (list.length === 0) {
      throw new Error('sequenced return requires at least one value')
    }

    const basePredicate = currentBehavior.predicate ?? (() => true)
    const baseTimes = currentBehavior.times
    currentBehavior = {}

    let index = 0
    const stickyLast = list[list.length - 1]
    const action = (...args: any[]): any => {
      void args
      let v: any
      if (options?.cycle) {
        v = list[index % list.length]
        index++
      } else if (index < list.length) {
        v = list[index]
        index++
      } else if (options && 'then' in options) {
        v = options.then
      } else {
        v = stickyLast
      }
      return project(v)
    }

    const idx = host.pushBehavior({ predicate: basePredicate, action, times: baseTimes })
    return retroView(idx)
  }

  const setup: MockSetup = {
    toReturn(value: any) {
      return pushWith(() => value)
    },
    toReturnSelf() {
      return pushWith(() => host.self)
    },
    toDoThis(fn: AnyFunc) {
      return pushWith((...args) => fn(...args))
    },
    toThrow(message: string) {
      return pushWith(() => {
        throw new Error(message)
      })
    },
    toResolveWith(value: any) {
      return pushWith(() => Promise.resolve(value))
    },
    toResolve() {
      return pushWith(() => Promise.resolve())
    },
    toRejectWith(error: any) {
      return pushWith(() => Promise.reject(error))
    },
    toResolveAfter(ms: number, value?: any) {
      return pushWith(() => new Promise((resolve) => setTimeout(() => resolve(value), ms)))
    },
    toRejectAfter(ms: number, error: unknown) {
      return pushWith(() => new Promise((_, reject) => setTimeout(() => reject(error), ms)))
    },
    toHang() {
      return pushWith(() => new Promise(() => {}))
    },
    toReturnInOrder(...values: any[]) {
      return sequencedReturn(values, (v) => v)
    },
    toResolveInOrder(...values: any[]) {
      return sequencedReturn(values, (v) => Promise.resolve(v))
    },
    toRejectInOrder(...errors: any[]) {
      return sequencedReturn(errors, (v) => Promise.reject(v))
    },
    toYield(...values: any[]) {
      return pushWith(() => {
        return (function* () {
          for (const v of values) yield v
        })()
      })
    },
    toAsyncYield(...values: any[]) {
      return pushWith(() => {
        return (async function* () {
          for (const v of values) yield v
        })()
      })
    },
    toAsyncYieldThrow(error: unknown, ...valuesBefore: any[]) {
      return pushWith(() => {
        return (async function* () {
          for (const v of valuesBefore) yield v
          throw error
        })()
      })
    },
    toCallbackWith(...cbArgs: any[]) {
      return pushWith((...args) => {
        const cb = [...args].reverse().find((arg) => typeof arg === 'function')
        if (!cb) throw new Error('No callback function found in arguments')
        cb(...cbArgs)
      })
    },
    toEmit(eventName: string, ...params: any[]) {
      return pushWith((...args) => {
        if (host.emitter) {
          host.emitter.emit(eventName, ...params)
        }
        return host.original ? host.original(...args) : undefined
      })
    },
    toIntercept(fn: AnyFunc) {
      return pushWith((...args) => {
        fn(...args)
        return host.original ? host.original(...args) : undefined
      })
    },
    toTimeWarp(ms: number) {
      return pushWith((...args) => {
        const cb = args.find((arg) => typeof arg === 'function')
        if (cb) {
          setTimeout(cb, ms)
        }
        return host.original ? host.original(...args) : undefined
      })
    },
    when(...expected: any[]) {
      if (expected.length === 1 && typeof expected[0] === 'function' && !isMatcher(expected[0])) {
        currentBehavior.predicate = expected[0]
      } else {
        currentBehavior.predicate = (args: any[]) =>
          expected.length <= args.length &&
          expected.every((e, i) =>
            isMatcher(e) ? e.test(args[i]) : isDeepStrictEqual(args[i], e)
          )
      }
      return setup
    },
    times(n: number) {
      currentBehavior.times = n
      return setup
    },
    once() {
      currentBehavior.times = 1
      return setup
    },
    twice() {
      currentBehavior.times = 2
      return setup
    },
    fallback() {
      host.clearBehaviors()
      return setup
    },
    get and() {
      return setup
    },
    get then() {
      return setup
    },
  }

  return setup
}
