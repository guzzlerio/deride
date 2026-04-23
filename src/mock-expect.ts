import assert from 'node:assert/strict'
import { inspect } from 'node:util'
import { CallRecord } from './call-record.js'
import { matchValue } from './matchers.js'
import { historySuffix } from './mock-spy.js'
import { deepMatch, hasMatch, humanise } from './utils.js'

/**
 * Argument, return-value, context, and throw assertions — chainable with
 * each other. Returned by count assertions so you can write
 * `called.once().withArg(x)` but NOT `called.once().twice()`.
 */
export interface ArgAssertions {
  /** Assert called with an argument matching (partial deep equal, matcher-aware). */
  withArg(arg: unknown): ArgAssertions
  /** Assert called with all specified arguments (partial deep equal, matcher-aware). */
  withArgs(...args: unknown[]): ArgAssertions
  /** Assert called with an argument matching the regex pattern (searches nested strings). */
  withMatch(pattern: RegExp): ArgAssertions
  /** Assert called with exactly these arguments (strict deep equal, matcher-aware). */
  matchExactly(...args: unknown[]): ArgAssertions
  /** Assert at least one call returned a value matching `expected` (value or matcher). */
  withReturn(expected: unknown): ArgAssertions
  /** Assert at least one call had its `this` bound to `target` (identity compare). */
  calledOn(target: unknown): ArgAssertions
  /** Assert at least one call threw. With no argument, any throw passes. */
  threw(expected?: unknown): ArgAssertions
}

/**
 * Call-count assertions. Each returns `ArgAssertions` so you can chain
 * argument/return checks after a count check, but not another count check.
 */
export interface CountAssertions {
  /** Assert called exactly `n` times. */
  times(n: number, err?: string): ArgAssertions
  /** Assert called exactly once. */
  once(): ArgAssertions
  /** Assert called exactly twice. */
  twice(): ArgAssertions
  /** Assert call count is less than `n`. */
  lt(n: number): ArgAssertions
  /** Assert call count is less than or equal to `n`. */
  lte(n: number): ArgAssertions
  /** Assert call count is greater than `n`. */
  gt(n: number): ArgAssertions
  /** Assert call count is greater than or equal to `n`. */
  gte(n: number): ArgAssertions
}

/**
 * Full assertion surface for the `.called` branch — count + arg assertions
 * plus terminal `never()` and `reset()`.
 */
export interface CalledExpect extends CountAssertions, ArgAssertions {
  /** Assert never called. Terminal — returns void, no chaining. */
  never(): void
  /** Reset call count and recorded arguments. Terminal — returns void. */
  reset(): void
  /** @deprecated Use `expect.method.not.called.*` instead. */
  not: CountAssertions & ArgAssertions & { never(): void }
}

/**
 * Assertion surface for the `.everyCall` branch — count + arg assertions.
 * Throws when the method was never called (no vacuous-true).
 */
export interface EveryCallExpect extends CountAssertions, ArgAssertions {}

/**
 * Shared shape for `called`/`everyCall` branches, used by both
 * `MockExpect` and `MockExpect.not`.
 */
export interface ExpectBranches {
  /** "At-least-one" assertions. */
  called: CalledExpect
  /** "Every-call" assertions; throws when the method was never called (no vacuous-true). */
  everyCall: EveryCallExpect
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
export interface MockExpect extends ExpectBranches {
  /** Assertions against a single invocation by zero-based index. */
  invocation(index: number): InvocationExpect
  /** Negated expectations — pass when the positive assertion would fail. */
  not: ExpectBranches
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
 * Assertion engine parameterised by quantifier (`some` or `every`).
 * The `called` branch uses `some` (at-least-one match); the `everyCall`
 * branch uses `every` (all calls must match).
 *
 * Every method returns `this` for fluent chaining, except `never()` which
 * is terminal and returns `void`.
 */
class AssertionBuilder implements CountAssertions, ArgAssertions {
  private readonly isEvery: boolean
  private readonly label: string

  constructor(
    private readonly host: ExpectHost,
    quantifier: Quantifier
  ) {
    this.isEvery = quantifier === 'every'
    this.label = this.isEvery ? 'every call of ' : ''
  }

  private aggregate(pred: (c: CallRecord) => boolean): boolean {
    return this.isEvery
      ? this.host.calls.every(pred)
      : this.host.calls.some(pred)
  }

  private assertCalled(): void {
    if (this.isEvery && this.host.calls.length === 0) {
      assert.fail(`Expected ${this.label}${this.host.name} but it was never called`)
    }
  }

  // ── Count assertions ──────────────────────────────────────────

  times(n: number, err?: string): this {
    if (!err) {
      err = `Expected ${this.host.name} to be called ${humanise(n)} but was ${humanise(this.host.calls.length)}`
    }
    assert.equal(this.host.calls.length, n, err)
    return this
  }

  once(): this {
    this.times(1)
    return this
  }

  twice(): this {
    this.times(2)
    return this
  }

  never(): void {
    this.times(0, `Expected ${this.host.name} to never be called but was ${humanise(this.host.calls.length)}`)
  }

