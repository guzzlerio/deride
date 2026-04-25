# Configuring behaviour

Every mocked method has a `.setup` handle. Call a method on `.setup` to configure how the mock responds. Setup methods chain (return the setup object) so you can combine `.when(...)`, `.once()`/`.times(n)`, and `.and.then` fluently.

## Return values

### `toReturn(value)`

Return a fixed value on every invocation:

```typescript
mock.setup.greet.toReturn('hello')
mock.greet('alice')   // 'hello'
mock.greet('bob')     // 'hello'
```

### `toReturnSelf()`

Return the wrapped mock itself — for fluent/chainable APIs like query builders:

```typescript
const q = stub<{
  where(v: unknown): unknown
  orderBy(v: unknown): unknown
  execute(): number[]
}>(['where', 'orderBy', 'execute'])

q.setup.where.toReturnSelf()
q.setup.orderBy.toReturnSelf()
q.setup.execute.toReturn([1, 2])

q.where('a').orderBy('b').where('c').execute()   // [1, 2]
```

### `toReturnInOrder(...values)`

Return each value once, then hold the last value ("sticky-last"):

```typescript
mock.setup.greet.toReturnInOrder('first', 'second', 'third')
mock.greet()   // 'first'
mock.greet()   // 'second'
mock.greet()   // 'third'
mock.greet()   // 'third'  (sticky)
```

Pass `{ then, cycle }` as a trailing argument for alternative fallback strategies:

```typescript
// Fallback to 'default' after exhausting the list
mock.setup.greet.toReturnInOrder('a', 'b', { then: 'default' })
// → 'a', 'b', 'default', 'default', …

// Cycle indefinitely
mock.setup.greet.toReturnInOrder('a', 'b', { cycle: true })
// → 'a', 'b', 'a', 'b', …
```

::: warning Value vs options
Since the options detector checks for `then` or `cycle` keys, if you genuinely want to **return** an object that happens to have those keys, wrap your values in an array:

```typescript
mock.setup.fn.toReturnInOrder([{ then: 'i-am-a-value' }])
```
:::

## Custom implementations

### `toDoThis(fn)`

Run arbitrary logic. Gets the call args, returns anything (including `undefined`):

```typescript
mock.setup.greet.toDoThis((name: string) => `yo ${name}`)
mock.greet('alice')   // 'yo alice'
```

### `toThrow(message)`

Throw a fresh `Error` with the given message:

```typescript
mock.setup.parse.toThrow('malformed input')
mock.parse('x')       // throws Error('malformed input')
```

## Promise behaviours

### `toResolveWith(value)` / `toResolve()`

```typescript
mock.setup.fetch.toResolveWith({ data: 42 })
await mock.fetch('/x')   // { data: 42 }

mock.setup.save.toResolve()
await mock.save(data)    // undefined
```

### `toRejectWith(error)`

```typescript
mock.setup.fetch.toRejectWith(new Error('network'))
await mock.fetch('/x')   // rejects with Error('network')
```

### `toResolveInOrder / toRejectInOrder`

Same sticky-last semantics as `toReturnInOrder`:

```typescript
mock.setup.fetch.toResolveInOrder('a', 'b', 'c')
await mock.fetch()   // 'a'
await mock.fetch()   // 'b'

mock.setup.fetch.toRejectInOrder(err1, err2)
```

### `toResolveAfter(ms, value)` / `toRejectAfter(ms, error)`

Delay resolution. Pairs well with fake timers:

```typescript
mock.setup.fetch.toResolveAfter(100, { data: 42 })
const p = mock.fetch('/x')  // pending
// ... advance time by 100ms ...
await p                      // { data: 42 }
```

### `toHang()`

Return a never-settling promise — useful for testing timeout/cancellation paths:

```typescript
mock.setup.fetch.toHang()
const p = mock.fetch('/x')
// p never resolves or rejects
```

## Iterators

### `toYield(...values)`

Return a fresh sync iterator on every call:

```typescript
mock.setup.stream.toYield(1, 2, 3)
for (const v of mock.stream()) console.log(v)
// 1
// 2
// 3
```

### `toAsyncYield(...values)`

Same for async iterators:

