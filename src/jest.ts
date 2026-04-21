/**
 * Jest integration for deride. Import once at the top of a test file
 * (typically via `setupFilesAfterEach`) to install custom matchers.
 *
 * ```ts
 * import 'deride/jest'
 * expect(mock.spy.greet).toHaveBeenCalledOnce()
 * ```
 *
 * We don't import jest types at the top because the package is optional; any
 * test project that installs deride/jest is expected to have jest in scope.
 */
import { MethodSpy } from './method-mock.js'
import { argsMatchAny, argsMatchAt, asSpy } from './matchers-runtime.js'

type MatchResult = { pass: boolean; message: () => string }

function built(pass: boolean, positiveMessage: string, negativeMessage: string): MatchResult {
  return { pass, message: () => (pass ? negativeMessage : positiveMessage) }
}

declare const expect: {
  extend(ext: Record<string, (...args: unknown[]) => MatchResult>): void
} | undefined

if (typeof expect !== 'undefined' && typeof expect.extend === 'function') {
  expect.extend({
    toHaveBeenCalled(received: unknown): MatchResult {
      const spy: MethodSpy = asSpy(received)
      return built(
        spy.callCount > 0,
        `expected mock to have been called (actual: ${spy.callCount})`,
        `expected mock not to have been called (actual: ${spy.callCount})`
      )
    },
    toHaveBeenCalledTimes(received: unknown, n: unknown): MatchResult {
      const spy: MethodSpy = asSpy(received)
      return built(
        spy.callCount === n,
        `expected mock to have been called ${n as number} times (actual: ${spy.callCount})`,
        `expected mock not to have been called ${n as number} times`
      )
    },
    toHaveBeenCalledOnce(received: unknown): MatchResult {
      const spy: MethodSpy = asSpy(received)
      return built(
        spy.callCount === 1,
        `expected mock to have been called once (actual: ${spy.callCount})`,
        `expected mock not to have been called once`
      )
    },
    toHaveBeenCalledWith(received: unknown, ...expected: unknown[]): MatchResult {
      const spy: MethodSpy = asSpy(received)
      return built(
        argsMatchAny(spy, expected),
        `expected mock to have been called with the given args`,
        `expected mock not to have been called with the given args`
      )
    },
    toHaveBeenLastCalledWith(received: unknown, ...expected: unknown[]): MatchResult {
      const spy: MethodSpy = asSpy(received)
      return built(
        spy.calls.length > 0 && argsMatchAt(spy, spy.calls.length - 1, expected),
        `expected mock's last call to match the given args`,
        `expected mock's last call not to match the given args`
      )
    },
    toHaveBeenNthCalledWith(received: unknown, nth: unknown, ...expected: unknown[]): MatchResult {
      const spy: MethodSpy = asSpy(received)
      return built(
        argsMatchAt(spy, (nth as number) - 1, expected),
        `expected mock's call #${nth as number} to match the given args`,
        `expected mock's call #${nth as number} not to match the given args`
      )
    },
  })
}

export {}
