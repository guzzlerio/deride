import { describe, it, expect, beforeEach, vi } from 'vitest'
import deride from '../src/index'

describe('MethodMock', () => {
  describe('func() - standalone mocked functions', () => {
    it('creates a callable function', () => {
      const fn = deride.func()
      fn('hello')
      fn.expect.called.once()
    })

    it('records call arguments', () => {
      const fn = deride.func()
      fn('hello')
      fn.expect.called.withArg('hello')
    })

    it('returns undefined by default', () => {
      const fn = deride.func()
      const result = fn('hello')
      expect(result).toBe(undefined)
    })

    it('delegates to original function when provided', () => {
      const fn = deride.func((x: number) => x * 2)
      const result = fn(5)
      expect(result).toBe(10)
      fn.expect.called.once()
    })

    it('allows setup override on func with original', () => {
      const fn = deride.func((x: number) => x * 2)
      fn.setup.toReturn(99)
      const result = fn(5)
      expect(result).toBe(99)
    })

    it('tracks multiple calls', () => {
      const fn = deride.func()
      fn('a')
      fn('b')
      fn('c')
      fn.expect.called.times(3)
    })
  })

  describe('setup.when() - conditional behavior', () => {
    let bob: any

    beforeEach(() => {
      bob = deride.stub(['greet'])
    })

    it('returns different values based on first argument', () => {
      bob.setup.greet.when('alice').toReturn('hi alice')
      bob.setup.greet.when('bob').toReturn('hi bob')
      expect(bob.greet('alice')).toBe('hi alice')
      expect(bob.greet('bob')).toBe('hi bob')
    })

    it('returns undefined when no when matches', () => {
      bob.setup.greet.when('alice').toReturn('hi alice')
      expect(bob.greet('unknown')).toBe(undefined)
    })

    it('supports predicate functions', () => {
      bob.setup.greet.when((args: any[]) => args[0].startsWith('Dr')).toReturn('hello doctor')
      expect(bob.greet('Dr Smith')).toBe('hello doctor')
      expect(bob.greet('Mr Jones')).toBe(undefined)
    })

    it('later when registrations take priority', () => {
      bob.setup.greet.when('alice').toReturn('first')
      bob.setup.greet.when('alice').toReturn('second')
      expect(bob.greet('alice')).toBe('second')
    })
  })

  describe('setup.times() / once() / twice() - limited invocations', () => {
    let bob: any

    beforeEach(() => {
      bob = deride.stub(['greet'])
    })

    it('once() limits behavior to single invocation', () => {
      bob.setup.greet.toReturn('default')
      bob.setup.greet.once().toReturn('first')
      expect(bob.greet()).toBe('first')
      expect(bob.greet()).toBe('default')
    })

    it('twice() limits behavior to two invocations', () => {
      bob.setup.greet.toReturn('fallback')
      bob.setup.greet.twice().toReturn('limited')
      expect(bob.greet()).toBe('limited')
      expect(bob.greet()).toBe('limited')
      expect(bob.greet()).toBe('fallback')
    })

    it('times(n) limits behavior to n invocations', () => {
      bob.setup.greet.toReturn('fallback')
      bob.setup.greet.times(3).toReturn('limited')
      expect(bob.greet()).toBe('limited')
      expect(bob.greet()).toBe('limited')
      expect(bob.greet()).toBe('limited')
      expect(bob.greet()).toBe('fallback')
    })

    it('falls back to undefined when no default behavior', () => {
      bob.setup.greet.once().toReturn('first')
      expect(bob.greet()).toBe('first')
      expect(bob.greet()).toBe(undefined)
    })

    it('supports .and.then chaining for sequential behaviors', () => {
      bob.setup.greet.toReturn('first').twice().and.then.toReturn('second')
      expect(bob.greet()).toBe('first')
      expect(bob.greet()).toBe('first')
      expect(bob.greet()).toBe('second')
    })

    it('supports multiple .and.then chains', () => {
      bob.setup.greet.toReturn('a').once().and.then.toReturn('b').once().and.then.toReturn('c')
      expect(bob.greet()).toBe('a')
      expect(bob.greet()).toBe('b')
      expect(bob.greet()).toBe('c')
      expect(bob.greet()).toBe('c')
    })

    it('when().twice() limits conditional behavior to two invocations', () => {
      bob.setup.greet.toReturn('default')
      bob.setup.greet.when('alice').twice().toReturn('special')
      expect(bob.greet('alice')).toBe('special')
      expect(bob.greet('alice')).toBe('special')
      expect(bob.greet('alice')).toBe('default')
      expect(bob.greet('bob')).toBe('default')
    })

    it('when().times(n) limits conditional behavior to n invocations', () => {
      bob.setup.greet.toReturn('default')
      bob.setup.greet.when('alice').times(1).toReturn('once-only')
      expect(bob.greet('alice')).toBe('once-only')
      expect(bob.greet('alice')).toBe('default')
    })
  })

  describe('setup.toRejectWith() - promise rejection', () => {
    it('rejects with the provided error', async () => {
      const bob = deride.stub(['fetch'])
      bob.setup.fetch.toRejectWith(new Error('network error'))
      await expect(bob.fetch()).rejects.toThrow('network error')
    })

    it('rejects with a string error', async () => {
      const bob = deride.stub(['fetch'])
      bob.setup.fetch.toRejectWith('bad request')
      await expect(bob.fetch()).rejects.toBe('bad request')
    })
  })

  describe('setup.toResolveWith() - promise resolution', () => {
    it('resolves with the provided value', async () => {
      const bob = deride.stub(['fetch'])
      bob.setup.fetch.toResolveWith('data')
      const result = await bob.fetch()
      expect(result).toBe('data')
    })
  })

  describe('setup.toCallbackWith() - callback invocation', () => {
    it('invokes the last function argument with provided args', () => {
      const bob = deride.stub(['load'])
      bob.setup.load.toCallbackWith(null, 'data')
      const results: any[] = []
      bob.load('file.txt', (err: any, data: any) => results.push({ err, data }))
      expect(results.length).toBe(1)
      expect(results[0].err).toBe(null)
      expect(results[0].data).toBe('data')
    })

    it('invokes the last function when multiple functions are passed', () => {
      const bob = deride.stub(['chuckle'])
      bob.setup.chuckle.toCallbackWith(0, 'boom')
      const results: any[] = []
      bob.chuckle(
        'bob',
        () => results.push('wrong'),
        (err: any, message: any) => results.push({ err, message })
      )
      expect(results.length).toBe(1)
      expect(results[0]).toEqual({ err: 0, message: 'boom' })
    })

    it('throws when no callback is found', () => {
      const bob = deride.stub(['load'])
      bob.setup.load.toCallbackWith(null, 'data')
      expect(() => bob.load('file.txt')).toThrow('No callback function found in arguments')
    })
  })

  describe('setup.toIntercept() - inspect without replacing', () => {
    it('calls interceptor and still returns original result', () => {
      const fn = deride.func((x: number) => x * 2)
      const intercepted: any[][] = []
      fn.setup.toIntercept((...args: any[]) => intercepted.push(args))
      const result = fn(5)
      expect(result).toBe(10)
      expect(intercepted.length).toBe(1)
      expect(intercepted[0]).toEqual([5])
    })

    it('calls interceptor and returns undefined when no original', () => {
      const fn = deride.func()
      const intercepted: any[][] = []
      fn.setup.toIntercept((...args: any[]) => intercepted.push(args))
      const result = fn('test')
      expect(result).toBe(undefined)
      expect(intercepted.length).toBe(1)
      expect(intercepted[0]).toEqual(['test'])
    })
  })

  describe('setup.toTimeWarp() - accelerated timeout', () => {
    it('schedules callback with specified delay', () => {
      vi.useFakeTimers()
      try {
        const bob = deride.stub(['doWork'])
        bob.setup.doWork.toTimeWarp(0)
        const results: string[] = []
        bob.doWork(1000, (_result: any) => results.push('done'))
        expect(results.length).toBe(0)
        vi.runAllTimers()
        expect(results.length).toBe(1)
        expect(results[0]).toBe('done')
      } finally {
        vi.useRealTimers()
      }
    })

    it('works with a non-zero delay', () => {
      vi.useFakeTimers()
      try {
        const bob = deride.stub(['doWork'])
        bob.setup.doWork.toTimeWarp(100)
        const results: string[] = []
        bob.doWork(() => results.push('done'))
        expect(results.length).toBe(0)
        vi.advanceTimersByTime(50)
        expect(results.length).toBe(0)
        vi.advanceTimersByTime(50)
        expect(results.length).toBe(1)
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('setup.fallback() - clear behaviors', () => {
    it('clears all behaviors', () => {
      const bob = deride.stub(['greet'])
      bob.setup.greet.toReturn('mocked')
      expect(bob.greet()).toBe('mocked')
      bob.setup.greet.fallback()
      expect(bob.greet()).toBe(undefined)
    })

    it('allows new behaviors to be added after fallback', () => {
      const bob = deride.stub(['greet'])
      bob.setup.greet.toReturn('first')
      bob.setup.greet.fallback()
      bob.setup.greet.toReturn('second')
      expect(bob.greet()).toBe('second')
    })
  })

  describe('setup.toThrow() - error throwing', () => {
    it('throws the specified error message', () => {
      const bob = deride.stub(['greet'])
      bob.setup.greet.toThrow('boom')
      expect(() => bob.greet()).toThrow('boom')
    })
  })

  describe('setup.toDoThis() - custom implementation', () => {
    it('replaces behavior with custom function', () => {
      const bob = deride.stub(['greet'])
      bob.setup.greet.toDoThis((name: string) => `hello ${name}`)
      expect(bob.greet('alice')).toBe('hello alice')
    })
  })

  describe('expect.called.twice() and comparison operators', () => {
    let bob: any

    beforeEach(() => {
      bob = deride.stub(['greet'])
    })

    it('twice() passes when called exactly twice', () => {
      bob.greet()
      bob.greet()
      bob.expect.greet.called.twice()
    })

    it('twice() fails when not called twice', () => {
      bob.greet()
      expect(() => bob.expect.greet.called.twice()).toThrow()
    })

    it('gt() passes when call count is greater', () => {
      bob.greet()
      bob.greet()
      bob.greet()
      bob.expect.greet.called.gt(2)
    })

    it('gt() fails when call count is not greater', () => {
      bob.greet()
      bob.greet()
      expect(() => bob.expect.greet.called.gt(5)).toThrow()
    })

    it('gte() passes when call count is equal', () => {
      bob.greet()
      bob.greet()
      bob.greet()
      bob.expect.greet.called.gte(3)
    })

    it('gte() passes when call count is greater', () => {
      bob.greet()
      bob.greet()
      bob.greet()
      bob.expect.greet.called.gte(2)
    })

    it('lt() passes when call count is less', () => {
      bob.greet()
      bob.greet()
      bob.greet()
      bob.expect.greet.called.lt(4)
    })

    it('lt() fails when call count is not less', () => {
      bob.greet()
      bob.greet()
      bob.greet()
      expect(() => bob.expect.greet.called.lt(2)).toThrow()
    })

    it('lte() passes when call count is equal', () => {
      bob.greet()
      bob.greet()
      bob.greet()
      bob.expect.greet.called.lte(3)
    })

    it('lte() passes when call count is less', () => {
      bob.greet()
      bob.greet()
      bob.expect.greet.called.lte(3)
    })

    it('never() passes when not called', () => {
      bob.expect.greet.called.never()
    })

    it('never() fails when called', () => {
      bob.greet()
      expect(() => bob.expect.greet.called.never()).toThrow()
    })
  })

  describe('expect.called.not.* - negated expectations', () => {
    let bob: any

    beforeEach(() => {
      bob = deride.stub(['greet'])
    })

    it('not.never() passes when function was called', () => {
      bob.greet('alice')
      bob.expect.greet.called.not.never()
    })

    it('not.never() fails when function was not called', () => {
      expect(() => bob.expect.greet.called.not.never()).toThrow()
    })

    it('not.once() fails when called exactly once', () => {
      bob.greet('alice')
      expect(() => bob.expect.greet.called.not.once()).toThrow()
    })

    it('not.once() passes when not called once', () => {
      bob.greet('a')
      bob.greet('b')
      bob.expect.greet.called.not.once()
    })

    it('not.twice() passes when called once', () => {
      bob.greet('alice')
      bob.expect.greet.called.not.twice()
    })

    it('not.twice() fails when called exactly twice', () => {
      bob.greet('a')
      bob.greet('b')
      expect(() => bob.expect.greet.called.not.twice()).toThrow()
    })

    it('not.times() passes when call count differs', () => {
      bob.greet('a')
      bob.expect.greet.called.not.times(5)
    })

    it('not.times() fails when call count matches', () => {
      bob.greet('a')
      expect(() => bob.expect.greet.called.not.times(1)).toThrow()
    })

    it('not.withArg() passes when arg was not used', () => {
      bob.greet('alice')
      bob.expect.greet.called.not.withArg('bob')
    })

    it('not.withArg() fails when arg was used', () => {
      bob.greet('alice')
      expect(() => bob.expect.greet.called.not.withArg('alice')).toThrow()
    })

    it('not.withArgs() passes when args were not used', () => {
      bob.greet('alice', 'carol')
      bob.expect.greet.called.not.withArgs('bob', 'dave')
    })

    it('not.withArgs() fails when args were used', () => {
      bob.greet('alice', 'carol')
      expect(() => bob.expect.greet.called.not.withArgs('alice', 'carol')).toThrow()
    })

    it('not.withMatch() passes when pattern does not match', () => {
      bob.greet('hello world')
      bob.expect.greet.called.not.withMatch(/^goodbye/)
    })

    it('not.withMatch() fails when pattern matches', () => {
      bob.greet('hello world')
      expect(() => bob.expect.greet.called.not.withMatch(/^hello/)).toThrow()
    })

    it('not.matchExactly() passes when args do not match exactly', () => {
      bob.greet('alice', 123)
      bob.expect.greet.called.not.matchExactly('bob', 456)
    })

    it('not.matchExactly() fails when args match exactly', () => {
      bob.greet('alice', 123)
      expect(() => bob.expect.greet.called.not.matchExactly('alice', 123)).toThrow()
    })

    it('not.gt() passes when call count is not greater', () => {
      bob.greet()
      bob.expect.greet.called.not.gt(5)
    })

    it('not.gt() fails when call count is greater', () => {
      bob.greet()
      bob.greet()
      bob.greet()
      expect(() => bob.expect.greet.called.not.gt(2)).toThrow()
    })

    it('not.lt() passes when call count is not less', () => {
      bob.greet()
      bob.greet()
      bob.greet()
      bob.expect.greet.called.not.lt(2)
    })

    it('not.lt() fails when call count is less', () => {
      bob.greet()
      expect(() => bob.expect.greet.called.not.lt(5)).toThrow()
    })

    it('not.gte() passes when call count is not gte', () => {
      bob.greet()
      bob.expect.greet.called.not.gte(5)
    })

    it('not.lte() passes when call count is not lte', () => {
      bob.greet()
      bob.greet()
      bob.greet()
      bob.expect.greet.called.not.lte(2)
    })
  })

  describe('expect.invocation() - specific call verification', () => {
    let bob: any

    beforeEach(() => {
      bob = deride.stub(['greet'])
      bob.greet('first')
      bob.greet('second', 'extra')
    })

    it('verifies argument of specific invocation with withArg', () => {
      bob.expect.greet.invocation(0).withArg('first')
      bob.expect.greet.invocation(1).withArg('second')
    })

    it('verifies multiple arguments of specific invocation with withArgs', () => {
      bob.expect.greet.invocation(1).withArgs('second', 'extra')
    })

    it('throws when invocation index is out of range', () => {
      expect(() => bob.expect.greet.invocation(5).withArg('x')).toThrow('invocation out of range')
    })

    it('fails when argument does not match invocation', () => {
      expect(() => bob.expect.greet.invocation(0).withArg('wrong')).toThrow()
    })

    it('fails when args do not match invocation', () => {
      expect(() => bob.expect.greet.invocation(1).withArgs('wrong', 'args')).toThrow()
    })
  })

  describe('func() with setup on standalone function', () => {
    it('supports toReturn on func', () => {
      const fn = deride.func()
      fn.setup.toReturn(42)
      expect(fn()).toBe(42)
    })

    it('supports toDoThis on func', () => {
      const fn = deride.func()
      fn.setup.toDoThis((x: number) => x + 1)
      expect(fn(10)).toBe(11)
    })

    it('supports toThrow on func', () => {
      const fn = deride.func()
      fn.setup.toThrow('oops')
      expect(() => fn()).toThrow('oops')
    })

    it('supports toResolveWith on func', async () => {
      const fn = deride.func()
      fn.setup.toResolveWith('resolved')
      const result = await fn()
      expect(result).toBe('resolved')
    })
  })

  describe('called.reset()', () => {
    it('resets call count', () => {
      const fn = deride.func()
      fn('a')
      fn('b')
      fn.expect.called.twice()
      fn.expect.called.reset()
      fn.expect.called.never()
    })
  })

  describe('wrap() with a standalone function', () => {
    it('returns a callable mock that delegates to the original', () => {
      function greet(name: string) { return `hello ${name}` }
      const wrapped = deride.wrap(greet)
      expect(wrapped('world')).toBe('hello world')
    })

    it('tracks calls on the wrapped function', () => {
      function greet(name: string) { return `hello ${name}` }
      const wrapped = deride.wrap(greet)
      wrapped('alice')
      wrapped.expect.called.once()
      wrapped.expect.called.withArg('alice')
    })

    it('allows setup overrides on the wrapped function', () => {
      function greet(name: string) { return `hello ${name}` }
      const wrapped = deride.wrap(greet)
      wrapped.setup.toReturn('overridden')
      expect(wrapped('x')).toBe('overridden')
    })
  })
})
