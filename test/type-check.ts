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

// ── Negated branch: count methods are terminal (issue #109 review §1) ──

// VALID: negated count alone is fine
expectSvc.expect.greet.not.called.once()
expectSvc.expect.greet.not.called.twice()
expectSvc.expect.greet.not.called.times(5)

// INVALID: negated count → arg chain (must be type error)
// @ts-expect-error: negated once() returns void — no chaining
expectSvc.expect.greet.not.called.once().withArg('x')

// @ts-expect-error: negated twice() returns void — no chaining
expectSvc.expect.greet.not.called.twice().withArg('x')

// @ts-expect-error: negated times() returns void — no chaining
expectSvc.expect.greet.not.called.times(1).withArg('x')

// VALID: negated arg assertions can still chain
expectSvc.expect.greet.not.called.withArg('nobody').withReturn('nope')

// VALID: deprecated called.not path still type-checks (issue #109 review §4)
expectSvc.expect.greet.called.not.withArg('nobody')
expectSvc.expect.greet.called.not.twice()

// ── stub<T>(methodNames) constrains names to keyof T (issue #127) ──

// VALID: every name is a method of MyService
deride.stub<MyService>(['greet', 'fetchData'])

// INVALID: 'fetchDat' is a typo — must not silently fall through to a
// permissive string[] overload. This is the whole point of issue #127.
// @ts-expect-error: "fetchDat" is not assignable to keyof MyService
deride.stub<MyService>(['greet', 'fetchDat'])

// VALID: a subset is still allowed — partial stubs are a supported pattern
deride.stub<MyService>(['greet'])

// VALID: readonly / `as const` arrays are accepted
deride.stub<MyService>(['greet', 'fetchData'] as const)

// INVALID: a widened string[] cannot be checked against keyof T
const dynamicNames: string[] = ['greet', 'fetchData']
// @ts-expect-error: string is not assignable to keyof MyService
deride.stub<MyService>(dynamicNames)

// VALID: documented escape hatch for dynamically built name lists
deride.stub<MyService>(dynamicNames as (keyof MyService)[])

// VALID: with no explicit T, names are inferred into the mock's shape —
// the array overload must win over the object overload, or T infers as
// string[] and the facades key off Array members instead of the names.
const inferred = deride.stub(['query', 'close'])
inferred.setup.query.toReturn(1)
inferred.expect.query.called.once()
inferred.spy.close.callCount satisfies number

// INVALID: a name that was never listed is not on the inferred mock
// @ts-expect-error: 'missing' was not in the method name list
inferred.setup.missing.toReturn(1)

// VALID: class and object forms are unaffected by the array overload order
class RealService {
  greet(_name: string): string {
    return ''
  }
  fetchData(_url: string): Promise<{ id: number }> {
    return Promise.resolve({ id: 1 })
  }
}
deride.stub(RealService).setup.greet.toReturn('hi')
const realObj = { greet: (_n: string): string => '' }
deride.stub(realObj).setup.greet.toReturn('hi')

// VALID: generic helpers wrapping stub() still infer (regression guard —
// a conditional-type object overload breaks this case)
function makeMock<U extends object>(target: U) {
  return deride.stub(target)
}
makeMock(new RealService()).setup.greet.toReturn('hi')
