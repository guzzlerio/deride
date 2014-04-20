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

    function call() {
        var result = originalMethod.apply(obj, arguments);
        calledWithArgs[timesCalled++] = arguments;
        return result;
    }

    function times(number) {
        timesCalled.should.eql(number);
    }

    function never() {
        timesCalled.should.eql(0);
    }

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

    function toDoThis(func) {
        originalMethod = func;
    }

    var self = {
        called: {
            times: times,
            never: never,
            withArgs: withArgs
        },
        toDoThis : toDoThis,
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
    for (var i = 0; i < objMethods.length; i++) {
        var method = objMethods[i];
        expectMethods[method] = expectMethods[method] || new Expectations(obj, method);
        self[method] = expectMethods[method].call;
    }
    self.expect = expectMethods;
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
