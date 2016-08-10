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

require('should');

var _ = require('lodash');
var util = require('util');
var assert = require('assert');
var deride = require('../lib/deride.js');

describe('Properties', function() {
    var bob;
    beforeEach(function() {
        bob = deride.stub(['greet', 'chuckle', 'foobar'], [{
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
        bob.setup.greet.toReturn('hello');
    });

    it('enables properties if specified in construction', function() {
        bob.age.should.be.equal(25);
        bob.height.should.be.equal('180cm');
    });

    it('still allows function overriding', function() {
        bob.greet('sally').should.eql('hello');
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
},{
    name: 'ES6 Classes',
    setup: function(){
        var Person = class {
            constructor(name){
                this.name = name;
            }
            greet(another){
                return 'howdy from ' + this.name + ' to ' + another;
            }
            chuckle(){

            }
            foobar(timeout, callback){
                fooBarFunction(timeout, callback);
            }
        };

        return deride.wrap(new Person('bob proto'));
    }   
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

    describe(test.name + ':matchExactly', function () {
        beforeEach(function(done) {
            bob = test.setup();
            done();
        });

        it('with a primitive string', function (done) {
            bob.greet('bob');
            bob.expect.greet.called.matchExactly('bob');
            done();
        });

        it('with multiple a primitive strings', function (done) {
            bob.greet('alice', 'carol');
            bob.expect.greet.called.matchExactly('alice', 'carol');
            done();
        });

        it('with mixed strings, arrays and numbers', function (done) {
            bob.greet('alice', ['carol'], 123);
            bob.expect.greet.called.matchExactly('alice', ['carol'], 123);
            done();
        });

        it('with mixture of primitives and objects', function () {
            bob.greet('alice', ['carol'], 123, {
                name: 'bob',
                a: 1
            }, 'sam');
            bob.expect.greet.called.matchExactly('alice', ['carol'], 123, {
                name: 'bob',
                a: 1
            }, 'sam');
        });

        it('with a frozen object', function () {
            bob.greet(Object.freeze({
                name: 'bob',
                a: 1
            }), 'sam');
            bob.expect.greet.called.matchExactly(Object.freeze({
                name: 'bob',
                a: 1
            }), 'sam');
        });

        it('with same instance', function () {
            var Obj = function() {
                return {
                    times: function (arg) {
                        return arg;
                    }
                };
            };
            var o = new Obj();
            bob.greet(o);
            bob.expect.greet.called.matchExactly(o);
        });

        it('with a function', function () {
            var func = function() {
                return 12345;
            };
            bob.greet(func);
            bob.expect.greet.called.matchExactly(func);
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

        it('enables resolving a promise', function() {
            bob.greet('alice').should.be.fulfilledWith('foobar');
        });

        it('enables rejecting a promise', function() {
            bob.greet('norman').should.be.rejectedWith('foobar');
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

        var lteTests = [{
            method: 'lt',
            pass: 4,
            fail: 1,
            message: 'less than'
        }, {
            method: 'lte',
            pass: 3,
            fail: 2,
            message: 'less than or equal to'
        }, {
            method: 'gt',
            pass: 2,
            fail: 4,
            message: 'greater than'
        }, {
            method: 'gte',
            pass: 3,
            fail: 4,
            message: 'greater than or equal to'
        }];
        describe('counting invocations with lt, lte, gt and gte methods', function() {
            _.each(lteTests, function(test) {
                describe('using the ' + test.method + ' method', function() {
                    beforeEach(function() {
                        bob.greet('alice');
                        bob.greet('alice');
                        bob.greet('alice');
                    });

                    it('enables counting invocations', function() {
                        bob.expect.greet.called[test.method](test.pass);
                    });

                    it('gives meaningful error when assertion fails', function() {
                        var regex = new RegExp('Expected greet to be called ' + test.message + ' .* but was');
                        assert.throws(function() {
                            bob.expect.greet.called[test.method](test.fail);
                        }, regex);
                    });

                    it('allows custom error message when fails', function() {
                        assert.throws(function() {
                            bob.expect.greet.called[test.method](test.fail, 'Talulas on the beach');
                        }, /Talulas on the beach/);
                    });
                });
            });
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
                err.should.eql(0);
                message.should.eql('boom');
                done();
            });
        });

        it('enables specifying the arguments as an array of a callback and invoking it', function(done) {
            bob.setup.chuckle.toCallbackWith([0, 'boom']);
            bob.chuckle(function(err, message) {
                err.should.eql(0);
                message.should.eql('boom');
                done();
            });
        });

        it('enables specifying the arguments of a callback and invoking it when specific arguments are provided', function(done) {
            bob.setup.chuckle.toCallbackWith([0, 'boom']);
            bob.setup.chuckle.when('alice').toCallbackWith([0, 'bam']);
            bob.chuckle(function(err, message) {
                err.should.eql(0);
                message.should.eql('boom');
                bob.chuckle('alice', function(err, message) {
                    err.should.eql(0);
                    message.should.eql('bam');
                    done();
                });
            });
        });

        describe('providing a predicate to when', function() {
            describe('with a single argument', function() {
                function resourceMatchingPredicate(msg) {
                    try {
                        var content = JSON.parse(msg.content.toString());
                        return content.resource === 'talula';
                    } catch (e) {
                        return false;
                    }
                }

                beforeEach(function() {
                    bob.setup.chuckle.toReturn('chuckling');
                    bob.setup.chuckle.when(resourceMatchingPredicate).toReturn('chuckle talula');
                    bob.setup.chuckle.when('alice').toReturn('chuckle alice');
                });

                it('non matching predicate returns existing response', function() {
                    var nonMatchingMsg = {
                        //...
                        //other properties that we do not know until runtime
                        //...
                        content: new Buffer(JSON.stringify({
                            resource: 'non-matching'
                        }))
                    };
                    bob.chuckle(nonMatchingMsg).should.eql('chuckling');
                });

                it('matching predicate returns overriden response', function() {
                    var matchingMsg = {
                        //...
                        //other properties that we do not know until runtime
                        //...
                        content: new Buffer(JSON.stringify({
                            resource: 'talula'
                        }))
                    };
                    bob.chuckle(matchingMsg).should.eql('chuckle talula');
                });

                it('still allows non-function predicates', function() {
                    bob.chuckle('alice').should.eql('chuckle alice');
                });
            });

            describe('with multiple arguments', function() {
                function resourceMatchingPredicate(arg1, arg2, arg3) {
                    return arg1 === 4 && arg2 === 5 && arg3 === 6;
                }

                beforeEach(function() {
                    bob.setup.chuckle.toReturn('chuckling');
                    bob.setup.chuckle.when(resourceMatchingPredicate).toReturn('chuckle talula');
                    bob.setup.chuckle.when('alice').toReturn('chuckle alice');
                });

                it('non matching predicate returns existing response', function() {
                    bob.chuckle(1, 2, 3).should.eql('chuckling');
                });

                it('matching predicate returns overriden response', function() {
                    bob.chuckle(4, 5, 6).should.eql('chuckle talula');
                });

                it('still allows non-function predicates', function() {
                    bob.chuckle('alice').should.eql('chuckle alice');
                });
            });

            describe('with null argument', function() {
                function resourceMatchingPredicate(arg1) {
                    return arg1 === null;
                }

                beforeEach(function() {
                    bob.setup.chuckle.toReturn('chuckling');
                    bob.setup.chuckle.when(resourceMatchingPredicate).toReturn('chuckle talula');
                    bob.setup.chuckle.when('alice').toReturn('chuckle alice');
                });

                it('non matching predicate returns existing response', function() {
                    bob.chuckle(1).should.eql('chuckling');
                });

                it('matching predicate returns overriden response', function() {
                    bob.chuckle(null).should.eql('chuckle talula');
                });

                it('still allows non-function predicates', function() {
                    bob.chuckle('alice').should.eql('chuckle alice');
                });
            });
        });
    });
});