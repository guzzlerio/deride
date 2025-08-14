import { describe, it, expect, beforeEach, vi } from 'vitest'
import deride from '../src/index'
import { Wrapped } from '../src/types'

export interface IPerson {
  greet(...args: unknown[]): string
  greetAsync(...args: unknown[]): Promise<string>
  chuckle(...args: unknown[]): void
  foobar(timeout: number, callback: any): void
}
interface IProps {
  age: number
  height: string
}

const fooBarFunction = function (timeout: number, callback: (arg0: string) => void) {
  setTimeout(function () {
    callback('result')
  }, timeout)
}

export class Person implements IPerson {
  constructor(private name: string) {}
  greet(another: string) {
    return `howdy from ${this.name} to ${another}`
  }
  greetAsync(another: string) {
    return Promise.resolve(`howdy from ${this.name} to ${another}`)
  }
  chuckle() {}
  foobar(timeout: number, callback: any): void {
    fooBarFunction(timeout, callback)
  }
}

const PersonObj: IPerson = {
  greet(name: string) {
    return 'alice sas hello to ' + name
  },
  greetAsync(name: string) {
    return Promise.resolve(`alice says hello to ${name}`)
  },
  chuckle() {},
  foobar(timeout: number, callback: any) {
    return fooBarFunction(timeout, callback)
  },
}

describe('deride', () => {
  //TODO move to separate test file
  describe('stub', () => {
    describe.only('Properties', function () {
      let bob: Wrapped<IPerson & IProps>
      beforeEach(function () {
        bob = deride.stub<IPerson & IProps>(
          ['greet'],
          [
            {
              name: 'age',
              options: {
                value: 25,
                enumerable: true,
              },
            },
            {
              name: 'height',
              options: {
                value: '180cm',
                enumerable: true,
              },
            },
          ]
        )
        bob.setup.greet.toReturn('hello')
      })

      it('enables properties if specified in construction', function () {
        expect(bob.age).to.eql(25)
        expect(bob.height).to.eql('180cm')
      })

      it('still allows function overriding', function () {
        expect(bob.greet('sally')).to.eql('hello')
      })
    })
  })
  describe.each([
    {
      name: 'Creating a stub object',
      setup: function () {
        const stub = deride.stub<IPerson>(['greet', 'chuckle', 'foobar'], undefined, {
          debug: {
            prefix: 'deride:test',
            suffix: 'stub:object',
          },
        })
        stub.setup.foobar.toDoThis(fooBarFunction)

        return stub
      },
    },
    {
      name: 'Creating a stub object from an object with Object style methods',
      setup: function () {
        const stub = deride.stub(PersonObj, undefined, {
          debug: {
            prefix: 'deride:test',
            suffix: 'stub:object:from',
          },
        })
        stub.setup.foobar.toDoThis(fooBarFunction)
        return stub
      },
    },
    {
      name: 'Wrapping existing objects with Object style methods',
      setup: function () {
        return deride.wrap(PersonObj, {
          debug: {
            prefix: 'deride:test',
            suffix: 'wrap:object',
          },
        })
      },
    },
    {
      name: 'Wrapping existing object using Object Freeze with expectations',
      setup: function () {
        function Person(name: string): IPerson {
          return Object.freeze({
            greet: function (otherPersonName: string) {
              return `${name} says hello to ${otherPersonName}`
            },
            greetAsync: function (otherPersonName: string) {
              return Promise.resolve(this.greet(otherPersonName))
            },
            chuckle: function () {},
            foobar: fooBarFunction,
          })
        }
        return deride.wrap(Person('bob'), {
          debug: {
            prefix: 'deride:test',
            suffix: 'wrap:object:freeze',
          },
        })
      },
    },
    {
      name: 'wrapping existing objects using prototype style with expectations',
      setup: function () {
        Person.prototype.foobar = fooBarFunction

        return deride.wrap(new Person('bob proto'), {
          debug: {
            prefix: 'deride:test',
            suffix: 'prototype:wrap',
          },
        })
      },
    },
    {
      name: 'ES6 Classes',
      setup: () => {
        return deride.wrap(new Person('bob proto'), {
          debug: {
            prefix: 'deride:test',
            suffix: 'es6:class',
          },
        })
      },
    },
  ])('$name', ({ name, setup }) => {
    let bob: Wrapped<IPerson>
    beforeEach(() => {
      bob = setup()
    })

    it('enables the determination of the single arg used when the arg is a primitive object', () => {
      bob.greet('alice', { name: 'bob', a: 1 }, 'sam')
      bob.expect.greet.called.withArg('sam')
    })

    it('enables the determination of the single arg used when the arg is not a primitive object', () => {
      bob.greet('alice', { name: 'bob', a: 1 })
      bob.expect.greet.called.withArg({ name: 'bob' })
    })

    it('enables the determination of single arg used to invoke the method', () => {
      bob.greet('bob')
      bob.greet('alice')
      bob.greet('carol')
      bob.expect.greet.called.withArg('bob')
      bob.expect.greet.called.withArg('alice')
      bob.expect.greet.called.withArg('carol')
    })

    it('enables emitting an event on method invocation', async () => {
      const callback = vi.fn()
      bob.setup.greet.toEmit('testing')
      bob.on('testing', callback)
      bob.greet('bob')
      expect(callback).toBeCalled()
    })
  })
})
