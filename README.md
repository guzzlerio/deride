# deride [![Build Status](https://travis-ci.org/guzzlerio/deride.svg?branch=master)](https://travis-ci.org/guzzlerio/deride) [![NPM version](https://badge.fury.io/js/deride.svg)](http://badge.fury.io/js/deride) [![Dependency Status](https://david-dm.org/guzzlerio/deride.svg)](https://david-dm.org/guzzlerio/deride) [![Stories in Ready](https://badge.waffle.io/guzzlerio/deride.png?label=ready&title=Ready)](https://waffle.io/guzzlerio/deride) [![Stories In Progress](https://badge.waffle.io/guzzlerio/deride.png?label=in%20progress&title=In%20Progres)](https://waffle.io/guzzlerio/deride) 

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

- [deride.stub(methods)](#stub-methods)
  - **methods** Array
- [deride.stub(obj)](#stub-obj)
  - **obj** Object
- [deride.func()](#func)

### Expectations

- [```obj```.expect.```method```.called.times(n)](#called-times)
- [```obj```.expect.```method```.called.once()](#called-once)
- [```obj```.expect.```method```.called.twice()](#called-once)
- [```obj```.expect.```method```.called.lt()](#called-lte)
- [```obj```.expect.```method```.called.lte()](#called-lte)
- [```obj```.expect.```method```.called.gt()](#called-lte)
- [```obj```.expect.```method```.called.gte()](#called-lte)
- [```obj```.expect.```method```.called.never()](#called-never)
- [```obj```.expect.```method```.called.withArg(arg)](#called-witharg)
- [```obj```.expect.```method```.called.withArgs(args)](#called-withargs)
- [```obj```.expect.```method```.called.withMatch(pattern)](#called-withmatch)
- [```obj```.expect.```method```.called.matchExactly(args)](#called-matchexactly)

**All of the above can be negated e.g. negating the `.withArgs` would be: ** 

- ```obj```.expect.```method```.called`.not`.withArgs(args)

### Resetting the counts / called with args
- [```obj```.expect.```method```.called.reset()](#called-reset)
- ```obj```.called.reset()

### Setup

- [```obj```.setup.```method```.toDoThis(func)](#setup-todothis)
- [```obj```.setup.```method```.toReturn(value)](#setup-toreturn)
- [```obj```.setup.```method```.toResolveWith(value)](#setup-promise-resolve)
- [```obj```.setup.```method```.toRejectWith(value)](#setup-promise-reject)
- [```obj```.setup.```method```.toThrow(message)](#setup-tothrow)
- [```obj```.setup.```method```.toEmit(event, args)](#events)
- [```obj```.setup.```method```.toCallbackWith(args)](#setup-tocallback)
- [```obj```.setup.```method```.toTimeWarp(milliseconds)](#setup-totimewarp)
- [```obj```.setup.```method```.when(args|function).[toDoThis|toReturn|toRejectWith|toResolveWith|toThrow|toEmit|toCallbackWith|toTimeWarp]](#setup-toreturn-when)
- [```obj```.setup.```method```.toIntercept(func)](#setup-tointercept)

## Examples

### The context
```javascript
var Person = function(name) {
    return Object.freeze({
        greet: function(otherPersonName) {
            console.log(name, 'says hello to', otherPersonName);
        },
		echo: function(name) {
			return name;
		}
    });
}
```

<a name="stub-methods" />

### Creating a stubbed object
Stubbing an object simply creates an anonymous object, with all the method specified and then the object is wrapped to provide all the expectation functionality of the library


```javascript
var bob = deride.stub(['greet']);
bob.greet('alice');
bob.expect.greet.called.times(1);
```

<a name="stub-obj" />

### Creating a stubbed object with properties
To stub an object with pre set properties call the stub method with a properties array in the second parameter. We are following the defineProperty definition as can be found in the below link. 

https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty


```javascript
var bob = deride.stub(['greet'], [{name: 'age', options: { value: 25, enumerable: true}}]);
bob.age === 25;
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

<a name="func" />

### Creating a single mocked method
```javascript
var func = deride.func();
func.setup.toReturn(1);
var value = func(1, 2, 3);
assert.equal(value, 1);
```

### Wrapping an existing function
```javascript
var f = function (name) { return 'hello ' + name; };
var func = deride.func(f);
assert(func('bob'), 'hello bob');
func.expect.called.withArg('bob');
```

### Wrapping an existing promise function
```javascript
var f = function (name) { return 'hello ' + name; };
var func = deride.func(when.lift(f));
func('bob').then(function (result) {
    assert(result, 'hello bob');
    func.expect.called.withArg('bob');
}).finally(done);
```

## Events

### Force the emit of an event on an object
```javascript
var bob = deride.stub([]);
bob.on('message', function() {
    done();
});
bob.emit('message', 'payload');
```

### Emit an event on method invocation
```javascript
bob.setup.greet.toEmit('testing');
bob.on('testing', function() {
	done();
});
bob.greet('bob');
```

### Emit an event with args on method invocation
```javascript
bob.setup.greet.toEmit('testing', 'arg1', { a: 1 });
bob.on('testing', function(a1, a2) {
	a1.should.eql('arg1');
	a2.should.eql({ a: 1 });
	done();
});
bob.greet('bob');
```


<a name="called-times" />

### Count the number of invocations of a method
```javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.greet('alice');
bob.expect.greet.called.times(1);
```

<a name="called-once" />

### Has convenience methods for invocation counts
```javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.greet('alice');
bob.expect.greet.called.once();
bob.greet('sally');
bob.expect.greet.called.twice();
```

<a name="called-lte" />

### Handy `lt`, `lte`, `gt` and `gte` methods
```javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.greet('alice');
bob.greet('alice');
bob.greet('alice');

bob.expect.greet.called.lt(4);
bob.expect.greet.called.lte(3);
bob.expect.greet.called.gt(2);
bob.expect.greet.called.gte(3);
```

<a name="called-never" />

### Determine if a method has **never** been called
```javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.expect.greet.called.never();
```

<a name="called-reset" />

### Resetting the called count on **all** methods
```javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.greet('alice');
bob.echo('alice');
bob.expect.greet.called.once();
bob.expect.echo.called.once();

bob.called.reset();

bob.expect.greet.called.never();
bob.expect.echo.called.never();
```

<a name="called-withargs" />

### Determine if a method was called with a specific set of arguments
```javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.greet('alice');
bob.greet('bob');
bob.expect.greet.called.withArgs('bob');
```

<a name="called-matchexactly" />

### Determine if a method was called with the Exact set of arguments
```javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.greet('alice', ['james'], 987);
bob.expect.greet.called.matchExactly('alice', ['james'], 987);
```

<a name="setup-todothis" />

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

<a name="setup-toreturn" />

### Override the return value for a function
```javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.setup.greet.toReturn('foobar');
var result = bob.greet('alice');
result.should.eql('foobar');
```

### Overriding the promise resolver for a function
<a name="setup-promise-resolve" />

#### To resolve with a value
```javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.setup.greet.toResolveWith('foobar');
bob.greet('alice').then(function(result) {
    result.should.eql('foobar');
});
```

<a name="setup-promise-reject" />

#### To reject with a value
```javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.setup.greet.toRejectWith('foobar');
bob.greet('alice').catch(function(result) {
    result.should.eql('foobar');
});
```

<a name="setup-tothrow" />

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

<a name="setup-tocallback" />

## Override the invocation of a callback

### when there is only one function passed as args
```javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.setup.chuckle.toCallbackWith(0, 'boom');
bob.chuckle(function(err, message) {
    assert.equal(err, 0);
    assert.equal(message, 'boom');
});
```

### when the callback is the last arg which is a `function`
```javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.setup.chuckle.toCallbackWith(0, 'boom');
bob.chuckle('bob', function() {
    done('this was not the callback');
}, function(err, message) {
    assert.equal(err, 0);
    assert.equal(message, 'boom');
    done();
});
```

<a name="setup-totimewarp" />

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

<a name="setup-tointercept" />

## Setup an intercept

Currently this will allow you to inspect the arguments that are passed to a method, but it will not pass any modifications to the real method.

```javascript
var bob = new Person('bob');
bob = deride.wrap(bob);
bob.setup.greet.toIntercept(function () {
    console.log(arguments); // { '0': 'sally', '1': { message: 'hello %s'} }
});

bob.greet('sally', {message: 'hello %s'});
```


## Setup for specific arguments

<a name="setup-toreturn-when" />

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

<a name="setup-todothis-when" />

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

<a name="setup-tothrow-when" />

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

<a name="setup-tocallback-when" />

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

<a name="setup-totimewarp-when" />

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

### Use a function as a predicate

If a function is passed to the `when`, then this will be invoked with the arguments passed. The function that has been setup will be called if this predicate returns truthy.

```javascript
function resourceMatchingPredicate(msg) {
	var content = JSON.parse(msg.content.toString());
	return content.resource === 'talula';
}
bob.setup.chuckle.toReturn('chuckling');
bob.setup.chuckle.when(resourceMatchingPredicate).toReturn('chuckle talula');

var matchingMsg = {
	//...
	//other properties that we do not know until runtime
	//...
	content: new Buffer(JSON.stringify({
		resource: 'talula'
	}))
};
bob.chuckle(matchingMsg).should.eql('chuckle talula');
```


### Provide access to individual calls to a method

```javascript
var bob = deride.wrap(bob);
bob.greet('jack', 'alice');
bob.greet('bob');
bob.expect.greet.invocation(0).withArg('alice');
bob.expect.greet.invocation(1).withArg('bob');
```

## Enable the assertion on a single arg being used in any invocation

<a name="called-witharg" />

### when the arg is a primitive object
```javascript
var bob = deride.wrap(bob);
bob.greet('alice', {
    name: 'bob',
    a: 1
}, 'sam');
bob.expect.greet.called.withArg('sam');
```

### when the arg is not a primitive object
```javascript
var bob = deride.wrap(bob);
bob.greet('alice', {
    name: 'bob',
    a: 1
});
bob.expect.greet.called.withArg({
    name: 'bob'
});
```

<a name="called-withmatch" />
## Use a RexExp match for the assertion on any args being used in any invocation

### when the arg is a primitive object
```javascript
var bob = deride.stub(['greet']);
bob.greet('The inspiration for this was that my colleague was having a');
bob.greet({a: 123, b: 'talula'}, 123, 'something');

bob.expect.greet.called.withMatch(/^The inspiration for this was/);
```

### when the arg is not a primitive object


```javascript
var bob = deride.stub(['greet']);
bob.greet('The inspiration for this was that my colleague was having a');
bob.greet({a: 123, b: { a: {'talula'}}, 123, 'something');

bob.expect.greet.called.withMatch(/^talula/gi);
```

---

## Contributing
Please ensure that you run ```grunt```, have no style warnings and that all the tests are passing.

## License
Copyright (c) 2014 Andrew Rea  
Copyright (c) 2014 James Allen

Licensed under the MIT license.
