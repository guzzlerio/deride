import { func } from './func.js'
import { inOrder } from './in-order.js'
import { match } from './matchers.js'
import { sandbox } from './sandbox.js'
import { stub } from './stub.js'
import { wrap } from './wrap.js'

export { func, inOrder, match, sandbox, stub, wrap }
export type { Wrapped, Options } from './types.js'
export type {
  TypedMockSetup,
  MockSetup,
  MockExpect,
  CalledExpect,
  InvocationExpect,
  MethodSpy,
  CallRecord,
  MockSnapshot,
} from './method-mock.js'
export type { MockedFunction } from './func.js'
export type { Matcher } from './matchers.js'
export type { Sandbox } from './sandbox.js'
export type { MockedClass } from './stub.js'

/**
 * Convenience namespace bundling every public function. Using `deride.stub()`
 * reads the same as the named export `stub()` — pick whichever import style
 * fits the codebase.
 */
export const deride = { func, inOrder, match, sandbox, stub, wrap }
export default deride
