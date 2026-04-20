import assert from 'node:assert/strict'
import Debug from 'debug'
import { EventEmitter } from 'node:events'
import { inspect, isDeepStrictEqual } from 'node:util'
import { cloneDeep, deepMatch, hasMatch, humanise, PREFIX } from './utils.js'

type AnyFunc = (...args: any[]) => any

type StubBehavior = {
  predicate: (args: any[]) => boolean
  action: AnyFunc
  times?: number
}

export class MethodMock {
  private callArgs: any[][] = []
  private behaviors: StubBehavior[] = []
  private currentBehavior: Partial<StubBehavior> = {}
  private original?: AnyFunc
  private emitter?: EventEmitter
  private methodName: string
  private debug: Debug.Debugger

  public readonly setup: MockSetup
  public readonly expect: MockExpect

  constructor(original?: AnyFunc, options?: { name?: string; emitter?: EventEmitter }) {
    this.original = original
    this.methodName = options?.name ?? 'anonymous'
    this.emitter = options?.emitter
    this.debug = Debug(`${PREFIX}:method-mock:${this.methodName}`)

    this.setup = this.createSetup()
    this.expect = this.createExpect()
  }

  /**
   * Creates a callable proxy that acts as both a function and exposes .setup/.expect
   */
  public createProxy(): AnyFunc & { setup: MockSetup; expect: MockExpect } {
    const self = this
    const fn: AnyFunc = (...args: any[]) => self.invoke(args)

    return new Proxy(fn, {
      get(target, prop: string | symbol) {
        if (prop === 'setup') return self.setup
        if (prop === 'expect') return self.expect
        return Reflect.get(target, prop)
      },
    }) as any
  }

  /**
   * Invoke this mock — records the call and dispatches to matching behavior
   */
  public invoke(args: any[]): any {
    this.debug('invoke', args)
    this.callArgs.push(cloneDeep(args))

    // First: find time-limited behaviors in order (FIFO)
    const timeLimited = this.behaviors.find(
      (b: StubBehavior) => b.predicate(args) && b.times !== undefined && b.times > 0
    )
    // Fallback: find the last unlimited behavior that matches
    const behavior = timeLimited ?? [...this.behaviors].reverse().find(
      (b: StubBehavior) => b.predicate(args) && b.times === undefined
    )

    if (behavior) {
      if (behavior.times !== undefined) behavior.times--
      return behavior.action(...args)
    }

    return this.original ? this.original(...args) : undefined
  }

  /**
   * Reset all call records
   */
  public reset(): void {
    this.callArgs = []
  }

