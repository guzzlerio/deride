import { describe, it, expect } from 'vitest'
import { stub } from '../src/index'

interface Svc {
  greet(arg: unknown): unknown
}

describe('spy.serialize', () => {
  it('returns the method name and calls', () => {
    const mock = stub<Svc>(['greet'])
    mock.greet('a')
    const out = mock.spy.greet.serialize()
    expect(out.method).toBe('greet')
    expect(Array.isArray(out.calls)).toBe(true)
    expect(out.calls.length).toBe(1)
  })

  it('omits timestamps for snapshot stability', () => {
    const mock = stub<Svc>(['greet'])
    mock.greet('a')
    const out = mock.spy.greet.serialize()
    expect(JSON.stringify(out)).not.toMatch(/"timestamp"/)
    expect(JSON.stringify(out)).not.toMatch(/"sequence"/)
  })

  it('sorts object keys for stability', () => {
    const mock = stub<Svc>(['greet'])
    mock.greet({ b: 2, a: 1, c: 3 })
    const out = mock.spy.greet.serialize() as { calls: Array<{ args: Array<Record<string, number>> }> }
    const keys = Object.keys(out.calls[0].args[0])
    expect(keys).toEqual(['a', 'b', 'c'])
  })

  it('renders circular refs as [Circular]', () => {
    const mock = stub<Svc>(['greet'])
    const obj: Record<string, unknown> = { a: 1 }
    obj.self = obj
    mock.greet(obj)
    const out = mock.spy.greet.serialize()
    expect(JSON.stringify(out)).toContain('[Circular]')
  })

  it('renders functions as [Function]', () => {
    const mock = stub<Svc>(['greet'])
    function named() {}
    mock.greet(named)
    const out = mock.spy.greet.serialize()
    expect(JSON.stringify(out)).toContain('[Function: named]')
  })

  it('matches an inline snapshot for stable usage', () => {
    const mock = stub<Svc>(['greet'])
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
      const mock = stub<Svc>(['greet'])
      mock.greet(new Date('2024-01-15T10:30:00Z') as never)
      const out = mock.spy.greet.serialize() as { calls: { args: string[] }[] }
      expect(out.calls[0].args[0]).toBe('2024-01-15T10:30:00.000Z')
    })

    it('renders RegExp as /pattern/flags', () => {
      const mock = stub<Svc>(['greet'])
      mock.greet(/foo.*bar/gi as never)
      const out = mock.spy.greet.serialize() as { calls: { args: string[] }[] }
      expect(out.calls[0].args[0]).toBe('/foo.*bar/gi')
    })

    it('renders Error as [Name: message]', () => {
      const mock = stub<Svc>(['greet'])
      mock.greet(new TypeError('bad input') as never)
      const out = mock.spy.greet.serialize() as { calls: { args: string[] }[] }
      expect(out.calls[0].args[0]).toBe('[TypeError: bad input]')
    })

    it('renders Map as { __type: "Map", entries: [...] }', () => {
      const mock = stub<Svc>(['greet'])
      mock.greet(new Map([['k', 1]]) as never)
      const out = mock.spy.greet.serialize() as { calls: { args: unknown[] }[] }
      expect(out.calls[0].args[0]).toEqual({
        __type: 'Map',
        entries: [['k', 1]],
      })
    })

    it('renders Set as { __type: "Set", values: [...] }', () => {
      const mock = stub<Svc>(['greet'])
      mock.greet(new Set([1, 2, 3]) as never)
      const out = mock.spy.greet.serialize() as { calls: { args: unknown[] }[] }
      expect(out.calls[0].args[0]).toEqual({
        __type: 'Set',
        values: [1, 2, 3],
      })
    })

    it('renders Uint8Array as { __type: "Uint8Array", values: [...] }', () => {
      const mock = stub<Svc>(['greet'])
      mock.greet(new Uint8Array([10, 20, 30]) as never)
      const out = mock.spy.greet.serialize() as { calls: { args: unknown[] }[] }
      expect(out.calls[0].args[0]).toEqual({
        __type: 'Uint8Array',
        values: [10, 20, 30],
      })
    })

    it('renders bigint and symbol leaves', () => {
      const sym = Symbol('thing')
      const mock = stub<Svc>(['greet'])
      mock.greet({ big: 9007199254740993n, sym } as never)
      const out = mock.spy.greet.serialize() as { calls: { args: { big: string; sym: string }[] }[] }
      expect(out.calls[0].args[0].big).toBe('9007199254740993n')
      expect(out.calls[0].args[0].sym).toBe('Symbol(thing)')
    })

    it('renders nested built-ins recursively (Map of Date)', () => {
      const mock = stub<Svc>(['greet'])
      mock.greet(new Map([['when', new Date('2024-01-01T00:00:00Z')]]) as never)
      const out = mock.spy.greet.serialize() as {
        calls: { args: { __type: string; entries: [string, string][] }[] }[]
      }
      expect(out.calls[0].args[0].entries[0][1]).toBe('2024-01-01T00:00:00.000Z')
    })
  })
})
