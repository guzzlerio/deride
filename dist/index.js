"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  default: () => src_default,
  deride: () => deride
});
module.exports = __toCommonJS(src_exports);

// src/func.ts
function func(toWrap) {
}

// src/utils.ts
var PREFIX = "deride";
function proxyFunctions(source, target, functions) {
  function createFunction(functionName) {
    return function() {
      const func2 = target[functionName];
      return func2.apply(target, arguments);
    };
  }
  functions.forEach((functionName) => {
    source[functionName] = createFunction(functionName);
  });
}
function getAllKeys(obj) {
  const keys = /* @__PURE__ */ new Set();
  let current = obj;
  while (current && current !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(current)) {
      keys.add(key);
    }
    current = Object.getPrototypeOf(current);
  }
  return Array.from(keys);
}
function omit(obj, keys) {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keys.includes(key))
  );
}
function every(collection, predicate) {
  predicate = isFunction(predicate) ? predicate : truthy;
  if (isArray(collection)) {
    return collection.every((v, i) => predicate(v, i));
  }
  return Object.entries(collection).every(([k, v]) => predicate(v, k));
}
function some(collection, predicate) {
  predicate = isFunction(predicate) ? predicate : truthy;
  if (isArray(collection)) {
    return collection.some((v, i) => predicate(v, i));
  }
  return Object.entries(collection).some(([k, v]) => predicate(v, k));
}
function isFunction(value) {
  return typeof value === "function";
}
function union(...arrays) {
  return [...new Set(arrays.flat())];
}
function isArray(value) {
  return Array.isArray(value);
}
function isObject(value) {
  return typeof value === "object" && value !== null || typeof value === "function";
}
function truthy(value, key) {
  if (value)
    return true;
  return false;
}
function filter(collection, predicate) {
  predicate = predicate ?? truthy;
  if (Array.isArray(collection)) {
    return collection.filter((v, i) => predicate(v, i));
  }
  return Object.fromEntries(
    Object.entries(collection).filter(([k, v]) => predicate(v, k))
  );
}
function deepEqual(a, b) {
  if (a === b)
    return true;
  if (typeof a !== "object" || typeof b !== "object" || a == null || b == null)
    return false;
  if (Array.isArray(a))
    return Array.isArray(b) && a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length)
    return false;
  return aKeys.every((key) => deepEqual(a[key], b[key]));
}
function includes(collection, value) {
  let arr = [];
  if (Array.isArray(collection)) {
    arr = collection;
  }
  if (typeof collection === "string") {
    arr = Array.from(collection);
  }
  if (typeof collection === "object" && collection !== null) {
    arr = Object.values(collection);
  }
  return arr.some((item) => deepEqual(item, value));
}
function humanise(number) {
  switch (number) {
    case 1:
      return "once";
    case 2:
      return "twice";
    default:
      return number + " times";
  }
}
var _ = {
  every,
  filter,
  includes,
  isArray,
  isFunction,
  isObject,
  omit,
  some,
  union
};

// src/wrap.ts
var import_debug3 = __toESM(require("debug"));
var import_node_events = require("events");

