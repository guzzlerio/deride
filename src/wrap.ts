import Debug from 'debug'
import { EventEmitter } from 'node:events'
import { getAllKeys, isFunction, PREFIX, proxyFunctions } from './utils.js'
import { MethodMock, MethodSpy, MockExpect, MockSetup } from './method-mock.js'
import { func } from './func.js'
import { Options, Wrapped } from './types.js'

export function wrap<T extends object>(
  obj: T,
  options: Options = { debug: { prefix: PREFIX, suffix: 'wrap' } }
): Wrapped<T> {
  if (typeof obj === 'function') {
    return func(obj as never) as unknown as Wrapped<T>
  }

  const debug = Debug(`${options.debug.prefix}:${options.debug.suffix}`)
  const objMethods = getAllKeys(obj).filter((m) => isFunction((obj as Record<PropertyKey, unknown>)[m as PropertyKey]))
  const mocks = {} as Record<string, MethodMock>
  const setupMethods = {} as Record<string, MockSetup>
  const expectMethods = {} as Record<string, MockExpect>
  const spyMethods = {} as Record<string, MethodSpy>
  const self = {} as Record<string, unknown> & {
    setup: Record<string, MockSetup>
    expect: Record<string, MockExpect>
    spy: Record<string, MethodSpy>
    called: { reset: () => void }
    snapshot: () => Record<string, ReturnType<MethodMock['snapshot']>>
    restore: (snap: Record<string, ReturnType<MethodMock['snapshot']>>) => void
  }

  const eventEmitter = new EventEmitter()
  proxyFunctions(self as never, eventEmitter as never, ['on', 'once', 'emit'] as never)

  for (const m of objMethods) {
    const method = String(m)
    debug('mapping', method)

    const original = (obj as Record<string, unknown>)[method]
    const mock = new MethodMock(
      typeof original === 'function' ? (original as (...a: unknown[]) => unknown).bind(obj) : undefined,
      { name: method, emitter: eventEmitter }
    )

    mocks[method] = mock
    setupMethods[method] = mock.setup
    expectMethods[method] = mock.expect
    spyMethods[method] = mock.spy

    self[method] = function (this: unknown, ...args: unknown[]) {
      return mock.invoke(args, this === undefined ? self : this)
    }
  }

  self.setup = setupMethods
  self.expect = expectMethods
  self.spy = spyMethods

  self.called = {
    reset: () => {
      for (const method in mocks) {
        mocks[method].reset()
      }
    },
  }

  self.snapshot = () => {
    const out: Record<string, ReturnType<MethodMock['snapshot']>> = {}
    for (const method in mocks) out[method] = mocks[method].snapshot()
    return out
  }

  self.restore = (snap: Record<string, ReturnType<MethodMock['snapshot']>>) => {
    for (const method in snap) {
      if (mocks[method]) mocks[method].restoreSnapshot(snap[method])
    }
  }

  for (const key of getAllKeys(obj)) {
    if (!(String(key) in self) && !isFunction((obj as Record<PropertyKey, unknown>)[key as PropertyKey])) {
      ;(self as Record<string, unknown>)[String(key)] = (obj as Record<string, unknown>)[String(key)]
    }
  }

  for (const method in mocks) mocks[method].setSelf(self)

  return self as unknown as Wrapped<T>
}
