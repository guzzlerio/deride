import Debug from 'debug'
import { EventEmitter } from 'node:events'
import { getAllKeys, PREFIX, proxyFunctions } from './utils.js'
import { Expectations } from './expect.js'
import { Setup } from './setup.js'
import { Options, Wrapped } from './types.js'

export function wrap<T extends object>(
    obj: T,
    options: Options = { debug: { prefix: PREFIX, suffix: 'wrap' } },
): Wrapped<T> {
    const debug = Debug(`${options.debug.prefix}:${options.debug.suffix}`)
    const objMethods = getAllKeys(obj)
    const expectMethods = {} as Record<keyof T, Expectations<T>>
    const setupMethods = {} as Record<keyof T, Setup<T>>
    const self = {} as any //as Record<keyof Wrapped<T>, any>

    const eventEmitter = new EventEmitter()
    proxyFunctions(self, eventEmitter, ['on', 'once', 'emit'])

    for (const m of objMethods) {
        debug('mapping', m)
        let method: keyof T = m as unknown as keyof T
        expectMethods[method] = Expectations(obj, method)
        setupMethods[method] = Setup(obj, method, eventEmitter)
        self[method] = setupForMethod(method)
    }

    function setupForMethod(method: keyof typeof obj) {
        debug(`setupForMethod: ${String(method)}`)
        return function () {
            expectMethods[method].call.apply(obj, arguments as any)
            return setupMethods[method].call.apply(obj, arguments as any)
        }
    }

    self.expect = expectMethods
    self.setup = setupMethods

    self.called = {
        reset: () => {},
    }
    return {
        ...obj,
        ...self,
    }
}
