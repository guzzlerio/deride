import assert from 'node:assert/strict'
import Debug from 'debug'
import { EventEmitter } from 'node:events'
import { inspect, isDeepStrictEqual } from 'node:util'
import { isMatcher, matchValue } from './matchers.js'
import { cloneDeep, deepMatch, hasMatch, humanise, PREFIX } from './utils.js'

type AnyFunc = (...args: any[]) => any

type StubBehavior = {
  predicate: (args: any[]) => boolean
  action: AnyFunc
  times?: number
}

/** A single recorded invocation. */
export interface CallRecord {
  /** Cloned arguments passed to the method. */
  readonly args: readonly unknown[]
  /** The value the method returned (the raw value, or Promise for async). */
  readonly returned?: unknown
  /** The error thrown synchronously by the method, if any. */
  readonly threw?: unknown
  /** The `this` binding the method was invoked with. */
  readonly thisArg?: unknown
  /** Wall-clock time at invocation (`Date.now()` milliseconds). */
  readonly timestamp: number
  /** Globally monotonic sequence number across all MethodMock invocations. */
  readonly sequence: number
}

/** Read-only inspection surface exposed via `mock.spy.method`. */
export interface MethodSpy {
  /** Total number of recorded calls. */
  readonly callCount: number
  /** All recorded calls in chronological order. */
  readonly calls: readonly CallRecord[]
  /** First recorded call, or `undefined` if never called. */
  readonly firstCall: CallRecord | undefined
  /** Last recorded call, or `undefined` if never called. */
  readonly lastCall: CallRecord | undefined
  /** Returns `true` if any recorded call's args contain all of the provided arguments (partial deep match, matcher-aware). Does not throw. */
  calledWith(...args: unknown[]): boolean
  /** Returns a human-readable dump of every recorded call. */
  printHistory(): string
  /** Canonical snapshot-friendly serialisation with stable key ordering. */
  serialize(): { method: string; calls: unknown[] }
}

/** Snapshot handle returned by `MethodMock.snapshot()`. */
export interface MockSnapshot {
  readonly __brand: 'deride.snapshot'
  readonly behaviors: StubBehavior[]
  readonly calls: CallRecord[]
}

let SEQ_COUNTER = 0
function nextSeq(): number {
  return ++SEQ_COUNTER
}

export class MethodMock {
  private calls: CallRecord[] = []
  private behaviors: StubBehavior[] = []
  private currentBehavior: Partial<StubBehavior> = {}
  private original?: AnyFunc
  private originalThis?: unknown
  private emitter?: EventEmitter
  private methodName: string
  private debug: Debug.Debugger
  private self?: unknown

  public readonly setup: MockSetup
  public readonly expect: MockExpect
  public readonly spy: MethodSpy

  constructor(original?: AnyFunc, options?: { name?: string; emitter?: EventEmitter }) {
    this.original = original
    this.methodName = options?.name ?? 'anonymous'
    this.emitter = options?.emitter
    this.debug = Debug(`${PREFIX}:method-mock:${this.methodName}`)

    this.setup = this.createSetup()
    this.expect = this.createExpect()
    this.spy = this.createSpy()
  }

  /** Attach the wrapped object so `toReturnSelf` and related features can resolve it. */
  public setSelf(self: unknown): void {
    this.self = self
  }

  /** Creates a callable proxy that acts as both a function and exposes .setup/.expect/.spy. */
  public createProxy(): AnyFunc & { setup: MockSetup; expect: MockExpect; spy: MethodSpy } {
    const self = this
    const fn: AnyFunc = () => undefined

    const proxy = new Proxy(fn, {
      apply(_target, thisArg, args) {
        return self.invoke(args, thisArg)
      },
      get(target, prop: string | symbol) {
        if (prop === 'setup') return self.setup
        if (prop === 'expect') return self.expect
        if (prop === 'spy') return self.spy
        return Reflect.get(target, prop)
      },
    }) as AnyFunc & { setup: MockSetup; expect: MockExpect; spy: MethodSpy }

    this.self = proxy
    return proxy
  }

