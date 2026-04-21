import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { func, stub } from '../src/index'

interface Svc {
  greet(name?: string): string
  fetch(url?: string): Promise<string>
  stream(): Iterable<number>
  streamAsync(): AsyncIterable<number>
  query(): { where(): unknown; orderBy(): unknown; execute(): number[] }
}

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
