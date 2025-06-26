import { func } from './func.js'
import { stub } from './stub.js'
import { wrap } from './wrap.js'

/*
// AI Generated clap-trap, but there's a few details I might use

type AnyFunc = (...args: any[]) => any
type StubBehavior = {
  predicate: (args: any[]) => boolean
  action: AnyFunc
  times?: number
}
class MethodMock {
  private callArgs: any[][] = []
  private behaviors: StubBehavior[] = []
  private currentBehavior: Partial<StubBehavior> = {}

  constructor(private original?: AnyFunc) {
    const fn: AnyFunc = (...args) => {
      this.callArgs.push(args)
      const behavior = this.behaviors.find(
        (b) => b.predicate(args) && (!b.times || b.times > 0),
      )
      if (behavior) {
        if (behavior.times !== undefined) behavior.times--
        return behavior.action(...args)
      }
      return this.original ? this.original(...args) : undefined
    }

    const proxy = new Proxy(fn, {
      get: (_, prop: string) => {
        if (prop === 'expect') return this.expect
        if (prop === 'setup') return this.setup
        return (this as any)[prop]
      },
    })

    return proxy as any
  }

  private addBehavior(action: AnyFunc) {
    const pred = this.currentBehavior.predicate ?? (() => true)
    const times = this.currentBehavior.times
    this.behaviors.push({ predicate: pred, action, times })
    this.currentBehavior = {}
    return this
  }

  public readonly setup = {
    toReturn: (value: any) => this.addBehavior(() => value),
    toThrow: (error: any) =>
      this.addBehavior(() => {
        throw error
      }),
    toDoThis: (fn: AnyFunc) => this.addBehavior((...args) => fn(...args)),
    toCallbackWith: (...cbArgs: any[]) =>
      this.addBehavior((...args) => {
        const cb = args.find((arg) => typeof arg === 'function')
        if (!cb) assert.fail('No callback function found')
        cb(...cbArgs)
      }),
    toCallbackWithAsync: (...cbArgs: any[]) =>
      this.addBehavior(async (...args) => {
        const cb = args.find((arg) => typeof arg === 'function')
        if (!cb) assert.fail('No callback function found')
        await Promise.resolve()
        cb(...cbArgs)
      }),
    toResolveWith: (val: any) => this.addBehavior(() => Promise.resolve(val)),
    toRejectWith: (err: any) => this.addBehavior(() => Promise.reject(err)),
    toEmit: (emitter: any, event: string, payload: any) =>
      this.addBehavior(() => {
        emitter.emit(event, payload)
      }),
    when: (predicateOrValue: any) => {
      this.currentBehavior.predicate =
        typeof predicateOrValue === 'function'
          ? predicateOrValue
          : (args: any[]) => args[0] === predicateOrValue
      return this.setup
    },
    times: (n: number) => {
      this.currentBehavior.times = n
      return this.setup
    },
  }

  public readonly expect = {
    called: {
      times: (n: number) => {
        if (this.callArgs.length !== n)
          assert.fail(
            `Expected to be called ${n} times but was called ${this.callArgs.length} times`,
          )
      },
      once: () => this.expect.called.times(1),
      twice: () => this.expect.called.times(2),
      lt: (n: number) => {
        if (!(this.callArgs.length < n))
          assert.fail(
            `Expected call count < ${n}, but got ${this.callArgs.length}`,
          )
      },
      lte: (n: number) => {
        if (!(this.callArgs.length <= n))
          assert.fail(
            `Expected call count <= ${n}, but got ${this.callArgs.length}`,
          )
      },
      gt: (n: number) => {
        if (!(this.callArgs.length > n))
          assert.fail(
            `Expected call count > ${n}, but got ${this.callArgs.length}`,
          )
      },
      gte: (n: number) => {
        if (!(this.callArgs.length >= n))
          assert.fail(
            `Expected call count >= ${n}, but got ${this.callArgs.length}`,
          )
      },
      never: () => this.expect.called.times(0),
      withArg: (arg: any) => {
        if (!this.callArgs.some((call) => call.some((a) => deepEqual(a, arg))))
          assert.fail(
            `Expected to be called with argument ${JSON.stringify(arg)}`,
          )
      },
      withArgs: (...args: any[]) => {
        if (
          !this.callArgs.some((call) =>
            args.every((a, i) => deepEqual(a, call[i])),
          )
        )
          assert.fail(`Expected call with args ${JSON.stringify(args)}`)
      },
      withMatch: (regex: RegExp) => {
        if (
          !this.callArgs.some((call) =>
            call.some((arg) => typeof arg === 'string' && regex.test(arg)),
          )
        )
          assert.fail(`Expected call with argument matching ${regex}`)
      },
      matchExactly: (...args: any[]) => {
        if (
          !this.callArgs.some(
            (call) =>
              call.length === args.length &&
              call.every((a, i) => deepEqual(a, args[i])),
          )
        ) {
          assert.fail(`Expected call with exact args ${JSON.stringify(args)}`)
        }
      },
      reset: () => {
        this.callArgs = []
      },
    },
    invocation: (i: number) => ({
      withArg: (arg: any) => {
        const call = this.callArgs[i]
        if (!call || !call.some((a) => deepEqual(a, arg)))
          assert.fail(
            `Invocation #${i} did not include argument ${JSON.stringify(arg)}`,
          )
      },
    }),
  }
}

// Public API
export function func<F extends AnyFunc>(
  original?: F,
): F & { expect: any; setup: any } {
  return new MethodMock(original) as any
}

export function stub<T extends object>(
  methodNames: string[],
  base: Partial<T> = {},
): T & Record<keyof T, any> {
  const mocked: any = { setup: {}}
  methodNames.forEach((name) => (mocked[name] = func()))
  return Object.assign<T, Partial<T>>(mocked, base)
}

export function wrap<T extends object>(target: T): T {
  const wrapped: any = {}
  for (const key of Object.keys(target)) {
    const value = (target as any)[key]
    wrapped[key] =
      typeof value === 'function' ? func(value.bind(target)) : value
  }
  return wrapped
}
*/

export const deride = { func, stub, wrap }
export default deride
