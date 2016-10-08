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
