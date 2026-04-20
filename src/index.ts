import { func } from './func.js'
import { stub } from './stub.js'
import { wrap } from './wrap.js'

export { func, stub, wrap }
export type { Wrapped, Options } from './types.js'
export type { MockSetup, MockExpect, CalledExpect, InvocationExpect } from './method-mock.js'
export type { MockedFunction } from './func.js'

export const deride = { func, stub, wrap }
export default deride
