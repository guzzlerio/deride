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
var assert = require('assert');
var deride = require('../lib/deride.js');

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
