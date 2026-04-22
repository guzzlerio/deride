import assert from 'node:assert/strict'
import { inspect } from 'node:util'
import { CallRecord } from './call-record.js'
import { matchValue } from './matchers.js'
import { historySuffix } from './mock-spy.js'
import { deepMatch, hasMatch, humanise } from './utils.js'

/**
 * Assertions about how a method was called. The `.called` branch asserts
 * "at least one" call matches; the `.everyCall` sister-branch on `MockExpect`
 * asserts "all" calls match.
 */
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
  /** Assert called with an argument matching (partial deep equal, matcher-aware). */
  withArg(arg: unknown): void
  /** Assert called with all specified arguments (partial deep equal, matcher-aware). */
  withArgs(...args: unknown[]): void
  /** Assert called with an argument matching the regex pattern (searches nested strings). */
  withMatch(pattern: RegExp): void
  /** Assert called with exactly these arguments (strict deep equal, matcher-aware). */
  matchExactly(...args: unknown[]): void
  /** Assert at least one call returned a value matching `expected` (value or matcher). */
  withReturn(expected: unknown): void
  /** Assert at least one call had its `this` bound to `target` (identity compare). */
  calledOn(target: unknown): void
  /** Assert at least one call threw. With no argument, any throw passes. */
  threw(expected?: unknown): void
  /** Reset call count and recorded arguments. */
  reset(): void
  /** Negated expectations — pass when the positive assertion would fail. */
  not: Omit<CalledExpect, 'reset' | 'not'>
}

/**
 * Assertions about a specific invocation, keyed by zero-based index. Obtained
 * via `expect.method.invocation(i)`.
 */
export interface InvocationExpect {
  /** Assert this invocation included the given argument. */
  withArg(arg: unknown): void
  /** Assert this invocation included all the given arguments. */
  withArgs(...args: unknown[]): void
}

/** Expectation surface for a mocked method — the top-level `mock.expect.method`. */
export interface MockExpect {
  /** "At-least-one" assertions. */
  called: CalledExpect
  /** "Every-call" assertions; throws when the method was never called (no vacuous-true). */
  everyCall: Omit<CalledExpect, 'reset' | 'not'>
  /** Assertions against a single invocation by zero-based index. */
  invocation(index: number): InvocationExpect
}

/** Narrow surface the expect factory needs from the owning MethodMock. */
export interface ExpectHost {
  /** Human-friendly method name for diagnostic output. */
  readonly name: string
  /** Live reference to the recorded calls array. */
  readonly calls: readonly CallRecord[]
  /** Clear the recorded call history. */
  clearCalls(): void
}

type Quantifier = 'some' | 'every'

function matchThrow(record: CallRecord, expected: unknown): boolean {
  if (record.threw === undefined) return false
  if (expected === undefined) return true
  if (typeof expected === 'string') {
    return record.threw instanceof Error && record.threw.message === expected
  }
  if (typeof expected === 'function') {
    return record.threw instanceof (expected as new (...a: unknown[]) => unknown)
  }
  return matchValue(record.threw, expected)
}

/**
 * Build the `called` / `everyCall` assertion objects, parameterised by
 * whether the quantifier is `some` or `every`. The two branches share this
 * single implementation — behaviour differs only in which array method is
 * used to aggregate per-call results.
 */
