/**
 * A single recorded invocation of a mocked method. Produced inside
 * `MethodMock.invoke` and exposed to consumers via `spy.method.calls`.
 */
export interface CallRecord {
  /** Cloned arguments passed to the method. */
  readonly args: readonly unknown[]
  /** The value the method returned (the raw value, or Promise for async). */
  readonly returned?: unknown
  /** The error thrown synchronously by the method, if any. */
  readonly threw?: unknown
  /** The `this` binding the method was invoked with. */
  readonly thisArg?: unknown
  /** Wall-clock time at invocation (`Date.now()` milliseconds). */
  readonly timestamp: number
  /** Globally monotonic sequence number across all MethodMock invocations. */
  readonly sequence: number
}

/** Opaque handle returned by `MethodMock.snapshot()`; pass to `restoreSnapshot()` to roll back. */
export interface MockSnapshot {
  /** Brand so the handle can't be confused with arbitrary objects. */
  readonly __brand: 'deride.snapshot'
  /** Internal: snapshot of behaviours at capture time. */
  readonly behaviors: ReadonlyArray<unknown>
  /** Internal: snapshot of calls at capture time. */
  readonly calls: ReadonlyArray<CallRecord>
}

let SEQ_COUNTER = 0

/** Returns the next globally-unique monotonic sequence number. */
export function nextSeq(): number {
  return ++SEQ_COUNTER
}

/** Test-only: reset the global sequence counter. Exposed for worker-isolation scenarios. */
export function __resetSeqForTests(): void {
  SEQ_COUNTER = 0
}