  /** Invoke this mock — records the call and dispatches to matching behavior. */
  public invoke(args: any[], thisArg?: unknown): any {
    this.debug('invoke', args)

    const record: CallRecord & { returned?: unknown; threw?: unknown } = {
      args: cloneDeep(args),
      thisArg,
      timestamp: Date.now(),
      sequence: nextSeq(),
    }
    this.calls.push(record)

    // First: find time-limited behaviors in order (FIFO)
    const timeLimited = this.behaviors.find(
      (b: StubBehavior) => b.predicate(args) && b.times !== undefined && b.times > 0
    )
    // Fallback: find the last unlimited behavior that matches
    const behavior = timeLimited ?? [...this.behaviors].reverse().find(
      (b: StubBehavior) => b.predicate(args) && b.times === undefined
    )

    try {
      if (behavior) {
        if (behavior.times !== undefined) behavior.times--
        const result = behavior.action.apply(this.self ?? thisArg, args)
        ;(record as { returned?: unknown }).returned = result
        return result
      }
      const result = this.original ? this.original.apply(this.originalThis ?? thisArg, args) : undefined
      ;(record as { returned?: unknown }).returned = result
      return result
    } catch (err) {
      ;(record as { threw?: unknown }).threw = err
      throw err
    }
  }

  /** Back-compat helper for internal code that reads arg tuples. */
  public get callArgs(): readonly (readonly unknown[])[] {
    return this.calls.map((c) => c.args)
  }

  /** Total number of recorded calls. */
  public get callCount(): number {
    return this.calls.length
  }

  /** Read-only access to recorded calls. */
  public getCalls(): readonly CallRecord[] {
    return this.calls
  }

  /** Name of the method this mock represents (used in failure messages). */
  public get name(): string {
    return this.methodName
  }

  /** Clear recorded call history. Behaviors remain intact. */
  public reset(): void {
    this.calls = []
  }

  /** Capture the current state (behaviors + call history) as an opaque snapshot. */
  public snapshot(): MockSnapshot {
    return {
      __brand: 'deride.snapshot',
      behaviors: this.behaviors.map((b) => ({ ...b })),
      calls: this.calls.map((c) => ({ ...c })),
    }
  }

  /** Restore behaviors and call history to a previously captured snapshot. */
  public restoreSnapshot(snap: MockSnapshot): void {
    if (!snap || snap.__brand !== 'deride.snapshot') {
      throw new Error('restoreSnapshot: not a deride snapshot')
    }
    this.behaviors = snap.behaviors.map((b) => ({ ...b }))
    this.calls = snap.calls.map((c) => ({ ...c }))
  }

  /** Clear both behaviors AND recorded calls. */
  public fullRestore(): void {
    this.behaviors = []
    this.calls = []
  }

