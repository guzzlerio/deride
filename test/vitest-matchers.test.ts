import { describe, it, expect } from 'vitest'
import '../src/vitest'
import { func, stub } from '../src/index'

interface Svc {
  greet(name: string): string
  fail(): void
}

describe('deride/vitest matchers', () => {
  it('toHaveBeenCalled passes after any call', () => {
    const fn = func<(x: number) => number>()
    fn(1)
    expect(fn).toHaveBeenCalled()
  })

  it('toHaveBeenCalled fails when never called', () => {
    const fn = func<(x: number) => number>()
    expect(() => expect(fn).toHaveBeenCalled()).toThrow()
  })

  it('toHaveBeenCalledTimes / toHaveBeenCalledOnce', () => {
    const mock = stub<Svc>(['greet', 'fail'])
    mock.greet('a')
    expect(mock.spy.greet).toHaveBeenCalledOnce()
    expect(mock.spy.greet).toHaveBeenCalledTimes(1)
    mock.greet('b')
    expect(mock.spy.greet).toHaveBeenCalledTimes(2)
  })

  it('toHaveBeenCalledWith', () => {
    const mock = stub<Svc>(['greet', 'fail'])
    mock.greet('alice')
    expect(mock.spy.greet).toHaveBeenCalledWith('alice')
    expect(() => expect(mock.spy.greet).toHaveBeenCalledWith('bob')).toThrow()
  })

  it('toHaveBeenLastCalledWith', () => {
    const mock = stub<Svc>(['greet', 'fail'])
    mock.greet('first')
    mock.greet('second')
    expect(mock.spy.greet).toHaveBeenLastCalledWith('second')
    expect(() => expect(mock.spy.greet).toHaveBeenLastCalledWith('first')).toThrow()
  })

  it('toHaveBeenNthCalledWith (1-indexed)', () => {
    const mock = stub<Svc>(['greet', 'fail'])
    mock.greet('first')
    mock.greet('second')
    expect(mock.spy.greet).toHaveBeenNthCalledWith(1, 'first')
    expect(mock.spy.greet).toHaveBeenNthCalledWith(2, 'second')
    expect(() => expect(mock.spy.greet).toHaveBeenNthCalledWith(1, 'second')).toThrow()
  })

  it('negation via .not', () => {
    const mock = stub<Svc>(['greet', 'fail'])
    mock.greet('x')
    expect(mock.spy.greet).not.toHaveBeenCalledWith('y')
    expect(mock.spy.greet).not.toHaveBeenCalledTimes(2)
  })

  it('works on MockedFunction directly (not just spy)', () => {
    const fn = func<(x: number) => number>()
    fn(5)
    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith(5)
  })

  it('throws a helpful error when given something that is not a mock', () => {
    expect(() => expect({}).toHaveBeenCalled()).toThrow(/MethodSpy|MockedFunction/)
    expect(() => expect(null).toHaveBeenCalled()).toThrow(/MethodSpy|MockedFunction/)
  })
})
