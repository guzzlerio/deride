/*
Copyright (c) 2014 Andrew Rea
Copyright (c) 2014 James Allen

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,30
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
 */

'use strict';

var deride = require('../lib/deride.js');
var utils = require('../lib/utils');
var _ = require('lodash');
var util = require('util');
var assert = require('assert');
require('should');

describe('utils', function() {
	it('finds object style methods', function() {
		var obj = {
			greet: function() {},
			depart: function() {}
		};
		utils.methods(obj).should.eql(['greet', 'depart']);
	});

	it('finds protoype style methods', function() {
		function Obj() {}
		Obj.prototype.greet = function() {};
		Obj.prototype.depart = function() {};
		utils.methods(new Obj()).should.eql(['greet', 'depart']);
	});

	it('finds methods attached to functions', function() {
		function obj() {}
		obj.greet = function() {};
		obj.depart = function() {};
		utils.methods(obj).should.eql(['greet', 'depart']);
	});

	describe('converts number to correct times text', function() {
		var testCases = [{
			name: 'once',
			value: 1,
		}, {
			name: 'twice',
			value: 2,
		}, {
			name: '3 times',
			value: 3,
		}, {
			name: '10 times',
			value: 10,
		}];

		_.each(testCases, function(test) {
			it('returns ' + test.name, function() {
				utils.humanise(test.value).should.eql(test.name);
			});
		});
	});

});

describe('Expectations', function() {
	it('does not invoke original method when override method body', function() {
		var obj = deride.stub(['send']);
		obj.setup.send.toThrow('bang');

		obj = deride.wrap(obj);
		obj.setup.send.toDoThis(function() {
			return 'hello';
		});
		var result = obj.send();
		assert.equal(result, 'hello');
	});

	it('ignores the order of an object properties when comparing equality', function(done) {
		var obj = deride.stub(['send']);
		obj.send({
			c: 3,
			b: 2,
			a: 1
		});
		obj.expect.send.called.withArgs({
			a: 1,
			b: 2,
			c: 3
		});
		done();
	});

	it('throws exception when object not called withArgs', function(done) {
		var obj = deride.stub(['send']);
		obj.send('1', '2', '3');
		assert.throws(function() {
			obj.expect.send.called.withArgs('4');
		}, Error);
		done();
	});

	it('handles comparison of withArgs when an argument is a function', function(done) {
		var obj = deride.stub(['send']);
		obj.send({
			a: 1
		}, function() {});
		obj.expect.send.called.withArgs({
			a: 1
		});
		done();
	});
});

describe('Single function', function() {
	it('Resetting the called count', function(done) {
		var MyClass = function() {
			return {
				doStuff: function() {}
			};
		};
		var myClass = deride.wrap(new MyClass());
		myClass.doStuff();
		myClass.expect.doStuff.called.once();
		myClass.expect.doStuff.called.reset();
		myClass.expect.doStuff.called.never();
		done();
	});

	it('Resetting the called with count', function(done) {
		var MyClass = function() {
			return {
				doStuff: function() {}
			};
		};
		var myClass = deride.wrap(new MyClass());
		myClass.doStuff('test');
		myClass.expect.doStuff.called.withArgs('test');
		myClass.expect.doStuff.called.reset();
		/* jshint immed: false */
		(function() {
			myClass.expect.doStuff.called.withArgs('test');
		}).should.throw('Expected doStuff to be called with: test');
		done();
	});

	it('Resetting the called count on all methods', function(done) {
		var MyClass = function() {
			return {
				doStuff: function() {},
				echo: function(name) {
					return name;
				}
			};
		};
		var myClass = deride.wrap(new MyClass());
		myClass.doStuff('test1');
		myClass.echo('echo1');

		myClass.expect.doStuff.called.once();
		myClass.expect.echo.called.once();
		myClass.called.reset();

		myClass.expect.doStuff.called.never();
		myClass.expect.echo.called.never();

		done();
	});

	it('Wrapping a class does not remove non-functions', function() {
		var MyClass = function() {
			return {
				aValue: 1,
				doStuff: function() {}
			};
		};
		var myClass = deride.wrap(new MyClass());
		myClass.should.have.property('aValue');
	});

	it('can setup a return value', function(done) {
		var func = deride.func();
		func.setup.toReturn(1);
		var value = func(1, 2, 3);
		assert.equal(value, 1);
		done();
	});

	it('can setup to invoke a callback', function(done) {
		var func = deride.func();
		func.setup.toCallbackWith(['hello', 'world']);
		func(function(arg1, arg2) {
			assert.equal(arg1, 'hello');
			assert.equal(arg2, 'world');
			done();
		});
	});
});


