import { func as coreFunc, MockedFunction } from './func.js'
import { stub as coreStub } from './stub.js'
import { Wrapped } from './types.js'
import { wrap as coreWrap } from './wrap.js'

type AnyFunc = (...args: any[]) => any

interface Registered {
  reset(): void
  restore(): void
}

/**
 * A bulk-management scope for mocks. Register mocks via the `stub` / `wrap` /
 * `func` factory proxies, then `reset()` (clear call history) or `restore()`
 * (clear history AND behaviours) every registered mock at once — the
 * afterEach / afterAll ergonomic.
 */
export interface Sandbox {
  /** Sandboxed {@link coreStub}. */
  stub: typeof coreStub
  /** Sandboxed {@link coreWrap}. */
  wrap: typeof coreWrap
  /** Sandboxed {@link coreFunc}. */
  func: typeof coreFunc
  /** Clear call history on every registered mock. Behaviours are preserved. */
  reset(): void
  /** Clear behaviours and call history on every registered mock. */
  restore(): void
  /** Current number of registered mocks. */
  readonly size: number
}

/**
 * Locate the `called.reset` method on either a `Wrapped<T>` or a standalone
 * `MockedFunction`. Returns a no-op if the mock doesn't expose one — we
 * prefer soft-fail over hard-fail here because `sb.reset()` is almost always
 * called from an `afterEach` and throwing would mask the real test failure.
 */
function resetOf(mock: unknown): () => void {
  const m = mock as {
    called?: { reset?: () => void }
    expect?: { called?: { reset?: () => void } }
  }
  if (m.called?.reset) return m.called.reset.bind(m.called)
  if (m.expect?.called?.reset) return m.expect.called.reset.bind(m.expect.called)
  return () => {
    /* noop */
  }
}

/**
 * Full restore — clear behaviours and history. For wrapped objects we use the
 * first-class `restore(snapshot)` with an empty snapshot; for MockedFunctions
 * we call `setup.fallback()` + `expect.called.reset()`.
 */
function restoreOf(mock: unknown): () => void {
  const m = mock as {
    setup?: {
      fallback?: () => void
      [method: string]: { fallback?: () => void } | (() => void) | undefined
    }
    called?: { reset?: () => void }
    expect?: { called?: { reset?: () => void } }
  }
  return () => {
    if (typeof m.setup?.fallback === 'function') {
      m.setup.fallback()
    } else if (m.setup) {
      for (const key of Object.keys(m.setup)) {
        const methodSetup = (m.setup as Record<string, { fallback?: () => void }>)[key]
        if (methodSetup && typeof methodSetup.fallback === 'function') {
          methodSetup.fallback()
        }
      }
    }
    resetOf(mock)()
  }
}

/**
 * Create a new {@link Sandbox}. Each call returns an independent scope — two
 * sandboxes don't share state, and nested sandboxes are independent too.
 */
export function sandbox(): Sandbox {
  const registered: Registered[] = []

  const sb: Sandbox = {
    stub: ((...args: unknown[]) => {
      const out = (coreStub as unknown as (...a: unknown[]) => unknown)(...args) as Wrapped<object>
      registered.push({ reset: resetOf(out), restore: restoreOf(out) })
      return out
    }) as typeof coreStub,
    wrap: ((...args: unknown[]) => {
      const out = (coreWrap as unknown as (...a: unknown[]) => unknown)(...args) as Wrapped<object>
      registered.push({ reset: resetOf(out), restore: restoreOf(out) })
      return out
    }) as typeof coreWrap,
    func: ((...args: unknown[]) => {
      const out = (coreFunc as unknown as (...a: unknown[]) => unknown)(...args) as MockedFunction<AnyFunc>
      registered.push({ reset: resetOf(out), restore: restoreOf(out) })
      return out
    }) as typeof coreFunc,
    reset() {
      for (const r of registered) r.reset()
    },
    restore() {
      for (const r of registered) r.restore()
    },
    get size() {
      return registered.length
    },
  }

  return sb
}
