import { describe, it, expect, beforeEach } from 'vitest'
import deride, { func, stub, wrap, match } from '../src/index'

interface Svc {
  greet(name: string): string
  fetch(url: string): Promise<string>
  fail(): void
}

describe('spy API', () => {
  let mock: ReturnType<typeof stub<Svc>>
  beforeEach(() => {
    mock = stub<Svc>(['greet', 'fetch', 'fail'])
  })

  describe('callCount', () => {
    it('is 0 before any call', () => {
      expect(mock.spy.greet.callCount).toBe(0)
    })

    it('reflects N calls', () => {
      mock.greet('a')
      mock.greet('b')
      mock.greet('c')
      expect(mock.spy.greet.callCount).toBe(3)
    })

    it('reflects reset()', () => {
      mock.greet('a')
      mock.expect.greet.called.reset()
      expect(mock.spy.greet.callCount).toBe(0)
    })
  })

  describe('calls array', () => {
    it('length matches callCount', () => {
      mock.greet('a')
      mock.greet('b')
      expect(mock.spy.greet.calls.length).toBe(mock.spy.greet.callCount)
    })

    it('indexes are stable', () => {
      mock.greet('first')
      mock.greet('second')
      expect(mock.spy.greet.calls[0].args).toEqual(['first'])
      expect(mock.spy.greet.calls[1].args).toEqual(['second'])
    })
  })

  describe('args capture', () => {
    it('clones args (mutation protection)', () => {
      const payload = { name: 'alice' }
      mock.greet(payload as unknown as string)
      payload.name = 'mutated'
      expect((mock.spy.greet.calls[0].args[0] as { name: string }).name).toBe('alice')
    })

    it('clones via cloneDeep (circular refs allowed)', () => {
      const payload: Record<string, unknown> = { name: 'a' }
      payload.self = payload
      expect(() => mock.greet(payload as unknown as string)).not.toThrow()
      expect(mock.spy.greet.calls.length).toBe(1)
    })
  })

  describe('returned capture', () => {
    it('captures primitive return values', () => {
      mock.setup.greet.toReturn('hi')
      mock.greet('alice')
      expect(mock.spy.greet.lastCall?.returned).toBe('hi')
    })

    it('captures undefined for void methods', () => {
      mock.fail()
      expect(mock.spy.fail.lastCall?.returned).toBeUndefined()
    })

    it('captures Promise returns (instance, not awaited)', () => {
      mock.setup.fetch.toResolveWith('ok')
      const p = mock.fetch('/x')
      expect(mock.spy.fetch.lastCall?.returned).toBe(p)
    })
  })

  describe('threw capture', () => {
    it('captures Error instance', () => {
      mock.setup.fail.toThrow('bang')
      expect(() => mock.fail()).toThrow()
      expect(mock.spy.fail.lastCall?.threw).toBeInstanceOf(Error)
      expect((mock.spy.fail.lastCall?.threw as Error).message).toBe('bang')
    })

    it('threw is undefined when the call did not throw', () => {
      mock.fail()
      expect(mock.spy.fail.lastCall?.threw).toBeUndefined()
    })

    it('captures non-Error throws via toDoThis', () => {
      mock.setup.fail.toDoThis(() => {
        throw 'plain-string'
      })
      expect(() => mock.fail()).toThrow('plain-string')
      expect(mock.spy.fail.lastCall?.threw).toBe('plain-string')
    })
  })

  describe('thisArg capture', () => {
    it('captures `this` when called as obj.method()', () => {
      mock.greet('a')
      expect(mock.spy.greet.lastCall?.thisArg).toBe(mock)
    })

    it('captures `this` via .call()', () => {
      const fn = func<(x: number) => number>()
      const target = { tag: 'target' }
      fn.call(target, 1)
      expect(fn.spy.lastCall?.thisArg).toBe(target)
    })

    it('captures undefined for standalone function call', () => {
      const fn = func<(x: number) => number>()
      fn(1)
      expect(fn.spy.lastCall?.thisArg).toBeUndefined()
    })
  })

  describe('timestamp & sequence', () => {
    it('timestamps are non-decreasing', () => {
      mock.greet('a')
      mock.greet('b')
      mock.greet('c')
      const ts = mock.spy.greet.calls.map((c) => c.timestamp)
      for (let i = 1; i < ts.length; i++) expect(ts[i]).toBeGreaterThanOrEqual(ts[i - 1])
    })

    it('sequence is strictly monotonic across mocks', () => {
      mock.greet('a')
      mock.fetch('/x')
      mock.greet('b')
      expect(mock.spy.greet.calls[0].sequence).toBeLessThan(mock.spy.fetch.calls[0].sequence)
      expect(mock.spy.fetch.calls[0].sequence).toBeLessThan(mock.spy.greet.calls[1].sequence)
    })
  })

  describe('firstCall / lastCall', () => {
    it('both undefined when never called', () => {
      expect(mock.spy.greet.firstCall).toBeUndefined()
      expect(mock.spy.greet.lastCall).toBeUndefined()
    })

    it('match calls[0] and calls[N-1]', () => {
      mock.greet('one')
      mock.greet('two')
      mock.greet('three')
      expect(mock.spy.greet.firstCall).toBe(mock.spy.greet.calls[0])
      expect(mock.spy.greet.lastCall).toBe(mock.spy.greet.calls[2])
    })
  })

  describe('calledWith (non-throwing boolean)', () => {
    it('returns true on match', () => {
      mock.greet('alice')
      expect(mock.spy.greet.calledWith('alice')).toBe(true)
    })

    it('returns false when no match', () => {
      mock.greet('alice')
      expect(mock.spy.greet.calledWith('bob')).toBe(false)
    })

    it('never throws', () => {
      expect(() => mock.spy.greet.calledWith('bob')).not.toThrow()
    })

    it('works with matchers', () => {
      mock.greet('alice')
      expect(mock.spy.greet.calledWith(match.string)).toBe(true)
      expect(mock.spy.greet.calledWith(match.number)).toBe(false)
    })
  })

  describe('printHistory()', () => {
    it('handles never-called case', () => {
      const out = mock.spy.greet.printHistory()
      expect(out).toContain('no calls')
    })

    it('includes method name and args', () => {
      mock.setup.greet.toReturn('hi')
      mock.greet('alice')
      const out = mock.spy.greet.printHistory()
      expect(out).toContain('greet')
      expect(out).toContain("'alice'")
      expect(out).toContain("'hi'")
    })
  })

  describe('reset interactions', () => {
    it('expect.method.called.reset() clears spy.calls', () => {
      mock.greet('a')
      mock.expect.greet.called.reset()
      expect(mock.spy.greet.calls.length).toBe(0)
    })

    it('obj.called.reset() clears every method spy', () => {
      mock.greet('a')
      mock.fail()
      mock.called.reset()
      expect(mock.spy.greet.calls.length).toBe(0)
      expect(mock.spy.fail.calls.length).toBe(0)
    })
  })

  describe('interaction with toIntercept/toThrow/toResolveWith', () => {
    it('toIntercept still produces a CallRecord', () => {
      const interceptor = (): void => {}
      const wrapped = wrap({ greet: (n: string) => `hello ${n}` })
      wrapped.setup.greet.toIntercept(interceptor)
      wrapped.greet('alice')
      expect(wrapped.spy.greet.lastCall?.returned).toBe('hello alice')
    })

    it('toThrow populates threw and leaves returned undefined', () => {
      mock.setup.fail.toThrow('bang')
      expect(() => mock.fail()).toThrow()
      expect(mock.spy.fail.lastCall?.threw).toBeInstanceOf(Error)
      expect(mock.spy.fail.lastCall?.returned).toBeUndefined()
    })

    it('toResolveWith returns the Promise; awaiting gives the value', async () => {
      mock.setup.fetch.toResolveWith('payload')
      const p = mock.fetch('/x')
      expect(mock.spy.fetch.lastCall?.returned).toBeInstanceOf(Promise)
      await expect(p).resolves.toBe('payload')
    })
  })

  describe('func() exposes spy directly', () => {
    it('fn.spy works on standalone functions', () => {
      const fn = func((x: number) => x * 2)
      fn(2)
      fn(3)
      expect(fn.spy.callCount).toBe(2)
      expect(fn.spy.calls[0].returned).toBe(4)
    })
  })

  describe('default export', () => {
    it('deride.match is exposed', () => {
      expect(deride.match).toBe(match)
    })
  })
})
