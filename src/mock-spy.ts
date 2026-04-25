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
 * testing.
 *
 * Rendering rules:
 *  - Plain objects: keys sorted alphabetically; recurse.
 *  - Arrays: index order preserved; recurse.
 *  - Circular refs: rendered as `[Circular]`.
 *  - Functions: rendered as `[Function: name]`.
 *  - Bigints: `123n` style suffix.
 *  - Symbols: `Symbol(desc)` via `.toString()`.
 *  - Date: ISO 8601 string.
 *  - RegExp: `/pattern/flags` form.
 *  - Error: `[Name: message]`.
 *  - Map: `{ __type: 'Map', entries: [[k, v], …] }`.
 *  - Set: `{ __type: 'Set', values: [v, …] }`.
 *  - Typed arrays / DataView: `{ __type: 'Uint8Array' (etc.), values: [n, …] }`.
 */
export function stableSerialise(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) return value
  if (typeof value !== 'object') {
    if (typeof value === 'function') {
      return `[Function${value.name ? ': ' + value.name : ''}]`
    }
    if (typeof value === 'bigint') return `${value.toString()}n`
    if (typeof value === 'symbol') return value.toString()
    return value
  }

  // Built-in types — render to deterministic atomic strings/objects so they
  // survive snapshot diffs and `instanceof` info isn't silently dropped.
  if (value instanceof Date) return value.toISOString()
  if (value instanceof RegExp) return value.toString()
  if (value instanceof Error) {
    return `[${value.constructor.name}: ${value.message}]`
  }

  if (seen.has(value)) return '[Circular]'
  seen.add(value)

  if (value instanceof Map) {
    return {
      __type: 'Map',
      entries: Array.from(value, ([k, v]) => [
        stableSerialise(k, seen),
        stableSerialise(v, seen),
      ]),
    }
  }
  if (value instanceof Set) {
    return {
      __type: 'Set',
      values: Array.from(value, (v) => stableSerialise(v, seen)),
    }
  }
  if (ArrayBuffer.isView(value)) {
    return {
      __type: value.constructor.name,
      values: Array.from(value as unknown as ArrayLike<number>),
    }
  }
  if (value instanceof ArrayBuffer) {
    return {
      __type: 'ArrayBuffer',
      values: Array.from(new Uint8Array(value)),
    }
  }

  if (Array.isArray(value)) return value.map((v) => stableSerialise(v, seen))
  const keys = Reflect.ownKeys(value)
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

/**
 * Read-only spy backed by a {@link SpyHost}.
 * Exposes call history and inspection methods without throwing.
 */
export class Spy implements MethodSpy {
  /** Create a spy backed by the given host. */
  constructor(private readonly host: SpyHost) {}

  get name(): string {
    return this.host.name
  }

  get callCount(): number {
    return this.host.calls.length
  }

  get calls(): readonly CallRecord[] {
    return this.host.calls
  }

  get firstCall(): CallRecord | undefined {
    return this.host.calls[0]
  }

  get lastCall(): CallRecord | undefined {
    return this.host.calls[this.host.calls.length - 1]
  }

  calledWith(...args: unknown[]): boolean {
    return this.host.calls.some((record) =>
      args.every((expected) => hasMatch(record.args, expected))
    )
  }

  printHistory(): string {
    if (this.host.calls.length === 0) return `${this.host.name}: (no calls)`
    const lines = this.host.calls.map((c, i) => {
      const argStr = c.args.map((a) => inspect(a, { depth: 4 })).join(', ')
      let tail = ''
      if (c.threw !== undefined) tail = ` -> threw ${inspect(c.threw)}`
      else if (c.returned !== undefined) tail = ` -> ${inspect(c.returned, { depth: 4 })}`
      return `  #${i} ${this.host.name}(${argStr})${tail}`
    })
    return [`${this.host.name}: ${this.host.calls.length} call(s)`, ...lines].join('\n')
  }

  serialize(): { method: string; calls: unknown[] } {
    return {
      method: this.host.name,
      calls: this.host.calls.map((c) => {
        const entry: Record<string, unknown> = { args: c.args }
        if (c.returned !== undefined) entry.returned = c.returned
        if (c.threw !== undefined) entry.threw = inspect(c.threw)
        return stableSerialise(entry)
      }),
    }
  }
}

/** Format the full recorded call history as a suffix for diagnostic error messages. */
export function historySuffix(host: SpyHost): string {
  const calls = host.calls
  if (calls.length === 0) return '\n  (no calls recorded)'
  const lines = calls.map((c, i) => {
    const argStr = c.args.map((a) => inspect(a, { depth: 3 })).join(', ')
    return `  #${i} (${argStr})`
  })
  return '\n  actual calls:\n' + lines.join('\n')
}
