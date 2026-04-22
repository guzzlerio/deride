import { CallRecord } from './call-record.js'
import { MethodSpy } from './mock-spy.js'

type InOrderEntry = MethodSpy | { __invocationSpy: MethodSpy; index: number }

function isSpy(entry: unknown): entry is MethodSpy {
  if (!entry || typeof entry !== 'object') return false
  const obj = entry as { calls?: unknown; callCount?: unknown }
  return Array.isArray(obj.calls) && typeof obj.callCount === 'number'
}

function isInvocationEntry(entry: unknown): entry is { __invocationSpy: MethodSpy; index: number } {
  return (
    entry !== null &&
    typeof entry === 'object' &&
    '__invocationSpy' in (entry as object)
  )
}

function normalise(entry: unknown): InOrderEntry {
  if (isInvocationEntry(entry)) return entry
  if (isSpy(entry)) return entry
  throw new Error(
    'inOrder: each argument must be a MethodSpy (e.g. mock.spy.method) or inOrder.at(spy, i)'
  )
}

function firstSequence(entry: InOrderEntry): number {
  if ('__invocationSpy' in entry) {
    const call: CallRecord | undefined = entry.__invocationSpy.calls[entry.index]
    return call ? call.sequence : Number.POSITIVE_INFINITY
  }
  const first = (entry as MethodSpy).calls[0]
  return first ? first.sequence : Number.POSITIVE_INFINITY
}

function label(entry: InOrderEntry): string {
  if ('__invocationSpy' in entry) {
    return `\`${entry.__invocationSpy.name}\` invocation ${entry.index}`
  }
  return `\`${(entry as MethodSpy).name}\``
}

/**
 * Assert that the given spies fired in the requested relative order
 * (comparing the first recorded call of each).
 *
 * Each argument should be either `mock.spy.method` or `inOrder.at(spy, i)` to
 * order a specific invocation rather than the first one.
 *
 * @throws if any spy was never called, or if the observed sequence differs
 *         from the argument order.
 */
export function inOrder(...entries: unknown[]): void {
  if (entries.length === 0) throw new Error('inOrder: at least one spy is required')
  const normed = entries.map(normalise)

  for (const entry of normed) {
    const seq = firstSequence(entry)
    if (seq === Number.POSITIVE_INFINITY) {
      throw new Error(`inOrder: ${label(entry)} was never called`)
    }
  }
  for (let i = 1; i < normed.length; i++) {
    const prevSeq = firstSequence(normed[i - 1])
    const currSeq = firstSequence(normed[i])
    if (currSeq < prevSeq) {
      throw new Error(
        `inOrder: ${label(normed[i])} (seq ${currSeq}) fired before ${label(normed[i - 1])} (seq ${prevSeq})`
      )
    }
  }
}

/**
 * Wrap a spy into an order handle pointing at a specific invocation index,
 * for use inside `inOrder(...)` / `inOrder.strict(...)`.
 */
inOrder.at = function atInvocation(spy: MethodSpy, index: number): InOrderEntry {
  return { __invocationSpy: spy, index }
}

/**
 * Strict variant — requires the exact interleave of the given spies (no other
 * calls on any of these spies between them). Useful when you want to assert a
 * precise sequence of N events.
 */
inOrder.strict = function strictInOrder(...entries: unknown[]): void {
  if (entries.length === 0) throw new Error('inOrder.strict: at least one spy is required')
  const normed = entries.map(normalise)

  const expectedSequences: number[] = []
  for (const entry of normed) {
    const seq = firstSequence(entry)
    if (seq === Number.POSITIVE_INFINITY) {
      throw new Error(`inOrder.strict: ${label(entry)} was never called`)
    }
    expectedSequences.push(seq)
  }

  const allSeqs: number[] = []
  for (const e of normed) {
    if ('__invocationSpy' in e) {
      allSeqs.push(firstSequence(e))
    } else {
      for (const c of (e as MethodSpy).calls) allSeqs.push(c.sequence)
    }
  }
  allSeqs.sort((a, b) => a - b)

  if (expectedSequences.length !== allSeqs.length) {
    throw new Error(
      'inOrder.strict: extra calls on listed spies break the expected interleave'
    )
  }
  for (let i = 0; i < expectedSequences.length; i++) {
    if (expectedSequences[i] !== allSeqs[i]) {
      throw new Error('inOrder.strict: calls did not interleave in the requested order')
    }
  }
}
