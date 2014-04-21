# compmoc [![Build Status](https://travis-ci.org/REAANDREW/compmoc.svg?branch=master)](https://travis-ci.org/REAANDREW/compmoc)

Mocking library based on composition

The inspiration for this was that my colleague was having a look at other mocking frameworks and mentioned to me that they do not work when using ```Object.freeze``` in the objects to enforce encapsulation.  This library builds on composition to create a mocking library that can work with objects which are frozen.  **It is really for the purpose of example since I am looking into using ```Object.freeze``` heavily in my current and future JavaScript develoment.** It is also developed with a very strict jshint profile, which is sometimes a challenge in itself but never the less a rewarding one.

## Getting Started
Install the module with: `npm install compmoc`

```javascript
var compmoc = require('compmoc');
```

## Documentation

### Mocking

- compmoc.wrap(obj)
- compmoc.stub(methods)

### Expectations

- ```obj```.expect.```method```.called.times(n)
- ```obj```.expect.```method```.called.never()
- ```obj```.expect.```method```.called.withArgs(args)

### Setup

- ```obj```.setup.```method```.toDoThis(func)
- ```obj```.setup.```method```.toReturn(value)
- ```obj```.setup.```method```.toThrow(message)
- ```obj```.setup.```method```.when(args).[toDoThis|toReturn|toThrow]

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

### Override the method body to change the invocation
```javascript
var bob = new Person('bob');
bob.setup.greet.toDoThis(function(otherPersonName) {
    return util.format('yo %s', otherPersonName);
});
var result = bob.greet('alice');
result.should.eql('yo alice');
```

### Override the return value for a function
```javascript
var bob = new Person('bob');
bob = compmoc.wrap(bob);
bob.setup.greet.toReturn('foobar');
var result = bob.greet('alice');
result.should.eql('foobar');
```

### Force a method invocation to throw a specific error
```javascript
var bob = new Person('bob');
bob = compmoc.wrap(bob);
bob.setup.greet.toThrow('BANG');
should(function() {
    bob.greet('alice');
}).
throw(/BANG/);
```

### Setting the return value of a function when specific arguments are used
```javascript
var bob = new Person('bob');
bob = compmoc.wrap(bob);
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
bob = compmoc.wrap(bob);
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
bob = compmoc.wrap(bob);
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

### Creating a stubbed object

Stubbing an object simply creates an anonymous object, with all the method specified and then the object is wrapped to provide all the expectation functionality of the library

```javascript
var bob = compmoc.stub(['greet']);
bob.greet('alice');
bob.expect.greet.called.times(1);
```


## Contributing
Please ensure that you run ```grunt```, have no style warnings and that all the tests are passing.

## Release History
_(Nothing yet)_

## License
Copyright (c) 2014 Andrew Rea  
Licensed under the MIT license.