describe('Eventing', function() {
	it('should allow the force of an emit', function(done) {
		var bob = deride.stub([]);
		bob.on('message', function() {
			done();
		});
		bob.emit('message', 'payload');
	});
});

var fooBarFunction = function(timeout, callback) {
	setTimeout(function() {
		callback('result');
	}, timeout);
};

var tests = [{
	name: 'Creating a stub object',
	setup: function() {
		var stub = deride.stub(['greet', 'chuckle', 'foobar']);
		stub.setup.foobar.toDoThis(fooBarFunction);

		return stub;
	}
}, {
	name: 'Creating a stub object from an object with Object style methods',
	setup: function() {

		var Person = {
			greet: function(name) {
				return 'alice sas hello to ' + name;
			},
			chuckle: function() {},
			foobar: fooBarFunction
		};
		var stub = deride.stub(Person);
		stub.setup.foobar.toDoThis(fooBarFunction);
		return stub;
	}
}, {
	name: 'Wrapping existing objects with Object style methods',
	setup: function() {
		var Person = {
			greet: function(name) {
				return 'alice sas hello to ' + name;
			},
			chuckle: function() {},
			foobar: fooBarFunction
		};
		return deride.wrap(Person);
	}
}, {
	name: 'Wrapping existing object using Object Freeze with expectations',
	setup: function() {

		var Person = function(name) {
			return Object.freeze({
				greet: function(otherPersonName) {
					return util.format('%s says hello to %s', name, otherPersonName);
				},
				chuckle: function() {},
				foobar: fooBarFunction
			});
		};
		return deride.wrap(new Person('bob'));
	}
}, {
	name: 'wrapping existing objects using prototype style with expectations',
	setup: function() {

		function Person(name) {
			this.name = name;
		}

		Person.prototype.greet = function(another) {
			return 'howdy from ' + this.name + ' to ' + another;
		};

		Person.prototype.chuckle = function() {};
		Person.prototype.foobar = fooBarFunction;

		return deride.wrap(new Person('bob proto'));
	}
}, {
	name: ' Creating a stub object with methods and has properties',
	setup: function() {
		var stub = deride.stub(['greet', 'chuckle', 'foobar'], [{
			name: 'age',
			options: {
				value: 25,
				enumerable: true
			}
		}, {
			name: 'height',
			options: {
				value: '180cm',
				enumerable: true
			}
		}]);
		stub.setup.foobar.toDoThis(fooBarFunction);

		return stub;
	},
	hasProperties: true
}];

