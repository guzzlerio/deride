import { describe, it, expect } from 'vitest'
import deride from '../src/index'

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
