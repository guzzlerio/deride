/*
Copyright (c) 2014 Andrew Rea
Copyright (c) 2014 James Allen

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
 */

'use strict';

var _ = require('lodash');
var assert = require('assert');
var utils = require('./utils');
var events = require('events');
var PREFIX = 'deride';

var Expectations = function(obj, method) {
	var timesCalled = 0;
	var calledWithArgs = {};

	function checkArg(expected, values) {
		return _.any(_.where(values, expected));
	}

	function checkArgs(expectedArgs, callArgs, evaluator) {
		var values = _.values(callArgs);
		var argResults = [];
		for (var argIndex = 0; argIndex < expectedArgs.length; argIndex++) {
			var expected = expectedArgs[argIndex];
			var foundArg = checkArg(expected, values);
			argResults.push(foundArg);
		}
		return evaluator(argResults);
	}

	function checkAnyArgs(expectedArgs, callArgs) {
		return checkArgs(expectedArgs, callArgs, _.any);
	}

	function withArgs() {
		var args = _.values(arguments);
		assertArgsWithEvaluator(calledWithArgs, args, _.all);
		return self.called;
	}

	function withSingleArg(arg) {
		var args = [arg];
		assertArgsWithEvaluator(calledWithArgs, args, _.any);
		return self.called;
	}

	function assertArgsWithEvaluator(argsToCheck, args, evaluator) {
		var callResults = [];
		_.forEach(argsToCheck, function(value) {
			var argResult = checkArgs(args, value, evaluator);
			callResults.push(argResult);
		});
		var result = _.any(callResults);
		assert(result, 'Expected ' + method + ' to be called with: ' + args.join(', '));
	}

	function withArg(args) {
		return function(arg) {
			assert(checkAnyArgs([arg], args));
		};
	}

	function invocation(index) {
		if (!(index.toString() in calledWithArgs)) {
			throw new Error('invocation out of range');
		}
		var arg = calledWithArgs[index.toString()];
		return {
			withArg: withArg(arg)
		};
	}

	function times(number, err) {
		if (!err) {
			err = 'Expected ' + method + ' to be called ' + utils.humanise(number) + ' but was ' + timesCalled;
		}
		assert.equal(timesCalled, number, err);
	}

	function never(err) {
		times(0, err);
	}

	function calledOnce(err) {
		times(1, err);
	}

	function calledTwice(err) {
		times(2, err);
	}

	function reset() {
		timesCalled = 0;
		calledWithArgs = {};
	}

	function call() {
		calledWithArgs[timesCalled++] = arguments;
	}

	function negate(func) {
		return function() {
			var args = _.values(arguments);
			try {
				func.call(null, args);
			} catch (err) {
				return self;
			}
			assert(false);
		};
	}

	function addNotMethods(obj) {
		var methods = {};
		var calledMethods = _.omit(utils.methods(obj.called), 'reset');
		_.each(calledMethods, function(method) {
			methods[method] = negate(obj.called[method]);
		});
		obj.called.not = methods;
		return obj;
	}

	var self = {
		called: {
			times: times,
			never: never,
			once: calledOnce,
			twice: calledTwice,
			reset: reset,
			withArgs: withArgs,
			withArg: withSingleArg
		},
		invocation: invocation,
		call: call
	};

	return (function() {
		return Object.freeze(addNotMethods(self));
	}());
};

