/**
 * Lightweight fake-timers helper for deride. Pairs with `toResolveAfter`,
 * `toRejectAfter`, and `toHang`.
 *
 * The goal is a minimal, dependency-free clock you can drop into a test when
 * you need synchronous control over `Date.now`, `setTimeout`, `setInterval`,
 * and `queueMicrotask`. It is intentionally much smaller than sinon's fake
 * timers — if you need deeper control (microtask ordering, setImmediate,
 * performance.now), reach for `vi.useFakeTimers()` or
 * `@sinonjs/fake-timers` directly.
 */

type TimerKind = 'timeout' | 'interval'

interface Timer {
  id: number
  kind: TimerKind
  callback: (...args: unknown[]) => void
  args: unknown[]
  dueAt: number
  repeat?: number
}

/**
 * Handle returned by {@link useFakeTimers}. Advance time, drain queues, or
 * restore the native globals.
 */
export interface FakeClock {
  /** Advance the clock by `ms` milliseconds, firing any timers that come due. */
  tick(ms: number): void
  /** Drain all pending timers, advancing the clock to each as needed. */
  runAll(): void
  /** Drain any microtasks queued via `queueMicrotask`. */
  flushMicrotasks(): void
  /** Current frozen time. */
  now(): number
  /** Restore native Date / setTimeout / setInterval / queueMicrotask. */
  restore(): void
  /**
   * Errors thrown from scheduled callbacks or microtasks are captured here
   * instead of propagating out of `tick` / `runAll` / `flushMicrotasks`.
   * Read this array in a test to assert on unexpected errors; clears on `restore()`.
   */
  readonly errors: readonly unknown[]
}

let active: FakeClock | undefined

/**
 * Install fake timers. Returns a {@link FakeClock} handle for advancing and
 * restoring time. Throws if fake timers are already installed — call
 * `.restore()` on the previous handle first.
 *
 * @param startEpoch Initial value for `Date.now()` in milliseconds since epoch. Defaults to `0`.
 */
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
  const errors: unknown[] = []

  function schedule(
    kind: TimerKind,
    cb: (...args: unknown[]) => void,
    ms: number,
    args: unknown[],
    repeat?: number
  ): number {
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
      } catch (err) {
        errors.push(err)
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
        } catch (err) {
          errors.push(err)
        }
      } else {
        // Interval — re-schedule first, then fire.
        t.dueAt = current + (t.repeat ?? 0)
        timers.sort((a, b) => a.dueAt - b.dueAt || a.id - b.id)
        try {
          t.callback(...t.args)
        } catch (err) {
          errors.push(err)
        }
      }
      drainMicrotasks()
    }
    if (until > current) current = until
  }

  const g = globalThis as unknown as Record<string, unknown>
  Date.now = () => current
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
      g.setTimeout = nativeSetTimeout
      g.clearTimeout = nativeClearTimeout
      g.setInterval = nativeSetInterval
      g.clearInterval = nativeClearInterval
      g.queueMicrotask = nativeQueueMicrotask
      errors.length = 0
      active = undefined
    },
    get errors() {
      return errors
    },
  }

  active = clock
  return clock
}

/**
 * `true` iff fake timers are currently installed in this process.
 * Useful for test harnesses that want an `afterEach` safety net:
 *
 * ```ts
 * afterEach(() => { if (isFakeTimersActive()) restoreActiveClock() })
 * ```
 */
export function isFakeTimersActive(): boolean {
  return active !== undefined
}

/**
 * Restore any currently-active fake clock, if one is installed. No-op if
 * timers are already native. Intended for `afterEach` guards so a test that
 * throws before its own `restore()` doesn't poison subsequent tests.
 */
export function restoreActiveClock(): void {
  active?.restore()
}
