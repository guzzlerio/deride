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
	return _.functions(obj);
}

function humanise(number) {
    switch (number) {
        case 1:
            return 'once';
        case 2:
            return 'twice';        
        default:
            return number + ' times';
    }
}

module.exports = {
    proxyFunctions: proxyFunctions,
    methods: methods,
    humanise: humanise
};
