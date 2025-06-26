import Debug from 'debug'
import EventEmitter from 'node:events'
import assert from 'node:assert/strict'
import { SetupMethods } from './types.js'
import { getAllKeys, humanise, PREFIX, _ } from './utils.js'

export type Setup<T extends object> = T & {
  call: () => any
  times: () => Setup<T>
  once: () => Setup<T>
  twice: () => Setup<T>
  fallback: () => Setup<T>
  toCallbackWith: () => Setup<T>
  toDoThis: (fn: Function) => Setup<T>
  toEmit: (...args: any[]) => Setup<T>
  toIntercept: () => Setup<T>
  toReject: () => Setup<T>
  toRejectWith: () => Setup<T>
  toResolve: () => Setup<T>
  toResolveWith: () => Setup<T>
  toReturn: (value: unknown) => Setup<T>
  toThrow: (message: string) => Setup<T>
  toTimeWarp: () => Setup<T>
  when: () => Setup<T>
}

type AnyFunc = (...args: any[]) => any
type StubBehavior = {
  predicate: (args: any[]) => boolean
  action: AnyFunc
  times?: number
}

export function Setup<T extends object>(
  obj: T,
  method: keyof T,
  emitter: EventEmitter,
): Setup<T> {
  const debug = Debug(PREFIX + ':setup:' + String(method))
  const originalMethod: Function = (obj as any)[method]
  let callToInvoke: (...args: unknown[]) => unknown = normalCall
  let callQueue: Array<any> = []
  let callToInvokeOnArguments: Record<string, AnyFunc> = {}
  let callQueueBasedOnArgs: Record<string, AnyFunc[]> = {}
  let argumentsPredicate: Function | null
  let lastPredicate: Function | undefined = undefined
  let beforeFunc: Function | undefined = undefined
  let key: string
  let functionPredicates = []
  let useCallQueue = false

  let self: any = {}

  const addBehavior = (action: AnyFunc) => {
    checkArgumentsToInvoke(action)
    return Object.freeze(self)
  }

  self.call = () => {
    debug('call')
    const args: unknown[] = Array.from(arguments)

    const key = serializeArgs(arguments)
    const callFromQueueBasedOnArgs = callQueueBasedOnArgs[key]
    if (_.isArray(callFromQueueBasedOnArgs)) {
      var f = callFromQueueBasedOnArgs.pop()
      if (_.isFunction(f)) {
        debug('callFromQueueBasedOnArgs')
        return f.apply(self, args)
      }
      return callToInvoke.apply(self, args)
    }
    const callBasedOnArgs = callToInvokeOnArguments[key]
    if (_.isFunction(callBasedOnArgs)) {
      debug('callBasedOnArgs')
      return callBasedOnArgs.apply(self, args)
    }
    return callToInvoke.apply(self, args)
  }
  self.times = () => {
    return Object.freeze(self)
  }
  self.once = () => {
    return Object.freeze(self)
  }
  self.twice = () => {
    return Object.freeze(self)
  }
  self.fallback = () => {
    return Object.freeze(self)
  }
  self.toCallbackWith = () => {
    return Object.freeze(self)
  }
  self.toDoThis = (func: (...args: unknown[]) => unknown) =>
    addBehavior(() => {
      debug('toDoThis override', arguments[1])
      const args: unknown[] = Array.from(arguments)
      return func.apply(obj, args)
    })
  self.toEmit = (eventName: string | symbol, ...params: any[]) => {
    const func = () => {
      debug('toEmit', arguments[1], eventName, params)
      emitter.emit.apply(emitter, [eventName, params])
      return originalMethod.apply(obj, arguments)
    }
    checkArgumentsToInvoke(func)
    return Object.freeze(self)
  }
  self.toIntercept = () => {
    return Object.freeze(self)
  }
  self.toReject = () => {
    return Object.freeze(self)
  }
  self.toRejectWith = () => {
    return Object.freeze(self)
  }
  self.toResolve = () => {
    return Object.freeze(self)
  }
  self.toResolveWith = () => {
    return Object.freeze(self)
  }
  self.toReturn = (value: any) =>
    addBehavior(() => {
      debug('toReturn', value)
      return value
    })
  self.toThrow = (message: string) =>
    addBehavior(() => {
      debug('toThrow', message, arguments)
      throw new Error(message)
    })
  self.toTimeWarp = () => {
    return Object.freeze(self)
  }
  self.when = () => {
    return Object.freeze(self)
  }

  function checkArgumentsToInvoke(func: AnyFunc) {
    debug('checkArgumentsToInvoke')
    if (argumentsPredicate !== null && argumentsPredicate !== undefined) {
      key = serializeArgs(argumentsPredicate)
      debug('argumentsPredicate', key)
      callToInvokeOnArguments[key] = func
      callQueueBasedOnArgs[key] = [...callQueueBasedOnArgs[key], func]
      debug('callQueueBasedOnArgs', callQueueBasedOnArgs)
      argumentsPredicate = null
      return
    }
    if (_.isFunction(lastPredicate)) {
      functionPredicates.push([lastPredicate, func])
      return
    }
    debug('no predicate function', { callQueue })
    callToInvoke = func
    if (useCallQueue) {
      debug('using the callQueue')
      callQueue.unshift(func)
    }
  }

  function normalCall() {
    debug('normal call', method)
    var result = originalMethod.apply(obj, arguments)
    return result
  }

  function serializeArgs(args: unknown) {
    return JSON.stringify(args)
  }
  return Object.freeze(self)
}
