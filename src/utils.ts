export const PREFIX = 'deride'

export function proxyFunctions<S>(
  source: S,
  target: Partial<S>,
  functions: (keyof S)[],
) {
  function createFunction(functionName: keyof S) {
    return function () {
      const func = target[functionName] as Function
      return func.apply(target, arguments)
    }
  }
  functions.forEach((functionName) => {
    source[functionName] = createFunction(functionName) as any
  })
}

export function getAllKeys<T extends object>(obj: T) {
  const keys = new Set<keyof T>()

  let current = obj
  while (current && current !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(current)) {
      keys.add(key as keyof T)
    }
    current = Object.getPrototypeOf(current)
  }

  return Array.from<keyof T>(keys)
}

function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keys.includes(key as K)),
  ) as Omit<T, K>
}

export function every<T>(
  collection: T[] | Record<string, T>,
  predicate: (value: T, key?: string | number) => boolean,
): boolean {
  predicate = isFunction(predicate) ? predicate : truthy
  if (isArray(collection)) {
    return collection.every((v, i) => predicate(v, i))
  }
  return Object.entries(collection).every(([k, v]) => predicate(v, k))
}

export function some<T>(
  collection: T[] | Record<string, T>,
  predicate: (value: T, key?: string | number) => boolean,
): boolean {
  predicate = isFunction(predicate) ? predicate : truthy
  if (isArray(collection)) {
    return collection.some((v, i) => predicate(v, i))
  }
  return Object.entries(collection).some(([k, v]) => predicate(v, k))
}

export function isFunction(value: unknown): value is (...args: any[]) => any {
  return typeof value === 'function'
}

function union<T>(...arrays: T[][]): T[] {
  return [...new Set(arrays.flat())]
}

function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value)
}
function isObject(value: unknown): value is Record<string, unknown> {
  return (
    (typeof value === 'object' && value !== null) || typeof value === 'function'
  )
}

function truthy<T>(value: T, key?: string | number) {
  if (value) return true
  return false
}
function filter<T>(
  collection: T[] | Record<string, T>,
  predicate?: (value: T, key?: string | number) => boolean,
): T[] | Record<string, T> {
  predicate = predicate ?? truthy
  if (Array.isArray(collection)) {
    return collection.filter((v, i) => predicate(v, i))
  }

  return Object.fromEntries(
    Object.entries(collection).filter(([k, v]) => predicate(v, k)),
  )
}

export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a == null || b == null)
    return false
  if (Array.isArray(a))
    return (
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((v, i) => deepEqual(v, b[i]))
    )

  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false

  return aKeys.every((key) => deepEqual(a[key], b[key]))
}

function includes<T>(
  collection: T[] | string | Record<string, T>,
  value: T,
): boolean {
  let arr: any[] = []

  if (Array.isArray(collection)) {
    arr = collection
  }
  if (typeof collection === 'string') {
    arr = Array.from(collection)
  }

  if (typeof collection === 'object' && collection !== null) {
    arr = Object.values(collection)
  }
  return arr.some((item) => deepEqual(item, value))
}

export function humanise(number: number) {
  switch (number) {
    case 1:
      return 'once'
    case 2:
      return 'twice'
    default:
      return number + ' times'
  }
}

export const _ = {
  every,
  filter,
  includes,
  isArray,
  isFunction,
  isObject,
  omit,
  some,
  union,
}
