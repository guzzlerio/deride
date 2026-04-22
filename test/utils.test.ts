import { describe, it, expect } from 'vitest'
// or: import { describe, it, expect } from '@jest/globals';
import { cloneDeep, deepMatch } from '../src/utils' // adjust if it's inlined

describe('cloneDeep', () => {
  it('should clone a simple object', () => {
    const obj = { a: 1, b: 'text' }
    const copy = cloneDeep(obj)

    expect(copy).toEqual(obj)
    expect(copy).not.toBe(obj)
  })

  it('should clone nested objects', () => {
    const obj = { a: { b: { c: 2 } } }
    const copy = cloneDeep(obj)

    expect(copy).toEqual(obj)
    expect(copy.a).not.toBe(obj.a)
    expect(copy.a.b).not.toBe(obj.a.b)
  })

  it('should clone arrays', () => {
    const obj = { items: [1, 2, 3, { nested: true }] }
    const copy = cloneDeep(obj)

    expect(copy).toEqual(obj)
    expect(copy.items).not.toBe(obj.items)
    expect(copy.items[3]).not.toBe(obj.items[3])
  })

  it('should preserve functions', () => {
    const fn = () => 42
    const obj = { a: 1, b: fn }
    const copy = cloneDeep(obj)

    expect(copy).toEqual(obj)
    expect(copy.b).toBe(fn)
  })

  it('should handle circular references', () => {
    const obj: any = { a: 1 }
    obj.self = obj

    const copy = cloneDeep(obj)
    expect(copy.a).toBe(1)
    expect(copy.self).toBe(copy) // not obj
  })

  it('should handle symbol keys', () => {
    const sym = Symbol('foo')
    const obj = { [sym]: 123, a: 1 }
    const copy = cloneDeep(obj)

    expect(copy[sym]).toBe(123)
    expect(copy).toEqual(obj)
  })

  describe('built-in types preserve their prototype', () => {
    it('clones a Date as a Date', () => {
      const d = new Date('2024-01-15T10:30:00Z')
      const copy = cloneDeep(d)
      expect(copy).toBeInstanceOf(Date)
      expect(copy).not.toBe(d)
      expect(copy.getTime()).toBe(d.getTime())
      d.setFullYear(1999)
      expect(copy.getFullYear()).toBe(2024) // mutation isolation
    })

    it('clones a RegExp as a RegExp, preserving flags', () => {
      const r = /foo.*bar/gi
      const copy = cloneDeep(r)
      expect(copy).toBeInstanceOf(RegExp)
      expect(copy).not.toBe(r)
      expect(copy.source).toBe('foo.*bar')
      expect(copy.flags).toBe('gi')
    })

    it('clones a Map as a Map with deeply-cloned values', () => {
      const inner = { x: 1 }
      const m = new Map<string, { x: number }>([['k', inner]])
      const copy = cloneDeep(m)
      expect(copy).toBeInstanceOf(Map)
      expect(copy).not.toBe(m)
      expect(copy.get('k')).toEqual({ x: 1 })
      expect(copy.get('k')).not.toBe(inner)
      inner.x = 99
      expect(copy.get('k')!.x).toBe(1)
    })

    it('clones a Set as a Set with deeply-cloned values', () => {
      const inner = { x: 1 }
      const s = new Set([inner])
      const copy = cloneDeep(s)
      expect(copy).toBeInstanceOf(Set)
      expect(copy).not.toBe(s)
      const [cloned] = copy
      expect(cloned).toEqual({ x: 1 })
      expect(cloned).not.toBe(inner)
    })

    it('clones a Map with cycles', () => {
      const m: Map<string, unknown> = new Map()
      m.set('self', m)
      const copy = cloneDeep(m)
      expect(copy.get('self')).toBe(copy)
    })

    it('clones a Uint8Array as a Uint8Array', () => {
      const arr = new Uint8Array([1, 2, 3, 4])
      const copy = cloneDeep(arr)
      expect(copy).toBeInstanceOf(Uint8Array)
      expect(copy).not.toBe(arr)
      expect(Array.from(copy)).toEqual([1, 2, 3, 4])
      arr[0] = 99
      expect(copy[0]).toBe(1)
    })

    it('clones an ArrayBuffer', () => {
      const buf = new Uint8Array([1, 2, 3]).buffer
      const copy = cloneDeep(buf)
      expect(copy).toBeInstanceOf(ArrayBuffer)
      expect(copy).not.toBe(buf)
      expect(Array.from(new Uint8Array(copy))).toEqual([1, 2, 3])
    })

    it('clones a DataView preserving its window', () => {
      const buf = new Uint8Array([1, 2, 3, 4, 5, 6]).buffer
      const view = new DataView(buf, 1, 3)
      const copy = cloneDeep(view)
      expect(copy).toBeInstanceOf(DataView)
      expect(copy.byteLength).toBe(3)
      expect(copy.getUint8(0)).toBe(2)
    })

    it('passes Promises through by reference (cannot meaningfully clone)', () => {
      const p = Promise.resolve(42)
      expect(cloneDeep(p)).toBe(p)
    })

    it('passes Errors through by reference (preserves stack and identity)', () => {
      const e = new Error('boom')
      expect(cloneDeep(e)).toBe(e)
    })

    it('passes WeakMap/WeakSet through by reference', () => {
      const wm = new WeakMap()
      const ws = new WeakSet()
      expect(cloneDeep(wm)).toBe(wm)
      expect(cloneDeep(ws)).toBe(ws)
    })
  })
})

describe('deepMatch', () => {
  it('matches at the top level', () => {
    const obj = { name: 'talula', age: 3 }
    expect(deepMatch(obj, /^tal/)).toBe(true)
  })

  it('matches a nested string property', () => {
    const obj = {
      a: 1,
      b: {
        c: {
          message: 'hello world',
        },
      },
    }
    expect(deepMatch(obj, /world$/)).toBe(true)
  })

  it('matches inside arrays (arrays are just objects with numeric keys)', () => {
    const obj = {
      tags: ['foo', 'bar', 'bazqux'],
    }
    expect(deepMatch(obj, /baz/)).toBe(true)
  })

  it('returns false when no value matches', () => {
    const obj = { a: 'alpha', b: { c: 'beta' } }
    expect(deepMatch(obj, /gamma/)).toBe(false)
  })

  it('skips non-string leaf values correctly', () => {
    const obj = { num: 42, fn: () => 'hi', bool: true }
    expect(deepMatch(obj, /.*/)).toBe(false) // regex never sees non-strings
  })

  it('handles circular references without infinite recursion', () => {
    const obj: any = { a: 'circle' }
    obj.self = obj
    expect(deepMatch(obj, /circle/)).toBe(true)
  })

  it('works with global / reusable regexes (test resets lastIndex)', () => {
    const obj = { k: 'repeat repeat' }
    const globalRe = /repeat/g // global flag mutates lastIndex
    expect(deepMatch(obj, globalRe)).toBe(true)
    expect(deepMatch(obj, globalRe)).toBe(true) // should still work on 2nd call
  })

  it('honours Object.hasOwn and ignores prototype keys', () => {
    const proto = { hidden: 'should-not-be-seen' }
    const child = Object.create(proto)
    child.visible = 'see me'
    expect(deepMatch(child, /see/)).toBe(true)
    expect(deepMatch(child, /hidden/)).toBe(false)
  })
})
