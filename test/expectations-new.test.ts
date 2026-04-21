import { describe, it, expect, beforeEach } from 'vitest'
import { func, stub, match } from '../src/index'

interface Svc {
  greet(name: string): string
  fetch(url: string): Promise<string>
  fail(): void
  sum(a: number, b: number): number
}

describe('withReturn', () => {
  let mock: ReturnType<typeof stub<Svc>>
  beforeEach(() => {
    mock = stub<Svc>(['greet', 'fetch', 'fail', 'sum'])
  })

  it('passes when any call returned the exact value', () => {
    mock.setup.greet.toReturn('hello alice')
    mock.greet('alice')
    mock.expect.greet.called.withReturn('hello alice')
  })

  it('fails when no call returned the value', () => {
    mock.setup.greet.toReturn('hi')
    mock.greet('alice')
    expect(() => mock.expect.greet.called.withReturn('hello alice')).toThrow()
  })

  it('works with matchers', () => {
    mock.setup.sum.toReturn(42)
    mock.sum(1, 2)
    mock.expect.sum.called.withReturn(match.number)
    mock.expect.sum.called.withReturn(match.gte(40))
    expect(() => mock.expect.sum.called.withReturn(match.string)).toThrow()
  })

  it('works with object deep equal', () => {
    mock = stub<Svc & { build(): { ok: boolean } }>(['greet', 'fetch', 'fail', 'sum', 'build']) as unknown as typeof mock
    ;(mock as unknown as { setup: { build: { toReturn: (v: unknown) => void } } }).setup.build.toReturn({ ok: true })
    ;(mock as unknown as { build: () => unknown }).build()
    ;(mock as unknown as { expect: { build: { called: { withReturn: (v: unknown) => void } } } }).expect.build.called.withReturn({ ok: true })
  })

  it('negation works', () => {
    mock.setup.greet.toReturn('hi')
    mock.greet('alice')
    mock.expect.greet.called.not.withReturn('goodbye')
    expect(() => mock.expect.greet.called.not.withReturn('hi')).toThrow()
  })
})

describe('calledOn', () => {
  it('passes when at least one call had the expected this', () => {
    const target = { tag: 'target' }
    const fn = func<(x: number) => number>()
    fn.call(target, 1)
    fn.expect.called.calledOn(target)
  })

  it('fails when no call had the expected this', () => {
    const target = { tag: 'target' }
    const other = { tag: 'other' }
    const fn = func<(x: number) => number>()
    fn.call(target, 1)
    expect(() => fn.expect.called.calledOn(other)).toThrow()
  })

  it('negation', () => {
    const target = { tag: 'target' }
    const other = { tag: 'other' }
    const fn = func<(x: number) => number>()
    fn.call(target, 1)
    fn.expect.called.not.calledOn(other)
    expect(() => fn.expect.called.not.calledOn(target)).toThrow()
  })
})

describe('threw', () => {
  let mock: ReturnType<typeof stub<Svc>>
  beforeEach(() => {
    mock = stub<Svc>(['greet', 'fetch', 'fail', 'sum'])
  })

  it('threw() with no args passes when any call threw', () => {
    mock.setup.fail.toThrow('bang')
    expect(() => mock.fail()).toThrow()
    mock.expect.fail.called.threw()
  })

  it('threw() fails when nothing threw', () => {
    mock.fail()
    expect(() => mock.expect.fail.called.threw()).toThrow()
  })

  it('threw(message) matches Error.message', () => {
    mock.setup.fail.toThrow('network error')
    expect(() => mock.fail()).toThrow()
    mock.expect.fail.called.threw('network error')
    expect(() => mock.expect.fail.called.threw('other')).toThrow()
  })

  it('threw(ErrorClass) is sugar for instanceOf', () => {
    class MyError extends Error {}
    mock.setup.fail.toDoThis(() => {
      throw new MyError('x')
    })
    expect(() => mock.fail()).toThrow()
    mock.expect.fail.called.threw(MyError)
  })

  it('threw(matcher) with match.instanceOf', () => {
    class MyError extends Error {}
    mock.setup.fail.toDoThis(() => {
      throw new MyError('x')
    })
    expect(() => mock.fail()).toThrow()
    mock.expect.fail.called.threw(match.instanceOf(MyError))
  })

  it('threw(matcher) with objectContaining for non-Error throws', () => {
    mock.setup.fail.toDoThis(() => {
      throw { code: 1, msg: 'no' }
    })
    expect(() => mock.fail()).toThrow()
    mock.expect.fail.called.threw(match.objectContaining({ code: 1 }))
  })

  it('negation', () => {
    mock.fail()
    mock.expect.fail.called.not.threw()
  })
})

describe('everyCall', () => {
  let mock: ReturnType<typeof stub<Svc>>
  beforeEach(() => {
    mock = stub<Svc>(['greet', 'fetch', 'fail', 'sum'])
  })

  it('throws when never called (no vacuous-true)', () => {
    expect(() => mock.expect.greet.everyCall.withArg(match.string)).toThrow()
  })

  it('passes when every call matches', () => {
    mock.greet('a')
    mock.greet('b')
    mock.greet('c')
    mock.expect.greet.everyCall.withArg(match.string)
  })

  it('fails when a single call mismatches', () => {
    mock.greet('a')
    mock.greet(42 as unknown as string)
    expect(() => mock.expect.greet.everyCall.withArg(match.string)).toThrow()
  })

  it('matchExactly across every call', () => {
    mock.sum(1, 2)
    mock.sum(1, 2)
    mock.expect.sum.everyCall.matchExactly(1, 2)
    mock.sum(3, 4)
    expect(() => mock.expect.sum.everyCall.matchExactly(1, 2)).toThrow()
  })

  it('withReturn across every call', () => {
    mock.setup.sum.toReturn(42)
    mock.sum(1, 2)
    mock.sum(3, 4)
    mock.expect.sum.everyCall.withReturn(42)
  })

  it('threw across every call', () => {
    mock.setup.fail.toThrow('bang')
    expect(() => mock.fail()).toThrow()
    expect(() => mock.fail()).toThrow()
    mock.expect.fail.everyCall.threw('bang')
  })

  it('once() / twice() / times()', () => {
    mock.greet('a')
    mock.greet('b')
    mock.expect.greet.everyCall.twice()
    mock.expect.greet.everyCall.times(2)
  })
})