// src/expect.ts
var import_strict = __toESM(require("assert/strict"));
var import_debug = __toESM(require("debug"));
function Expectations(obj, method) {
  const debug = (0, import_debug.default)(PREFIX + ":expect:" + String(method));
  let timesCalled = 0;
  let calledWithArgs = {};
  const self = {
    invocation,
    call,
    // not: {
    //     called: {
    //         times: negate(times),
    //     },
    // },
    called: {
      times,
      // never: never,
      // once: calledOnce,
      // twice: calledTwice,
      // lt: calledLt,
      // lte: calledLte,
      // gt: calledGt,
      // gte: calledGte,
      reset,
      // matchExactly: matchExactly,
      withArg,
      withArgs
      // withArg: withSingleArg,
      // withMatch: withMatch,
    }
  };
  function call() {
    debug("called", JSON.stringify(arguments));
    calledWithArgs[timesCalled++] = structuredClone(Array.from(arguments));
  }
  function invocation(index) {
    if (!(index.toString() in calledWithArgs)) {
      throw new Error("invocation out of range");
    }
    const arg = calledWithArgs[index];
    return { withArg: withArg(arg) };
  }
  function checkArg(expected, values) {
    const jsonExpected = JSON.stringify(expected);
    debug("checkArg", jsonExpected, values);
    return _.includes(values, expected);
  }
  function checkAnyArgs(expectedArgs, callArgs) {
    return checkArgs(expectedArgs, callArgs, _.some);
  }
  function withArg(arg) {
    const args = Object.values(Array.from(arguments));
    assertArgsWithEvaluator(calledWithArgs, args, _.some);
  }
  function checkArgs(expectedArgs, callArgs, evaluator) {
    const values = Object.values(callArgs);
    const argResults = [];
    debug("checkArgs", expectedArgs, callArgs);
    expectedArgs.forEach((expected) => {
      debug("expected", expected, "in", values);
      const foundArg = checkArg(expected, values);
      argResults.push(foundArg);
    });
    return evaluator(argResults);
  }
  function assertArgsWithEvaluator(argsToCheck, expectedArgs, evaluator) {
    let callResults = [];
    for (const [key, value] of Object.entries(argsToCheck)) {
      debug("checking", key, value, expectedArgs);
      callResults.push(checkArgs(expectedArgs, value, evaluator));
    }
    const result = callResults.some(Boolean);
    (0, import_strict.default)(
      result,
      `Expected ${String(method)} to be called with: ${expectedArgs.join(", ")}`
    );
  }
  function withArgs() {
    const args = Object.values(Array.from(arguments));
    assertArgsWithEvaluator(calledWithArgs, args, _.every);
  }
  function times(number, err) {
    if (!err) {
      err = `Expected ${String(method)} to be called ${humanise(number)} but was ${timesCalled}`;
    }
    import_strict.default.equal(timesCalled, number, err);
    return self;
  }
  function reset() {
    timesCalled = 0;
    calledWithArgs = {};
  }
  return self;
}

