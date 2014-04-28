/*
     Copyright (c) 2014 Andrew Rea
     Copyright (c) 2014 James Allen

     Permission is hereby granted, free of charge, to any person
     obtaining a copy of this software and associated documentation
     files (the "Software"), to deal in the Software without
     restriction, including without limitation the rights to use,
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
var _ = require('lodash');
var util = require('util');
var assert = require('assert');

describe('Excpectations', function() {
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
});


describe('Eventing', function() {
    it('should allow the force of an emit', function(done) {
        var bob = deride.stub([]);
        bob = deride.wrap(bob);
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
    name: 'Wrapping existing objects with Object style methods',
    setup: function() {
        var Person = {
            greet: function(name) {
                return 'alice sas hello to ' + name;
            },
            chuckle: function() {},
            foobar: fooBarFunction
        };
        return Person;
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
        return new Person('bob');
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

        return new Person('bob proto');
    }
}];

_.forEach(tests, function(test) {
    describe(test.name, function() {
        var bob;

        beforeEach(function(done) {
            bob = test.setup();
            done();
        });

        it('enables counting the number of invocations of a method', function(done) {
            bob = deride.wrap(bob);
            bob.greet('alice');
            bob.expect.greet.called.times(1);
            done();
        });

        it('can return a bespoke error when counting number of invocations', function(done) {
            bob = deride.wrap(bob);
            assert.throws(function() {
               bob.expect.greet.called.times(1, 'This is a bespoke error');
            }, /This is a bespoke error/);
            done();
        });

        it('enables convenience method for called.once', function(done) {
            bob = deride.wrap(bob);
            bob.greet('alice');
            bob.expect.greet.called.once();
            done();
        });

        it('can return a bespoke error for called once', function(done) {
            bob = deride.wrap(bob);
            assert.throws(function() {
               bob.expect.greet.called.once('This is a bespoke error');
            }, /This is a bespoke error/);
            done();
        });

        it('enables convenience method for called.twice', function(done) {
            bob = deride.wrap(bob);
            bob.greet('alice');
            bob.greet('sally');
            bob.expect.greet.called.twice();
            done();
        });

        it('can return a bespoke error for called twice', function(done) {
            bob = deride.wrap(bob);
            assert.throws(function() {
               bob.expect.greet.called.twice('This is a bespoke error');
            }, /This is a bespoke error/);
            done();
        });

        it('enables the determination that a method has NEVER been called', function(done) {
            bob = deride.wrap(bob);
            bob.expect.greet.called.never();
            done();
        });

        it('enables the determination of the args used to invoke the method', function(done) {
            bob = deride.wrap(bob);
            bob.greet('alice');
            bob.greet('bob');
            bob.expect.greet.called.withArgs('bob');
            done();
        });

        it('enables overriding a methods body', function(done) {
            bob = deride.wrap(bob);
            bob.setup.greet.toDoThis(function(otherPersonName) {
                return util.format('yo %s', otherPersonName);
            });
            var result = bob.greet('alice');
            assert.equal(result, 'yo alice');
            done();
        });

        it('enables setting the return value of a function', function(done) {
            bob = deride.wrap(bob);
            bob.setup.greet.toReturn('foobar');
            var result = bob.greet('alice');
            assert.equal(result, 'foobar');
            done();
        });

        it('enables throwing an exception for a method invocation', function(done) {
            bob = deride.wrap(bob);
            bob.setup.greet.toThrow('BANG');
            assert.throws(function() {
                bob.greet('alice');
            }, /BANG/);
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

        it('enables overriding a methods body when specific arguments are provided', function(done) {
            bob = deride.wrap(bob);
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
            bob = deride.wrap(bob);
            bob.setup.greet.when('alice').toReturn('foobar');
            bob.setup.greet.toReturn('barfoo');
            var result1 = bob.greet('alice');
            var result2 = bob.greet('bob');
            assert.equal(result1, 'foobar');
            assert.equal(result2, 'barfoo');
            done();
        });

        it('enables throwing an exception for a method invocation when specific arguments are provided', function(done) {

            bob = deride.wrap(bob);
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
            bob = deride.wrap(bob);
            bob.setup.chuckle.toCallbackWith([0, 'boom']);
            bob.chuckle(function(err, message) {
                assert.equal(err, 0);
                assert.equal(message, 'boom');
                done();
            });
        });

        it('enables specifying the arguments of a callback and invoking it when specific arguments are provided', function(done) {

            bob = deride.wrap(bob);
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

        it('enables accelerating timeouts for functions when specific arguments are provided', function(done) {
            var timeout1 = 10000;
            var timeout2 = 20000;
            bob = deride.wrap(bob);
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
});
