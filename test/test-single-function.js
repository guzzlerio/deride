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
var assert = require('assert');
var when = require('when');
var deride = require('../lib/deride.js');

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
