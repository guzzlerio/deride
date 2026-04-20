import Debug from 'debug'
import { EventEmitter } from 'node:events'
import { getAllKeys, isFunction, PREFIX, proxyFunctions } from './utils.js'
import { MethodMock, MockSetup, MockExpect } from './method-mock.js'
import { func } from './func.js'
import { Options, Wrapped } from './types.js'

export function wrap<T extends object>(
  obj: T,
  options: Options = { debug: { prefix: PREFIX, suffix: 'wrap' } }
): Wrapped<T> {
  // If obj is a function, delegate to func() for standalone function mocking
  if (typeof obj === 'function') {
    return func(obj as any) as any
  }

  const debug = Debug(`${options.debug.prefix}:${options.debug.suffix}`)
  const objMethods = getAllKeys(obj).filter((m) => isFunction((obj as any)[m]))
  const mocks = {} as Record<string, MethodMock>
  const setupMethods = {} as Record<string, MockSetup>
  const expectMethods = {} as Record<string, MockExpect>
  const self = {} as any

  const eventEmitter = new EventEmitter()
  proxyFunctions(self, eventEmitter, ['on', 'once', 'emit'])

  for (const m of objMethods) {
    const method = String(m)
    debug('mapping', method)

    const original = (obj as any)[method]
    const mock = new MethodMock(
      typeof original === 'function' ? original.bind(obj) : undefined,
      { name: method, emitter: eventEmitter }
    )

    mocks[method] = mock
    setupMethods[method] = mock.setup
    expectMethods[method] = mock.expect

    self[method] = (...args: any[]) => mock.invoke(args)
  }

  self.setup = setupMethods
  self.expect = expectMethods

  self.called = {
    reset: () => {
      for (const method in mocks) {
        mocks[method].reset()
      }
    },
  }

  // Copy non-function properties from original object
  for (const key of getAllKeys(obj)) {
    if (!(String(key) in self) && !isFunction((obj as any)[key])) {
      self[String(key)] = (obj as any)[key]
    }
  }

  return self as Wrapped<T>
}
