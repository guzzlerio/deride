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

var Expectations = function() {
    var timesCalled = 0;
    var calledWithArgs = {};

    function call() {
        calledWithArgs[timesCalled++] = arguments[0];
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
        });
        return _.any(results, function(result) {
            return result;
        });
    }

    return (function() {
        return Object.freeze({
            called: {
                times: times,
                never: never,
                withArgs: withArgs
            },
            call: call
        });
    }());

};

function wrap(obj) {
    var objMethods = methods(obj);
    var self = {};
    var expectMethods = {};
    var createWrapper = function(method) {
        return function() {
            var original = obj[method];
            expectMethods[method].call(arguments);
            return original.apply(obj, arguments);
        };

    };
    for (var i = 0; i < objMethods.length; i++) {
        var method = objMethods[i];
        expectMethods[method] = expectMethods[method] || new Expectations();
        var expectMethod = createWrapper(method);
        self[method] = expectMethod;
    }
    self.expect = expectMethods;
    return Object.freeze(self);
}

module.exports = {
    wrap: wrap
};
