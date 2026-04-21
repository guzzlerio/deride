/**
 * Lightweight fake-timers helper for deride. Pairs with `toResolveAfter`,
 * `toRejectAfter`, and `toHang`.
 *
 * The goal is a minimal, dependency-free clock you can drop into a test when
 * you need synchronous control over `Date.now`, `setTimeout`, `setInterval`,
 * and `queueMicrotask`. It is intentionally much smaller than sinon's fake
 * timers — if you need deeper control (queueMicrotask ordering, setImmediate,
 * performance.now), reach for `vi.useFakeTimers()` directly.
 */

type TimerKind = 'timeout' | 'interval'

interface Timer {
  id: number
  kind: TimerKind
  callback: (...args: unknown[]) => void
  args: unknown[]
  dueAt: number
  /** For intervals, the repeat delay. */
  repeat?: number
}

type NativeTimeoutReturn = ReturnType<typeof setTimeout>

export interface FakeClock {
  /** Advance the clock by `ms` milliseconds, firing any timers that come due. */
  tick(ms: number): void
  /** Drain all pending timers, advancing the clock to each as needed. */
  runAll(): void
  /** Drain any microtasks queued via queueMicrotask. */
  flushMicrotasks(): void
  /** Current frozen time. */
  now(): number
  /** Restore native Date / setTimeout / setInterval / queueMicrotask. */
  restore(): void
}

let active: FakeClock | undefined

/** Install fake timers. Returns a handle for advancing and restoring time. */
export function useFakeTimers(startEpoch: number = 0): FakeClock {
  if (active) {
    throw new Error('deride/clock: fake timers are already installed; call restore() first')
  }

  const nativeDateNow = Date.now
  const nativeSetTimeout = globalThis.setTimeout
  const nativeClearTimeout = globalThis.clearTimeout
  const nativeSetInterval = globalThis.setInterval
  const nativeClearInterval = globalThis.clearInterval
  const nativeQueueMicrotask = globalThis.queueMicrotask

  let current = startEpoch
  let nextId = 1
  const timers: Timer[] = []
  const microtasks: Array<() => void> = []

  function schedule(kind: TimerKind, cb: (...args: unknown[]) => void, ms: number, args: unknown[], repeat?: number): number {
    const id = nextId++
    timers.push({ id, kind, callback: cb, args, dueAt: current + Math.max(0, ms), repeat })
    timers.sort((a, b) => a.dueAt - b.dueAt || a.id - b.id)
    return id
  }

  function cancel(id: number) {
    const idx = timers.findIndex((t) => t.id === id)
    if (idx >= 0) timers.splice(idx, 1)
  }

  function drainMicrotasks() {
    while (microtasks.length) {
      const fn = microtasks.shift()!
      try {
        fn()
      } catch {
        /* swallowed in tests — uncaught microtask */
      }
    }
  }

  function runDueTimers(until: number) {
    while (timers.length && timers[0].dueAt <= until) {
      const t = timers[0]
      current = t.dueAt
      if (t.kind === 'timeout') {
        timers.shift()
        try {
          t.callback(...t.args)
        } catch {
          /* swallowed */
        }
      } else {
        // interval — re-schedule first, then fire
        t.dueAt = current + (t.repeat ?? 0)
        timers.sort((a, b) => a.dueAt - b.dueAt || a.id - b.id)
        try {
          t.callback(...t.args)
        } catch {
          /* swallowed */
        }
      }
      drainMicrotasks()
    }
    if (until > current) current = until
  }

  // Install patches (cast via unknown because Node's typings are stricter than
  // the lightweight fake we provide here)
  Date.now = () => current
  const g = globalThis as unknown as Record<string, unknown>
  g.setTimeout = (cb: (...a: unknown[]) => void, ms = 0, ...rest: unknown[]) =>
    schedule('timeout', cb, ms, rest)
  g.clearTimeout = (id: number) => cancel(id)
  g.setInterval = (cb: (...a: unknown[]) => void, ms = 0, ...rest: unknown[]) =>
    schedule('interval', cb, ms, rest, ms)
  g.clearInterval = (id: number) => cancel(id)
  g.queueMicrotask = (cb: () => void) => {
    microtasks.push(cb)
  }

  const clock: FakeClock = {
    tick(ms: number) {
      runDueTimers(current + ms)
      drainMicrotasks()
    },
    runAll() {
      let guard = 10_000
      while (timers.length && guard-- > 0) {
        const next = timers[0]
        runDueTimers(next.dueAt)
      }
      drainMicrotasks()
    },
    flushMicrotasks() {
      drainMicrotasks()
    },
    now() {
      return current
    },
    restore() {
      Date.now = nativeDateNow
      const gg = globalThis as unknown as Record<string, unknown>
      gg.setTimeout = nativeSetTimeout
      gg.clearTimeout = nativeClearTimeout
      gg.setInterval = nativeSetInterval
      gg.clearInterval = nativeClearInterval
      gg.queueMicrotask = nativeQueueMicrotask
      active = undefined
    },
  }

  // Internal helper: cast ID to Node's Timeout type when returning
  void (nativeSetTimeout as unknown as (cb: () => void) => NativeTimeoutReturn)

  active = clock
  return clock
}
