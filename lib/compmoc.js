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

    function call() {
        timesCalled++;
    }

    function times(number) {
        timesCalled.should.eql(number);
    }

    function never() {
        timesCalled.should.eql(0);
    }

    return function() {
        return Object.freeze({
            called: {
                times: times,
                never: never
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
            expectMethods[method].call();
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