  lt(n: number): this {
    assert(
      this.host.calls.length < n,
      `Expected ${this.host.name} call count < ${n}, but got ${this.host.calls.length}`
    )
    return this
  }

  lte(n: number): this {
    assert(
      this.host.calls.length <= n,
      `Expected ${this.host.name} call count <= ${n}, but got ${this.host.calls.length}`
    )
    return this
  }

  gt(n: number): this {
    assert(
      this.host.calls.length > n,
      `Expected ${this.host.name} call count > ${n}, but got ${this.host.calls.length}`
    )
    return this
  }

  gte(n: number): this {
    assert(
      this.host.calls.length >= n,
      `Expected ${this.host.name} call count >= ${n}, but got ${this.host.calls.length}`
    )
    return this
  }

  // ── Arg / return / context assertions ─────────────────────────

  withArg(arg: unknown): this {
    this.assertCalled()
    const result = this.aggregate((c) => hasMatch(c.args, arg))
    assert(
      result,
      `Expected ${this.label}${this.host.name} to be called with: ${inspect(arg)}${historySuffix(this.host)}`
    )
    return this
  }

  withArgs(...args: unknown[]): this {
    this.assertCalled()
    const result = this.aggregate((c) =>
      args.every((expected) => hasMatch(c.args, expected))
    )
    assert(
      result,
      `Expected ${this.label}${this.host.name} to be called with: ${args.join(', ')}${historySuffix(this.host)}`
    )
    return this
  }

  withMatch(pattern: RegExp): this {
    this.assertCalled()
    const result = this.aggregate((c) =>
      (c.args).some((arg) =>
        typeof arg === 'object' && arg !== null
          ? deepMatch(arg as object, pattern)
          : pattern.test(String(arg))
      )
    )
    assert(result, `Expected ${this.label}${this.host.name} to be called matching: ${pattern}`)
    return this
  }

  matchExactly(...expectedArgs: unknown[]): this {
    this.assertCalled()
    const matched = this.aggregate((c) =>
      c.args.length === expectedArgs.length &&
      (c.args).every((a, i) => matchValue(a, expectedArgs[i]))
    )
    assert(
      matched,
      `Expected ${this.label}${this.host.name} to be called matchExactly args${inspect(expectedArgs, { depth: 10 })}`
    )
    return this
  }

  withReturn(expected: unknown): this {
    this.assertCalled()
    const matched = this.aggregate((c) => 'returned' in c && matchValue(c.returned, expected))
    assert(
      matched,
      `Expected ${this.label}${this.host.name} to have returned: ${inspect(expected)}${historySuffix(this.host)}`
    )
    return this
  }

  calledOn(target: unknown): this {
    this.assertCalled()
    assert(
      this.aggregate((c) => c.thisArg === target),
      `Expected ${this.label}${this.host.name} to have been called on the given target`
    )
    return this
  }

  threw(expected?: unknown): this {
    this.assertCalled()
    assert(
      this.aggregate((c) => matchThrow(c, expected)),
      `Expected ${this.label}${this.host.name} to have thrown${expected !== undefined ? ': ' + inspect(expected) : ''}`
    )
    return this
  }
}

/**
 * Wrap a builder in a Proxy that negates every method call — the method
 * passes iff the original would have thrown. Chaining returns the proxy
 * itself (except `never` which stays terminal).
 */
function negateBranch(source: AssertionBuilder): AssertionBuilder {
  return new Proxy(source, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, target)
      if (typeof value !== 'function') return value
      return (...args: unknown[]) => {
        try {
          value.apply(target, args)
        } catch {
          return prop === 'never' ? undefined : receiver
        }
        assert.fail(`Expected negated assertion to fail but it passed`)
      }
    },
  })
}

/** Build the full `mock.expect.method` surface (called + everyCall + not + invocation). */
export function createExpect(host: ExpectHost): MockExpect {
  const someBuilder = new AssertionBuilder(host, 'some')
  const everyBuilder = new AssertionBuilder(host, 'every')

  const negatedSome = negateBranch(someBuilder)

  const called: CalledExpect = Object.create(someBuilder, {
    reset: { value: () => host.clearCalls() },
    not: { value: negatedSome },
  })

  const notCalled: CalledExpect = Object.create(negatedSome, {
    reset: { value: () => host.clearCalls() },
    not: { value: someBuilder },
  })

  return {
    called,
    everyCall: everyBuilder,
    not: {
      called: notCalled,
      everyCall: negateBranch(everyBuilder),
    },
    invocation(index: number): InvocationExpect {
      if (index >= host.calls.length) {
        throw new Error('invocation out of range')
      }
      const record = host.calls[index]
      return {
        withArg(arg: unknown) {
          assert(
            hasMatch(record.args, arg),
            `Invocation #${index} did not include argument ${inspect(arg)}`
          )
        },
        withArgs(...expectedArgs: unknown[]) {
          assert(
            expectedArgs.every((expected) => hasMatch(record.args, expected)),
            `Invocation #${index} did not include arguments ${inspect(expectedArgs)}`
          )
        },
      }
    },
  }
}
