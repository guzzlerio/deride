import { MethodMock, MethodSpy, TypedMockSetup, MockExpect } from './method-mock.js'

type AnyFunc = (...args: any[]) => any

export type MockedFunction<F extends AnyFunc = AnyFunc> = F & {
  setup: F extends (...args: infer A) => infer R ? TypedMockSetup<A, R> : TypedMockSetup
  expect: MockExpect
  spy: MethodSpy
}

export function func<F extends AnyFunc>(original?: F): MockedFunction<F> {
  const mock = new MethodMock(original, { name: original?.name })
  return mock.createProxy() as MockedFunction<F>
}
