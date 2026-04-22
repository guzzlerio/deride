import Debug from 'debug'
import { MethodMock, MethodSpy, MockExpect } from './method-mock.js'
import { Options, Wrapped } from './types.js'
import { getAllKeys, isFunction, PREFIX } from './utils.js'
import { wrap } from './wrap.js'

type AnyCtor = new (...args: unknown[]) => object

type StubPropertyDescriptor = {
  name: PropertyKey
  options: PropertyDescriptor & ThisType<unknown>
}

type StubOptions = Options & {
  /** When `true` and `target` is a class, include static methods on the stub instead of prototype methods. */
  static?: boolean
}

/**
 * A constructor-mocked class. Callable via `new`, each instantiation records
 * the constructor args and yields a fresh {@link Wrapped} instance whose
 * methods are auto-stubbed from the original class prototype.
 */
export interface MockedClass<C extends AnyCtor> {
  /** Construct a fresh mocked instance, recording constructor args. */
  new (...args: ConstructorParameters<C>): Wrapped<InstanceType<C>>
  /** Assertion surface for the constructor itself (`expect.constructor.called.*`). */
  readonly expect: { constructor: MockExpect }
  /** Read-only inspection of constructor calls. */
  readonly spy: { constructor: MethodSpy }
  /** All constructed instances, in order. */
  readonly instances: readonly Wrapped<InstanceType<C>>[]
  /** Apply a setup callback to every instance created from now on (and past instances). */
  setupAll: (fn: (instance: Wrapped<InstanceType<C>>) => void) => void
}

function isConstructor(value: unknown): value is AnyCtor {
  if (typeof value !== 'function') return false
  const proto = (value as { prototype?: unknown }).prototype
  return proto !== null && typeof proto === 'object'
}

function prototypeMethods(ctor: AnyCtor): string[] {
  const out: string[] = []
  let current: object | null = ctor.prototype as object
  const seen = new Set<string>()
  while (current && current !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(current)) {
      if (key === 'constructor' || seen.has(key)) continue
      const desc = Object.getOwnPropertyDescriptor(current, key)
      if (!desc) continue
      // Skip accessors — they usually aren't safe to auto-stub.
      if (desc.get || desc.set) continue
      if (typeof desc.value === 'function') {
        out.push(key)
        seen.add(key)
      }
    }
    current = Object.getPrototypeOf(current) as object | null
  }
  return out
}

function staticMethods(ctor: AnyCtor): string[] {
  const out: string[] = []
  for (const key of Object.getOwnPropertyNames(ctor)) {
    if (key === 'length' || key === 'name' || key === 'prototype') continue
    const desc = Object.getOwnPropertyDescriptor(ctor, key)
    if (!desc || desc.get || desc.set) continue
    if (typeof desc.value === 'function') out.push(key)
  }
  return out
}

function isMethodNameArray(target: unknown): target is (string | PropertyKey)[] {
  return Array.isArray(target) && target.every((v) => typeof v === 'string' || typeof v === 'symbol' || typeof v === 'number')
}

/**
 * Build a test double.
 *
 * Overloads:
 *  - `stub(MyClass)` — auto-discovers methods from the class prototype chain.
 *  - `stub(existingObject)` — auto-discovers methods from an instance.
 *  - `stub<T>(['method1', 'method2'])` — explicit list of method names.
 *  - `stub<T>(methodNames, properties, options)` — with property descriptors and
 *    additional options (e.g. `{ static: true }` to mock a class's static side).
 *
 * Pass `{ static: true }` alongside a class target to stub the static methods
 * instead of the prototype methods.
 */
export function stub<I extends object>(cls: new (...args: never[]) => I): Wrapped<I>
export function stub<T extends object>(obj: T): Wrapped<T>
export function stub<T extends object>(methodNames: (keyof T)[]): Wrapped<T>
export function stub<T extends object>(
  methodNames: string[],
  properties?: StubPropertyDescriptor[],
  options?: StubOptions
): Wrapped<T>
export function stub<T extends object>(
  target: T | (keyof T)[] | string[] | AnyCtor,
  properties?: StubPropertyDescriptor[],
  options: StubOptions = { debug: { prefix: PREFIX, suffix: 'stub' } }
): Wrapped<T> {
  const debug = Debug(`${options.debug?.prefix ?? PREFIX}:${options.debug?.suffix ?? 'stub'}`)

  let methods: string[]
  if (isMethodNameArray(target)) {
    methods = target.map((m) => String(m))
  } else if (isConstructor(target)) {
    methods = options.static ? staticMethods(target) : prototypeMethods(target)
  } else {
    methods = getAllKeys(target as T).filter((m) => isFunction((target as Record<PropertyKey, unknown>)[m as PropertyKey])) as string[]
  }

  const stubObj: Record<string, () => void> = {}
  for (const method of methods) {
    stubObj[method] = () => {}
  }

  const wrapped = wrap(stubObj, options) as unknown as Wrapped<T>

  properties?.forEach((prop) => {
    debug('mapping property', prop)
    Object.defineProperty(wrapped, prop.name, prop.options)
  })

  return wrapped
}

/**
 * Create a {@link MockedClass} — a `new`-able replacement for `C` that tracks
 * constructor calls and produces auto-stubbed instances.
 *
 * @param ctor Optional concrete class used to discover method names.
 * @param opts `methods` overrides the discovered list; otherwise the prototype
 *             chain of `ctor` is walked (static methods are not included).
 */
stub.class = function stubClass<C extends AnyCtor>(
  ctor?: C,
  opts: { methods?: string[]; static?: boolean } = {}
): MockedClass<C> {
  const constructorMock = new MethodMock(undefined, { name: 'constructor' })
  const instances: Wrapped<InstanceType<C>>[] = []
  const setups: Array<(instance: Wrapped<InstanceType<C>>) => void> = []

  const methodNames =
    opts.methods ??
    (ctor ? prototypeMethods(ctor as AnyCtor) : [])

  const constructedProxy = new Proxy(
    function () {
      /* construct-only target */
    } as unknown as C,
    {
      construct(_target, args) {
        constructorMock.invoke(args, undefined)
        const instance = stub<InstanceType<C>>(methodNames as string[]) as Wrapped<InstanceType<C>>
        instances.push(instance)
        for (const s of setups) s(instance)
        return instance as unknown as object
      },
      get(_target, prop) {
        if (prop === 'expect') return { constructor: constructorMock.expect }
        if (prop === 'spy') return { constructor: constructorMock.spy }
        if (prop === 'instances') return instances
        if (prop === 'setupAll') {
          return (fn: (instance: Wrapped<InstanceType<C>>) => void) => {
            setups.push(fn)
            for (const inst of instances) fn(inst)
          }
        }
        return undefined
      },
    }
  ) as unknown as MockedClass<C>

  return constructedProxy
}
