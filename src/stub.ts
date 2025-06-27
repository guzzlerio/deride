import { Options, Wrapped } from './types.js'
import { _, getAllKeys, PREFIX, proxyFunctions } from './utils.js'
import { wrap } from './wrap.js'

export function stub<T extends object>(
  target: T | keyof T[] | string[],
  properties?: any,
  options: Options = { debug: { prefix: PREFIX, suffix: 'wrap' } },
){
  const debug = require('debug')(
    `${options.debug.prefix}:${options.debug.suffix}`,
  )
  debug(target)
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
  properties?.forEach((prop: { name: PropertyKey; options: PropertyDescriptor & ThisType<any> }) => {
    Object.defineProperty(stubObj, prop.name, prop.options)
  })
  return wrap(stubObj, options) as Wrapped<T>
}
