'use strict';
var _ = require('lodash');

function proxyFunctions(source, target, functions) {
    function createFunction(functionName, target) {
        return function() {
            return target[functionName].apply(target, arguments);
        };
    }
    for (var i = 0; i < functions.length; i++) {
        var functionName = functions[i];
        source[functionName] = createFunction(functionName, target);
    }
}

function methods(obj) {
    var funcs = [];

    var methodsOnObj = Object.getOwnPropertyNames(obj);

    if (obj.constructor !== Object) {
        _.forEach(obj.constructor.prototype, function(value, property) {
            methodsOnObj.push(property);
        });
    }

    _.forEach(methodsOnObj, function(value) {
        var member = typeof(obj[value]);
        if (member === 'function') {
            funcs.push(value);
        }
    });
    return funcs;
}

module.exports = {
    proxyFunctions: proxyFunctions,
    methods: methods
};
