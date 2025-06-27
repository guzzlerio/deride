import assert from 'node:assert/strict'
import Debug from 'debug'
import { getAllKeys, humanise, PREFIX, _ } from './utils.js'
import { Wrapped } from './types.js'
import { inspect, isDeepStrictEqual } from 'node:util'

export type Expectations<T extends object> = T & {
  invocation: (index: number) => void
  call: () => unknown
  // not: {
  //   called: {
  //     times: (number: number, err: string) => Expectations<T>
  //   }
  // }
  called: {
    reset: () => void
    never: () => void
    once: () => void
    times: (number: number, err: string) => Expectations<T>
    withArg: (arg: unknown) => void
    withArgs: (args: unknown) => void
    withMatch: (pattern: RegExp) => void
    matchExactly: (...args: unknown[]) => void
  }
}
export function Expectations<T extends object>(
  obj: T,
  method: keyof T,
): Expectations<T> {
  const debug = Debug(PREFIX + ':expect:' + String(method))
  let timesCalled = 0
  let calledWithArgs: Record<number, Parameters<any>> = {}

  const self = {
    invocation: invocation,
    call: call,
    // not: {
    //     called: {
    //         times: negate(times),
    //     },
    // },
    called: {
      times: times,
      never: never,
      once: calledOnce,
      // twice: calledTwice,
      // lt: calledLt,
      // lte: calledLte,
      // gt: calledGt,
      // gte: calledGte,
      reset: reset,
      // matchExactly: matchExactly,
      withArg: withArg,
      withArgs: withArgs,
      // withArg: withSingleArg,
      withMatch: withMatch,
      matchExactly: matchExactly,
    },
  }

  // function addNotMethods(obj: Wrapped<T>) {
  //   function negate(func: Function) {
  //     return function () {
  //       const args = Object.values(arguments)
  //       try {
  //         func.call(null, args)
  //       } catch (err) {
  //         return self
  //       }
  //       assert(false)
  //     }
  //   }

  //   let methods = {} as Record<keyof Wrapped<T>, any>
  //   const calledMethods = getAllKeys(_.omit(obj.called, ['reset']))
  //   calledMethods.forEach((method) => {
  //     methods[method] = negate(obj.called[method])
  //   })
  //   obj.called.not = methods
  //   return obj
  // }

  function call() {
    debug('called', JSON.stringify(arguments))
    calledWithArgs[timesCalled++] = _.cloneDeep(Array.from(arguments))
  }

  function invocation(index: number) {
    if (!(index.toString() in calledWithArgs)) {
      throw new Error('invocation out of range')
    }
    const arg = calledWithArgs[index]
    return { withArg: withArg(arg) }
  }

  function checkArg(expected: unknown, values: any) {
    const jsonExpected = JSON.stringify(expected)
    debug('checkArg', jsonExpected, values)
    // if (_.isArray(expected)) {
    //   return _.some(
    //     expected,
    //     values.filter((v) => JSON.stringify(v) === jsonExpected),
    //   )
    // }
    // if (_.isObject(expected)) {
    //   return _.some(_.filter(values, expected))
    // }
    return _.includes(values, expected)
  }

  // function checkArgs(
  //     expectedArgs: any[],
  //     callArgs: unknown[],
  //     evaluator: (args: any[]) => boolean,
  // ) {
  //     const values = Object.values(callArgs)
  //     const argResults = []
  //     for (let argIndex = 0; argIndex < expectedArgs.length; argIndex++) {
  //         const expected = expectedArgs[argIndex]
  //         debug('expected', expected, 'in', values)
  //         const foundArg = checkArg(expected, values)
  //         argResults.push(foundArg)
  //     }
  //     return evaluator(argResults)
  // }

  function checkAnyArgs(
    expectedArgs: any[],
    callArgs: Record<string | number, unknown>,
  ) {
    return checkArgs(expectedArgs, callArgs, _.some)
  }

  function withArg(arg: unknown) {
    const args = Object.values(Array.from(arguments))
    assertArgsWithEvaluator(calledWithArgs, args, _.some)
  }

  function withMatch(pattern: RegExp) {
    debug('withMatch', pattern, calledWithArgs)
    let matched = false
    for (const calls in calledWithArgs) {
      if (matched) {
        debug('MATCHED', calls)
        break
      }
      for (const arg of calledWithArgs[calls]) {
        debug(calls, arg)
        if (matched) {
          debug('MATCHED', calls, arg)
          break
        }
        if (_.isObject(arg)) {
          matched = _.deepMatch(arg, pattern)
          debug('is object match?', matched, arg, pattern)
          break
        }
        matched = pattern.test(String(arg))
        debug('is match?', matched, arg, pattern)
      }
    }
    assert(
      matched,
      `Expected ${String(method)} to be called matching: ${pattern}`,
    )
  }

  function matchExactly() {
    const expectedArgs = Object.values(arguments)
    debug('matchExactly', calledWithArgs, expectedArgs)
    let matched = true
    for (const calls in calledWithArgs) {
      if (!matched) break
      for (let i = 0; i < calledWithArgs[calls].length; i++) {
        const arg = calledWithArgs[calls][i]
        debug(calls, arg)
        matched = isDeepStrictEqual(arg, expectedArgs[i])
        debug('is match?', matched, arg, expectedArgs[i])
        if (!matched) break
      }
    }
    assert(
      matched,
      `Expected ${String(method)} to be called matchExactly args${inspect(expectedArgs, { depth: 10 })}`,
    )
  }

  // function assertArgsWithEvaluator(argsToCheck: any[], args: unknown[], evaluator: (args: any[]) => boolean) {
  //     const callResults = [];
  //     _.forEach(argsToCheck, function(value: any) {
  //         debug('checking', value, args);
  //         const argResult = checkArgs(args, value, evaluator);
  //         callResults.push(argResult);
  //     });
  //     const result = some(callResults);
  //     assert(result, `Expected ${String(method)} to be called with: ${args.join(', ')}`);
  // }
  type EvaluatorFn = (...args: any[]) => boolean

  function checkArgs(
    expectedArgs: unknown[],
    callArgs: Record<string | number, unknown>,
    evaluator: EvaluatorFn,
  ): boolean {
    const values = Object.values(callArgs)
    const argResults: boolean[] = []
    debug('checkArgs', expectedArgs, callArgs)

    expectedArgs.forEach((expected) => {
      debug('expected', expected, 'in', values)
      const foundArg = checkArg(expected, values)
      argResults.push(foundArg)
    })
    // for (let argIndex = 0; argIndex < expectedArgs.length; argIndex++) {
    //   const expected = expectedArgs[argIndex]
    //   debug('expected', expected, 'in', values)
    //   const foundArg = checkArg(expected, values)
    //   argResults.push(foundArg)
    // }

    return evaluator(argResults)
  }

  function assertArgsWithEvaluator(
    argsToCheck: Record<string | number, Parameters<any>>,
    expectedArgs: unknown[],
    evaluator: EvaluatorFn,
  ): void {
    let callResults = []
    for (const [key, value] of Object.entries(argsToCheck)) {
      debug('checking', key, value, expectedArgs)
      callResults.push(checkArgs(expectedArgs, value as any, evaluator))
    }
    const result = callResults.some(Boolean)

    assert(
      result,
      `Expected ${String(method)} to be called with: ${expectedArgs.join(', ')}`,
    )
  }

  function withArgs() {
    const args = Object.values(Array.from(arguments))
    assertArgsWithEvaluator(calledWithArgs, args, _.every)
  }

  function times(number: number, err?: any) {
    if (!err) {
      err = `Expected ${String(method)} to be called ${humanise(number)} but was ${timesCalled}`
    }
    assert.equal(timesCalled, number, err)
    return self
  }

  function never() {
    return times(
      0,
      `Expected ${String(method)} to never be called but was ${humanise(timesCalled)}`,
    )
  }

  function calledOnce() {
    return times(1)
  }

  function calledTwice() {
    return times(2)
  }

  function reset() {
    timesCalled = 0
    calledWithArgs = {}
  }

  return self as Expectations<T>
}
