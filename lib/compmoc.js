/*
 * compmoc
 * https://github.com/area/compmoc
 *
 * Copyright (c) 2014 Andrew Rea
 * Licensed under the MIT license.
 */

'use strict';

require('should');

var methods = function(obj) {
    var funcs = [];
    for (var a in obj) {
        var member = typeof(obj[a]);
        if (member === 'function') {
            funcs.push(a);
        }
    }
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
        var found = true;
        for (var set in calledWithArgs) {
            found = true;
            for (var i = 0; i < arguments.length; i++) {
                if (calledWithArgs[set][i] !== arguments[i]) {
                    found = false;
                    break;
                }
            }
            if(found === true){
                break;
            }
        }
        found.should.eql(true);
    }

    return function() {
        return Object.freeze({
            called: {
                times: times,
                never: never,
                withArgs: withArgs
            },
            call: call
        })
    }();

};

function wrap(obj) {
    var objMethods = methods(obj);
    var self = {};
    var expectMethods = {};
    for (var methodIndex in objMethods) {
        var method = objMethods[methodIndex];
        expectMethods[method] = expectMethods[method] || new Expectations()
        var expectMethod = function() {
            var original = obj[method];
            expectMethods[method].call(arguments);
            return original.apply(obj, arguments);
        };
        self[method] = expectMethod;

    }
    self.expect = expectMethods;
    return Object.freeze(self);
}

module.exports = {
    wrap: wrap
}
