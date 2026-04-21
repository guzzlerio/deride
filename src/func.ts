import { MethodMock, MethodSpy, TypedMockSetup, MockExpect } from './method-mock.js'

type AnyFunc = (...args: any[]) => any

/**
 * A standalone mocked function. Behaves as a callable proxy whose `setup`,
 * `expect`, and `spy` properties provide the same facades as a method on a
 * wrapped object. Created via {@link func}.
 */
export type MockedFunction<F extends AnyFunc = AnyFunc> = F & {
  /** Configure behaviour (`toReturn`, `toResolveWith`, `when`, etc.). */
  setup: F extends (...args: infer A) => infer R ? TypedMockSetup<A, R> : TypedMockSetup
  /** Assert how it was called. */
  expect: MockExpect
  /** Read-only inspection (call count, args, return values). */
  spy: MethodSpy
}

/**
 * Create a standalone mocked function. If `original` is supplied, the mock
 * falls back to calling it when no behaviour matches; otherwise the
 * unconfigured mock returns `undefined`.
 *
 * @example
 *   const fn = func<(x: number) => number>()
 *   fn.setup.toReturn(42)
 *   fn(1) // 42
 */
export function func<F extends AnyFunc>(original?: F): MockedFunction<F> {
  const mock = new MethodMock(original, { name: original?.name })
  return mock.createProxy() as MockedFunction<F>
}
