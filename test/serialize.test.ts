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
})
