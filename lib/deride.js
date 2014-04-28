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

var Expectations = function() {

    var timesCalled = 0;
    var calledWithArgs = {};

    function withArgs() {
        var args = arguments;
        var results = [];
        _.forEach(calledWithArgs, function(value) {
            var found = true;
            for (var i = 0; i < arguments.length; i++) {
                if (JSON.stringify(value[i]) !== JSON.stringify(args[i])) {
                    found = false;
                    break;
                }
            }
            results.push(found);
        });
        assert(_.any(results));
    }

    function times(number, err) {
        assert.equal(timesCalled, number, err);
    }

    function never(err) {
        assert.equal(timesCalled, 0, err);
    }

    function calledOnce(err) {
        assert.equal(timesCalled, 1, err);
    }

    function calledTwice(err) {
        assert.equal(timesCalled, 2, err);
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
            withArgs: withArgs
        },
        call: call
    };

    return (function() {
        return Object.freeze(self);
    }());
};

var Setup = function(obj, method) {
    var originalMethod = obj[method];
    var callToInvoke = normalCall;
    var callToInvokeOnArguments = {};
    var argumentsPredicate;

    function normalCall() {
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
        checkArgumentsToInvoke(func);
    }

    function toTimeWarp(milliseconds) {
        var func = function() {
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
            throw new Error(message);
        };
        checkArgumentsToInvoke(func);
    }

    var self = {
        toDoThis: toDoThis,
        toReturn: toReturn,
        toThrow: toThrow,
        toCallbackWith: toCallbackWith,
        toTimeWarp: toTimeWarp,
        when: when,
        call: call
    };

    return (function() {
        return Object.freeze(self);
    }());

};

function wrap(obj) {
    var objMethods = utils.methods(obj);
    var self = {};
    var expectMethods = {};
    var setupMethods = {};
    var eventEmitter = new events.EventEmitter();
    utils.proxyFunctions(self, eventEmitter, ['on', 'emit']);

    function setupForMethod(method) {
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
    return Object.freeze(self);
}

function stub(methods) {
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
    stub: stub
};
