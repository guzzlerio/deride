import { describe, it, expect, afterEach } from 'vitest'
import { useFakeTimers } from '../src/clock'
import { stub } from '../src/index'

let currentClock: ReturnType<typeof useFakeTimers> | undefined

afterEach(() => {
  if (currentClock) {
    currentClock.restore()
    currentClock = undefined
  }
})

describe('useFakeTimers', () => {
  it('freezes Date.now at the start epoch', () => {
    currentClock = useFakeTimers(1000)
    expect(Date.now()).toBe(1000)
    expect(Date.now()).toBe(1000)
  })

  it('tick advances time and Date.now', () => {
    currentClock = useFakeTimers(0)
    currentClock.tick(500)
    expect(Date.now()).toBe(500)
  })

  it('setTimeout fires after tick past its delay', () => {
    currentClock = useFakeTimers(0)
    let fired = false
    setTimeout(() => {
      fired = true
    }, 100)
    currentClock.tick(50)
    expect(fired).toBe(false)
    currentClock.tick(50)
    expect(fired).toBe(true)
  })

  it('clearTimeout prevents firing', () => {
    currentClock = useFakeTimers(0)
    let fired = false
    const id = setTimeout(() => {
      fired = true
    }, 100)
    clearTimeout(id)
    currentClock.tick(100)
    expect(fired).toBe(false)
  })

  it('setInterval fires repeatedly', () => {
    currentClock = useFakeTimers(0)
    let count = 0
    const id = setInterval(() => {
      count++
    }, 50)
    currentClock.tick(125)
    expect(count).toBe(2)
    clearInterval(id)
    currentClock.tick(125)
    expect(count).toBe(2)
  })

  it('queueMicrotask drains in order with flushMicrotasks', () => {
    currentClock = useFakeTimers(0)
    const seen: number[] = []
    queueMicrotask(() => seen.push(1))
    queueMicrotask(() => seen.push(2))
    currentClock.flushMicrotasks()
    expect(seen).toEqual([1, 2])
  })

  it('runAll drains everything', () => {
    currentClock = useFakeTimers(0)
    const seen: number[] = []
    setTimeout(() => seen.push(1), 100)
    setTimeout(() => seen.push(2), 200)
    currentClock.runAll()
    expect(seen).toEqual([1, 2])
  })

  it('double install throws', () => {
    currentClock = useFakeTimers(0)
    expect(() => useFakeTimers(0)).toThrow()
  })

  it('restore() returns natives', () => {
    currentClock = useFakeTimers(0)
    currentClock.restore()
    currentClock = undefined
    expect(Date.now()).toBeGreaterThan(1000) // real clock
  })

  it('integrates with toResolveAfter', async () => {
    currentClock = useFakeTimers(0)
    const mock = stub<{ fetch(): Promise<string> }>(['fetch'])
    mock.setup.fetch.toResolveAfter(100, 'payload')
    const p = mock.fetch()
    let value: string | undefined
    void p.then((v) => {
      value = v
    })
    currentClock.tick(100)
    currentClock.flushMicrotasks()
    await p
    expect(value).toBe('payload')
  })

  it('runAll does not force toHang to settle', async () => {
    currentClock = useFakeTimers(0)
    const mock = stub<{ fetch(): Promise<string> }>(['fetch'])
    mock.setup.fetch.toHang()
    const p = mock.fetch()
    let settled = false
    void p.then(
      () => {
        settled = true
      },
      () => {
        settled = true
      }
    )
    currentClock.runAll()
    currentClock.flushMicrotasks()
    expect(settled).toBe(false)
  })

  it('negative delay schedules at current time', () => {
    currentClock = useFakeTimers(0)
    let fired = false
    setTimeout(() => {
      fired = true
    }, -100)
    currentClock.tick(0)
    expect(fired).toBe(true)
  })

  it('setTimeout with no delay schedules at current time', () => {
    currentClock = useFakeTimers(0)
    let fired = false
    setTimeout(() => {
      fired = true
    })
    currentClock.tick(0)
    expect(fired).toBe(true)
  })

  it('throwing timer callback does not break the loop', () => {
    currentClock = useFakeTimers(0)
    let count = 0
    setTimeout(() => {
      throw new Error('boom')
    }, 10)
    setTimeout(() => {
      count++
    }, 20)
    currentClock.tick(20)
    expect(count).toBe(1)
  })

  it('throwing microtask does not break flush', () => {
    currentClock = useFakeTimers(0)
    let fired = false
    queueMicrotask(() => {
      throw new Error('boom')
    })
    queueMicrotask(() => {
      fired = true
    })
    currentClock.flushMicrotasks()
    expect(fired).toBe(true)
  })
})
