import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { func, stub } from '../src/index'

interface Svc {
  greet(name?: string): string
  fetch(url?: string): Promise<string>
  stream(): Iterable<number>
  streamAsync(): AsyncIterable<number>
  query(): { where(): unknown; orderBy(): unknown; execute(): number[] }
}

interface SystemUnderTest {
  greet(...args: unknown[]): string
  fetch(...args: unknown[]): Promise<unknown>
  load(...args: unknown[]): unknown
  chuckle(...args: unknown[]): unknown
  doWork(...args: unknown[]): unknown
}

describe('setup.when() - conditional behavior', () => {
  let bob: ReturnType<typeof stub<SystemUnderTest>>

  beforeEach(() => {
    bob = stub<SystemUnderTest>(['greet'])
  })

  it('returns different values based on first argument', () => {
    bob.setup.greet.when('alice').toReturn('hi alice')
    bob.setup.greet.when('bob').toReturn('hi bob')
    expect(bob.greet('alice')).toBe('hi alice')
    expect(bob.greet('bob')).toBe('hi bob')
  })

  it('returns undefined when no when matches', () => {
    bob.setup.greet.when('alice').toReturn('hi alice')
    expect(bob.greet('unknown')).toBe(undefined)
  })

  it('supports predicate functions', () => {
    bob.setup.greet.when((args: any[]) => args[0].startsWith('Dr')).toReturn('hello doctor')
    expect(bob.greet('Dr Smith')).toBe('hello doctor')
    expect(bob.greet('Mr Jones')).toBe(undefined)
  })

  it('matches multiple arguments positionally', () => {
    const fn = func<(a: string, b: number) => string>()
    fn.setup.when('alice', 42).toReturn('matched')
    expect(fn('alice', 42)).toBe('matched')
    expect(fn('alice', 99)).toBe(undefined)
  })

  it('later when registrations take priority', () => {
    bob.setup.greet.when('alice').toReturn('first')
    bob.setup.greet.when('alice').toReturn('second')
    expect(bob.greet('alice')).toBe('second')
  })
})

describe('setup.times() / once() / twice() - limited invocations', () => {
  let bob: ReturnType<typeof stub<SystemUnderTest>>

  beforeEach(() => {
    bob = stub<SystemUnderTest>(['greet'])
  })

  it('once() limits behavior to single invocation', () => {
    bob.setup.greet.toReturn('default')
    bob.setup.greet.once().toReturn('first')
    expect(bob.greet()).toBe('first')
    expect(bob.greet()).toBe('default')
  })

  it('twice() limits behavior to two invocations', () => {
    bob.setup.greet.toReturn('fallback')
    bob.setup.greet.twice().toReturn('limited')
    expect(bob.greet()).toBe('limited')
    expect(bob.greet()).toBe('limited')
    expect(bob.greet()).toBe('fallback')
  })

  it('times(n) limits behavior to n invocations', () => {
    bob.setup.greet.toReturn('fallback')
    bob.setup.greet.times(3).toReturn('limited')
    expect(bob.greet()).toBe('limited')
    expect(bob.greet()).toBe('limited')
    expect(bob.greet()).toBe('limited')
    expect(bob.greet()).toBe('fallback')
  })

  it('falls back to undefined when no default behavior', () => {
    bob.setup.greet.once().toReturn('first')
    expect(bob.greet()).toBe('first')
    expect(bob.greet()).toBe(undefined)
  })

  it('supports .and.then chaining for sequential behaviors', () => {
    bob.setup.greet.toReturn('first').twice().and.then.toReturn('second')
    expect(bob.greet()).toBe('first')
    expect(bob.greet()).toBe('first')
    expect(bob.greet()).toBe('second')
  })

  it('supports multiple .and.then chains', () => {
    bob.setup.greet.toReturn('a').once().and.then.toReturn('b').once().and.then.toReturn('c')
    expect(bob.greet()).toBe('a')
    expect(bob.greet()).toBe('b')
    expect(bob.greet()).toBe('c')
    expect(bob.greet()).toBe('c')
  })

  it('when().twice() limits conditional behavior to two invocations', () => {
    bob.setup.greet.toReturn('default')
    bob.setup.greet.when('alice').twice().toReturn('special')
    expect(bob.greet('alice')).toBe('special')
    expect(bob.greet('alice')).toBe('special')
    expect(bob.greet('alice')).toBe('default')
    expect(bob.greet('bob')).toBe('default')
  })

  it('when().times(n) limits conditional behavior to n invocations', () => {
    bob.setup.greet.toReturn('default')
    bob.setup.greet.when('alice').times(1).toReturn('once-only')
    expect(bob.greet('alice')).toBe('once-only')
    expect(bob.greet('alice')).toBe('default')
  })
})

