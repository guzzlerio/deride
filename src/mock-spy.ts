import { inspect } from 'node:util'
import { CallRecord } from './call-record.js'
import { hasMatch } from './utils.js'

/**
 * Read-only inspection surface exposed via `mock.spy.method`.
 *
 * Complements the assertion-based `mock.expect.method` API: every field here is
 * non-throwing so you can inspect state programmatically without wrapping
 * calls in try/catch.
 */
export interface MethodSpy {
  /** Human-friendly name of the method this spy belongs to. */
  readonly name: string
  /** Total number of recorded calls. */
  readonly callCount: number
  /** All recorded calls in chronological order. */
  readonly calls: readonly CallRecord[]
  /** First recorded call, or `undefined` if never called. */
  readonly firstCall: CallRecord | undefined
  /** Last recorded call, or `undefined` if never called. */
  readonly lastCall: CallRecord | undefined
  /** Returns `true` if any recorded call's args contain all of the provided arguments (partial deep match, matcher-aware). Does not throw. */
  calledWith(...args: unknown[]): boolean
  /** Returns a human-readable dump of every recorded call. */
  printHistory(): string
  /** Canonical snapshot-friendly serialisation with stable key ordering and no timestamps. */
  serialize(): { method: string; calls: unknown[] }
}

/**
 * Produces a canonical, stable representation of `value` suitable for snapshot
 * testing: keys sorted, circular refs rendered as `[Circular]`, functions as
 * `[Function: name]`, bigints with an `n` suffix, symbols via `.toString()`.
 */
export function stableSerialise(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) return value
  if (typeof value !== 'object') {
    if (typeof value === 'function') {
      const name = (value as { name?: string }).name
      return `[Function${name ? ': ' + name : ''}]`
    }
    if (typeof value === 'bigint') return `${value.toString()}n`
    if (typeof value === 'symbol') return value.toString()
    return value
  }
  if (seen.has(value as object)) return '[Circular]'
  seen.add(value as object)
  if (Array.isArray(value)) return value.map((v) => stableSerialise(v, seen))
  const keys = Reflect.ownKeys(value as object)
    .map((k) => k.toString())
    .sort()
  const out: Record<string, unknown> = {}
  for (const k of keys) {
    out[k] = stableSerialise((value as Record<string, unknown>)[k], seen)
  }
  return out
}

/** Host interface the spy factory needs to read recorded calls from a MethodMock. */
export interface SpyHost {
  /** Human-friendly method name for diagnostic output. */
  readonly name: string
  /** Live reference to the recorded calls array. */
  readonly calls: readonly CallRecord[]
}

/** Build the `MethodSpy` facade backed by the given host. */
export function createSpy(host: SpyHost): MethodSpy {
  return {
    get name() {
      return host.name
    },
    get callCount() {
      return host.calls.length
    },
    get calls() {
      return host.calls
    },
    get firstCall() {
      return host.calls[0]
    },
    get lastCall() {
      return host.calls[host.calls.length - 1]
    },
    calledWith(...args: unknown[]): boolean {
      return host.calls.some((record) =>
        args.every((expected) => hasMatch(record.args as readonly unknown[], expected))
      )
    },
    printHistory(): string {
      if (host.calls.length === 0) return `${host.name}: (no calls)`
      const lines = host.calls.map((c, i) => {
        const argStr = (c.args as unknown[]).map((a) => inspect(a, { depth: 4 })).join(', ')
        let tail = ''
        if (c.threw !== undefined) tail = ` -> threw ${inspect(c.threw)}`
        else if (c.returned !== undefined) tail = ` -> ${inspect(c.returned, { depth: 4 })}`
        return `  #${i} ${host.name}(${argStr})${tail}`
      })
      return [`${host.name}: ${host.calls.length} call(s)`, ...lines].join('\n')
    },
    serialize() {
      return {
        method: host.name,
        calls: host.calls.map((c) => {
          const entry: Record<string, unknown> = { args: c.args }
          if (c.returned !== undefined) entry.returned = c.returned
          if (c.threw !== undefined) entry.threw = inspect(c.threw)
          return stableSerialise(entry)
        }),
      }
    },
  }
}

/** Format the full recorded call history as a suffix for diagnostic error messages. */
export function historySuffix(host: SpyHost): string {
  const calls = host.calls
  if (calls.length === 0) return '\n  (no calls recorded)'
  const lines = calls.map((c, i) => {
    const argStr = (c.args as unknown[]).map((a) => inspect(a, { depth: 3 })).join(', ')
    return `  #${i} (${argStr})`
  })
  return '\n  actual calls:\n' + lines.join('\n')
}
