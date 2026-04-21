import { EventEmitter } from 'node:events'
import { MethodSpy, TypedMockSetup, MockExpect, MockSnapshot } from './method-mock.js'

/** Extract typed setup for each method of T */
export type SetupMethods<T extends object> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? TypedMockSetup<A, R>
    : TypedMockSetup<any[], any>
}

export type ExpectMethods<T extends object> = Record<keyof T, MockExpect>

export type SpyMethods<T extends object> = Record<keyof T, MethodSpy>

export type Wrapped<T extends object> = T & {
  called: {
    reset: () => void
  }
  setup: SetupMethods<T>
  expect: ExpectMethods<T>
  spy: SpyMethods<T>
  /** Capture behaviours + call history for all methods. */
  snapshot: () => Record<string, MockSnapshot>
  /** Roll back behaviours + call history for all methods. */
  restore: (snap: Record<string, MockSnapshot>) => void
  on: (eventName: string, listener: (...args: any[]) => void) => EventEmitter
  once: (eventName: string, listener: (...args: any[]) => void) => EventEmitter
  emit: (eventName: string, ...args: any[]) => boolean
}

export type Options = {
  debug: {
    prefix: string | undefined
    suffix: string | undefined
  }
}