describe('setup.toRejectWith() - promise rejection', () => {
  it('rejects with the provided error', async () => {
    const bob = stub<SystemUnderTest>(['fetch'])
    bob.setup.fetch.toRejectWith(new Error('network error'))
    await expect(bob.fetch()).rejects.toThrow('network error')
  })

  it('rejects with a string error', async () => {
    const bob = stub<SystemUnderTest>(['fetch'])
    bob.setup.fetch.toRejectWith('bad request')
    await expect(bob.fetch()).rejects.toBe('bad request')
  })
})

describe('setup.toResolveWith() - promise resolution', () => {
  it('resolves with the provided value', async () => {
    const bob = stub<SystemUnderTest>(['fetch'])
    bob.setup.fetch.toResolveWith('data')
    const result = await bob.fetch()
    expect(result).toBe('data')
  })
})

describe('setup.toCallbackWith() - callback invocation', () => {
  it('invokes the last function argument with provided args', () => {
    const bob = stub<SystemUnderTest>(['load'])
    bob.setup.load.toCallbackWith(null, 'data')
    const results: any[] = []
    bob.load('file.txt', (err: any, data: any) => results.push({ err, data }))
    expect(results.length).toBe(1)
    expect(results[0].err).toBe(null)
    expect(results[0].data).toBe('data')
  })

  it('invokes the last function when multiple functions are passed', () => {
    const bob = stub<SystemUnderTest>(['chuckle'])
    bob.setup.chuckle.toCallbackWith(0, 'boom')
    const results: any[] = []
    bob.chuckle(
      'bob',
      () => results.push('wrong'),
      (err: any, message: any) => results.push({ err, message })
    )
    expect(results.length).toBe(1)
    expect(results[0]).toEqual({ err: 0, message: 'boom' })
  })

  it('throws when no callback is found', () => {
    const bob = stub<SystemUnderTest>(['load'])
    bob.setup.load.toCallbackWith(null, 'data')
    expect(() => bob.load('file.txt')).toThrow('No callback function found in arguments')
  })
})

describe('setup.toIntercept() - inspect without replacing', () => {
  it('calls interceptor and still returns original result', () => {
    const fn = func((x: number) => x * 2)
    const intercepted: any[][] = []
    fn.setup.toIntercept((...args: any[]) => intercepted.push(args))
    const result = fn(5)
    expect(result).toBe(10)
    expect(intercepted.length).toBe(1)
    expect(intercepted[0]).toEqual([5])
  })

  it('calls interceptor and returns undefined when no original', () => {
    const fn = func()
    const intercepted: any[][] = []
    fn.setup.toIntercept((...args: any[]) => intercepted.push(args))
    const result = fn('test')
    expect(result).toBe(undefined)
    expect(intercepted.length).toBe(1)
    expect(intercepted[0]).toEqual(['test'])
  })
})

