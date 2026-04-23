/**
 * This file is a compile-time type check — not a runtime test.
 * Run with: npx tsc --noEmit
 * Lines marked @ts-expect-error should fail without the annotation.
 */
import deride from '../src/index.js'

interface MyService {
  greet(name: string): string
  fetchData(url: string): Promise<{ id: number }>
}

const svc = deride.stub<MyService>(['greet', 'fetchData'])

// VALID: correct return type
svc.setup.greet.toReturn('hello')

// INVALID: wrong return type
// @ts-expect-error: number is not assignable to string
svc.setup.greet.toReturn(123)

// VALID: cast as any to opt out
svc.setup.greet.toReturn(123 as any)

// VALID: correct doThis signature
svc.setup.greet.toDoThis((name: string) => `hi ${name}`)

// INVALID: wrong doThis return type
// @ts-expect-error: () => number is not assignable to (name: string) => string
svc.setup.greet.toDoThis(() => 42)

// VALID: cast as any to opt out
svc.setup.greet.toDoThis((() => 42) as any)

// VALID: correct resolved type
svc.setup.fetchData.toResolveWith({ id: 1 })

// INVALID: wrong resolved type
// @ts-expect-error: string is not assignable to { id: number }
svc.setup.fetchData.toResolveWith('wrong')

// VALID: cast as any to opt out
svc.setup.fetchData.toResolveWith('wrong' as any)

// VALID: when with correct arg type
svc.setup.greet.when('alice').toReturn('hi')

// VALID: func() with generics
const fn = deride.func((x: number) => x * 2)
fn.setup.toReturn(10)

// INVALID: wrong return type on func
// @ts-expect-error: string is not assignable to number
fn.setup.toReturn('oops')

// VALID: opt-out
fn.setup.toReturn('oops' as any)

// ── Expect chaining ──────────────────────────────────────────────

const expectSvc = deride.stub<MyService>(['greet', 'fetchData'])
expectSvc.setup.greet.toReturn('hi')
expectSvc.greet('x')

// VALID: count → arg chain
expectSvc.expect.greet.called.once().withArg('x')

// VALID: arg → arg chain
expectSvc.expect.greet.called.withArg('x').withReturn('hi')

// VALID: negation at MockExpect level
expectSvc.expect.greet.not.called.withArg('nobody')

// INVALID: count → count chain
// @ts-expect-error: ArgAssertions has no 'twice'
expectSvc.expect.greet.called.once().twice()

// INVALID: never → chain (void has no properties)
// @ts-expect-error: void has no 'withArg'
expectSvc.expect.greet.called.never().withArg('x')
