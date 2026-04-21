import { describe, it, expect, beforeEach } from 'vitest'
import deride, { match, stub, type Matcher } from '../src/index'
import { isMatcher, matchValue, MATCHER_BRAND } from '../src/matchers'

interface Svc {
  handle(arg: unknown): unknown
  call(a: unknown, b: unknown, c?: unknown): unknown
}

describe('matchers', () => {
  describe('isMatcher brand recognition', () => {
    it('recognises a real matcher', () => {
      expect(isMatcher(match.any)).toBe(true)
      expect(isMatcher(match.string)).toBe(true)
    })

    it('rejects a look-alike without the brand symbol', () => {
      const fake = { description: 'x', test: () => true }
      expect(isMatcher(fake)).toBe(false)
    })

    it('rejects a look-alike with wrong brand value', () => {
      const fake = { [MATCHER_BRAND]: false, description: 'x', test: () => true }
      expect(isMatcher(fake)).toBe(false)
    })

    it('rejects null, undefined, primitives', () => {
      expect(isMatcher(null)).toBe(false)
      expect(isMatcher(undefined)).toBe(false)
      expect(isMatcher('match.any')).toBe(false)
      expect(isMatcher(42)).toBe(false)
    })
  })

  describe('type matchers', () => {
    it('match.any accepts everything including nullish', () => {
      for (const v of [null, undefined, 0, '', false, {}, [], () => {}]) {
        expect(match.any.test(v)).toBe(true)
      }
    })

    it('match.defined rejects undefined, accepts null', () => {
      expect(match.defined.test(undefined)).toBe(false)
      expect(match.defined.test(null)).toBe(true)
      expect(match.defined.test(0)).toBe(true)
    })

    it('match.nullish accepts only null/undefined', () => {
      expect(match.nullish.test(null)).toBe(true)
      expect(match.nullish.test(undefined)).toBe(true)
      expect(match.nullish.test(0)).toBe(false)
      expect(match.nullish.test('')).toBe(false)
    })

    it('match.string', () => {
      expect(match.string.test('x')).toBe(true)
      expect(match.string.test(1)).toBe(false)
      expect(match.string.test(null)).toBe(false)
    })

    it('match.number', () => {
      expect(match.number.test(1)).toBe(true)
      expect(match.number.test(NaN)).toBe(true)
      expect(match.number.test('1')).toBe(false)
    })

    it('match.boolean', () => {
      expect(match.boolean.test(true)).toBe(true)
      expect(match.boolean.test(false)).toBe(true)
      expect(match.boolean.test(1)).toBe(false)
    })

    it('match.bigint', () => {
      expect(match.bigint.test(1n)).toBe(true)
      expect(match.bigint.test(1)).toBe(false)
    })

    it('match.symbol', () => {
      expect(match.symbol.test(Symbol('x'))).toBe(true)
      expect(match.symbol.test('x')).toBe(false)
    })

    it('match.function', () => {
      expect(match.function.test(() => 0)).toBe(true)
      expect(match.function.test(class {})).toBe(true)
      expect(match.function.test({})).toBe(false)
    })

    it('match.array', () => {
      expect(match.array.test([])).toBe(true)
      expect(match.array.test({ length: 0 })).toBe(false)
    })

    it('match.object rejects arrays and null', () => {
      expect(match.object.test({})).toBe(true)
      expect(match.object.test([])).toBe(false)
      expect(match.object.test(null)).toBe(false)
    })
  })

  describe('structural matchers', () => {
    class Animal {}
    class Dog extends Animal {}
    class Cat {}

    it('instanceOf matches exact class', () => {
      expect(match.instanceOf(Dog).test(new Dog())).toBe(true)
    })

    it('instanceOf matches subclass', () => {
      expect(match.instanceOf(Animal).test(new Dog())).toBe(true)
    })

    it('instanceOf rejects unrelated class', () => {
      expect(match.instanceOf(Dog).test(new Cat())).toBe(false)
    })

    it('instanceOf rejects null and primitives', () => {
      expect(match.instanceOf(Dog).test(null)).toBe(false)
      expect(match.instanceOf(Dog).test('dog')).toBe(false)
    })

    it('objectContaining matches exact shape', () => {
      expect(match.objectContaining({ a: 1 }).test({ a: 1 })).toBe(true)
    })

    it('objectContaining matches supersets', () => {
      expect(match.objectContaining({ a: 1 }).test({ a: 1, b: 2 })).toBe(true)
    })

    it('objectContaining rejects missing keys', () => {
      expect(match.objectContaining({ a: 1 }).test({ b: 2 })).toBe(false)
    })

    it('objectContaining supports nested matchers', () => {
      const m = match.objectContaining({ id: match.number, name: match.string })
      expect(m.test({ id: 1, name: 'a' })).toBe(true)
      expect(m.test({ id: '1', name: 'a' })).toBe(false)
    })

    it('objectContaining distinguishes { x: undefined } from {}', () => {
      const m = match.objectContaining({ x: undefined })
      expect(m.test({})).toBe(false)
      expect(m.test({ x: undefined })).toBe(true)
    })

    it('arrayContaining matches subset (any order)', () => {
      const m = match.arrayContaining([2, 1])
      expect(m.test([1, 2, 3])).toBe(true)
    })

    it('arrayContaining rejects missing element', () => {
      expect(match.arrayContaining([4]).test([1, 2, 3])).toBe(false)
    })

    it('arrayContaining supports nested matchers', () => {
      const m = match.arrayContaining([match.objectContaining({ id: 1 })])
      expect(m.test([{ id: 1, x: 0 }, { id: 2 }])).toBe(true)
    })

    it('arrayContaining with empty expected list matches any array', () => {
      expect(match.arrayContaining([]).test([])).toBe(true)
      expect(match.arrayContaining([]).test([1, 2])).toBe(true)
    })

    it('exact uses strict deep equal, rejects extra keys', () => {
      expect(match.exact({ a: 1 }).test({ a: 1 })).toBe(true)
      expect(match.exact({ a: 1 }).test({ a: 1, b: 2 })).toBe(false)
    })
  })

  describe('comparator matchers', () => {
    it('gt / gte with numbers', () => {
      expect(match.gt(5).test(6)).toBe(true)
      expect(match.gt(5).test(5)).toBe(false)
      expect(match.gte(5).test(5)).toBe(true)
    })

    it('lt / lte with numbers', () => {
      expect(match.lt(5).test(4)).toBe(true)
      expect(match.lt(5).test(5)).toBe(false)
      expect(match.lte(5).test(5)).toBe(true)
    })

    it('comparators with bigints', () => {
      expect(match.gt(5n).test(6n)).toBe(true)
      expect(match.lte(5n).test(5n)).toBe(true)
    })

    it('comparators reject mixed bigint vs number', () => {
      expect(match.gt(5n).test(6)).toBe(false)
      expect(match.gt(5).test(6n)).toBe(false)
    })

    it('between is inclusive at both bounds', () => {
      expect(match.between(1, 3).test(1)).toBe(true)
      expect(match.between(1, 3).test(3)).toBe(true)
      expect(match.between(1, 3).test(0)).toBe(false)
      expect(match.between(1, 3).test(4)).toBe(false)
    })

    it('NaN rejects everything', () => {
      expect(match.gt(0).test(NaN)).toBe(false)
      expect(match.lt(0).test(NaN)).toBe(false)
      expect(match.between(0, 10).test(NaN)).toBe(false)
    })
  })

  describe('string matchers', () => {
    it('regex matches and rejects', () => {
      expect(match.regex(/foo/).test('foobar')).toBe(true)
      expect(match.regex(/foo/).test('bar')).toBe(false)
    })

    it('regex rejects non-string without coercion', () => {
      expect(match.regex(/42/).test(42)).toBe(false)
    })

    it('regex resets lastIndex for global patterns', () => {
      const g = /x/g
      expect(match.regex(g).test('xxx')).toBe(true)
      expect(match.regex(g).test('xxx')).toBe(true)
    })

    it('startsWith / endsWith / includes', () => {
      expect(match.startsWith('foo').test('foobar')).toBe(true)
      expect(match.endsWith('bar').test('foobar')).toBe(true)
      expect(match.includes('oba').test('foobar')).toBe(true)
      expect(match.startsWith('foo').test('other')).toBe(false)
    })

    it('string matchers reject non-strings', () => {
      expect(match.startsWith('x').test(42)).toBe(false)
      expect(match.endsWith('x').test(null)).toBe(false)
      expect(match.includes('x').test([])).toBe(false)
    })
  })

  describe('logic combinators', () => {
    it('not inverts', () => {
      expect(match.not(match.string).test(1)).toBe(true)
      expect(match.not(match.string).test('x')).toBe(false)
    })

    it('allOf requires every matcher to pass', () => {
      const m = match.allOf(match.string, match.startsWith('a'))
      expect(m.test('abc')).toBe(true)
      expect(m.test('bc')).toBe(false)
      expect(m.test(1)).toBe(false)
    })

    it('allOf with empty list is vacuously true', () => {
      expect(match.allOf().test(123)).toBe(true)
    })

    it('oneOf passes if any matcher passes', () => {
      const m = match.oneOf(match.string, match.number)
      expect(m.test('x')).toBe(true)
      expect(m.test(1)).toBe(true)
      expect(m.test(true)).toBe(false)
    })

    it('oneOf with empty list is vacuously false', () => {
      expect(match.oneOf().test('anything')).toBe(false)
    })

    it('anyOf tests equality or matcher-match against each value', () => {
      expect(match.anyOf(1, 2, 3).test(2)).toBe(true)
      expect(match.anyOf(1, 2, 3).test(4)).toBe(false)
      expect(match.anyOf(match.string, 99).test('x')).toBe(true)
    })
  })

  describe('match.where', () => {
    it('uses a custom predicate', () => {
      const m = match.where<number>((n) => n > 100)
      expect(m.test(200)).toBe(true)
      expect(m.test(50)).toBe(false)
    })

    it('catches thrown predicates as non-match', () => {
      const m = match.where(() => {
        throw new Error('boom')
      })
      expect(m.test(undefined)).toBe(false)
    })
  })

  describe('matchValue helper', () => {
    it('uses matchers at the top level', () => {
      expect(matchValue('x', match.string)).toBe(true)
      expect(matchValue(1, match.string)).toBe(false)
    })

    it('recurses into arrays', () => {
      expect(matchValue([1, 'a'], [match.number, match.string])).toBe(true)
      expect(matchValue([1, 2], [match.number, match.string])).toBe(false)
    })

    it('recurses into objects (strict key set)', () => {
      expect(matchValue({ a: 1 }, { a: match.number })).toBe(true)
      expect(matchValue({ a: 1, b: 2 }, { a: match.number })).toBe(false)
    })

    it('falls back to deep strict equal for non-matcher values', () => {
      expect(matchValue({ a: [1, 2] }, { a: [1, 2] })).toBe(true)
      expect(matchValue({ a: [1, 2] }, { a: [2, 1] })).toBe(false)
    })
  })

  describe('integration with setup.when()', () => {
    let mock: ReturnType<typeof stub<Svc>>
    beforeEach(() => {
      mock = stub<Svc>(['handle', 'call'])
    })

    it('matcher gates a behaviour', () => {
      mock.setup.handle.when(match.string).toReturn('string!')
      mock.setup.handle.when(match.number).toReturn('number!')
      expect(mock.handle('x')).toBe('string!')
      expect(mock.handle(1)).toBe('number!')
    })

    it('non-matching call returns undefined without a default', () => {
      mock.setup.handle.when(match.number).toReturn('number!')
      expect(mock.handle(5)).toBe('number!')
      expect(mock.handle('x')).toBeUndefined()
    })

    it('time-limited when() matcher beats a later default', () => {
      mock.setup.handle.when(match.number).toReturn('number!').once()
      mock.setup.handle.toReturn('default')
      expect(mock.handle(5)).toBe('number!')
      expect(mock.handle(5)).toBe('default')
      expect(mock.handle('x')).toBe('default')
    })

    it('objectContaining as when', () => {
      mock.setup.handle.when(match.objectContaining({ id: 1 })).toReturn('found')
      expect(mock.handle({ id: 1, name: 'a' })).toBe('found')
      expect(mock.handle({ id: 2 })).toBeUndefined()
    })
  })

  describe('integration with expect.withArg', () => {
    let mock: ReturnType<typeof stub<Svc>>
    beforeEach(() => {
      mock = stub<Svc>(['handle', 'call'])
    })

    it('matcher accepted', () => {
      mock.handle('alice')
      mock.expect.handle.called.withArg(match.string)
    })

    it('matcher fails when no arg matches', () => {
      mock.handle(42)
      expect(() => mock.expect.handle.called.withArg(match.string)).toThrow()
    })

    it('nested matcher inside an object', () => {
      mock.handle({ id: 3, name: 'carol' })
      mock.expect.handle.called.withArg({ id: match.number })
    })
  })

  describe('integration with expect.withArgs', () => {
    it('mixed positional matchers and values', () => {
      const mock = stub<Svc>(['call'])
      mock.call('x', 99, 'z')
      mock.expect.call.called.withArgs(match.string, match.number)
    })
  })

  describe('integration with expect.matchExactly', () => {
    it('matcher in each position', () => {
      const mock = stub<Svc>(['call'])
      mock.call('x', 99, 'z')
      mock.expect.call.called.matchExactly(match.string, match.number, match.string)
    })

    it('mismatched arity fails even with matchers', () => {
      const mock = stub<Svc>(['call'])
      mock.call('x', 99)
      expect(() =>
        mock.expect.call.called.matchExactly(match.string, match.number, match.string)
      ).toThrow()
    })
  })

  describe('integration with expect.invocation(i).withArg', () => {
    it('per-call matcher assertion', () => {
      const mock = stub<Svc>(['handle'])
      mock.handle('first')
      mock.handle(99)
      mock.expect.handle.invocation(0).withArg(match.string)
      mock.expect.handle.invocation(1).withArg(match.number)
      expect(() => mock.expect.handle.invocation(0).withArg(match.number)).toThrow()
    })
  })

  describe('negation with matchers', () => {
    it('not.withArg(match.*) passes when no arg matches', () => {
      const mock = stub<Svc>(['handle'])
      mock.handle(42)
      mock.expect.handle.called.not.withArg(match.string)
    })

    it('not.withArg(match.*) fails when some arg matches', () => {
      const mock = stub<Svc>(['handle'])
      mock.handle('x')
      expect(() => mock.expect.handle.called.not.withArg(match.string)).toThrow()
    })
  })

  describe('type-level sanity', () => {
    it('Matcher type is exported and assignable', () => {
      const m: Matcher = match.any
      expect(isMatcher(m)).toBe(true)
    })

    it('deride.match is part of the default export', () => {
      expect(deride.match).toBe(match)
    })
  })
})
