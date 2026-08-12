import { describe, it, expect } from 'vitest'
import { stub } from '../src/index'

class Greeter {
  greet(name: string): string {
    return 'hi ' + name
  }
  shout(name: string): string {
    return 'HI ' + name.toUpperCase()
  }
  static version(): string {
    return '1.0'
  }
}

class Extended extends Greeter {
  whisper(): string {
    return 'psst'
  }
}

describe('stub(MyClass) — class auto-discovery', () => {
  it('picks up prototype methods', () => {
    const mock = stub(Greeter)
    mock.setup.greet.toReturn('mocked')
    expect(mock.greet('x')).toBe('mocked')
    mock.expect.greet.called.once()
  })

  it('walks inherited prototype methods', () => {
    const mock = stub(Extended)
    mock.setup.greet.toReturn('hi')
    mock.setup.shout.toReturn('HI')
    mock.setup.whisper.toReturn('psst')
    expect(mock.greet('x')).toBe('hi')
    expect(mock.shout('x')).toBe('HI')
    expect(mock.whisper()).toBe('psst')
  })

  it('excludes constructor', () => {
    const mock = stub(Greeter) as unknown as { setup: Record<string, unknown> }
    expect(Object.hasOwn(mock.setup, 'constructor')).toBe(false)
  })

  it('{ static: true } picks up static methods, not prototype', () => {
    const mock = stub<{ version(): string }>(Greeter as never, undefined, {
      debug: { prefix: 'deride', suffix: 'stub' },
      static: true,
    })
    mock.setup.version.toReturn('mocked-v')
    expect(mock.version()).toBe('mocked-v')
    expect('greet' in (mock.setup as object)).toBe(false)
  })
})

describe('stub.class<typeof C>()', () => {
  it('records constructor calls', () => {
    const MockedGreeter = stub.class(Greeter)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _a = new MockedGreeter('ignored' as never)
    MockedGreeter.expect.constructor.called.once()
  })

  it('new() returns a fresh Wrapped<instance> with working setup/expect', () => {
    const MockedGreeter = stub.class(Greeter)
    const g = new MockedGreeter()
    g.setup.greet.toReturn('mocked')
    expect(g.greet('x')).toBe('mocked')
    g.expect.greet.called.once()
  })

  it('each new() gives independent instance state', () => {
    const MockedGreeter = stub.class(Greeter)
    const a = new MockedGreeter()
    const b = new MockedGreeter()
    a.setup.greet.toReturn('A')
    b.setup.greet.toReturn('B')
    expect(a.greet('x')).toBe('A')
    expect(b.greet('x')).toBe('B')
    a.expect.greet.called.once()
    b.expect.greet.called.once()
  })

  it('constructor args are captured', () => {
    const MockedGreeter = stub.class(Greeter)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _i = new MockedGreeter('arg1' as never)
    MockedGreeter.expect.constructor.called.withArg('arg1')
  })

  it('setupAll applies to every instance (past and future)', () => {
    const MockedGreeter = stub.class(Greeter)
    const a = new MockedGreeter()
    MockedGreeter.setupAll((inst) => inst.setup.greet.toReturn('everyone'))
    const b = new MockedGreeter()
    expect(a.greet('x')).toBe('everyone')
    expect(b.greet('x')).toBe('everyone')
  })

  it('instances array lists all constructed stubs', () => {
    const MockedGreeter = stub.class(Greeter)
    const a = new MockedGreeter()
    const b = new MockedGreeter()
    expect(MockedGreeter.instances).toEqual([a, b])
  })
})

describe('stub<T>(methodNames) — name list forms (issue #127)', () => {
  interface Db {
    query(sql: string): string
    close(): void
  }

  it('stubs every listed method', () => {
    const db = stub<Db>(['query', 'close'])
    db.setup.query.toReturn('rows')
    expect(db.query('select 1')).toBe('rows')
    db.close()
    db.expect.close.called.once()
  })

  it('accepts a readonly / as const name list', () => {
    const names = ['query', 'close'] as const
    const db = stub<Db>(names)
    db.setup.query.toReturn('rows')
    expect(db.query('select 1')).toBe('rows')
  })

  it('only stubs the names listed — omitted methods are absent', () => {
    const db = stub<Db>(['query'])
    expect(typeof db.query).toBe('function')
    expect((db as unknown as Record<string, unknown>).close).toBeUndefined()
  })

  it('infers the mock shape from the names when no type argument is given', () => {
    const mock = stub(['query', 'close'])
    mock.setup.query.toReturn('rows')
    expect(mock.query()).toBe('rows')
    // The array overload must win over the object overload, otherwise the
    // facades key off Array members rather than the supplied names.
    expect((mock.setup as unknown as Record<string, unknown>).push).toBeUndefined()
  })
})
