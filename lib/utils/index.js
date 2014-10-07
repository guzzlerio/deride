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

function hasValue(obj) {
    return obj !== null && obj !== undefined;
}

function methods(obj) {
    //Properties which cannot be accessed in strict mode
    var reservedProperties = ['caller', 'callee', 'arguments'];
    var funcs = [];

    var methodsOnObj = Object.getOwnPropertyNames(obj);

    if (obj.constructor !== Object) {
        _.forEach(obj.constructor.prototype, function(value, property) {
            methodsOnObj.push(property);
        });
    }

    _.forEach(methodsOnObj, function(value) {
        if (reservedProperties.indexOf(value) === -1 &&
            obj[value] instanceof Function) {
            funcs.push(value);
        }
    });
    return funcs;
}

module.exports = {
    proxyFunctions: proxyFunctions,
    methods: methods,
    hasValue: hasValue
};
