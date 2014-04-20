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

    return function() {
        return Object.freeze({
            called: {
                times: times
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
        var expectMethod = function() {
            var original = obj[method];
            expectMethods[method] = expectMethods[method] || new Expectations()
            expectMethods[method].call();
            return original.apply(obj, arguments);
        };
        self[method] = expectMethod;

    }
    console.log('self',self);
    self.expect = expectMethods;
    return Object.freeze(self);
}

module.exports = {
    wrap: wrap
}
