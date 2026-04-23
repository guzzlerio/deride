# Types

Every public type exported from deride, grouped by concern.

## `Wrapped<T>`

The type produced by `stub()`, `wrap()`, and `stub.class` instances. Your original `T` plus the deride facades.

```typescript
type Wrapped<T extends object> = T & {
  called: { reset: () => void }
  setup: SetupMethods<T>
  expect: ExpectMethods<T>
  spy: SpyMethods<T>
  snapshot(): Record<string, MockSnapshot>
  restore(snap: Record<string, MockSnapshot>): void
  on(event: string, listener: (...args: any[]) => void): EventEmitter
  once(event: string, listener: (...args: any[]) => void): EventEmitter
  emit(event: string, ...args: any[]): boolean
}

type SetupMethods<T extends object> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? TypedMockSetup<A, R>
    : TypedMockSetup<any[], any>
}

type ExpectMethods<T extends object> = Record<keyof T, MockExpect>
type SpyMethods<T extends object>    = Record<keyof T, MethodSpy>
```

::: warning Reserved property names
`Wrapped<T>` layers the following properties on top of `T`: `called`, `setup`, `expect`, `spy`, `snapshot`, `restore`, `on`, `once`, `emit`. If your `T` has methods with these names, the deride facade will shadow them — usually caught at type-check time.
:::

## Setup — `TypedMockSetup<A, R>`

The type of `mock.setup.method`, parameterised by the method's argument tuple `A` and return type `R`.

```typescript
interface TypedMockSetup<A extends any[], R> {
  toReturn(value: R): TypedMockSetup<A, R>
  toReturnSelf(): TypedMockSetup<A, R>
  toDoThis(fn: (...args: A) => R): TypedMockSetup<A, R>
  toThrow(message: string): TypedMockSetup<A, R>

  toResolveWith(value: R extends Promise<infer U> ? U : R): TypedMockSetup<A, R>
  toResolve(): TypedMockSetup<A, R>
  toRejectWith(error: unknown): TypedMockSetup<A, R>
  toResolveAfter(ms: number, value?: R extends Promise<infer U> ? U : R): TypedMockSetup<A, R>
  toRejectAfter(ms: number, error: unknown): TypedMockSetup<A, R>
  toHang(): TypedMockSetup<A, R>

  toReturnInOrder(...values: (R | [R[], { then?: R; cycle?: boolean }])[]): TypedMockSetup<A, R>
  toResolveInOrder(...values: (R extends Promise<infer U> ? U : R)[]): TypedMockSetup<A, R>
  toRejectInOrder(...errors: unknown[]): TypedMockSetup<A, R>

  toYield(...values: unknown[]): TypedMockSetup<A, R>
  toAsyncYield(...values: unknown[]): TypedMockSetup<A, R>
  toAsyncYieldThrow(error: unknown, ...valuesBefore: unknown[]): TypedMockSetup<A, R>

  toCallbackWith(...args: any[]): TypedMockSetup<A, R>
  toEmit(eventName: string, ...params: any[]): TypedMockSetup<A, R>
  toIntercept(fn: (...args: A) => void): TypedMockSetup<A, R>
  toTimeWarp(ms: number): TypedMockSetup<A, R>

  when(...expected: unknown[]): TypedMockSetup<A, R>
  times(n: number): TypedMockSetup<A, R>
  once(): TypedMockSetup<A, R>
  twice(): TypedMockSetup<A, R>
  fallback(): TypedMockSetup<A, R>

  readonly and: TypedMockSetup<A, R>
  readonly then: TypedMockSetup<A, R>
}

type MockSetup = TypedMockSetup<any[], any>
```

## Expect — `MockExpect`

```typescript
interface ArgAssertions {
  withArg(arg: unknown): ArgAssertions
  withArgs(...args: unknown[]): ArgAssertions
  withMatch(pattern: RegExp): ArgAssertions
  matchExactly(...args: unknown[]): ArgAssertions
  withReturn(expected: unknown): ArgAssertions
  calledOn(target: unknown): ArgAssertions
  threw(expected?: unknown): ArgAssertions
}

interface CountAssertions {
  times(n: number, err?: string): ArgAssertions
  once(): ArgAssertions
  twice(): ArgAssertions
  lt(n: number): ArgAssertions
  lte(n: number): ArgAssertions
  gt(n: number): ArgAssertions
  gte(n: number): ArgAssertions
}

interface CalledExpect extends CountAssertions, ArgAssertions {
  never(): void
  reset(): void
}

interface EveryCallExpect extends CountAssertions, ArgAssertions {}

interface ExpectBranches {
  called: CalledExpect
  everyCall: EveryCallExpect
}

interface MockExpect extends ExpectBranches {
  invocation(index: number): InvocationExpect
  not: ExpectBranches
}

interface InvocationExpect {
  withArg(arg: unknown): void
  withArgs(...args: unknown[]): void
}
```

## Spy — `MethodSpy` and `CallRecord`

```typescript
interface MethodSpy {
  readonly name: string
  readonly callCount: number
  readonly calls: readonly CallRecord[]
  readonly firstCall: CallRecord | undefined
  readonly lastCall: CallRecord | undefined

  calledWith(...args: unknown[]): boolean
  printHistory(): string
  serialize(): { method: string; calls: unknown[] }
}

interface CallRecord {
  readonly args: readonly unknown[]
  readonly returned?: unknown
  readonly threw?: unknown
  readonly thisArg?: unknown
  readonly timestamp: number
  readonly sequence: number
}
```

## Matchers — `Matcher<T>`

```typescript
interface Matcher<T = unknown> {
  readonly [MATCHER_BRAND]: true
  readonly description: string
  test(value: T): boolean
}

const MATCHER_BRAND: unique symbol
function isMatcher(value: unknown): value is Matcher
```

## Lifecycle — `MockSnapshot` and `Sandbox`

```typescript
interface MockSnapshot {
  readonly __brand: 'deride.snapshot'
  readonly behaviors: ReadonlyArray<unknown>
  readonly calls: ReadonlyArray<CallRecord>
}

interface Sandbox {
  stub: typeof stub
  wrap: typeof wrap
  func: typeof func
  reset(): void
  restore(): void
  readonly size: number
}
```

## Factories — `MockedFunction` and `MockedClass`

```typescript
type MockedFunction<F extends (...args: any[]) => any> = F & {
  setup: F extends (...args: infer A) => infer R ? TypedMockSetup<A, R> : TypedMockSetup
  expect: MockExpect
  spy: MethodSpy
}

interface MockedClass<C extends new (...args: any[]) => object> {
  new (...args: ConstructorParameters<C>): Wrapped<InstanceType<C>>
  readonly expect: { constructor: MockExpect }
  readonly spy: { constructor: MethodSpy }
  readonly instances: readonly Wrapped<InstanceType<C>>[]
  setupAll(fn: (instance: Wrapped<InstanceType<C>>) => void): void
}
```

## Options

```typescript
type Options = {
  debug: {
    prefix: string | undefined    // default 'deride'
    suffix: string | undefined    // default 'stub' or 'wrap'
  }
}
```

## Sub-path — `FakeClock`

From `deride/clock`:

```typescript
interface FakeClock {
  tick(ms: number): void
  runAll(): void
  flushMicrotasks(): void
  now(): number
  restore(): void
  readonly errors: readonly unknown[]
}

function useFakeTimers(startEpoch?: number): FakeClock
function isFakeTimersActive(): boolean
function restoreActiveClock(): void
```
