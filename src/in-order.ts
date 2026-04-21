import { MethodSpy, MockExpect, CallRecord } from './method-mock.js'

type InOrderEntry =
  | MethodSpy
  | MockExpect
  | { __invocationSpy: MethodSpy; index: number }
  | { calls: readonly CallRecord[] }

function extractSpy(entry: unknown): MethodSpy | undefined {
  if (!entry || typeof entry !== 'object') return undefined
  const obj = entry as Record<string, unknown>
  if ('__invocationSpy' in obj) return undefined
  if ('calls' in obj && Array.isArray((obj as { calls: unknown }).calls)) {
    return obj as unknown as MethodSpy
  }
  // MockExpect has .called and .invocation — pull the spy out through a side channel.
  // We accept MethodSpy directly; for MockExpect, users should pass mock.spy.method.
  return undefined
}

function firstSequence(entry: InOrderEntry): number {
  if ('__invocationSpy' in entry) {
    const call = entry.__invocationSpy.calls[entry.index]
    if (!call) return Number.POSITIVE_INFINITY
    return call.sequence
  }
  const spy = entry as MethodSpy
  const first = spy.calls[0]
  if (!first) return Number.POSITIVE_INFINITY
  return first.sequence
}

function label(entry: InOrderEntry): string {
  if ('__invocationSpy' in entry) {
    return `invocation ${entry.index} of a spy`
  }
  return 'a spy'
}

function normalise(entry: unknown): InOrderEntry {
  const spy = extractSpy(entry)
  if (spy) return spy
  if (entry && typeof entry === 'object' && '__invocationSpy' in (entry as object)) {
    return entry as InOrderEntry
  }
  throw new Error('inOrder: each argument must be a MethodSpy (e.g. mock.spy.method) or invocation(i) handle')
}

/**
 * Assert that the given spies fired in relative order (by first call of each).
 * Each argument should be either `mock.spy.method` or `inOrder.at(mock.spy.method, i)`
 * for ordering a specific invocation.
 */
export function inOrder(...entries: unknown[]): void {
  if (entries.length === 0) throw new Error('inOrder: at least one spy is required')
  const normed = entries.map(normalise)
  for (let i = 0; i < normed.length; i++) {
    const seq = firstSequence(normed[i])
    if (seq === Number.POSITIVE_INFINITY) {
      throw new Error(`inOrder: ${label(normed[i])} was never called`)
    }
  }
  for (let i = 1; i < normed.length; i++) {
    const prev = firstSequence(normed[i - 1])
    const curr = firstSequence(normed[i])
    if (curr < prev) {
      throw new Error(
        `inOrder: ${label(normed[i])} (seq ${curr}) fired before ${label(normed[i - 1])} (seq ${prev})`
      )
    }
  }
}

inOrder.at = function atInvocation(spy: MethodSpy, index: number): InOrderEntry {
  return { __invocationSpy: spy, index } as unknown as InOrderEntry
}

/**
 * Strict variant — requires the exact interleave of the given spies (no other
 * calls on any of these spies between them). Useful when you want to assert
 * a precise sequence of N events.
 */
inOrder.strict = function strictInOrder(...entries: unknown[]): void {
  if (entries.length === 0) throw new Error('inOrder.strict: at least one spy is required')
  const normed = entries.map(normalise)
  const expectedSequences: number[] = []
  for (let i = 0; i < normed.length; i++) {
    const seq = firstSequence(normed[i])
    if (seq === Number.POSITIVE_INFINITY) {
      throw new Error(`inOrder.strict: ${label(normed[i])} was never called`)
    }
    expectedSequences.push(seq)
  }
  // Gather all sequences across all spies in the list. For non-invocation entries, use ALL calls.
  const allSeqs: number[] = []
  for (const e of normed) {
    if ('__invocationSpy' in e) {
      allSeqs.push(firstSequence(e))
    } else {
      for (const c of (e as MethodSpy).calls) allSeqs.push(c.sequence)
    }
  }
  allSeqs.sort((a, b) => a - b)
  // Expected sequences must equal the sorted all-sequences (no interleaving with other calls on listed spies)
  if (expectedSequences.length !== allSeqs.length) {
    throw new Error('inOrder.strict: extra calls on listed spies break the expected interleave')
  }
  for (let i = 0; i < expectedSequences.length; i++) {
    if (expectedSequences[i] !== allSeqs[i]) {
      throw new Error('inOrder.strict: calls did not interleave in the requested order')
    }
  }
}
