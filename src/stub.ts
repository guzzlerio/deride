import Debug from 'debug'
import { Options, Wrapped } from './types.js'
import { getAllKeys, isFunction, PREFIX } from './utils.js'
import { wrap } from './wrap.js'

export function stub<T extends object>(
  target: T | (keyof T)[] | string[],
  properties?: { name: PropertyKey; options: PropertyDescriptor & ThisType<any> }[],
  options: Options = { debug: { prefix: PREFIX, suffix: 'stub' } }
) {
  const debug = Debug(`${options.debug.prefix}:${options.debug.suffix}`)

  let methods: string[]
  if (Array.isArray(target)) {
    methods = target as string[]
  } else {
    methods = getAllKeys(target as T).filter((m) => isFunction((target as any)[m])) as string[]
  }

  const stubObj: Record<string, any> = {}
  for (const method of methods) {
    stubObj[method] = function () {}
  }

  const wrapped = wrap(stubObj, options) as any

  // Apply property descriptors after wrapping so they sit directly on the wrapped object
  properties?.forEach((prop) => {
    debug('mapping property', prop)
    Object.defineProperty(wrapped, prop.name, prop.options)
  })

  return wrapped as Wrapped<T>
}
