'use strict';

var compmoc = require('../lib/compmoc.js');
var util = require('util');

describe('Creating a stub object', function() {

    var bob = compmoc.stub(['greet']);

    assertions(bob);
});


describe('Wrapping existing object with expectations', function() {

    var Person = function(name) {
        return Object.freeze({
            greet: function(otherPersonName) {
                return util.format('%s says hello to %s', name, otherPersonName);
            }
        });
    };

    assertions(new Person('non'));
});

function assertions(bob) {
    it('enables counting the number of invocations of a method', function(done) {
        bob = compmoc.wrap(bob);
        bob.greet('alice');
        bob.expect.greet.called.times(1);
        done();
    });

    it('enables the determination that a method has NEVER been called', function(done) {
        bob = compmoc.wrap(bob);
        bob.expect.greet.called.never();
        done();
    });

    it('enables the determination of the args used to invoke the method', function(done) {
        bob = compmoc.wrap(bob);
        bob.greet('alice');
        bob.greet('bob');
        bob.expect.greet.called.withArgs('bob');
        done();
    });

    it('enables overriding a methods body', function(done) {
        bob = compmoc.wrap(bob);
        bob.expect.greet.toDoThis(function(otherPersonName) {
           return util.format('yo %s', otherPersonName);
        });
        var result = bob.greet('alice');
        result.should.eql('yo alice');
        done();
    });
}
