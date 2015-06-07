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
		var foundArg = false;
		for (var valueIndex = 0; valueIndex < values.length; valueIndex++) {
			var actual = values[valueIndex];
			try {
				assert.deepEqual(actual, expected);
				foundArg = true;
				break;
			} catch (err) {}
		}
		return foundArg;
	}

	function checkArgs(expectedArgs, callArgs) {
		var values = _.values(callArgs);
		var argResults = [];
		for (var argIndex = 0; argIndex < expectedArgs.length; argIndex++) {
			var expected = expectedArgs[argIndex];
			var foundArg = checkArg(expected, values);
			argResults.push(foundArg);
		}
		return _.all(argResults);
	}

	function withArgs() {
		var args = _.values(arguments);
		var callResults = [];
		_.forEach(calledWithArgs, function(value) {
			var argResult = checkArgs(args, value);
			callResults.push(argResult);
		});
		assert(_.any(callResults), 'Expected ' + method + ' to be called with: ' + args.join(', '));
	}

	function times(number, err) {
		if (!err) {
			err = 'Expected ' + method + ' to be called ' + utils.humanise(number);
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

	var self = {
		called: {
			times: times,
			never: never,
			once: calledOnce,
			twice: calledTwice,
			reset: reset,
			withArgs: withArgs
		},
		call: call
	};

	return (function() {
		return Object.freeze(self);
	}());
};

var Setup = function(obj, method) {
	var debug = require('debug')(PREFIX);
	var Promises = require('when');
	var originalMethod = obj[method];
	var callToInvoke = normalCall;
	var callToInvokeOnArguments = {};
	var argumentsPredicate;

	function normalCall() {
		debug('normal call', method);
		var result = originalMethod.apply(obj, arguments);
		return result;
	}

	function call() {
		var key = serializeArgs(arguments);
		var callBasedOnArgs = callToInvokeOnArguments[key];
		if (callBasedOnArgs !== null && callBasedOnArgs !== undefined) {
			return callBasedOnArgs.apply(self, arguments);
		} else {
			return callToInvoke.apply(self, arguments);
		}
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

	function toDoThis(func) {
		var wrapper = function() {
			debug('toDoThis override');
			var result = func.apply(obj, arguments);
			return result;
		};
		checkArgumentsToInvoke(wrapper);
	}

	function toResolveWith(arg) {
		var func = function() {
			debug('toResolveWith');
			return Promises.resolve(arg);
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

	function toCallbackWith(args) {
		var func = function() {
			debug('toCallbackWith', args);
			for (var i = 0; i < arguments.length; i++) {
				var argType = typeof(arguments[i]);
				if (argType === 'function') {
					arguments[i].apply(null, args);
				}
			}
		};
		checkArgumentsToInvoke(func);
	}

	function serializeArgs(args) {
		return JSON.stringify(args);
	}

	function toReturn(value) {
		var overrideReturnValue = function() {
			debug('toReturn', value);
			return value;
		};
		checkArgumentsToInvoke(overrideReturnValue);
	}

	function when() {
		argumentsPredicate = arguments;
		return Object.freeze(self);
	}

	function toThrow(message) {
		var func = function() {
			debug('toThrow', message);
			throw new Error(message);
		};
		checkArgumentsToInvoke(func);
	}

	var self = {
		toDoThis: toDoThis,
		toReturn: toReturn,
		toThrow: toThrow,
		toCallbackWith: toCallbackWith,
		toResolveWith: toResolveWith,
		toRejectWith: toRejectWith,
		toTimeWarp: toTimeWarp,
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
	utils.proxyFunctions(self, eventEmitter, ['on', 'emit']);

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
		setupMethods[method] = new Setup(obj, method);
		self[method] = setupForMethod(method);
	}

	self.expect = expectMethods;
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
