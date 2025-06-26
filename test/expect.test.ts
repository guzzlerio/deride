import assert from 'node:assert/strict'
import { describe, it, expect, beforeEach } from 'vitest'
import deride from '../src/index'
import { IPerson } from './wrap.test'
import { Wrapped } from '../src/types'

describe('deride', () => {
  describe('Expectations', () => {
    let bob: Wrapped<IPerson>
    beforeEach(function () {
      // bob = deride.wrap(new Person('bob'))
      bob = deride.stub<IPerson>(['greet'])
      bob.setup.greet.toReturn('talula')
    })

    it('does not invoke original method when override method body', function () {
      bob.setup.greet.toDoThis(() => 'hello')
      const result = bob.greet('')
      assert.equal(result, 'hello')
    })

    it('ignores the order of an object properties when comparing equality', function () {
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
  })
})
