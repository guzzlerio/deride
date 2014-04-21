/*
 * compmoc
 * https://github.com/area/compmoc
 *
 * Copyright (c) 2014 Andrew Rea
 * Licensed under the MIT license.
 */

'use strict';

require('should');
var _ = require('lodash');

var methods = function(obj) {
    var funcs = [];

    if (obj.constructor !== Object) {
        obj = obj.constructor.prototype;
    }
    _.forEach(obj, function(value, property) {
        var member = typeof(value);
        if (member === 'function') {
            funcs.push(property);
        }
    });
    return funcs;
};

var Expectations = function(obj, method) {

    var timesCalled = 0;
    var calledWithArgs = {};
    var originalMethod = obj[method];

    function withArgs() {
        var args = arguments;
        var results = [];
        _.forEach(calledWithArgs, function(value) {
            var found = true;
            for (var i = 0; i < arguments.length; i++) {
                if (value[i] !== args[i]) {
                    found = false;
                    break;
                }
            }
            results.push(found);
        });
        _.any(results).should.eql(true);
    }

    function times(number) {
        timesCalled.should.eql(number);
    }

    function never() {
        timesCalled.should.eql(0);
    }

    function call() {
        calledWithArgs[timesCalled++] = arguments;
        var result = originalMethod.apply(obj, arguments);
        return result;
    }

    var self = {
        called: {
            times: times,
            never: never,
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

    function reset() {
        callToInvokeOnArguments = {};
        callToInvoke = normalCall;
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
        when: when,
        reset: reset,
        call: call
    };

    return (function() {
        return Object.freeze(self);
    }());

};

function wrap(obj) {
    var objMethods = methods(obj);
    var self = {};
    var expectMethods = {};
    var setupMethods = {};

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
