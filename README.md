# deride [![Build Status](https://travis-ci.org/REAANDREW/deride.svg?branch=master)](https://travis-ci.org/REAANDREW/deride) [![NPM version](https://badge.fury.io/js/deride.svg)](http://badge.fury.io/js/deride) [![Dependency Status](https://david-dm.org/REAANDREW/deride.svg)](https://david-dm.org/REAANDREW/deride)

[![NPM](https://nodei.co/npm/deride.png?downloadRank=true&downloads=true)](https://nodei.co/npm/deride/)

Mocking library based on composition

The inspiration for this was that my colleague was having a look at other mocking frameworks and mentioned to me that they do not work when using ```Object.freeze``` in the objects to enforce encapsulation.  This library builds on composition to create a mocking library that can work with objects which are frozen.
## Getting Started
Install the module with: `npm install deride`

```javascript
var deride = require('deride');
```

## Documentation

### Mocking

- deride.wrap(obj)

**CAUTION** Remember when you use this function about the good practice recommended in the book **Growing Object-Oriented Software, Guided by Tests**  ***Chapter 8: Only Mock Types That You Own***

- deride.stub(methods)
  - **methods** Array
- deride.stub(obj)
  - **obj** Object
- deride.func()

### Expectations

- ```obj```.expect.```method```.called.times(n)
- ```obj```.expect.```method```.called.once()
- ```obj```.expect.```method```.called.twice()
- ```obj```.expect.```method```.called.never()
- ```obj```.expect.```method```.called.withArgs(args)

### Resetting the counts / called with args
- ```obj```.expect.```method```.called.reset()

### Setup

- ```obj```.setup.```method```.toDoThis(func)
- ```obj```.setup.```method```.toReturn(value)
- ```obj```.setup.```method```.toResolveWith(value)
- ```obj```.setup.```method```.toRejectWith(value)
- ```obj```.setup.```method```.toThrow(message)
- ```obj```.setup.```method```.toCallbackWith(args)
- ```obj```.setup.```method```.toTimeWarp(milliseconds)
- ```obj```.setup.```method```.when(args).[toDoThis|toReturn|toRejectWith|toResolveWith|toThrow|toCallbackWith|toTimeWarp]

## Examples

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
bob = deride.wrap(bob);
bob.greet('alice');
bob.expect.greet.called.times(1);
```

### Has convenience methods for invocation counts
```javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.greet('alice');
bob.expect.greet.called.once();
bob.greet('sally');
bob.expect.greet.called.twice();
```

### Determine if a method has **never** been called
```javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.expect.greet.called.never();
```

### Determine if a method was called with a specific set of arguments
```javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.greet('alice');
bob.greet('bob');
bob.expect.greet.called.withArgs('bob');
```

### Override the method body to change the invocation
```javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.setup.greet.toDoThis(function(otherPersonName) {
    return util.format('yo %s', otherPersonName);
});
var result = bob.greet('alice');
result.should.eql('yo alice');
```

### Override the return value for a function
```javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.setup.greet.toReturn('foobar');
var result = bob.greet('alice');
result.should.eql('foobar');
```

### Overriding the promise resolver for a function
#### To resolve with a value
```javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.setup.greet.toResolveWith('foobar');
bob.greet('alice').then(function(result) {
    result.should.eql('foobar');
});
```

#### To reject with a value
```javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.setup.greet.toRejectWith('foobar');
bob.greet('alice').catch(function(result) {
    result.should.eql('foobar');
});
```

### Force a method invocation to throw a specific error
```javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.setup.greet.toThrow('BANG');
should(function() {
    bob.greet('alice');
}).
throw(/BANG/);
```

### Override the invocation of a callback
```javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.setup.chuckle.toCallbackWith([0, 'boom']);
bob.chuckle(function(err, message) {
    assert.equal(err, 0);
    assert.equal(message, 'boom');
});
```

### Accelerating the timeout used internally by a function
```javascript
var Person = function(name) {
    return Object.freeze({
        foobar: function(timeout, callback) {
            setTimeout(function() {
                callback('result');
            }, timeout);
        }
    });
};
var timeout = 10000;
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.setup.foobar.toTimeWarp(timeout);
bob.foobar(timeout, function(message) {
    assert.equal(message, 'result');
});
```

### Setting the return value of a function when specific arguments are used
```javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.setup.greet.when('alice').toReturn('foobar');
bob.setup.greet.toReturn('barfoo');
var result1 = bob.greet('alice');
var result2 = bob.greet('bob');
result1.should.eql('foobar');
result2.should.eql('barfoo');
```

### Overriding a method`s body when specific arguments are provided
``` javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.setup.greet.when('alice').toDoThis(function(otherPersonName) {
    return util.format('yo yo %s', otherPersonName);
});
bob.setup.greet.toDoThis(function(otherPersonName) {
    return util.format('yo %s', otherPersonName);
});
var result1 = bob.greet('alice');
var result2 = bob.greet('bob');
result1.should.eql('yo yo alice');
result2.should.eql('yo bob');
```

### Throwing an error for a method invocation when specific arguments are provided
```javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.setup.greet.when('alice').toThrow('BANG');
should(function() {
    bob.greet('alice');
}).
throw (/BANG/);
should(function() {
    bob.greet('bob');
}).not.
throw (/BANG/);
```

### Override the invocation of a callback when specific arguments are provided
```javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.setup.chuckle.toCallbackWith([0, 'boom']);
bob.setup.chuckle.when('alice').toCallbackWith([0, 'bam']);
bob.chuckle(function(err, message) {
    assert.equal(err, 0);
    assert.equal(message, 'boom');
    bob.chuckle('alice', function(err, message) {
        assert.equal(err, 0);
        assert.equal(message, 'bam');
    });
});
```

### Accelerating the timeout used internally by a function when specific arguments are provided
```javascript
var Person = function(name) {
    return Object.freeze({
        foobar: function(timeout, callback) {
            setTimeout(function() {
                callback('result');
            }, timeout);
        }
    });
};
var timeout1 = 10000;
var timeout2 = 20000;
var bob = new Person('bob');
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

```

### Creating a stubbed object
Stubbing an object simply creates an anonymous object, with all the method specified and then the object is wrapped to provide all the expectation functionality of the library

```javascript
var bob = deride.stub(['greet']);
bob.greet('alice');
bob.expect.greet.called.times(1);
```

### Creating a stubbed object based on an existing object
```javascript
var Person = {
    greet: function(name) {
        return 'alice sas hello to ' + name;
    },
};
var bob = deride.stub(Person);
bob.greet('alice');
bob.expect.greet.called.once();
```

### Creating a single mocked method
```javascript
var func = deride.func();
func.setup.toReturn(1);
var value = func(1, 2, 3);
assert.equal(value, 1);
```

### Force the emit of an event on an object
```javascript
var bob = deride.stub([]);
bob.on('message', function() {
    done();
});
bob.emit('message', 'payload');
```

## Contributing
Please ensure that you run ```grunt```, have no style warnings and that all the tests are passing.

## License
Copyright (c) 2014 Andrew Rea  
Copyright (c) 2014 James Allen

Licensed under the MIT license.
