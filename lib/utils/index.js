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
	return _.functionsIn(obj);
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

var mixins = {
	deepMapValues: function(object, callback, propertyPath) {
		var properties = getProperties(propertyPath);
		if (_.isArray(object)) {
			return _.map(object, deepMapValuesIteratee);
		} else if (_.isObject(object) && !_.isDate(object) && !_.isRegExp(object)) {
			return _.extend({}, object, _.mapValues(object, deepMapValuesIteratee));
		} else {
			return callback(object, properties);
		}

		function deepMapValuesIteratee(value, key) {
			return _.deepMapValues(value, callback, _.flatten([properties, key]));
		}

		function getProperties(propertyPath) {
			if (_.isArray(propertyPath)) {
				return propertyPath;
			}

			if (!_.isString(propertyPath)) {
				return [];
			}

			return parseStringPropertyPath(propertyPath);
		}

		function parseStringPropertyPath(propertyPath) {
			//jshint maxcomplexity:13
			//jshint maxdepth:3
			//REASON: taken from https://github.com/marklagendijk/lodash-deep/blob/master/lodash-deep.js
			//        Need to look at refactoring it.
			var character = '';
			var parsedPropertyPath = [];
			var parsedPropertyPathPart = '';
			var escapeNextCharacter = false;
			var isSpecialCharacter = false;
			var insideBrackets = false;

			// Walk through the path and find backslashes that escape periods or other backslashes, and split on unescaped
			// periods and brackets.
			for (var i = 0; i < propertyPath.length; i++) {
				character = propertyPath[i];
				isSpecialCharacter = (character === '\\' || character === '[' || character === ']' || character === '.');

				if (isSpecialCharacter && !escapeNextCharacter) {
					if (insideBrackets && character !== ']') {
						throw new SyntaxError('unexpected "' + character + '" within brackets at character ' + i + ' in property path ' + propertyPath);
					}

					switch (character) {
						case '\\':
							escapeNextCharacter = true;
							break;
						case ']':
							insideBrackets = false;
							break;
						case '[':
							insideBrackets = true;
							/* falls through */
						case '.':
							parsedPropertyPath.push(parsedPropertyPathPart);
							parsedPropertyPathPart = '';
							break;
					}
				} else {
					parsedPropertyPathPart += character;
					escapeNextCharacter = false;
				}
			}

			if (parsedPropertyPath[0] === '') {
				//allow '[0]', or '.0'
				parsedPropertyPath.splice(0, 1);
			}

			// capture the final part
			parsedPropertyPath.push(parsedPropertyPathPart);
			return parsedPropertyPath;
		}
	}
};

module.exports = {
	proxyFunctions: proxyFunctions,
	methods: methods,
	humanise: humanise,
	mixins: mixins
};
