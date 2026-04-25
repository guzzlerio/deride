import { describe, it, expect, beforeEach } from 'vitest'
import deride, { func, stub, wrap, match } from '../src/index'

// ── from spy.test.ts ────────────────────────────────────────────────────

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

// ── from serialize.test.ts ──────────────────────────────────────────────

interface SerSvc {
  greet(arg: unknown): unknown
}

describe('spy.serialize', () => {
  it('returns the method name and calls', () => {
    const mock = stub<SerSvc>(['greet'])
    mock.greet('a')
    const out = mock.spy.greet.serialize()
    expect(out.method).toBe('greet')
    expect(Array.isArray(out.calls)).toBe(true)
    expect(out.calls.length).toBe(1)
  })

  it('omits timestamps for snapshot stability', () => {
    const mock = stub<SerSvc>(['greet'])
    mock.greet('a')
    const out = mock.spy.greet.serialize()
    expect(JSON.stringify(out)).not.toMatch(/"timestamp"/)
    expect(JSON.stringify(out)).not.toMatch(/"sequence"/)
  })

  it('sorts object keys for stability', () => {
    const mock = stub<SerSvc>(['greet'])
    mock.greet({ b: 2, a: 1, c: 3 })
    const out = mock.spy.greet.serialize() as { calls: Array<{ args: Array<Record<string, number>> }> }
    const keys = Object.keys(out.calls[0].args[0])
    expect(keys).toEqual(['a', 'b', 'c'])
  })

  it('renders circular refs as [Circular]', () => {
    const mock = stub<SerSvc>(['greet'])
    const obj: Record<string, unknown> = { a: 1 }
    obj.self = obj
    mock.greet(obj)
    const out = mock.spy.greet.serialize()
    expect(JSON.stringify(out)).toContain('[Circular]')
  })

  it('renders functions as [Function]', () => {
    const mock = stub<SerSvc>(['greet'])
    function named() {}
    mock.greet(named)
    const out = mock.spy.greet.serialize()
    expect(JSON.stringify(out)).toContain('[Function: named]')
  })

  it('matches an inline snapshot for stable usage', () => {
    const mock = stub<SerSvc>(['greet'])
    mock.setup.greet.toReturn('hi')
    mock.greet('alice')
    mock.greet({ id: 1 })
    expect(mock.spy.greet.serialize()).toMatchInlineSnapshot(`
      {
        "calls": [
          {
            "args": [
              "alice",
            ],
            "returned": "hi",
          },
          {
            "args": [
              {
                "id": 1,
              },
            ],
            "returned": "hi",
          },
        ],
        "method": "greet",
      }
    `)
  })

  describe('built-in types', () => {
    it('renders Date as ISO string', () => {
      const mock = stub<SerSvc>(['greet'])
      mock.greet(new Date('2024-01-15T10:30:00Z') as never)
      const out = mock.spy.greet.serialize() as { calls: { args: string[] }[] }
      expect(out.calls[0].args[0]).toBe('2024-01-15T10:30:00.000Z')
    })

    it('renders RegExp as /pattern/flags', () => {
      const mock = stub<SerSvc>(['greet'])
      mock.greet(/foo.*bar/gi as never)
      const out = mock.spy.greet.serialize() as { calls: { args: string[] }[] }
      expect(out.calls[0].args[0]).toBe('/foo.*bar/gi')
    })

    it('renders Error as [Name: message]', () => {
      const mock = stub<SerSvc>(['greet'])
      mock.greet(new TypeError('bad input') as never)
      const out = mock.spy.greet.serialize() as { calls: { args: string[] }[] }
      expect(out.calls[0].args[0]).toBe('[TypeError: bad input]')
    })

    it('renders Map as { __type: "Map", entries: [...] }', () => {
      const mock = stub<SerSvc>(['greet'])
      mock.greet(new Map([['k', 1]]) as never)
      const out = mock.spy.greet.serialize() as { calls: { args: unknown[] }[] }
      expect(out.calls[0].args[0]).toEqual({
        __type: 'Map',
        entries: [['k', 1]],
      })
    })

    it('renders Set as { __type: "Set", values: [...] }', () => {
      const mock = stub<SerSvc>(['greet'])
      mock.greet(new Set([1, 2, 3]) as never)
      const out = mock.spy.greet.serialize() as { calls: { args: unknown[] }[] }
      expect(out.calls[0].args[0]).toEqual({
        __type: 'Set',
        values: [1, 2, 3],
      })
    })

    it('renders Uint8Array as { __type: "Uint8Array", values: [...] }', () => {
      const mock = stub<SerSvc>(['greet'])
      mock.greet(new Uint8Array([10, 20, 30]) as never)
      const out = mock.spy.greet.serialize() as { calls: { args: unknown[] }[] }
      expect(out.calls[0].args[0]).toEqual({
        __type: 'Uint8Array',
        values: [10, 20, 30],
      })
    })

    it('renders bigint and symbol leaves', () => {
      const sym = Symbol('thing')
      const mock = stub<SerSvc>(['greet'])
      mock.greet({ big: 9007199254740993n, sym } as never)
      const out = mock.spy.greet.serialize() as { calls: { args: { big: string; sym: string }[] }[] }
      expect(out.calls[0].args[0].big).toBe('9007199254740993n')
      expect(out.calls[0].args[0].sym).toBe('Symbol(thing)')
    })

    it('renders nested built-ins recursively (Map of Date)', () => {
      const mock = stub<SerSvc>(['greet'])
      mock.greet(new Map([['when', new Date('2024-01-01T00:00:00Z')]]) as never)
      const out = mock.spy.greet.serialize() as {
        calls: { args: { __type: string; entries: [string, string][] }[] }[]
      }
      expect(out.calls[0].args[0].entries[0][1]).toBe('2024-01-01T00:00:00.000Z')
    })
  })
})

// ── from diagnostics.test.ts (printHistory) ─────────────────────────────

interface PrintSvc {
  greet(a: unknown, b?: unknown): unknown
}

describe('printHistory', () => {
  it('no calls renders the no-calls line', () => {
    const mock = stub<PrintSvc>(['greet'])
    expect(mock.spy.greet.printHistory()).toContain('no calls')
  })

  it('shows method name, args, and return value', () => {
    const mock = stub<PrintSvc>(['greet'])
    mock.setup.greet.toReturn('out')
    mock.greet('in')
    const out = mock.spy.greet.printHistory()
    expect(out).toContain('greet')
    expect(out).toContain("'in'")
    expect(out).toContain("'out'")
  })

  it('shows threw -> for throwing calls', () => {
    const mock = stub<PrintSvc>(['greet'])
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
