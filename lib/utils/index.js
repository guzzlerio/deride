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
    return _.functions(obj);
}

module.exports = {
    proxyFunctions: proxyFunctions,
    methods: methods,
    hasValue: hasValue
};
