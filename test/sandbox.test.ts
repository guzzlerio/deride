import { describe, it, expect } from 'vitest'
import { sandbox } from '../src/index'

interface Db {
  query(sql: string): unknown
}

interface Logger {
  info(msg: string): void
}

describe('sandbox', () => {
  it('registers mocks created via sb.stub / sb.wrap / sb.func', () => {
    const sb = sandbox()
    sb.stub<Db>(['query'])
    sb.wrap({ info(msg: string) {
      void msg
    } })
    sb.func(() => 0)
    expect(sb.size).toBe(3)
  })

  it('reset() clears call history on every registered mock', () => {
    const sb = sandbox()
    const db = sb.stub<Db>(['query'])
    const log = sb.stub<Logger>(['info'])
    db.query('x')
    log.info('hello')
    sb.reset()
    db.expect.query.called.never()
    log.expect.info.called.never()
  })

  it('reset() preserves behaviours', () => {
    const sb = sandbox()
    const db = sb.stub<Db>(['query'])
    db.setup.query.toReturn('preserved')
    db.query('x')
    sb.reset()
    expect(db.query('y')).toBe('preserved')
  })

  it('restore() clears behaviours and history', () => {
    const sb = sandbox()
    const db = sb.stub<Db>(['query'])
    db.setup.query.toReturn('mocked')
    db.query('x')
    sb.restore()
    // After restore, call history is reset AND the behaviour is gone (stub methods default to undefined)
    expect(db.query('x')).toBeUndefined()
    db.expect.query.called.once()
  })

  it('mocks outside the sandbox are not affected', async () => {
    const { stub: plainStub } = await import('../src/index')
    const sb = sandbox()
    const inside = sb.stub<Db>(['query'])
    const outside = plainStub<Db>(['query'])
    inside.query('x')
    outside.query('y')
    sb.reset()
    inside.expect.query.called.never()
    outside.expect.query.called.once()
  })

  it('sb.func works', () => {
    const sb = sandbox()
    const fn = sb.func<(x: number) => number>()
    fn.setup.toReturn(42)
    fn(1)
    expect(fn.spy.callCount).toBe(1)
    sb.reset()
    expect(fn.spy.callCount).toBe(0)
    // Behaviour preserved
    expect(fn(1)).toBe(42)
  })

  it('two sandboxes are independent', () => {
    const a = sandbox()
    const b = sandbox()
    const dbA = a.stub<Db>(['query'])
    const dbB = b.stub<Db>(['query'])
    dbA.query('a')
    dbB.query('b')
    a.reset()
    dbA.expect.query.called.never()
    dbB.expect.query.called.once()
  })

  it('double-restore is a no-op', () => {
    const sb = sandbox()
    const db = sb.stub<Db>(['query'])
    db.query('x')
    sb.restore()
    expect(() => sb.restore()).not.toThrow()
  })

  it('sb.wrap reset clears call history on wrapped objects', () => {
    const sb = sandbox()
    const wrapped = sb.wrap({ shout: (s: string) => s.toUpperCase() })
    wrapped.shout('x')
    sb.reset()
    wrapped.expect.shout.called.never()
  })

  it('sb.func restore clears behaviours', () => {
    const sb = sandbox()
    const fn = sb.func<(x: number) => number>()
    fn.setup.toReturn(99)
    fn(1)
    sb.restore()
    expect(fn.spy.callCount).toBe(0)
    // Behaviour cleared by fallback()
    expect(fn(1)).toBeUndefined()
  })
})