_.forEach(tests, function(test) {
	var bob;

	describe(test.name + ':withArg', function() {
		beforeEach(function(done) {
			bob = test.setup();
			done();
		});

		it('enables the determination of the single arg used when the arg is a primitive object', function() {
			bob.greet('alice', {
				name: 'bob',
				a: 1
			}, 'sam');
			bob.expect.greet.called.withArg('sam');
		});

		it('enables the determination of the single arg used when the arg is not a primitive object', function(done) {
			bob.greet('alice', {
				name: 'bob',
				a: 1
			});
			bob.expect.greet.called.withArg({
				name: 'bob'
			});
			done();
		});

		it('enables the determination of single arg used to invoke the method', function(done) {
			bob.greet('bob');
			bob.greet('alice', 'carol');
			bob.expect.greet.called.withArg('bob');
			bob.expect.greet.called.withArg('alice');
			bob.expect.greet.called.withArg('carol');
			done();
		});

		it('the determination of single arg NOT used to invoke the method', function(done) {
			bob.greet('bob');
			bob.greet('alice', 'carol');
			bob.expect.greet.called.not.withArg('talula');
			done();
		});
	});

	describe(test.name + ':invocation', function() {
		beforeEach(function(done) {
			bob = test.setup();
			done();
		});

		it('enables access to all the method invocations', function(done) {
			bob.greet('jack', 'alice');
			bob.greet('bob');
			bob.expect.greet.invocation(0).withArg('alice');
			bob.expect.greet.invocation(1).withArg('bob');
			done();
		});

		it('throws an exception for an invocation requested which is out of range', function(done) {
			bob.greet('alice');
			bob.greet('bob');
			(function() {
				bob.expect.greet.invocation(2).withArg('alice');
			}).should.throw('invocation out of range');
			done();
		});
	});

	describe(test.name + ':eventing', function() {
		beforeEach(function(done) {
			bob = test.setup();
			done();
		});

		it('enables emitting an event on method invocation', function(done) {
			bob.setup.greet.toEmit('testing');
			bob.on('testing', function() {
				done();
			});
			bob.greet('bob');
		});

		it('enables emitting an event with args on method invocation', function(done) {
			bob.setup.greet.toEmit('testing', 'arg1', {
				a: 1
			});
			bob.on('testing', function(a1, a2) {
				a1.should.eql('arg1');
				a2.should.eql({
					a: 1
				});
				done();
			});
			bob.greet('bob');
		});
	});

	describe(test.name + ':accelerating time', function() {
		beforeEach(function(done) {
			bob = test.setup();
			done();
		});

		it('enables accelerating timeouts for functions', function(done) {
			var timeout = 10000;
			bob = deride.wrap(bob);
			bob.setup.foobar.toTimeWarp(timeout);
			bob.foobar(timeout, function(message) {
				assert.equal(message, 'result');
				done();
			});
		});

		it('enables accelerating timeouts for functions when specific arguments are provided', function(done) {
			bob = deride.wrap(bob);
			var timeout1 = 10000;
			var timeout2 = 20000;
			bob.setup.foobar.toTimeWarp(timeout1);
			bob.setup.foobar.when(timeout2).toTimeWarp(timeout2);
			bob.foobar(timeout1, function(message) {
				assert.equal(message, 'result');
				bob.foobar(timeout2, function(message) {
					assert.equal(message, 'result');
					done();
				});
			});
		});
	});

	describe(test.name + ':with promises', function() {
		beforeEach(function() {
			bob = test.setup();
			bob.setup.greet.when('alice').toResolveWith('foobar');
			bob.setup.greet.when('norman').toRejectWith(new Error('foobar'));
		});

		it('enables resolving a promise', function(done) {
			bob.greet('alice').then(function(result) {
				assert.equal(result, 'foobar');
				done();
			});
		});

		it('enables rejecting a promise', function(done) {
			bob.greet('norman')
				.then(function() {
					done('should not have resolved');
				})
				.catch(function(result) {
					assert.equal(result.message, 'foobar');
					done();
				});
		});
	});

	describe(test.name + ':callbackWith', function() {
		beforeEach(function(done) {
			bob = test.setup();
			done();
		});

		it('can find the callback', function(done) {
			bob.setup.greet.toCallbackWith([null, 'hello']);
			bob.greet('joe', function(err, msg) {
				msg.should.eql('hello');
				done();
			});
		});

		describe('when multiple args are functions', function() {
			it('can find the callback', function(done) {
				bob.setup.greet.toCallbackWith([null, 'hello']);
				bob.greet('joe', function() {
					done('this is not the callback');
				}, function(err, msg) {
					msg.should.eql('hello');
					done();
				});
			});
		});
	});

	describe(test.name, function() {
		beforeEach(function(done) {
			bob = test.setup();
			done();
		});

		it('enables counting the number of invocations of a method', function(done) {
			bob.greet('alice');
			bob.expect.greet.called.times(1);
			done();
		});

		it('enables counting the negation of the number of invocations of a method', function(done) {
			bob.greet('alice');
			bob.expect.greet.called.not.times(2);
			done();
		});

		it('enables counting the negation of the number of invocations of a method - should fail', function(done) {
			bob.greet('alice');
			assert.throws(function() {
				bob.expect.greet.called.not.times(1);
			}, /AssertionError/);
			done();
		});

		it('can return a bespoke error when counting number of invocations', function(done) {
			assert.throws(function() {
				bob.expect.greet.called.times(1, 'This is a bespoke error');
			}, /This is a bespoke error/);
			done();
		});

		it('enables convenience method for called.once', function(done) {
			bob.greet('alice');
			bob.expect.greet.called.once();
			done();
		});

		it('can return a bespoke error for called once', function(done) {
			assert.throws(function() {
				bob.expect.greet.called.once('This is a bespoke error');
			}, /This is a bespoke error/);
			done();
		});

		it('enables convenience method for called.twice', function(done) {
			bob.greet('alice');
			bob.greet('sally');
			bob.expect.greet.called.twice();
			done();
		});

		it('can return a bespoke error for called twice', function(done) {
			assert.throws(function() {
				bob.expect.greet.called.twice('This is a bespoke error');
			}, /This is a bespoke error/);
			done();
		});

		it('enables the determination that a method has NEVER been called', function(done) {
			bob.expect.greet.called.never();
			done();
		});

		it('can return a bespoke error for called NEVER', function(done) {
			bob.greet('alice');
			assert.throws(function() {
				bob.expect.greet.called.never('This is a bespoke error');
			}, /This is a bespoke error/);
			done();
		});

		it('enables the determination of the args used to invoke the method', function(done) {
			bob.greet('bob');
			bob.greet('alice', 'carol');
			bob.expect.greet.called.withArgs('bob');
			done();
		});

		it('enables overriding a methods body', function(done) {
			bob.setup.greet.toDoThis(function(otherPersonName) {
				return util.format('yo %s', otherPersonName);
			});
			var result = bob.greet('alice');
			assert.equal(result, 'yo alice');
			done();
		});

		it('enables setting the return value of a function', function(done) {
			bob.setup.greet.toReturn('foobar');
			var result = bob.greet('alice');
			assert.equal(result, 'foobar');
			done();
		});

		it('enables throwing an exception for a method invocation', function(done) {
			bob.setup.greet.toThrow('BANG');
			assert.throws(function() {
				bob.greet('alice');
			}, /BANG/);
			done();
		});

		it('enables overriding a methods body when specific arguments are provided', function(done) {
			bob.setup.greet.when('alice').toDoThis(function(otherPersonName) {
				return util.format('yo yo %s', otherPersonName);
			});
			bob.setup.greet.toDoThis(function(otherPersonName) {
				return util.format('yo %s', otherPersonName);
			});
			var result1 = bob.greet('alice');
			var result2 = bob.greet('bob');
			assert.equal(result1, 'yo yo alice');
			assert.equal(result2, 'yo bob');
			done();
		});

		it('enables setting the return value of a function when specific arguments are provided', function(done) {
			bob.setup.greet.when('alice').toReturn('foobar');
			bob.setup.greet.toReturn('barfoo');
			var result1 = bob.greet('alice');
			var result2 = bob.greet('bob');
			assert.equal(result1, 'foobar');
			assert.equal(result2, 'barfoo');
			done();
		});

		it('enables throwing an exception for a method invocation when specific arguments are provided', function(done) {
			bob.setup.greet.when('alice').toThrow('BANG');
			assert.throws(function() {
				bob.greet('alice');
			}, /BANG/);
			assert.doesNotThrow(function() {
				bob.greet('bob');
			}, /BANG/);
			done();
		});

		it('enables specifying the arguments of a callback and invoking it', function(done) {
			bob.setup.chuckle.toCallbackWith(0, 'boom');
			bob.chuckle(function(err, message) {
				assert.equal(err, 0);
				assert.equal(message, 'boom');
				done();
			});
		});

		it('enables specifying the arguments as an array of a callback and invoking it', function(done) {
			bob.setup.chuckle.toCallbackWith([0, 'boom']);
			bob.chuckle(function(err, message) {
				assert.equal(err, 0);
				assert.equal(message, 'boom');
				done();
			});
		});

		it('enables specifying the arguments of a callback and invoking it when specific arguments are provided', function(done) {
			bob.setup.chuckle.toCallbackWith([0, 'boom']);
			bob.setup.chuckle.when('alice').toCallbackWith([0, 'bam']);
			bob.chuckle(function(err, message) {
				assert.equal(err, 0);
				assert.equal(message, 'boom');
				bob.chuckle('alice', function(err, message) {
					assert.equal(err, 0);
					assert.equal(message, 'bam');
					done();
				});
			});
		});

		if (test.hasProperties) {
			it('enables properties if specified in construction', function() {
				(bob.age).should.be.equal(25);
				(bob.height).should.be.equal('180cm');
			});
		}
	});
});
