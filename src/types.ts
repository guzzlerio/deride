import { EventEmitter } from 'node:events'
import { Expectations } from './expect.js'
import { Setup } from './setup.js'

export type Wrapped<T extends object> = T & {
    called: T & {
        not: T
        reset: () => void
    }
    setup: SetupMethods<T>
    expect: ExpectMethods<T>
    on: (eventName: string, listener: Function) => EventEmitter
    once: (eventName: string, listener: Function) => EventEmitter
    emit: (eventName: string, listener: Function) => EventEmitter
}
export type Options = {
    debug: {
        prefix: string | undefined
        suffix: string | undefined
    }
}

export type ExpectMethods<T extends object> = Record<keyof T, Expectations<T>>
export type SetupMethods<T extends object> = Record<keyof T, Setup<T>>