describe('setup.toTimeWarp() - accelerated timeout', () => {
  it('schedules callback with specified delay', () => {
    vi.useFakeTimers()
    try {
      const bob = stub<SystemUnderTest>(['doWork'])
      bob.setup.doWork.toTimeWarp(0)
      const results: string[] = []
      bob.doWork(1000, (_result: any) => results.push('done'))
      expect(results.length).toBe(0)
      vi.runAllTimers()
      expect(results.length).toBe(1)
      expect(results[0]).toBe('done')
    } finally {
      vi.useRealTimers()
    }
  })

  it('works with a non-zero delay', () => {
    vi.useFakeTimers()
    try {
      const bob = stub<SystemUnderTest>(['doWork'])
      bob.setup.doWork.toTimeWarp(100)
      const results: string[] = []
      bob.doWork(() => results.push('done'))
      expect(results.length).toBe(0)
      vi.advanceTimersByTime(50)
      expect(results.length).toBe(0)
      vi.advanceTimersByTime(50)
      expect(results.length).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('setup.fallback() - clear behaviors', () => {
  it('clears all behaviors', () => {
    const bob = stub<SystemUnderTest>(['greet'])
    bob.setup.greet.toReturn('mocked')
    expect(bob.greet()).toBe('mocked')
    bob.setup.greet.fallback()
    expect(bob.greet()).toBe(undefined)
  })

  it('allows new behaviors to be added after fallback', () => {
    const bob = stub<SystemUnderTest>(['greet'])
    bob.setup.greet.toReturn('first')
    bob.setup.greet.fallback()
    bob.setup.greet.toReturn('second')
    expect(bob.greet()).toBe('second')
  })
})

describe('setup.toThrow() - error throwing', () => {
  it('throws the specified error message', () => {
    const bob = stub<SystemUnderTest>(['greet'])
    bob.setup.greet.toThrow('boom')
    expect(() => bob.greet()).toThrow('boom')
  })
})

describe('setup.toDoThis() - custom implementation', () => {
  it('replaces behavior with custom function', () => {
    const bob = stub<SystemUnderTest>(['greet'])
    bob.setup.greet.toDoThis((name: string) => `hello ${name}`)
    expect(bob.greet('alice')).toBe('hello alice')
  })
})

// ── setup-extensions (toReturnInOrder, toResolveInOrder, etc.) ──────────

describe('toReturnInOrder', () => {
  let mock: ReturnType<typeof stub<Svc>>
  beforeEach(() => {
    mock = stub<Svc>(['greet', 'fetch', 'stream', 'streamAsync', 'query'])
  })

  it('returns each value in order, sticky-last', () => {
    mock.setup.greet.toReturnInOrder('a', 'b', 'c')
    expect(mock.greet()).toBe('a')
    expect(mock.greet()).toBe('b')
    expect(mock.greet()).toBe('c')
    expect(mock.greet()).toBe('c')
  })

  it('throws on empty', () => {
    expect(() => mock.setup.greet.toReturnInOrder()).toThrow()
  })

  it('{ then } fallback beats sticky-last', () => {
    mock.setup.greet.toReturnInOrder(['a', 'b'] as never, { then: 'default' } as never)
    expect(mock.greet()).toBe('a')
    expect(mock.greet()).toBe('b')
    expect(mock.greet()).toBe('default')
  })

  it('{ cycle: true } wraps around', () => {
    mock.setup.greet.toReturnInOrder(['a', 'b'] as never, { cycle: true } as never)
    expect(mock.greet()).toBe('a')
    expect(mock.greet()).toBe('b')
    expect(mock.greet()).toBe('a')
    expect(mock.greet()).toBe('b')
  })

  it('{ cycle: true } works without wrapping values in an array', () => {
    mock.setup.greet.toReturnInOrder('a', 'b', { cycle: true } as never)
    expect(mock.greet()).toBe('a')
    expect(mock.greet()).toBe('b')
    expect(mock.greet()).toBe('a')
    expect(mock.greet()).toBe('b')
  })

  it('{ then } works without wrapping values in an array', () => {
    mock.setup.greet.toReturnInOrder('a', 'b', { then: 'default' } as never)
    expect(mock.greet()).toBe('a')
    expect(mock.greet()).toBe('b')
    expect(mock.greet()).toBe('default')
  })
})

describe('toResolveInOrder / toRejectInOrder', () => {
  let mock: ReturnType<typeof stub<Svc>>
  beforeEach(() => {
    mock = stub<Svc>(['greet', 'fetch', 'stream', 'streamAsync', 'query'])
  })

  it('toResolveInOrder returns resolved promises sequentially', async () => {
    mock.setup.fetch.toResolveInOrder('first', 'second', 'third')
    expect(await mock.fetch()).toBe('first')
    expect(await mock.fetch()).toBe('second')
    expect(await mock.fetch()).toBe('third')
    expect(await mock.fetch()).toBe('third')
  })

  it('toRejectInOrder returns rejecting promises sequentially', async () => {
    mock.setup.fetch.toRejectInOrder(new Error('a'), new Error('b'))
    await expect(mock.fetch()).rejects.toThrow('a')
    await expect(mock.fetch()).rejects.toThrow('b')
  })
})

describe('toResolveAfter / toRejectAfter / toHang', () => {
  let mock: ReturnType<typeof stub<Svc>>
  beforeEach(() => {
    mock = stub<Svc>(['greet', 'fetch', 'stream', 'streamAsync', 'query'])
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('toResolveAfter resolves only after the timer advances', async () => {
    mock.setup.fetch.toResolveAfter(100, 'payload')
    const p = mock.fetch()
    let done = false
    void p.then(() => {
      done = true
    })
    await vi.advanceTimersByTimeAsync(50)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(50)
    expect(await p).toBe('payload')
  })

  it('toRejectAfter rejects after the timer', async () => {
    mock.setup.fetch.toRejectAfter(10, new Error('slow-fail'))
    const p = mock.fetch()
    vi.advanceTimersByTime(10)
    await expect(p).rejects.toThrow('slow-fail')
  })

  it('toHang returns a never-settling promise', async () => {
    mock.setup.fetch.toHang()
    const race = Promise.race([
      mock.fetch().then(() => 'resolved'),
      new Promise<string>((resolve) => setTimeout(() => resolve('timeout'), 5)),
    ])
    vi.advanceTimersByTime(10)
    expect(await race).toBe('timeout')
  })
})

describe('toYield / toAsyncYield', () => {
  let mock: ReturnType<typeof stub<Svc>>
  beforeEach(() => {
    mock = stub<Svc>(['greet', 'fetch', 'stream', 'streamAsync', 'query'])
  })

  it('toYield produces a sync iterator', () => {
    mock.setup.stream.toYield(1, 2, 3)
    const out: number[] = []
    for (const v of mock.stream()) out.push(v)
    expect(out).toEqual([1, 2, 3])
  })

  it('re-invoking yields a fresh iterator', () => {
    mock.setup.stream.toYield(1, 2)
    const a = [...mock.stream()]
    const b = [...mock.stream()]
    expect(a).toEqual([1, 2])
    expect(b).toEqual([1, 2])
  })

  it('empty toYield() yields nothing', () => {
    mock.setup.stream.toYield()
    expect([...mock.stream()]).toEqual([])
  })

  it('toAsyncYield produces an async iterator', async () => {
    mock.setup.streamAsync.toAsyncYield(1, 2, 3)
    const out: number[] = []
    for await (const v of mock.streamAsync()) out.push(v)
    expect(out).toEqual([1, 2, 3])
  })

  it('toAsyncYieldThrow throws after yielding the given values', async () => {
    mock.setup.streamAsync.toAsyncYieldThrow(new Error('drained'), 1, 2)
    const out: number[] = []
    await expect(
      (async () => {
        for await (const v of mock.streamAsync()) out.push(v)
      })()
    ).rejects.toThrow('drained')
    expect(out).toEqual([1, 2])
  })

  it('early break works on sync iterator', () => {
    mock.setup.stream.toYield(1, 2, 3, 4)
    const out: number[] = []
    for (const v of mock.stream()) {
      out.push(v)
      if (out.length === 2) break
    }
    expect(out).toEqual([1, 2])
  })
})

describe('toReturnSelf', () => {
  it('returns the wrapped mock for fluent chains', () => {
    const query = stub<{
      where(v: unknown): unknown
      orderBy(v: unknown): unknown
      execute(): number[]
    }>(['where', 'orderBy', 'execute'])
    query.setup.where.toReturnSelf()
    query.setup.orderBy.toReturnSelf()
    query.setup.execute.toReturn([1, 2])
    const result = query.where('a').orderBy('b').where('c').execute()
    expect(result).toEqual([1, 2])
    query.expect.where.called.twice()
    query.expect.orderBy.called.once()
  })

  it('toReturnSelf on a standalone func returns the function proxy', () => {
    const fn = func<(x: number) => unknown>()
    fn.setup.toReturnSelf()
    expect(fn(1)).toBe(fn)
  })
})
