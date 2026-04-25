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

const fooBarFunction = (timeout: number, callback: (arg0: string) => void) => {
  setTimeout(() => {
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
  describe('stub', () => {
    describe('Properties', () => {
      let bob: Wrapped<IPerson & IProps>
      beforeEach(() => {
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

      it('enables properties if specified in construction', () => {
        expect(bob.age).to.eql(25)
        expect(bob.height).to.eql('180cm')
      })

      it('still allows function overriding', () => {
        expect(bob.greet('sally')).to.eql('hello')
      })
    })
  })
  describe.each([
    {
      name: 'Creating a stub object',
      setup: () => {
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
      setup: () => {
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
      setup: () => {
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
      setup: () => {
        const createPerson = (name: string): IPerson =>
          Object.freeze({
            greet: (otherPersonName: string) => {
              return `${name} says hello to ${otherPersonName}`
            },
            greetAsync: (otherPersonName: string) => {
              return Promise.resolve(`${name} says hello to ${otherPersonName}`)
            },
            chuckle: () => {},
            foobar: fooBarFunction,
          })
        return deride.wrap(createPerson('bob'), {
          debug: {
            prefix: 'deride:test',
            suffix: 'wrap:object:freeze',
          },
        })
      },
    },
    {
      name: 'wrapping existing objects using prototype style with expectations',
      setup: () => {
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
  ])('$name', ({ setup }) => {
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

describe('wrap() with a standalone function', () => {
  it('returns a callable mock that delegates to the original', () => {
    function greet(name: string) {
      return `hello ${name}`
    }
    const wrapped = deride.wrap(greet)
    expect(wrapped('world')).toBe('hello world')
  })

  it('tracks calls on the wrapped function', () => {
    function greet(name: string) {
      return `hello ${name}`
    }
    const wrapped = deride.wrap(greet)
    wrapped('alice')
    wrapped.expect.called.once()
    wrapped.expect.called.withArg('alice')
  })

  it('allows setup overrides on the wrapped function', () => {
    function greet(name: string) {
      return `hello ${name}`
    }
    const wrapped = deride.wrap(greet)
    wrapped.setup.toReturn('overridden')
    expect(wrapped('x')).toBe('overridden')
  })
})
