import { EventEmitter } from 'node:events'
import { MockSetup, MockExpect } from './method-mock.js'

export type Wrapped<T extends object> = T & {
  called: {
    reset: () => void
  }
  setup: SetupMethods<T>
  expect: ExpectMethods<T>
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

export type SetupMethods<T extends object> = Record<keyof T, MockSetup>
export type ExpectMethods<T extends object> = Record<keyof T, MockExpect>