  private addBehavior(action: AnyFunc): MockSetup {
    const predicate = this.currentBehavior.predicate ?? (() => true)
    const times = this.currentBehavior.times
    this.behaviors.push({ predicate, action, times })
    this.currentBehavior = {}
    const lastIdx = this.behaviors.length - 1
    const self = this

    // Return a post-add view of setup that allows retroactive times() on the just-added behavior
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
        if (typeof predicateOrValue === 'function') {
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

  private createExpect(): MockExpect {
    const self = this

    const called: CalledExpect = {
      times(n: number, err?: string) {
        if (!err) {
          err = `Expected ${self.methodName} to be called ${humanise(n)} but was ${humanise(self.callArgs.length)}`
        }
        assert.equal(self.callArgs.length, n, err)
      },
      once() {
        called.times(1)
      },
      twice() {
        called.times(2)
      },
      never() {
        called.times(
          0,
          `Expected ${self.methodName} to never be called but was ${humanise(self.callArgs.length)}`
        )
      },
      lt(n: number) {
        assert(
          self.callArgs.length < n,
          `Expected ${self.methodName} call count < ${n}, but got ${self.callArgs.length}`
        )
      },
      lte(n: number) {
        assert(
          self.callArgs.length <= n,
          `Expected ${self.methodName} call count <= ${n}, but got ${self.callArgs.length}`
        )
      },
      gt(n: number) {
        assert(
          self.callArgs.length > n,
          `Expected ${self.methodName} call count > ${n}, but got ${self.callArgs.length}`
        )
      },
      gte(n: number) {
        assert(
          self.callArgs.length >= n,
          `Expected ${self.methodName} call count >= ${n}, but got ${self.callArgs.length}`
        )
      },
      withArg(arg: unknown) {
        const result = self.callArgs.some((callArgs) => hasMatch(callArgs, arg))
        assert(result, `Expected ${self.methodName} to be called with: ${inspect(arg)}`)
      },
      withArgs(...args: unknown[]) {
        const result = self.callArgs.some((callArgs) =>
          args.every((expected) => hasMatch(callArgs, expected))
        )
        assert(result, `Expected ${self.methodName} to be called with: ${args.join(', ')}`)
      },
      withMatch(pattern: RegExp) {
        let matched = false
        for (const callArgs of self.callArgs) {
          if (matched) break
          for (const arg of callArgs) {
            if (matched) break
            if (typeof arg === 'object' && arg !== null) {
              matched = deepMatch(arg, pattern)
            } else {
              matched = pattern.test(String(arg))
            }
          }
        }
        assert(matched, `Expected ${self.methodName} to be called matching: ${pattern}`)
      },
      matchExactly(...expectedArgs: unknown[]) {
        const matched = self.callArgs.some(
          (callArgs) =>
            callArgs.length === expectedArgs.length &&
            callArgs.every((a, i) => isDeepStrictEqual(a, expectedArgs[i]))
        )
        assert(
          matched,
          `Expected ${self.methodName} to be called matchExactly args${inspect(expectedArgs, { depth: 10 })}`
        )
      },
      reset() {
        self.callArgs = []
      },
      not: {} as Omit<CalledExpect, 'reset' | 'not'>,
    }

    function negate(fn: (...args: any[]) => void) {
      return (...args: any[]) => {
        try {
          fn(...args)
        } catch {
          return // original threw, so negation passes
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
    }

    const expect: MockExpect = {
      called,
      invocation(index: number) {
        if (index >= self.callArgs.length) {
          throw new Error('invocation out of range')
        }
        const args = self.callArgs[index]
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

/** Configure the behavior of a mocked method. */
export interface MockSetup {
  /** Return a fixed value when invoked. */
  toReturn(value: any): MockSetup
  /** Replace the method body with a custom function. */
  toDoThis(fn: AnyFunc): MockSetup
  /** Throw an error with the given message when invoked. */
  toThrow(message: string): MockSetup
  /** Return a resolved promise with the given value. */
  toResolveWith(value: any): MockSetup
  /** Return a resolved promise with no value. */
  toResolve(): MockSetup
  /** Return a rejected promise with the given error. */
  toRejectWith(error: any): MockSetup
  /** Invoke the first callback argument with the given args. */
  toCallbackWith(...args: any[]): MockSetup
  /** Emit an event on the wrapped object when invoked. */
  toEmit(eventName: string, ...params: any[]): MockSetup
  /** Call the interceptor with args, then call the original method. */
  toIntercept(fn: AnyFunc): MockSetup
  /** Schedule the callback with an accelerated timeout. */
  toTimeWarp(ms: number): MockSetup
  /** Apply the next behavior only when args match the predicate or value. */
  when(predicateOrValue: any): MockSetup
  /** Apply the next behavior only for the first `n` invocations. */
  times(n: number): MockSetup
  /** Apply the next behavior only for the first invocation. */
  once(): MockSetup
  /** Apply the next behavior only for the first two invocations. */
  twice(): MockSetup
  /** Clear all configured behaviors, revert to original. */
  fallback(): MockSetup
  /** Chaining alias — returns the setup object for readability. */
  readonly and: MockSetup
  /** Chaining alias — returns the setup object for readability. */
  readonly then: MockSetup
}

/** Assert expectations about how a method was called. */
export interface CalledExpect {
  /** Assert called exactly `n` times. */
  times(n: number, err?: string): void
  /** Assert called exactly once. */
  once(): void
  /** Assert called exactly twice. */
  twice(): void
  /** Assert never called. */
  never(): void
  /** Assert call count is less than `n`. */
  lt(n: number): void
  /** Assert call count is less than or equal to `n`. */
  lte(n: number): void
  /** Assert call count is greater than `n`. */
  gt(n: number): void
  /** Assert call count is greater than or equal to `n`. */
  gte(n: number): void
  /** Assert called with an argument matching (partial deep equal). */
  withArg(arg: unknown): void
  /** Assert called with all specified arguments (partial deep equal). */
  withArgs(...args: unknown[]): void
  /** Assert called with an argument matching the regex pattern. */
  withMatch(pattern: RegExp): void
  /** Assert called with exactly these arguments (strict deep equal). */
  matchExactly(...args: unknown[]): void
  /** Reset call count and recorded arguments. */
  reset(): void
  /** Negated expectations — pass when the positive assertion would fail. */
  not: Omit<CalledExpect, 'reset' | 'not'>
}

/** Assert expectations about a specific invocation by index. */
export interface InvocationExpect {
  /** Assert this invocation included the given argument. */
  withArg(arg: unknown): void
  /** Assert this invocation included all the given arguments. */
  withArgs(...args: unknown[]): void
}

/** Expectation interface for a mocked method. */
export interface MockExpect {
  /** Call count and argument assertions. */
  called: CalledExpect
  /** Access a specific invocation by zero-based index. */
  invocation(index: number): InvocationExpect
}
