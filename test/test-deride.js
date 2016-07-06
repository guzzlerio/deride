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
var when = require('when');
var deride = require('../lib/deride.js');
var utils = require('../lib/utils');

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

    it('finds es6 class methods', function(){
        let Something = class {
            greet(){
                return 'Hello';
            }
            depart(){

            }
        };

        utils.methods(new Something()).should.eql(['greet', 'depart']);
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
    var bob;
    beforeEach(function () {
        bob = deride.stub(['greet']);
        bob.setup.greet.toReturn('talula');
    });

    it('does not invoke original method when override method body', function() {
        bob.setup.greet.toThrow('bang');

        bob = deride.wrap(bob);
        bob.setup.greet.toDoThis(function() {
            return 'hello';
        });
        var result = bob.greet();
        assert.equal(result, 'hello');
    });

    it('ignores the order of an object properties when comparing equality', function(done) {
        bob.greet({
            c: 3,
            b: 2,
            a: 1
        });
        bob.expect.greet.called.withArgs({
            a: 1,
            b: 2,
            c: 3
        });
        done();
    });

    it('throws exception when object not called withArgs', function(done) {
        bob.greet('1', '2', '3');
        assert.throws(function() {
            bob.expect.greet.called.withArgs('4');
        }, Error);
        done();
    });

    describe('withArg called with an array', function () {
        _.forEach([{
            name: 'string', input: 'talula', expectPass: false
        }, {
            name: 'non match array', input: ['d', 'e'], expectPass: false
        }, {
            name: 'partial match array', input: ['a', 'd'], expectPass: false
        }, {
            name: 'match but wrong order', input: ['b', 'a'], expectPass: false
        }, {
            name: 'match', input: ['a', 'b'], expectPass: true
        }], function (test) {
            if (test.expectPass) {
                it('object called with ' + test.name + ' should pass', function() {
                    bob.greet(test.input);
                    bob.expect.greet.called.withArg(['a', 'b']);
                });
            } else {
                it('object called with ' + test.name + ' should fail', function() {
                    bob.greet(test.input);
                    assert.throws(function() {
                        bob.expect.greet.called.withArg(['a', 'b']);
                    }, Error);
                });
            }
        });
    });

    it('handles withArg called with object', function () {
        bob.greet(new Error('booom'));
        bob.expect.greet.called.withArgs(new Error('booom'));
    });

    it('handles comparison of withArgs when an argument is a function', function() {
        bob.greet({
            a: 1
        }, function() {});
        bob.expect.greet.called.withArgs({
            a: 1
        });
    });

    it('allows matching call args with regex', function() {
        bob.greet('The inspiration for this was that my colleague was having a');
        bob.greet({
            a: 123,
            b: 'talula'
        }, 123, 'something');

        bob.expect.greet.called.withMatch(/^The inspiration for this was/);
    });

    it('allows matching call args with regex', function() {
        bob.greet('The inspiration for this was that my colleague was having a');

        (function() {
            bob.expect.greet.called.withMatch(/^talula/);
        }).should.throw('Expected greet to be called matching: /^talula/');
    });

    it('allows matching call args with regex in objects', function() {
        bob.greet('The inspiration for this was that my colleague was having a');
        bob.greet({
            a: 123,
            b: 'talula'
        }, 123, 'something');

        bob.expect.greet.called.withMatch(/^talula/gi);
    });

    it('allows matching call args with regex in deep objects', function() {
        bob.greet('The inspiration for this was that my colleague was having a');
        bob.greet({
            a: 123,
            b: { a: 'talula' }
        }, 123, 'something');

        bob.expect.greet.called.withMatch(/^talula/gi);
    });

    describe('matchExactly causes failures', function () {

        it('with mixed strings, arrays and numbers', function () {
            bob.greet('alice', ['carol'], 123);
            (function () {
                bob.expect.greet.called.matchExactly('not-alice', ['or-carol'], 987);
            }).should.throw('Expected greet to be called matchExactly args[ \'not-alice\', [ \'or-carol\' ], 987 ]');
        });

        it('with mixture of primitives and objects', function () {
            bob.greet('alice', ['carol'], 123, {
                name: 'bob',
                a: 1
            }, 'sam');
            (function () {
                bob.expect.greet.called.matchExactly('alice', ['carol'], 123, {
                    name: 'not-bob',
                    a: 1
                }, 'not-sam');
            }).should.throw('Expected greet to be called matchExactly args[ \'alice\', [ \'carol\' ], 123, { name: \'not-bob\', a: 1 }, \'not-sam\' ]');
        });

        describe('should not allow mutation after expectation is defined', function () {
            var bob, objectToMutate;
            
            beforeEach(function () {
                bob = deride.stub(['greet']);
                objectToMutate = {
                    test: 'abc'
                };
            });

            describe('with promises', function () {
                beforeEach(function () {
                    bob.setup.greet.toResolve();
                });

                beforeEach(function sampleInvocationWhichMutatesObject(done) {
                    bob.greet(objectToMutate)
                        .then(function () {
                            objectToMutate.test = '123';
                            done();
                        });
                });

                it('should expect original and not mutated object', function () {
                    bob.expect.greet.called.matchExactly({
                        test: 'abc'
                    });
                });
            });
        });

    });
});

describe('Single function', function() {
    var MyClass;
    beforeEach(function () {
        MyClass = function() {
            return {
                aValue: 1,
                doStuff: function() {},
                echo: function(name) {
                    return name;
                }
            };
        };
    });

    it('Resetting the called count', function(done) {
        var myClass = deride.wrap(new MyClass());
        myClass.doStuff();
        myClass.expect.doStuff.called.once();
        myClass.expect.doStuff.called.reset();
        myClass.expect.doStuff.called.never();
        done();
    });

    it('Resetting the called with count', function(done) {
        var myClass = deride.wrap(new MyClass());
        myClass.doStuff('test');
        myClass.expect.doStuff.called.withArgs('test');
        myClass.expect.doStuff.called.reset();
        (function() {
            myClass.expect.doStuff.called.withArgs('test');
        }).should.throw('Expected doStuff to be called with: test');
        done();
    });

    it('Resetting the called count on all methods', function(done) {
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

    describe('wrapping an existing function', function (){
        var f;
        beforeEach(function () {
            f = function (name) {
                return 'hello ' + name;
            };
        });

        it('can wrap an existing function', function () {
            var func = deride.func(f);
            assert(func('bob'), 'hello bob');
            func.expect.called.withArg('bob');
        });

        it('can wrap a promised function', function (done) {
            var func = deride.func(when.lift(f));
            func('bob').then(function(result){
                assert(result, 'hello bob');
                func.expect.called.withArg('bob');
            }).finally(done);
        });
    });

    it('can setup an intercept on promises', function (done) {
        var promise = require('when');
        var Obj = function() {
            return {
                times: function (arg) {
                    return promise.resolve(arg * 2);
                }
            };
        };
        var beforeCalledWith;

        var a = deride.wrap(new Obj());
        a.setup.times.toIntercept(function (value) {
            beforeCalledWith = value;
        });
        a.times(2).then(function (result) {
            result.should.eql(4);
            beforeCalledWith.should.eql(2);
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
