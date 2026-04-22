import { describe, it, expect, beforeEach } from 'vitest'
import { inOrder, stub } from '../src/index'

interface Db {
  connect(): void
  query(sql: string): void
  disconnect(): void
}

interface Logger {
  info(msg: string): void
  error(msg: string): void
}

describe('inOrder', () => {
  let db: ReturnType<typeof stub<Db>>
  let log: ReturnType<typeof stub<Logger>>

  beforeEach(() => {
    db = stub<Db>(['connect', 'query', 'disconnect'])
    log = stub<Logger>(['info', 'error'])
  })

  it('passes when spies fired in the requested order', () => {
    db.connect()
    db.query('select 1')
    log.info('done')
    inOrder(db.spy.connect, db.spy.query, log.spy.info)
  })

  it('throws when spies fired out of order', () => {
    log.info('done')
    db.connect()
    expect(() => inOrder(db.spy.connect, log.spy.info)).toThrow(/fired before/)
  })

  it('throws on a never-called spy', () => {
    db.connect()
    expect(() => inOrder(db.spy.connect, log.spy.info)).toThrow(/never called/)
  })

  it('throws on zero spies', () => {
    expect(() => inOrder()).toThrow()
  })

  it('single spy passes if called at least once', () => {
    db.connect()
    inOrder(db.spy.connect)
  })

  it('can compare specific invocations via inOrder.at', () => {
    db.query('a')
    db.query('b')
    inOrder(inOrder.at(db.spy.query, 0), inOrder.at(db.spy.query, 1))
    expect(() => inOrder(inOrder.at(db.spy.query, 1), inOrder.at(db.spy.query, 0))).toThrow()
  })

  it('allows interleaved calls by default (first-of-each ordering)', () => {
    db.connect()
    log.info('x')
    db.query('y')
    log.info('z')
    db.disconnect()
    inOrder(db.spy.connect, db.spy.query, db.spy.disconnect)
  })

  it('strict variant rejects interleaved extra calls on listed spies', () => {
    db.connect()
    db.query('a')
    db.connect()
    expect(() => inOrder.strict(db.spy.connect, db.spy.query)).toThrow()
  })

  it('strict variant accepts an exact interleave', () => {
    db.connect()
    db.query('a')
    inOrder.strict(db.spy.connect, db.spy.query)
  })

  it('strict variant throws on never-called spy', () => {
    db.connect()
    expect(() => inOrder.strict(db.spy.connect, log.spy.info)).toThrow(/never called/)
  })

  it('ties: listed spies with equal sequence would be impossible (sequence is monotonic)', () => {
    db.connect()
    db.query('x')
    const a = db.spy.connect.calls[0].sequence
    const b = db.spy.query.calls[0].sequence
    expect(b).toBeGreaterThan(a)
  })

  it('inOrder.at on a never-indexed call', () => {
    expect(() => inOrder(inOrder.at(db.spy.query, 5))).toThrow(/never called/)
  })

  it('rejects things that are not a spy', () => {
    expect(() => inOrder('not a spy' as never)).toThrow(/MethodSpy/)
  })

  it('inOrder.strict rejects zero args', () => {
    expect(() => inOrder.strict()).toThrow()
  })
})
