import { describe, it, expect, beforeEach } from 'vitest'
import deride from '../src/index'
import { IPerson } from './wrap.test'
import { Wrapped } from '../src/types'

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
