/**
 * Vitest integration for deride. Import once at the top of a test file
 * (typically via `setupFiles`) to install custom matchers.
 *
 * ```ts
 * import 'deride/vitest'
 * expect(mock.spy.greet).toHaveBeenCalledOnce()
 * ```
 */
import { expect } from 'vitest'
import { MethodSpy } from './method-mock.js'
import { argsMatchAny, argsMatchAt, asSpy } from './matchers-runtime.js'

type MatchResult = { pass: boolean; message: () => string }

function built(pass: boolean, message: string): MatchResult {
  return { pass, message: () => message }
}

expect.extend({
  toHaveBeenCalled(received: unknown): MatchResult {
    const spy: MethodSpy = asSpy(received)
    return built(spy.callCount > 0, `expected mock to have been called (actual: ${spy.callCount})`)
  },
  toHaveBeenCalledTimes(received: unknown, n: number): MatchResult {
    const spy: MethodSpy = asSpy(received)
    return built(spy.callCount === n, `expected mock to have been called ${n} times (actual: ${spy.callCount})`)
  },
  toHaveBeenCalledOnce(received: unknown): MatchResult {
    const spy: MethodSpy = asSpy(received)
    return built(spy.callCount === 1, `expected mock to have been called once (actual: ${spy.callCount})`)
  },
  toHaveBeenCalledWith(received: unknown, ...expected: unknown[]): MatchResult {
    const spy: MethodSpy = asSpy(received)
    return built(argsMatchAny(spy, expected), `expected mock to have been called with the given args`)
  },
  toHaveBeenLastCalledWith(received: unknown, ...expected: unknown[]): MatchResult {
    const spy: MethodSpy = asSpy(received)
    return built(
      spy.calls.length > 0 && argsMatchAt(spy, spy.calls.length - 1, expected),
      `expected mock's last call to match the given args`
    )
  },
  toHaveBeenNthCalledWith(received: unknown, nth: number, ...expected: unknown[]): MatchResult {
    const spy: MethodSpy = asSpy(received)
    return built(argsMatchAt(spy, nth - 1, expected), `expected mock's call #${nth} to match the given args`)
  },
})

export {}