```typescript
mock.setup.stream.toAsyncYield(1, 2, 3)
for await (const v of mock.stream()) console.log(v)
```

### `toAsyncYieldThrow(error, ...valuesBefore)`

Yield some values, then throw:

```typescript
mock.setup.stream.toAsyncYieldThrow(new Error('drained'), 1, 2)
// yields 1, 2, then rejects with Error('drained')
```

## Callbacks and events

### `toCallbackWith(...args)`

Finds the last function argument and invokes it with the provided args — handy for Node-style callback APIs:

```typescript
mock.setup.load.toCallbackWith(null, 'data')
mock.load('file.txt', (err, data) => {
  // err === null, data === 'data'
})
```

### `toEmit(eventName, ...params)`

Emit an event on the wrapped object when the method is called:

```typescript
mock.setup.greet.toEmit('greeted', 'payload')
mock.on('greeted', (data) => console.log(data))  // 'payload'
mock.greet('alice')
```

### `toIntercept(fn)`

Call your interceptor *and then* the original method (preserving the return value):

```typescript
const log: unknown[][] = []
wrapped.setup.greet.toIntercept((...args) => log.push(args))
wrapped.greet('alice')
// log === [['alice']]
// wrapped.greet still returned the original result
```

### `toTimeWarp(ms)`

Accelerate a callback — schedules the found callback with the given delay instead of the original:

```typescript
mock.setup.load.toTimeWarp(0)
mock.load(10_000, (result) => { /* called immediately, not after 10s */ })
```

## Gating behaviour by arguments

### `.when(value | matcher | predicate)`

Chain before any behaviour to gate it on the call's arguments:

```typescript
// Value match (deep equal)
mock.setup.greet.when('alice').toReturn('hi alice')
mock.setup.greet.when('bob').toReturn('hi bob')

// Matcher
mock.setup.greet.when(match.string).toReturn('hi string')

// Multiple positional args / matchers
mock.setup.log.when('info', match.string).toReturn(true)

// Predicate function (full access to args)
mock.setup.greet.when((args) => args[0].startsWith('Dr')).toReturn('hi doctor')
```

See [Matchers](./matchers) for the full `match.*` catalogue.

## Limiting invocations

### `.once()` / `.twice()` / `.times(n)`

Chain to limit how many times a behaviour applies:

```typescript
mock.setup.greet.once().toReturn('first')
mock.setup.greet.toReturn('default')

mock.greet()   // 'first'
mock.greet()   // 'default'
```

The limit counts *each matching invocation*, so a time-limited behaviour combined with `when` only consumes when its predicate matches:

```typescript
mock.setup.greet.when('admin').twice().toReturn('hi admin')
mock.setup.greet.toReturn('default')

mock.greet('alice')  // 'default'   (when predicate didn't match, quota unchanged)
mock.greet('admin')  // 'hi admin'  (1/2)
mock.greet('admin')  // 'hi admin'  (2/2)
mock.greet('admin')  // 'default'   (quota exhausted)
```

## Chaining sequential behaviours

`.and.then` is an alias for the setup object — use it for readability when building a sequence:

```typescript
mock.setup.greet
  .toReturn('alice')
  .twice()
  .and.then
  .toReturn('sally')

mock.greet()   // 'alice'
mock.greet()   // 'alice'
mock.greet()   // 'sally'
```

Can be combined with `.when`:

```typescript
mock.setup.greet
  .when('simon')
  .toReturn('special')
  .twice()
  .and.then
  .toReturn('default')

mock.greet('simon')   // 'special'
mock.greet('simon')   // 'special'
mock.greet('simon')   // 'default'
```

## Clearing behaviour

### `.fallback()`

Clear all configured behaviours on this method; future calls fall back to the original (or `undefined` for pure stubs):

```typescript
wrapped.setup.greet.toReturn('mocked')
wrapped.greet('x')                  // 'mocked'
wrapped.setup.greet.fallback()
wrapped.greet('x')                  // original return value
```

## The dispatch rule (refresher)

Time-limited behaviours first, in registration order (FIFO). When none match, the *last* registered unlimited behaviour wins. See the [Philosophy](./philosophy#the-dispatch-rule) for why and how to work with it.
