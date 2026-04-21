import { describe, it, expect } from 'vitest'
import { stub } from '../src/index'

interface Svc {
  greet(a: unknown, b?: unknown): unknown
}

describe('failure message diagnostics', () => {
  it('withArg failure includes all recorded calls', () => {
    const mock = stub<Svc>(['greet'])
    mock.greet('a')
    mock.greet('b')
    try {
      mock.expect.greet.called.withArg('c')
      expect.fail('should have thrown')
    } catch (err) {
      const msg = (err as Error).message
      expect(msg).toContain('actual calls')
      expect(msg).toContain("#0")
      expect(msg).toContain("#1")
      expect(msg).toContain("'a'")
      expect(msg).toContain("'b'")
    }
  })

  it('zero-call failure says no calls recorded', () => {
    const mock = stub<Svc>(['greet'])
    try {
      mock.expect.greet.called.withArg('x')
      expect.fail('should have thrown')
    } catch (err) {
      expect((err as Error).message).toContain('no calls recorded')
    }
  })

  it('withArgs failure includes history', () => {
    const mock = stub<Svc>(['greet'])
    mock.greet('a', 'b')
    try {
      mock.expect.greet.called.withArgs('x', 'y')
      expect.fail('should have thrown')
    } catch (err) {
      expect((err as Error).message).toContain('actual calls')
    }
  })
})

describe('printHistory', () => {
  it('no calls renders the no-calls line', () => {
    const mock = stub<Svc>(['greet'])
    expect(mock.spy.greet.printHistory()).toContain('no calls')
  })

  it('shows method name, args, and return value', () => {
    const mock = stub<Svc>(['greet'])
    mock.setup.greet.toReturn('out')
    mock.greet('in')
    const out = mock.spy.greet.printHistory()
    expect(out).toContain('greet')
    expect(out).toContain("'in'")
    expect(out).toContain("'out'")
  })

  it('shows threw -> for throwing calls', () => {
    const mock = stub<Svc>(['greet'])
    mock.setup.greet.toThrow('bang')
    try {
      mock.greet('x')
    } catch {
      /* expected */
    }
    const out = mock.spy.greet.printHistory()
    expect(out).toContain('threw')
  })
})
