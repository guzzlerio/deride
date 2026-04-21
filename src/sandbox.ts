import { func as coreFunc, MockedFunction } from './func.js'
import { stub as coreStub } from './stub.js'
import { Wrapped } from './types.js'
import { wrap as coreWrap } from './wrap.js'

type AnyFunc = (...args: any[]) => any

type Registered = { reset: () => void; restore?: () => void }

export interface Sandbox {
  stub: typeof coreStub
  wrap: typeof coreWrap
  func: typeof coreFunc
  /** Clear call history on every registered mock. Behaviours are preserved. */
  reset(): void
  /** Clear behaviours and call history on every registered mock. */
  restore(): void
  /** Current number of registered mocks. */
  readonly size: number
}

export function sandbox(): Sandbox {
  const registered: Registered[] = []

  function register<T extends object>(mock: Wrapped<T> | MockedFunction<AnyFunc>): void {
    const m = mock as unknown as {
      called?: { reset: () => void }
      setup?: Record<string, { fallback?: () => void }>
    }
    registered.push({
      reset: () => m.called?.reset(),
      restore: () => {
        m.called?.reset()
        if (m.setup) {
          for (const key of Object.keys(m.setup)) {
            m.setup[key]?.fallback?.()
          }
        }
      },
    })
  }

  const sb: Sandbox = {
    stub: ((...args: unknown[]) => {
      const out = (coreStub as unknown as (...a: unknown[]) => unknown)(...args)
      register(out as Wrapped<object>)
      return out
    }) as typeof coreStub,
    wrap: ((...args: unknown[]) => {
      const out = (coreWrap as unknown as (...a: unknown[]) => unknown)(...args)
      register(out as Wrapped<object>)
      return out
    }) as typeof coreWrap,
    func: ((...args: unknown[]) => {
      const out = (coreFunc as unknown as (...a: unknown[]) => unknown)(...args)
      const fn = out as MockedFunction<AnyFunc>
      registered.push({
        reset: () => {
          const reset = (fn as unknown as { expect?: { called?: { reset?: () => void } } })
            .expect?.called?.reset
          if (reset) reset.call((fn as unknown as { expect: { called: unknown } }).expect.called)
        },
        restore: () => {
          const reset = (fn as unknown as { expect?: { called?: { reset?: () => void } } })
            .expect?.called?.reset
          if (reset) reset.call((fn as unknown as { expect: { called: unknown } }).expect.called)
          const fallback = (fn as unknown as { setup?: { fallback?: () => void } }).setup?.fallback
          if (fallback) fallback.call((fn as unknown as { setup: unknown }).setup)
        },
      })
      return out
    }) as typeof coreFunc,
    reset() {
      for (const r of registered) r.reset()
    },
    restore() {
      for (const r of registered) r.restore?.()
    },
    get size() {
      return registered.length
    },
  }

  return sb
}
