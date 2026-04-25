import { describe, it, expect, beforeEach } from 'vitest'
import deride, { func, stub, match } from '../src/index'
import { IPerson } from './wrap.test'
import { Wrapped } from '../src/types'

// ── from expect.test.ts ─────────────────────────────────────────────────

describe('deride', () => {
  describe('Expectations', () => {
    let bob: Wrapped<IPerson>
    beforeEach(() => {
      bob = deride.stub<IPerson>(['greet', 'greetAsync', 'chuckle'])
      bob.setup.greet.toReturn('talula')
      bob.setup.greetAsync.toResolveWith('talula')
    })

    it('does not invoke original method when override method body', () => {
      bob.setup.greet.toDoThis(() => 'hello')
      const result = bob.greet('')
      expect(result).toBe('hello')
    })

    describe('withArgs', () => {
      it('ignores the order of an object properties when comparing equality', () => {
        bob.greet({
          c: 3,
          b: 2,
          a: 1,
        })
        bob.expect.greet.called.withArgs({
          a: 1,
          b: 2,
          c: 3,
        })
      })

      it('throws exception when object not called withArgs', () => {
        bob.greet('1', '2', '3')
        expect(() => bob.expect.greet.called.withArgs('4')).toThrow()
      })

      describe.each([
        {
          name: 'string',
          input: 'talula',
          expectPass: false,
        },
        {
          name: 'non match array',
          input: ['d', 'e'],
          expectPass: false,
        },
        {
          name: 'partial match array',
          input: ['a', 'd'],
          expectPass: false,
        },
        {
          name: 'match but wrong order',
          input: ['b', 'a'],
          expectPass: false,
        },
        {
          name: 'match',
          input: ['a', 'b'],
          expectPass: true,
        },
      ])('withArg called with an array', ({ name, input, expectPass }) => {
        if (expectPass) {
          it('object called with ' + name + ' should pass', () => {
            bob.greet(input)
            bob.expect.greet.called.withArg(['a', 'b'])
          })
        } else {
          it('object called with ' + name + ' should fail', () => {
            bob.greet(input)
            expect(() => {
              bob.expect.greet.called.withArg(['a', 'b'])
            }).toThrow()
          })
        }
      })

      it('handles called with object', () => {
        const obj = new Object()
        bob.greet(obj)
        bob.expect.greet.called.withArgs(obj)
      })

      it('handles comparison of withArgs when an argument is a function', () => {
        bob.greet(
          {
            a: 1,
          },
          () => {}
        )
        bob.expect.greet.called.withArgs({
          a: 1,
        })
      })
    })

    describe('withMatch', () => {
      beforeEach(() => {
        bob.greet('The inspiration for this was that my colleague was having a')
        bob.greet(
          {
            a: 123,
            b: 'talula',
          },
          123,
          'something'
        )
      })

      it('allows matching call args with regex', () => {
        bob.expect.greet.called.withMatch(/^The inspiration for this was/)
      })

      it('fails when no match is found with regex', () => {
        expect(() => bob.expect.greet.called.withMatch(/^other/)).toThrow(
          'Expected greet to be called matching: /^other/'
        )
      })

      it('allows matching call args with regex in objects', () => {
        bob.expect.greet.called.withMatch(/^talula/gi)
      })

      it('allows matching call args with regex in deep objects', () => {
        bob.greet(
          {
            a: 123,
            b: {
              a: 'talula',
            },
          },
          123,
          'something'
        )

        bob.expect.greet.called.withMatch(/^talula/gi)
      })
    })

    describe('reset', () => {
      it('Resetting the called count', () => {
        bob.greet('yo')
        bob.expect.greet.called.once()
        bob.expect.greet.called.reset()
        bob.expect.greet.called.never()
      })

      it('Resetting the called with count', () => {
        bob.greet('test')
        bob.expect.greet.called.withArgs('test')
        bob.expect.greet.called.reset()
        expect(() => bob.expect.greet.called.withArgs('test')).toThrow(
          'Expected greet to be called with: test'
        )
      })

      it('Resetting the called count on all methods', () => {
        bob.greet('test1')
        bob.chuckle('echo1')

        bob.expect.greet.called.once()
        bob.expect.chuckle.called.once()
        bob.called.reset()

        bob.expect.greet.called.never()
        bob.expect.chuckle.called.never()
      })
    })
    describe('matchExactly', () => {
      describe('matchExactly causes failures', () => {
        it('with mixed strings, arrays and numbers', () => {
          bob.greet('alice', ['carol'], 123)
          expect(() => bob.expect.greet.called.matchExactly('not-alice', ['or-carol'], 987)).toThrow(
            `Expected greet to be called matchExactly args[ 'not-alice', [ 'or-carol' ], 987 ]`
          )
        })

        it('with mixture of primitives and objects', () => {
          bob.greet(
            'alice',
            ['carol'],
            123,
            {
              name: 'bob',
              a: 1,
            },
            'sam'
          )
          expect(() =>
            bob.expect.greet.called.matchExactly(
              'alice',
              ['carol'],
              123,
              {
                name: 'not-bob',
                a: 1,
              },
              'not-sam'
            )
          ).toThrow(
            `Expected greet to be called matchExactly args[ 'alice', [ 'carol' ], 123, { name: 'not-bob', a: 1 }, 'not-sam' ]`
          )
        })
      })

      describe('should not allow mutation after expectation is defined', () => {
        let objectToMutate: { test: string }

        beforeEach(() => {
          objectToMutate = {
            test: 'abc',
          }
        })

        describe('with promises', () => {
          beforeEach(() => {
            bob.setup.greet.toResolve()
          })

          beforeEach(async () => {
            await bob.greetAsync(objectToMutate)
            objectToMutate.test = '123'
          })

          it('should expect original and not mutated object', () => {
            bob.expect.greetAsync.called.matchExactly({
              test: 'abc',
            })
          })
        })
      })
    })
  })
})

