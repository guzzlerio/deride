import { Options, Wrapped } from './types.js'
import { _, getAllKeys, PREFIX, proxyFunctions } from './utils.js'
import { wrap } from './wrap.js'

export function stub<T extends object>(
  target: T | keyof T[] | string[],
  properties?: { name: PropertyKey; options: PropertyDescriptor & ThisType<any> }[],
  options: Options = { debug: { prefix: PREFIX, suffix: 'wrap' } }
) {
  const debug = require('debug')(`${options.debug.prefix}:${options.debug.suffix}`)
  debug(target, properties)
  let methods = []
  if (_.isArray(target)) {
    methods = target
  } else {
    methods = getAllKeys(target as T) as string[]
  }

  let stubObj: Record<string, any> = {}
  const emptyMethod = function () {
    return function () {}
  }
  for (let i = 0; i < methods.length; i++) {
    stubObj[String(methods[i])] = emptyMethod()
  }
  debug('********************', properties)
  properties?.forEach(
    (prop: { name: PropertyKey; options: PropertyDescriptor & ThisType<any> }) => {
      debug('mapping property', prop)
      stubObj = Object.defineProperty(stubObj, prop.name, prop.options)
    }
  )
  debug('&&&&&&&&&&', Object.getOwnPropertyNames(stubObj), stubObj)
  return wrap(stubObj, options) as Wrapped<T>
}