function buildAssertions(
  host: ExpectHost,
  quantifier: Quantifier
): Omit<CalledExpect, 'reset' | 'not'> {
  const agg = <T>(items: readonly T[], pred: (v: T) => boolean) =>
    quantifier === 'some' ? items.some(pred) : items.every(pred)

  const label = quantifier === 'some' ? '' : 'every call of '

  function assertCalled() {
    if (quantifier === 'every' && host.calls.length === 0) {
      assert.fail(`Expected ${label}${host.name} but it was never called`)
    }
  }

  const calls = () => host.calls

  return {
    times(n: number, err?: string) {
      if (!err) {
        err = `Expected ${host.name} to be called ${humanise(n)} but was ${humanise(host.calls.length)}`
      }
      assert.equal(host.calls.length, n, err)
    },
    once() {
      this.times(1)
    },
    twice() {
      this.times(2)
    },
    never() {
      this.times(0, `Expected ${host.name} to never be called but was ${humanise(host.calls.length)}`)
    },
    lt(n: number) {
      assert(
        host.calls.length < n,
        `Expected ${host.name} call count < ${n}, but got ${host.calls.length}`
      )
    },
    lte(n: number) {
      assert(
        host.calls.length <= n,
        `Expected ${host.name} call count <= ${n}, but got ${host.calls.length}`
      )
    },
    gt(n: number) {
      assert(
        host.calls.length > n,
        `Expected ${host.name} call count > ${n}, but got ${host.calls.length}`
      )
    },
    gte(n: number) {
      assert(
        host.calls.length >= n,
        `Expected ${host.name} call count >= ${n}, but got ${host.calls.length}`
      )
    },
    withArg(arg: unknown) {
      assertCalled()
      const result = agg(calls(), (c) => hasMatch(c.args as readonly unknown[], arg))
      assert(
        result,
        `Expected ${label}${host.name} to be called with: ${inspect(arg)}${historySuffix(host)}`
      )
    },
    withArgs(...args: unknown[]) {
      assertCalled()
      const result = agg(calls(), (c) =>
        args.every((expected) => hasMatch(c.args as readonly unknown[], expected))
      )
      assert(
        result,
        `Expected ${label}${host.name} to be called with: ${args.join(', ')}${historySuffix(host)}`
      )
    },
    withMatch(pattern: RegExp) {
      assertCalled()
      const matchOne = (c: CallRecord) =>
        (c.args as unknown[]).some((arg) =>
          typeof arg === 'object' && arg !== null
            ? deepMatch(arg as object, pattern)
            : pattern.test(String(arg))
        )
      assert(agg(calls(), matchOne), `Expected ${label}${host.name} to be called matching: ${pattern}`)
    },
    matchExactly(...expectedArgs: unknown[]) {
      assertCalled()
      const matched = agg(calls(), (c) =>
        c.args.length === expectedArgs.length &&
        (c.args as unknown[]).every((a, i) => matchValue(a, expectedArgs[i]))
      )
      assert(
        matched,
        `Expected ${label}${host.name} to be called matchExactly args${inspect(expectedArgs, { depth: 10 })}`
      )
    },
    withReturn(expected: unknown) {
      assertCalled()
      const matched = agg(calls(), (c) => 'returned' in c && matchValue(c.returned, expected))
      assert(
        matched,
        `Expected ${label}${host.name} to have returned: ${inspect(expected)}${historySuffix(host)}`
      )
    },
    calledOn(target: unknown) {
      assertCalled()
      assert(
        agg(calls(), (c) => c.thisArg === target),
        `Expected ${label}${host.name} to have been called on the given target`
      )
    },
    threw(expected?: unknown) {
      assertCalled()
      assert(
        agg(calls(), (c) => matchThrow(c, expected)),
        `Expected ${label}${host.name} to have thrown${expected !== undefined ? ': ' + inspect(expected) : ''}`
      )
    },
  }
}

/** Wrap an assertion function so it passes iff the original would throw. */
function negate<F extends (...args: any[]) => void>(fn: F): F {
  return ((...args: unknown[]) => {
    try {
      ;(fn as unknown as (...a: unknown[]) => void)(...args)
    } catch {
      return
    }
    assert.fail(`Expected negated assertion to fail but it passed`)
  }) as unknown as F
}

/** Build the full `mock.expect.method` surface (called + everyCall + invocation). */
export function createExpect(host: ExpectHost): MockExpect {
  const someBranch = buildAssertions(host, 'some')
  const everyBranch = buildAssertions(host, 'every')

  const called: CalledExpect = {
    ...someBranch,
    reset() {
      host.clearCalls()
    },
    not: {} as Omit<CalledExpect, 'reset' | 'not'>,
  }

  called.not = {
    times: negate(called.times.bind(called)),
    once: negate(called.once.bind(called)),
    twice: negate(called.twice.bind(called)),
    never: negate(called.never.bind(called)),
    lt: negate(called.lt.bind(called)),
    lte: negate(called.lte.bind(called)),
    gt: negate(called.gt.bind(called)),
    gte: negate(called.gte.bind(called)),
    withArg: negate(called.withArg.bind(called)),
    withArgs: negate(called.withArgs.bind(called)),
    withMatch: negate(called.withMatch.bind(called)),
    matchExactly: negate(called.matchExactly.bind(called)),
    withReturn: negate(called.withReturn.bind(called)),
    calledOn: negate(called.calledOn.bind(called)),
    threw: negate(called.threw.bind(called)),
  }

  return {
    called,
    everyCall: everyBranch,
    invocation(index: number): InvocationExpect {
      if (index >= host.calls.length) {
        throw new Error('invocation out of range')
      }
      const args = host.calls[index].args as unknown[]
      return {
        withArg(arg: unknown) {
          assert(
            hasMatch(args, arg),
            `Invocation #${index} did not include argument ${inspect(arg)}`
          )
        },
        withArgs(...expectedArgs: unknown[]) {
          assert(
            expectedArgs.every((expected) => hasMatch(args, expected)),
            `Invocation #${index} did not include arguments ${inspect(expectedArgs)}`
          )
        },
      }
    },
  }
}
