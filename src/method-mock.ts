import Debug from 'debug'
import { EventEmitter } from 'node:events'
import { CallRecord, MockSnapshot, nextSeq } from './call-record.js'
import { createExpect, MockExpect } from './mock-expect.js'
import { createSetup, MockSetup, StubBehavior } from './mock-setup.js'
import { Spy, MethodSpy } from './mock-spy.js'
import { cloneDeep, PREFIX } from './utils.js'

type AnyFunc = (...args: any[]) => any

/**
 * The core mock engine. A `MethodMock` represents a single mocked method: it
 * records every invocation as a {@link CallRecord}, dispatches to matching
 * behaviours, and exposes three facades (`setup`, `expect`, `spy`) built
 * from focused factory modules.
 */
export class MethodMock {
  private _calls: CallRecord[] = []
  private _behaviors: StubBehavior[] = []
  private _original?: AnyFunc
  private _originalThis?: unknown
  private _emitter?: EventEmitter
  private _name: string
  private _debug: Debug.Debugger
  private _self?: unknown

  /** Behaviour-configuration facade (`mock.setup.method`). */
  public readonly setup: MockSetup
  /** Assertion facade (`mock.expect.method`). */
  public readonly expect: MockExpect
  /** Read-only inspection facade (`mock.spy.method`). */
  public readonly spy: MethodSpy

  /**
   * Create a new MethodMock.
   *
   * @param original Optional original implementation — used when no behaviour matches.
   * @param options Optional name (used in diagnostic output) and shared emitter for `toEmit`.
   */
  constructor(original?: AnyFunc, options?: { name?: string; emitter?: EventEmitter }) {
    this._original = original
    this._name = options?.name ?? 'anonymous'
    this._emitter = options?.emitter
    this._debug = Debug(`${PREFIX}:method-mock:${this._name}`)

    const setupHost = {
      pushBehavior: (b: StubBehavior) => {
        this._behaviors.push(b)
        return this._behaviors.length - 1
      },
      setBehaviorTimes: (i: number, t: number | undefined) => {
        this._behaviors[i].times = t
      },
      clearBehaviors: () => {
        this._behaviors = []
      },
      get original() {
        return self._original
      },
      get self() {
        return self._self
      },
      get emitter() {
        return self._emitter
      },
    }

    const spyExpectHost = {
      get name() {
        return self._name
      },
      get calls() {
        return self._calls
      },
      clearCalls: () => {
        this._calls = []
      },
    }

    const self = this

    this.setup = createSetup(setupHost)
    this.expect = createExpect(spyExpectHost)
    this.spy = new Spy(spyExpectHost)
  }

  /** Attach the wrapped object — used by `toReturnSelf` and for `this` defaulting. */
  public setSelf(self: unknown): void {
    this._self = self
  }

  /** Human-friendly method name (from constructor options, or `'anonymous'`). */
  public get name(): string {
    return this._name
  }

  /** Total number of recorded calls. */
  public get callCount(): number {
    return this._calls.length
  }

  /** Live view of recorded args in the legacy `unknown[][]` shape — kept for back-compat with internals. */
  public get callArgs(): readonly (readonly unknown[])[] {
    return this._calls.map((c) => c.args)
  }

  /** Read-only handle onto the recorded calls array. */
  public getCalls(): readonly CallRecord[] {
    return this._calls
  }

  /**
   * Build a callable Proxy that is simultaneously a function (invoking it
   * dispatches through `invoke`) and a holder of `setup` / `expect` / `spy`
   * properties. Used by `func()` for standalone mocked functions.
   */
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

    this._self = proxy
    return proxy
  }

  /** Invoke the mock — records the call and dispatches to the matching behaviour. */
  public invoke(args: any[], thisArg?: unknown): any {
    this._debug('invoke', args)

    const record: Mutable<CallRecord> = {
      args: cloneDeep(args),
      thisArg,
      timestamp: Date.now(),
      sequence: nextSeq(),
    }
    this._calls.push(record)

    // First: find time-limited behaviors in registration order (FIFO)
    const timeLimited = this._behaviors.find(
      (b) => b.predicate(args) && b.times !== undefined && b.times > 0
    )
    // Fallback: find the LAST unlimited behaviour that matches
    const behavior =
      timeLimited ??
      [...this._behaviors].reverse().find((b) => b.predicate(args) && b.times === undefined)

    try {
      if (behavior) {
        if (behavior.times !== undefined) behavior.times--
        const result = behavior.action.apply(this._self ?? thisArg, args)
        record.returned = result
        return result
      }
      const result = this._original
        ? this._original.apply(this._originalThis ?? thisArg, args)
        : undefined
      record.returned = result
      return result
    } catch (err) {
      record.threw = err
      throw err
    }
  }

  /** Clear recorded call history. Behaviours remain intact. */
  public reset(): void {
    this._calls = []
  }

  /** Capture the current state (behaviours + call history) as an opaque snapshot. */
  public snapshot(): MockSnapshot {
    return {
      __brand: 'deride.snapshot',
      behaviors: this._behaviors.map((b) => ({ ...b })),
      calls: this._calls.map((c) => ({ ...c })),
    }
  }

  /** Restore behaviours and call history to a previously captured snapshot. */
  public restoreSnapshot(snap: MockSnapshot): void {
    if (!snap || snap.__brand !== 'deride.snapshot') {
      throw new Error('restoreSnapshot: not a deride snapshot')
    }
    this._behaviors = (snap.behaviors as StubBehavior[]).map((b) => ({ ...b }))
    this._calls = (snap.calls as CallRecord[]).map((c) => ({ ...c }))
  }

  /** Clear BOTH behaviours and recorded calls — the "cold start" reset. */
  public fullRestore(): void {
    this._behaviors = []
    this._calls = []
  }
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] }

// Re-export the types the rest of the codebase (and the public API) consume.
export type { CallRecord, MockSnapshot } from './call-record.js'
export type {
  ArgAssertions,
  CalledExpect,
  CountAssertions,
  EveryCallExpect,
  ExpectBranches,
  InvocationExpect,
  MockExpect,
} from './mock-expect.js'
export type { MockSetup, TypedMockSetup, StubBehavior } from './mock-setup.js'
export type { MethodSpy } from './mock-spy.js'
