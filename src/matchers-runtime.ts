/**
 * Shared helpers between the vitest and jest integrations. Both packages need
 * the same "matcher-aware" comparison logic against recorded call args, so we
 * centralise it here.
 */
import { hasMatch } from './utils.js'
import { MethodSpy } from './method-mock.js'
import { MockedFunction } from './func.js'

/** Accepts either a MethodSpy (e.g. mock.spy.greet) or a MockedFunction proxy. */
export type AnySpyLike = MethodSpy | MockedFunction

export function asSpy(target: unknown): MethodSpy {
  if (target == null) {
    throw new Error('deride matcher: expected a MethodSpy or MockedFunction')
  }
  // Work by duck-typing since Proxy `in` doesn't reflect virtual properties
  const t = target as { spy?: MethodSpy; calls?: readonly unknown[]; callCount?: number }
  if (Array.isArray(t.calls) && typeof t.callCount === 'number') {
    return target as MethodSpy
  }
  if (t.spy && Array.isArray(t.spy.calls)) {
    return t.spy
  }
  throw new Error('deride matcher: expected a MethodSpy or MockedFunction')
}

export function argsMatchAny(spy: MethodSpy, expected: readonly unknown[]): boolean {
  return spy.calls.some((record) =>
    expected.every((e) => hasMatch(record.args as unknown as readonly object[], e))
  )
}

export function argsMatchAt(spy: MethodSpy, index: number, expected: readonly unknown[]): boolean {
  const record = spy.calls[index]
  if (!record) return false
  return expected.every((e) => hasMatch(record.args as unknown as readonly object[], e))
}