// ── from expectations-new.test.ts ───────────────────────────────────────

interface ExpSvc {
  greet(name: string): string
  fetch(url: string): Promise<string>
  fail(): void
  sum(a: number, b: number): number
}

describe('withReturn', () => {
  let mock: ReturnType<typeof stub<ExpSvc>>
  beforeEach(() => {
    mock = stub<ExpSvc>(['greet', 'fetch', 'fail', 'sum'])
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
    mock = stub<ExpSvc & { build(): { ok: boolean } }>(['greet', 'fetch', 'fail', 'sum', 'build']) as unknown as typeof mock
    ;(mock as unknown as { setup: { build: { toReturn: (v: unknown) => void } } }).setup.build.toReturn({ ok: true })
    ;(mock as unknown as { build: () => unknown }).build()
    ;(mock as unknown as { expect: { build: { called: { withReturn: (v: unknown) => void } } } }).expect.build.called.withReturn({ ok: true })
  })

  it('passes when a call returned undefined', () => {
    mock.greet('alice')
    mock.expect.greet.called.withReturn(undefined)
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
  let mock: ReturnType<typeof stub<ExpSvc>>
  beforeEach(() => {
    mock = stub<ExpSvc>(['greet', 'fetch', 'fail', 'sum'])
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
  let mock: ReturnType<typeof stub<ExpSvc>>
  beforeEach(() => {
    mock = stub<ExpSvc>(['greet', 'fetch', 'fail', 'sum'])
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

describe('withArg deep equality', () => {
  it('deeply compares nested object values', () => {
    const fn = func<(opts: { nested: { a: number } }) => void>()
    fn({ nested: { a: 1 } })
    fn.expect.called.withArg({ nested: { a: 1 } })
  })
})

// ── from method-mock.test.ts (count/negation/invocation) ────────────────

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

describe('expect.not.called.* - negated expectations (preferred path)', () => {
  let bob: any

  beforeEach(() => {
    bob = deride.stub(['greet'])
  })

  it('not.never() passes when function was called', () => {
    bob.greet('alice')
    bob.expect.greet.not.called.never()
  })

  it('not.never() fails when function was not called', () => {
    expect(() => bob.expect.greet.not.called.never()).toThrow()
  })

  it('not.once() fails when called exactly once', () => {
    bob.greet('alice')
    expect(() => bob.expect.greet.not.called.once()).toThrow()
  })

  it('not.once() passes when not called once', () => {
    bob.greet('a')
    bob.greet('b')
    bob.expect.greet.not.called.once()
  })

  it('not.twice() passes when called once', () => {
    bob.greet('alice')
    bob.expect.greet.not.called.twice()
  })

  it('not.twice() fails when called exactly twice', () => {
    bob.greet('a')
    bob.greet('b')
    expect(() => bob.expect.greet.not.called.twice()).toThrow()
  })

  it('not.times() passes when call count differs', () => {
    bob.greet('a')
    bob.expect.greet.not.called.times(5)
  })

  it('not.times() fails when call count matches', () => {
    bob.greet('a')
    expect(() => bob.expect.greet.not.called.times(1)).toThrow()
  })

  it('not.withArg() passes when arg was not used', () => {
    bob.greet('alice')
    bob.expect.greet.not.called.withArg('bob')
  })

  it('not.withArg() fails when arg was used', () => {
    bob.greet('alice')
    expect(() => bob.expect.greet.not.called.withArg('alice')).toThrow()
  })

  it('not.withArgs() passes when args were not used', () => {
    bob.greet('alice', 'carol')
    bob.expect.greet.not.called.withArgs('bob', 'dave')
  })

  it('not.withArgs() fails when args were used', () => {
    bob.greet('alice', 'carol')
    expect(() => bob.expect.greet.not.called.withArgs('alice', 'carol')).toThrow()
  })

  it('not.withMatch() passes when pattern does not match', () => {
    bob.greet('hello world')
    bob.expect.greet.not.called.withMatch(/^goodbye/)
  })

  it('not.withMatch() fails when pattern matches', () => {
    bob.greet('hello world')
    expect(() => bob.expect.greet.not.called.withMatch(/^hello/)).toThrow()
  })

  it('not.matchExactly() passes when args do not match exactly', () => {
    bob.greet('alice', 123)
    bob.expect.greet.not.called.matchExactly('bob', 456)
  })

  it('not.matchExactly() fails when args match exactly', () => {
    bob.greet('alice', 123)
    expect(() => bob.expect.greet.not.called.matchExactly('alice', 123)).toThrow()
  })

  it('not.gt() passes when call count is not greater', () => {
    bob.greet()
    bob.expect.greet.not.called.gt(5)
  })

  it('not.gt() fails when call count is greater', () => {
    bob.greet()
    bob.greet()
    bob.greet()
    expect(() => bob.expect.greet.not.called.gt(2)).toThrow()
  })

  it('not.lt() passes when call count is not less', () => {
    bob.greet()
    bob.greet()
    bob.greet()
    bob.expect.greet.not.called.lt(2)
  })

  it('not.lt() fails when call count is less', () => {
    bob.greet()
    expect(() => bob.expect.greet.not.called.lt(5)).toThrow()
  })

  it('not.gte() passes when call count is not gte', () => {
    bob.greet()
    bob.expect.greet.not.called.gte(5)
  })

  it('not.lte() passes when call count is not lte', () => {
    bob.greet()
    bob.greet()
    bob.greet()
    bob.expect.greet.not.called.lte(2)
  })
})

describe('fluent chaining', () => {
  let bob: any

  beforeEach(() => {
    bob = deride.stub(['greet'])
    bob.setup.greet.toReturn('hi')
  })

  it('count → arg: once().withArg()', () => {
    bob.greet('alice')
    bob.expect.greet.called.once().withArg('alice')
  })

  it('count → arg: twice().withArgs()', () => {
    bob.greet('a', 'b')
    bob.greet('a', 'b')
    bob.expect.greet.called.twice().withArgs('a', 'b')
  })

  it('count → return: once().withReturn()', () => {
    bob.greet('alice')
    bob.expect.greet.called.once().withReturn('hi')
  })

  it('arg → arg: withArg().withReturn()', () => {
    bob.greet('alice')
    bob.expect.greet.called.withArg('alice').withReturn('hi')
  })

  it('range → arg: gte().withArg()', () => {
    bob.greet('alice')
    bob.greet('bob')
    bob.expect.greet.called.gte(1).withArg('alice')
  })

  it('negation with not.called chaining', () => {
    bob.greet('alice')
    bob.expect.greet.not.called.withArg('nobody')
  })

  it('negated count → arg chain has correct semantics', () => {
    // Called twice with 'alice'. Negated count methods are terminal
    // (return void) to prevent misleading De Morgan chaining.
    // Use two separate assertions instead.
    bob.greet('alice')
    bob.greet('alice')
    bob.expect.greet.not.called.once()
    bob.expect.greet.called.withArg('alice')
  })

  it('called.not back-compat: same behaviour as not.called', () => {
    bob.greet('alice')
    bob.expect.greet.called.not.withArg('nobody')
    bob.expect.greet.called.not.twice()
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

// ── from diagnostics.test.ts ────────────────────────────────────────────

interface DiagSvc {
  greet(a: unknown, b?: unknown): unknown
}

describe('failure message diagnostics', () => {
  it('withArg failure includes all recorded calls', () => {
    const mock = stub<DiagSvc>(['greet'])
    mock.greet('a')
    mock.greet('b')
    try {
      mock.expect.greet.called.withArg('c')
      expect.fail('should have thrown')
    } catch (err) {
      const msg = (err as Error).message
      expect(msg).toContain('actual calls')
      expect(msg).toContain("#0")
      expect(msg).toContain("#1")
      expect(msg).toContain("'a'")
      expect(msg).toContain("'b'")
    }
  })

  it('zero-call failure says no calls recorded', () => {
    const mock = stub<DiagSvc>(['greet'])
    try {
      mock.expect.greet.called.withArg('x')
      expect.fail('should have thrown')
    } catch (err) {
      expect((err as Error).message).toContain('no calls recorded')
    }
  })

  it('withArgs failure includes history', () => {
    const mock = stub<DiagSvc>(['greet'])
    mock.greet('a', 'b')
    try {
      mock.expect.greet.called.withArgs('x', 'y')
      expect.fail('should have thrown')
    } catch (err) {
      expect((err as Error).message).toContain('actual calls')
    }
  })
})
