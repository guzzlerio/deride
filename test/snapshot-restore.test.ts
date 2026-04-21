import { describe, it, expect } from 'vitest'
import { stub } from '../src/index'

interface Svc {
  greet(name: string): string
  chuckle(n: number): string
}

describe('per-mock snapshot/restore', () => {
  it('captures behaviours and rolls them back', () => {
    const m = stub<Svc>(['greet', 'chuckle'])
    m.setup.greet.toReturn('v1')
    const snap = m.snapshot()
    m.setup.greet.toReturn('v2')
    expect(m.greet('x')).toBe('v2')
    m.restore(snap)
    expect(m.greet('x')).toBe('v1')
  })

  it('rolls back call history', () => {
    const m = stub<Svc>(['greet', 'chuckle'])
    m.setup.greet.toReturn('v1')
    const snap = m.snapshot()
    m.greet('a')
    m.greet('b')
    m.restore(snap)
    m.expect.greet.called.never()
  })

  it('snapshot is independent of subsequent mutation', () => {
    const m = stub<Svc>(['greet', 'chuckle'])
    m.setup.greet.toReturn('v1')
    const snap = m.snapshot()
    m.setup.greet.toReturn('v2')
    // mutating the mock after snapshot should not change snap
    m.restore(snap)
    expect(m.greet('x')).toBe('v1')
  })

  it('supports nested snapshots', () => {
    const m = stub<Svc>(['greet', 'chuckle'])
    m.setup.greet.toReturn('A')
    const snapA = m.snapshot()
    m.setup.greet.toReturn('B')
    const snapB = m.snapshot()
    m.setup.greet.toReturn('C')
    m.restore(snapB)
    expect(m.greet('x')).toBe('B')
    m.restore(snapA)
    expect(m.greet('x')).toBe('A')
  })
})
