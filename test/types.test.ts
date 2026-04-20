import { describe, it, expect } from 'vitest'
import deride from '../src/index'

/**
 * These tests verify that the type system correctly constrains setup methods
 * to the method's actual signature, while allowing explicit opt-out via <any>.
 */

interface MyService {
  greet(name: string): string
  fetchData(url: string): Promise<{ id: number }>
  process(a: number, b: number): number
}

describe('Typed setup', () => {
  describe('toReturn', () => {
    it('accepts the correct return type', () => {
      const svc = deride.stub<MyService>(['greet', 'fetchData', 'process'])
      svc.setup.greet.toReturn('hello')
      expect(svc.greet('x')).toBe('hello')
    })

    it('allows as any cast to bypass type checking', () => {
      const svc = deride.stub<MyService>(['greet', 'fetchData', 'process'])
      svc.setup.greet.toReturn(123 as any)
      expect(svc.greet('x')).toBe(123)
    })
  })

  describe('toDoThis', () => {
    it('accepts a function with matching signature', () => {
      const svc = deride.stub<MyService>(['greet', 'fetchData', 'process'])
      svc.setup.greet.toDoThis((name: string) => `hi ${name}`)
      expect(svc.greet('alice')).toBe('hi alice')
    })

    it('allows as any cast to bypass type checking', () => {
      const svc = deride.stub<MyService>(['greet', 'fetchData', 'process'])
      svc.setup.greet.toDoThis((() => 42) as any)
      expect(svc.greet('x')).toBe(42)
    })
  })

  describe('toResolveWith', () => {
    it('accepts the resolved type for promise-returning methods', async () => {
      const svc = deride.stub<MyService>(['greet', 'fetchData', 'process'])
      svc.setup.fetchData.toResolveWith({ id: 1 })
      const result = await svc.fetchData('url')
      expect(result).toEqual({ id: 1 })
    })

    it('allows as any cast to bypass type checking', async () => {
      const svc = deride.stub<MyService>(['greet', 'fetchData', 'process'])
      svc.setup.fetchData.toResolveWith('not an object' as any)
      const result = await svc.fetchData('url')
      expect(result).toBe('not an object')
    })
  })

  describe('when', () => {
    it('accepts the first argument type', () => {
      const svc = deride.stub<MyService>(['greet', 'fetchData', 'process'])
      svc.setup.greet.when('alice').toReturn('hi alice')
      expect(svc.greet('alice')).toBe('hi alice')
    })
  })

  describe('func() with generics', () => {
    it('constrains toReturn to the function return type', () => {
      const fn = deride.func((x: number) => x * 2)
      fn.setup.toReturn(99)
      expect(fn(5)).toBe(99)
    })

    it('allows as any cast on func', () => {
      const fn = deride.func((x: number) => x * 2)
      fn.setup.toReturn('not a number' as any)
      expect(fn(5)).toBe('not a number')
    })
  })
})