var Setup = function(obj, method, emitter) {
	var debug = require('debug')(PREFIX + ':setup:'+ method);
	var Promises = require('when');
	var originalMethod = obj[method];
	var callToInvoke = normalCall;
	var callToInvokeOnArguments = {};
	var argumentsPredicate;

	function call() {
		var key = serializeArgs(arguments);
		var callBasedOnArgs = callToInvokeOnArguments[key];
		if (callBasedOnArgs !== null && callBasedOnArgs !== undefined) {
			return callBasedOnArgs.apply(self, arguments);
		} else {
			return callToInvoke.apply(self, arguments);
		}
	}

	function getArgArray(argArray) {
		if (argArray.length === 1 && _.isArray(argArray[0])) {
			return argArray[0];
		}
		return argArray;
	}

	function toCallbackWith() {
		var args = getArgArray([].slice.call(arguments));
		var func = function() {
			debug('toCallbackWith', args);
			var index = _.findLastIndex(arguments, _.isFunction);
			arguments[index].apply(null, args);
		};
		checkArgumentsToInvoke(func);
	}

	function toDoThis(func) {
		var wrapper = function() {
			debug('toDoThis override');
			var result = func.apply(obj, arguments);
			return result;
		};
		checkArgumentsToInvoke(wrapper);
	}

	function toEmit() {
		var args = Array.prototype.slice.call(arguments);
		var func = function() {
			emitter.emit.apply(emitter, args);
			return originalMethod.apply(obj, arguments);
		};
		checkArgumentsToInvoke(func);
	}

	function toRejectWith(arg) {
		var func = function() {
			debug('toRejectWith');
			return Promises.reject(arg);
		};
		checkArgumentsToInvoke(func);
	}

	function toResolveWith(arg) {
		var func = function() {
			debug('toResolveWith');
			return Promises.resolve(arg);
		};
		checkArgumentsToInvoke(func);
	}

	function toReturn(value) {
		var overrideReturnValue = function() {
			debug('toReturn', value);
			return value;
		};
		checkArgumentsToInvoke(overrideReturnValue);
	}

	function toThrow(message) {
		var func = function() {
			debug('toThrow', message);
			throw new Error(message);
		};
		checkArgumentsToInvoke(func);
	}

	function toTimeWarp(milliseconds) {
		var func = function() {
			debug('toTimeWarp', milliseconds);
			var originalTimeoutFunc = setTimeout;
			setTimeout = function(delegate, timeout) {
				originalTimeoutFunc(delegate, timeout - milliseconds);
			};
			var result = originalMethod.apply(obj, arguments);
			return result;
		};
		checkArgumentsToInvoke(func);
	}

	function when() {
		argumentsPredicate = arguments;
		return Object.freeze(self);
	}

	function checkArgumentsToInvoke(func) {
		if (argumentsPredicate !== null && argumentsPredicate !== undefined) {
			var key = serializeArgs(argumentsPredicate);
			callToInvokeOnArguments[key] = func;
		} else {
			callToInvoke = func;
		}
		argumentsPredicate = null;
	}

	function normalCall() {
		debug('normal call', method);
		var result = originalMethod.apply(obj, arguments);
		return result;
	}

	function serializeArgs(args) {
		return JSON.stringify(args);
	}

	var self = {
		toDoThis: toDoThis,
		toReturn: toReturn,
		toThrow: toThrow,
		toCallbackWith: toCallbackWith,
		toResolveWith: toResolveWith,
		toRejectWith: toRejectWith,
		toTimeWarp: toTimeWarp,
		toEmit: toEmit,
		when: when,
		call: call
	};

	return (function() {
		return Object.freeze(self);
	}());
};

function wrap(obj) {
	var debug = require('debug')(PREFIX + ':wrap');
	var objMethods = utils.methods(obj);
	var self = {};
	var expectMethods = {};
	var setupMethods = {};
	var eventEmitter = new events.EventEmitter();
	utils.proxyFunctions(self, eventEmitter, ['on', 'once', 'emit']);

	function setupForMethod(method) {
		debug(method);
		return function() {
			expectMethods[method].call.apply(obj, arguments);
			return setupMethods[method].call.apply(obj, arguments);
		};
	}

	for (var i = 0; i < objMethods.length; i++) {
		var method = objMethods[i];
		expectMethods[method] = new Expectations(obj, method);
		setupMethods[method] = new Setup(obj, method, eventEmitter);
		self[method] = setupForMethod(method);
	}

	self.expect = expectMethods;
	self.called = {
		reset: function() {
			_.each(expectMethods, function(method) {
				method.called.reset();
			});
		}
	};
	self.setup = setupMethods;
	return Object.freeze(_.merge({}, obj, self));
}

function func() {
	var debug = require('debug')(PREFIX + ':func');
	var objHarness = {
		value: function() {}
	};
	var wrapped = wrap(objHarness);

	function createFunc() {
		debug('harness');
		var returnVal = wrapped.value.apply(objHarness, arguments);
		return returnVal;
	}
	createFunc.expect = wrapped.expect.value;
	createFunc.setup = wrapped.setup.value;

	return Object.freeze(createFunc);
}

function stub(target) {
	var debug = require('debug')(PREFIX + ':stub');
	debug(target);
	var methods = [];
	if (_.isArray(target)) {
		methods = target;
	} else {
		methods = utils.methods(target);
	}

	var stubObj = {};
	var emptyMethod = function() {
		return function() {};
	};
	for (var i = 0; i < methods.length; i++) {
		stubObj[methods[i]] = emptyMethod();
	}
	return wrap(stubObj);
}

module.exports = {
	wrap: wrap,
	stub: stub,
	func: func
};
