'use strict';

var compmoc = require('../lib/compmoc.js');


describe('Wrapping existing object with expectations', function() {

    var Person = function(name) {
        return Object.freeze({
            greet: function() {
                console.log(name, 'says hello');
            }
        });
    }

    it('enables counting the number of invocations of a method', function(done) {
        var bob = new Person('bob');
        bob = compmoc.wrap(bob);
        bob.greet();
        bob.expect.greet.called.times(1);
        done();
    });

});
