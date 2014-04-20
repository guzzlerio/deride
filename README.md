# compmoc [![Build Status](https://secure.travis-ci.org/area/compmoc.png?branch=master)](http://travis-ci.org/area/compmoc)

Mocking library based on composition

The inspiration for this was that my colleague was having a look at sinon and mentioned to me that it would not work when using ```Object.freeze``` in the objects to enforce encapsulation.  This library builds on composition to create a mocking library that can work with objects which are frozen.

## Getting Started
Install the module with: `npm install compmoc`

```javascript
var compmoc = require('compmoc');
```

### The context
```javascript
var Person = function(name) {
    return Object.freeze({
        greet: function(otherPersonName) {
            console.log(name, 'says hello to', otherPersonName);
        }
    });
}
```

### Count the number of invocations of a method
```javascript
var bob = new Person('bob');
bob = compmoc.wrap(bob);
bob.greet('alice');
bob.expect.greet.called.times(1);
```

### Determine if a method has **never** been called
```javascript
var bob = new Person('bob');
bob = compmoc.wrap(bob);
bob.expect.greet.called.never();
```

### Determine if a method was called with a specific set of arguments
```javascript
var bob = new Person('bob');
bob = compmoc.wrap(bob);
bob.greet('alice');
bob.greet('bob');
bob.expect.greet.called.withArgs('bob');
```

## Documentation
_(Coming soon)_

## Examples
_(Coming soon)_

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
_(Nothing yet)_

## License
Copyright (c) 2014 Andrew Rea  
Licensed under the MIT license.
