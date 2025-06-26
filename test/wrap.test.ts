import { describe, it, expect, beforeEach, vi } from 'vitest'
import deride from '../src/index'

export interface IPerson {
  greet(...args: unknown[]): string
  chuckle(...args: unknown[]): void
}

export class Person implements IPerson {
  constructor(private name: string) {}
  greet(another: string) {
    return `howdy from ${this.name} to ${another}`
  }
  chuckle() {}
}

describe('deride', () => {
  describe.each([
    {
      name: 'ES6 Classes',
      setup: () => {
        return new Person('bob proto')
      },
    },
  ])('something $name', ({ name, setup }) => {
    beforeEach(() => {})
    it('enables the determination of single arg used to invoke the method', () => {
      const bob = deride.wrap(setup())
      bob.greet('bob')
      bob.greet('alice')
      bob.greet('carol')
      bob.expect.greet.called.withArg('bob')
      bob.expect.greet.called.withArg('alice')
      bob.expect.greet.called.withArg('carol')
    })

    it('enables emitting an event on method invocation', async function () {
      const bob = deride.wrap(setup())
      const callback = vi.fn()
      bob.setup.greet.toEmit('testing')
      bob.on('testing', callback)
      bob.greet('bob')
      expect(callback).toBeCalled()
    })
  })
})