// src/setup.ts
var import_debug2 = __toESM(require("debug"));
function Setup(obj, method, emitter) {
  const debug = (0, import_debug2.default)(PREFIX + ":setup:" + String(method));
  const originalMethod = obj[method];
  let callToInvoke = normalCall;
  let callQueue = [];
  let callToInvokeOnArguments = {};
  let callQueueBasedOnArgs = {};
  let argumentsPredicate;
  let lastPredicate = void 0;
  let beforeFunc = void 0;
  let key;
  let functionPredicates = [];
  let useCallQueue = false;
  let self = {};
  const addBehavior = (action) => {
    checkArgumentsToInvoke(action);
    return Object.freeze(self);
  };
  self.call = () => {
    debug("call");
    const args = Array.from(arguments);
    const key2 = serializeArgs(arguments);
    const callFromQueueBasedOnArgs = callQueueBasedOnArgs[key2];
    if (_.isArray(callFromQueueBasedOnArgs)) {
      var f = callFromQueueBasedOnArgs.pop();
      if (_.isFunction(f)) {
        debug("callFromQueueBasedOnArgs");
        return f.apply(self, args);
      }
      return callToInvoke.apply(self, args);
    }
    const callBasedOnArgs = callToInvokeOnArguments[key2];
    if (_.isFunction(callBasedOnArgs)) {
      debug("callBasedOnArgs");
      return callBasedOnArgs.apply(self, args);
    }
    return callToInvoke.apply(self, args);
  };
  self.times = () => {
    return Object.freeze(self);
  };
  self.once = () => {
    return Object.freeze(self);
  };
  self.twice = () => {
    return Object.freeze(self);
  };
  self.fallback = () => {
    return Object.freeze(self);
  };
  self.toCallbackWith = () => {
    return Object.freeze(self);
  };
  self.toDoThis = (func2) => addBehavior(() => {
    debug("toDoThis override", arguments[1]);
    const args = Array.from(arguments);
    return func2.apply(obj, args);
  });
  self.toEmit = (eventName, ...params) => {
    const func2 = () => {
      debug("toEmit", arguments[1], eventName, params);
      emitter.emit.apply(emitter, [eventName, params]);
      return originalMethod.apply(obj, arguments);
    };
    checkArgumentsToInvoke(func2);
    return Object.freeze(self);
  };
  self.toIntercept = () => {
    return Object.freeze(self);
  };
  self.toReject = () => {
    return Object.freeze(self);
  };
  self.toRejectWith = () => {
    return Object.freeze(self);
  };
  self.toResolve = () => {
    return Object.freeze(self);
  };
  self.toResolveWith = () => {
    return Object.freeze(self);
  };
  self.toReturn = (value) => addBehavior(() => {
    debug("toReturn", value);
    return value;
  });
  self.toThrow = (message) => addBehavior(() => {
    debug("toThrow", message, arguments);
    throw new Error(message);
  });
  self.toTimeWarp = () => {
    return Object.freeze(self);
  };
  self.when = () => {
    return Object.freeze(self);
  };
  function checkArgumentsToInvoke(func2) {
    debug("checkArgumentsToInvoke");
    if (argumentsPredicate !== null && argumentsPredicate !== void 0) {
      key = serializeArgs(argumentsPredicate);
      debug("argumentsPredicate", key);
      callToInvokeOnArguments[key] = func2;
      callQueueBasedOnArgs[key] = [...callQueueBasedOnArgs[key], func2];
      debug("callQueueBasedOnArgs", callQueueBasedOnArgs);
      argumentsPredicate = null;
      return;
    }
    if (_.isFunction(lastPredicate)) {
      functionPredicates.push([lastPredicate, func2]);
      return;
    }
    debug("no predicate function", { callQueue });
    callToInvoke = func2;
    if (useCallQueue) {
      debug("using the callQueue");
      callQueue.unshift(func2);
    }
  }
  function normalCall() {
    debug("normal call", method);
    var result = originalMethod.apply(obj, arguments);
    return result;
  }
  function serializeArgs(args) {
    return JSON.stringify(args);
  }
  return Object.freeze(self);
}

// src/wrap.ts
function wrap(obj, options = { debug: { prefix: PREFIX, suffix: "wrap" } }) {
  const debug = (0, import_debug3.default)(`${options.debug.prefix}:${options.debug.suffix}`);
  const objMethods = getAllKeys(obj);
  const expectMethods = {};
  const setupMethods = {};
  const self = {};
  const eventEmitter = new import_node_events.EventEmitter();
  proxyFunctions(self, eventEmitter, ["on", "once", "emit"]);
  for (const m of objMethods) {
    debug("mapping", m);
    let method = m;
    expectMethods[method] = Expectations(obj, method);
    setupMethods[method] = Setup(obj, method, eventEmitter);
    self[method] = setupForMethod(method);
  }
  function setupForMethod(method) {
    debug(`setupForMethod: ${String(method)}`);
    return function() {
      expectMethods[method].call.apply(obj, arguments);
      return setupMethods[method].call.apply(obj, arguments);
    };
  }
  self.expect = expectMethods;
  self.setup = setupMethods;
  self.called = {
    reset: () => {
    }
  };
  return {
    ...obj,
    ...self
  };
}

// src/stub.ts
function stub(target, properties, options = { debug: { prefix: PREFIX, suffix: "wrap" } }) {
  const debug = require("debug")(
    `${options.debug.prefix}:${options.debug.suffix}`
  );
  debug(target);
  let methods = [];
  if (_.isArray(target)) {
    methods = target;
  } else {
    methods = getAllKeys(target);
  }
  let stubObj = {};
  const emptyMethod = function() {
    return function() {
    };
  };
  for (let i = 0; i < methods.length; i++) {
    stubObj[methods[i]] = emptyMethod();
  }
  properties?.forEach((prop) => {
    Object.defineProperty(stubObj, prop.name, prop.options);
  });
  return wrap(stubObj, options);
}

// src/index.ts
var deride = { func, stub, wrap };
var src_default = deride;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  deride
});