  private addBehavior(action: AnyFunc): MockSetup {
    const predicate = this.currentBehavior.predicate ?? (() => true)
    const times = this.currentBehavior.times
    this.behaviors.push({ predicate, action, times })
    this.currentBehavior = {}
    const lastIdx = this.behaviors.length - 1
    const self = this

    return Object.create(this.setup, {
      times: {
        value(n: number) {
          self.behaviors[lastIdx].times = n
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

  private createSetup(): MockSetup {
    const self = this

    const setup: MockSetup = {
      toReturn(value: any) {
        return self.addBehavior(() => value)
      },
      toReturnSelf() {
        return self.addBehavior(() => self.self)
      },
      toDoThis(fn: AnyFunc) {
        return self.addBehavior((...args) => fn(...args))
      },
      toThrow(message: string) {
        return self.addBehavior(() => {
          throw new Error(message)
        })
      },
      toResolveWith(value: any) {
        return self.addBehavior(() => Promise.resolve(value))
      },
      toResolve() {
        return self.addBehavior(() => Promise.resolve())
      },
      toRejectWith(error: any) {
        return self.addBehavior(() => Promise.reject(error))
      },
      toResolveAfter(ms: number, value?: any) {
        return self.addBehavior(() => new Promise((resolve) => setTimeout(() => resolve(value), ms)))
      },
      toRejectAfter(ms: number, error: unknown) {
        return self.addBehavior(() => new Promise((_, reject) => setTimeout(() => reject(error), ms)))
      },
      toHang() {
        return self.addBehavior(() => new Promise(() => {}))
      },
      toReturnInOrder(...values: any[]) {
        return self.sequencedReturn(values, (v) => v)
      },
      toResolveInOrder(...values: any[]) {
        return self.sequencedReturn(values, (v) => Promise.resolve(v))
      },
      toRejectInOrder(...errors: any[]) {
        return self.sequencedReturn(errors, (v) => Promise.reject(v))
      },
      toYield(...values: any[]) {
        return self.addBehavior(() => {
          return (function* () {
            for (const v of values) yield v
          })()
        })
      },
      toAsyncYield(...values: any[]) {
        return self.addBehavior(() => {
          return (async function* () {
            for (const v of values) yield v
          })()
        })
      },
      toAsyncYieldThrow(error: unknown, ...valuesBefore: any[]) {
        return self.addBehavior(() => {
          return (async function* () {
            for (const v of valuesBefore) yield v
            throw error
          })()
        })
      },
      toCallbackWith(...cbArgs: any[]) {
        return self.addBehavior((...args) => {
          const cb = [...args].reverse().find((arg) => typeof arg === 'function')
          if (!cb) throw new Error('No callback function found in arguments')
          cb(...cbArgs)
        })
      },
      toEmit(eventName: string, ...params: any[]) {
        return self.addBehavior((...args) => {
          if (self.emitter) {
            self.emitter.emit(eventName, ...params)
          }
          return self.original ? self.original(...args) : undefined
        })
      },
      toIntercept(fn: AnyFunc) {
        return self.addBehavior((...args) => {
          fn(...args)
          return self.original ? self.original(...args) : undefined
        })
      },
      toTimeWarp(ms: number) {
        return self.addBehavior((...args) => {
          const cb = args.find((arg) => typeof arg === 'function')
          if (cb) {
            setTimeout(cb, ms)
          }
          return self.original ? self.original(...args) : undefined
        })
      },
      when(predicateOrValue: any) {
        if (isMatcher(predicateOrValue)) {
          self.currentBehavior.predicate = (args: any[]) =>
            args.length > 0 && predicateOrValue.test(args[0])
        } else if (typeof predicateOrValue === 'function') {
          self.currentBehavior.predicate = predicateOrValue
        } else {
          self.currentBehavior.predicate = (args: any[]) =>
            args.length > 0 && isDeepStrictEqual(args[0], predicateOrValue)
        }
        return setup
      },
      times(n: number) {
        self.currentBehavior.times = n
        return setup
      },
      once() {
        self.currentBehavior.times = 1
        return setup
      },
      twice() {
        self.currentBehavior.times = 2
        return setup
      },
      fallback() {
        self.behaviors = []
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

  private sequencedReturn(values: any[], project: (value: any) => any): MockSetup {
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
      Array.isArray(values[0]) &&
      values.length === 2 &&
      ('then' in (last as object) || 'cycle' in (last as object))
    ) {
      list = values[0] as any[]
      options = last as { then?: unknown; cycle?: boolean }
    }
    if (list.length === 0) {
      throw new Error('sequenced return requires at least one value')
    }

    const basePredicate = this.currentBehavior.predicate ?? (() => true)
    const baseTimes = this.currentBehavior.times
    this.currentBehavior = {}

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

    this.behaviors.push({ predicate: basePredicate, action, times: baseTimes })
    const lastIdx = this.behaviors.length - 1
    const selfMock = this

    return Object.create(this.setup, {
      times: {
        value(n: number) {
          selfMock.behaviors[lastIdx].times = n
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

  private createSpy(): MethodSpy {
    const self = this
    return {
      get callCount() {
        return self.calls.length
      },
      get calls() {
        return self.calls
      },
      get firstCall() {
        return self.calls[0]
      },
      get lastCall() {
        return self.calls[self.calls.length - 1]
      },
      calledWith(...args: unknown[]): boolean {
        return self.calls.some((record) =>
          args.every((expected) => hasMatch(record.args as unknown[], expected))
        )
      },
      printHistory(): string {
        if (self.calls.length === 0) return `${self.methodName}: (no calls)`
        const lines = self.calls.map((c, i) => {
          const argStr = (c.args as unknown[]).map((a) => inspect(a, { depth: 4 })).join(', ')
          let tail = ''
          if (c.threw !== undefined) tail = ` -> threw ${inspect(c.threw)}`
          else if (c.returned !== undefined) tail = ` -> ${inspect(c.returned, { depth: 4 })}`
          return `  #${i} ${self.methodName}(${argStr})${tail}`
        })
        return [`${self.methodName}: ${self.calls.length} call(s)`, ...lines].join('\n')
      },
      serialize() {
        return {
          method: self.methodName,
          calls: self.calls.map((c) => {
            const entry: Record<string, unknown> = { args: c.args }
            if (c.returned !== undefined) entry.returned = c.returned
            if (c.threw !== undefined) entry.threw = inspect(c.threw)
            return stableSerialise(entry)
          }),
        }
      },
    }
  }

  private createExpect(): MockExpect {
    const self = this

    function callMatchesReturn(expected: unknown) {
      return self.calls.some((c) => {
        if (c.returned !== undefined && matchValue(c.returned, expected)) return true
        // For Promise returns, also check the resolved-value shape if the test stubbed toResolveWith
        return false
      })
    }

    const called: CalledExpect = {
      times(n: number, err?: string) {
        if (!err) {
          err = `Expected ${self.methodName} to be called ${humanise(n)} but was ${humanise(self.calls.length)}`
        }
        assert.equal(self.calls.length, n, err)
      },
      once() {
        called.times(1)
      },
      twice() {
        called.times(2)
      },
      never() {
        called.times(0, `Expected ${self.methodName} to never be called but was ${humanise(self.calls.length)}`)
      },
      lt(n: number) {
        assert(self.calls.length < n, `Expected ${self.methodName} call count < ${n}, but got ${self.calls.length}`)
      },
      lte(n: number) {
        assert(self.calls.length <= n, `Expected ${self.methodName} call count <= ${n}, but got ${self.calls.length}`)
      },
      gt(n: number) {
        assert(self.calls.length > n, `Expected ${self.methodName} call count > ${n}, but got ${self.calls.length}`)
      },
      gte(n: number) {
        assert(self.calls.length >= n, `Expected ${self.methodName} call count >= ${n}, but got ${self.calls.length}`)
      },
      withArg(arg: unknown) {
        const result = self.calls.some((c) => hasMatch(c.args as unknown[], arg))
        assert(result, `Expected ${self.methodName} to be called with: ${inspect(arg)}${historySuffix(self)}`)
      },
      withArgs(...args: unknown[]) {
        const result = self.calls.some((c) =>
          args.every((expected) => hasMatch(c.args as unknown[], expected))
        )
        assert(result, `Expected ${self.methodName} to be called with: ${args.join(', ')}${historySuffix(self)}`)
      },
      withMatch(pattern: RegExp) {
        let matched = false
        for (const c of self.calls) {
          if (matched) break
          for (const arg of c.args) {
            if (matched) break
            if (typeof arg === 'object' && arg !== null) {
              matched = deepMatch(arg as object, pattern)
            } else {
              matched = pattern.test(String(arg))
            }
          }
        }
        assert(matched, `Expected ${self.methodName} to be called matching: ${pattern}`)
      },
      matchExactly(...expectedArgs: unknown[]) {
        const matched = self.calls.some(
          (c) =>
            c.args.length === expectedArgs.length &&
            (c.args as unknown[]).every((a, i) => matchValue(a, expectedArgs[i]))
        )
        assert(
          matched,
          `Expected ${self.methodName} to be called matchExactly args${inspect(expectedArgs, { depth: 10 })}`
        )
      },
      withReturn(expected: unknown) {
        assert(
          callMatchesReturn(expected),
          `Expected ${self.methodName} to have returned: ${inspect(expected)}${historySuffix(self)}`
        )
      },
      calledOn(target: unknown) {
        const matched = self.calls.some((c) => c.thisArg === target)
        assert(matched, `Expected ${self.methodName} to have been called on the given target`)
      },
      threw(expected?: unknown) {
        const matched = self.calls.some((c) => {
          if (c.threw === undefined) return false
          if (expected === undefined) return true
          if (typeof expected === 'string') {
            return c.threw instanceof Error && c.threw.message === expected
          }
          if (typeof expected === 'function') {
            return c.threw instanceof (expected as new (...a: any[]) => unknown)
          }
          return matchValue(c.threw, expected)
        })
        assert(matched, `Expected ${self.methodName} to have thrown${expected !== undefined ? ': ' + inspect(expected) : ''}`)
      },
      reset() {
        self.calls = []
      },
      not: {} as Omit<CalledExpect, 'reset' | 'not'>,
    }

    const everyCall: Omit<CalledExpect, 'reset' | 'not'> = {
      times: (n: number) => called.times(n),
      once: called.once,
      twice: called.twice,
      never: called.never,
      lt: called.lt,
      lte: called.lte,
      gt: called.gt,
      gte: called.gte,
      withArg(arg: unknown) {
        assert(self.calls.length > 0, `Expected every call of ${self.methodName} to include ${inspect(arg)} but it was never called`)
        const matched = self.calls.every((c) => hasMatch(c.args as unknown[], arg))
        assert(matched, `Expected every call of ${self.methodName} to include ${inspect(arg)}${historySuffix(self)}`)
      },
      withArgs(...args: unknown[]) {
        assert(self.calls.length > 0, `Expected every call of ${self.methodName} to include ${args.join(', ')} but it was never called`)
        const matched = self.calls.every((c) => args.every((expected) => hasMatch(c.args as unknown[], expected)))
        assert(matched, `Expected every call of ${self.methodName} to include args ${args.join(', ')}${historySuffix(self)}`)
      },
      withMatch(pattern: RegExp) {
        assert(self.calls.length > 0, `Expected every call of ${self.methodName} to match ${pattern} but it was never called`)
        const matched = self.calls.every((c) =>
          (c.args as unknown[]).some((arg) =>
            typeof arg === 'object' && arg !== null
              ? deepMatch(arg as object, pattern)
              : pattern.test(String(arg))
          )
        )
        assert(matched, `Expected every call of ${self.methodName} to match ${pattern}`)
      },
      matchExactly(...expectedArgs: unknown[]) {
        assert(self.calls.length > 0, `Expected every call of ${self.methodName} to match exactly but it was never called`)
        const matched = self.calls.every(
          (c) =>
            c.args.length === expectedArgs.length &&
            (c.args as unknown[]).every((a, i) => matchValue(a, expectedArgs[i]))
        )
        assert(matched, `Expected every call of ${self.methodName} to matchExactly ${inspect(expectedArgs)}`)
      },
      withReturn(expected: unknown) {
        assert(self.calls.length > 0, `Expected every call of ${self.methodName} to return ${inspect(expected)} but it was never called`)
        const matched = self.calls.every((c) => c.returned !== undefined && matchValue(c.returned, expected))
        assert(matched, `Expected every call of ${self.methodName} to return ${inspect(expected)}`)
      },
      calledOn(target: unknown) {
        assert(self.calls.length > 0, `Expected every call of ${self.methodName} to be on target but it was never called`)
        const matched = self.calls.every((c) => c.thisArg === target)
        assert(matched, `Expected every call of ${self.methodName} to be on the target`)
      },
      threw(expected?: unknown) {
        assert(self.calls.length > 0, `Expected every call of ${self.methodName} to have thrown but it was never called`)
        const matched = self.calls.every((c) => {
          if (c.threw === undefined) return false
          if (expected === undefined) return true
          if (typeof expected === 'string') return c.threw instanceof Error && c.threw.message === expected
          if (typeof expected === 'function') return c.threw instanceof (expected as new (...a: any[]) => unknown)
          return matchValue(c.threw, expected)
        })
        assert(matched, `Expected every call of ${self.methodName} to have thrown`)
      },
    } as Omit<CalledExpect, 'reset' | 'not'>

    function negate(fn: (...args: any[]) => void) {
      return (...args: any[]) => {
        try {
          fn(...args)
        } catch {
          return
        }
        assert.fail(`Expected negated assertion to fail but it passed`)
      }
    }

    called.not = {
      times: negate(called.times),
      once: negate(called.once),
      twice: negate(called.twice),
      never: negate(called.never),
      lt: negate(called.lt),
      lte: negate(called.lte),
      gt: negate(called.gt),
      gte: negate(called.gte),
      withArg: negate(called.withArg),
      withArgs: negate(called.withArgs),
      withMatch: negate(called.withMatch),
      matchExactly: negate(called.matchExactly),
      withReturn: negate(called.withReturn),
      calledOn: negate(called.calledOn),
      threw: negate(called.threw),
    }

    const expect: MockExpect = {
      called,
      everyCall,
      invocation(index: number) {
        if (index >= self.calls.length) {
          throw new Error('invocation out of range')
        }
        const record = self.calls[index]
        const args = record.args as unknown[]
        return {
          withArg(arg: unknown) {
            const result = hasMatch(args, arg)
            assert(result, `Invocation #${index} did not include argument ${inspect(arg)}`)
          },
          withArgs(...expectedArgs: unknown[]) {
            const result = expectedArgs.every((expected) => hasMatch(args, expected))
            assert(result, `Invocation #${index} did not include arguments ${inspect(expectedArgs)}`)
          },
        }
      },
    }

    return expect
  }
}

function historySuffix(self: MethodMock): string {
  const calls = self.getCalls()
  if (calls.length === 0) return '\n  (no calls recorded)'
  const lines = calls.map((c, i) => {
    const argStr = (c.args as unknown[]).map((a) => inspect(a, { depth: 3 })).join(', ')
    return `  #${i} (${argStr})`
  })
  return '\n  actual calls:\n' + lines.join('\n')
}

function stableSerialise(value: unknown, seen = new WeakSet()): unknown {
  if (value === null || value === undefined) return value
  if (typeof value !== 'object') {
    if (typeof value === 'function') return `[Function${(value as { name?: string }).name ? ': ' + (value as { name?: string }).name : ''}]`
    if (typeof value === 'bigint') return `${value.toString()}n`
    if (typeof value === 'symbol') return value.toString()
    return value
  }
  if (seen.has(value as object)) return '[Circular]'
  seen.add(value as object)
  if (Array.isArray(value)) return value.map((v) => stableSerialise(v, seen))
  const keys = Reflect.ownKeys(value as object)
    .map((k) => k.toString())
    .sort()
  const out: Record<string, unknown> = {}
  for (const k of keys) {
    out[k] = stableSerialise((value as Record<string, unknown>)[k], seen)
  }
  return out
}

/** Configure the behavior of a mocked method. Constrained to the method's signature. Cast value `as any` to bypass type checking. */
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
  /** Apply the next behavior only when args match the predicate or value. */
  when(predicateOrValue: A[0] | ((args: A) => boolean) | { readonly [s: symbol]: true; description: string; test(v: unknown): boolean }): TypedMockSetup<A, R>
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

/** Assert expectations about how a method was called. */
export interface CalledExpect {
  times(n: number, err?: string): void
  once(): void
  twice(): void
  never(): void
  lt(n: number): void
  lte(n: number): void
  gt(n: number): void
  gte(n: number): void
  withArg(arg: unknown): void
  withArgs(...args: unknown[]): void
  withMatch(pattern: RegExp): void
  matchExactly(...args: unknown[]): void
  /** Assert at least one call returned a value matching `expected`. */
  withReturn(expected: unknown): void
  /** Assert at least one call had its `this` bound to `target` (identity compare). */
  calledOn(target: unknown): void
  /** Assert at least one call threw; with no argument, any throw passes. */
  threw(expected?: unknown): void
  reset(): void
  not: Omit<CalledExpect, 'reset' | 'not'>
}

/** Assert expectations about a specific invocation by index. */
export interface InvocationExpect {
  withArg(arg: unknown): void
  withArgs(...args: unknown[]): void
}

/** Expectation interface for a mocked method. */
export interface MockExpect {
  called: CalledExpect
  /** Assertions applied to EVERY recorded call (fails if any call mismatches, or if never called). */
  everyCall: Omit<CalledExpect, 'reset' | 'not'>
  invocation(index: number): InvocationExpect
}
