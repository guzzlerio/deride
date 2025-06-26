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
