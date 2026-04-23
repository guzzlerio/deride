# API Reference

Quick index of every public export from `deride` and its sub-paths.

## Main entry (`deride`)

```typescript
import { stub, wrap, func, match, inOrder, sandbox, type Wrapped /* … */ } from 'deride'
```

### Factories

| Export | Summary |
|--------|---------|
| [`stub`](./stub) | Build a stub from method names, an instance, or a class |
| [`stub.class`](./stub#stub-class) | Mock a constructor and track `new` calls |
| [`wrap`](./wrap) | Wrap an existing object or function with deride facades |
| [`func`](./func) | Create a standalone mocked function |
| [`sandbox`](./sandbox) | Scope for fan-out reset/restore |

### Helpers

| Export | Summary |
|--------|---------|
| [`match`](./match) | Namespace of composable argument matchers |
| [`inOrder`](./in-order) | Cross-mock call-ordering assertion |

### Default export

`deride` — a convenience namespace bundling every named export:

```typescript
import deride from 'deride'
deride.stub(...)
deride.match.string
deride.inOrder(...)
```

## Types

Full index in [Types](./types).

```typescript
import type {
  Wrapped,                              // result of stub()/wrap()
  TypedMockSetup, MockSetup,            // setup surface
  MockExpect, CalledExpect, InvocationExpect,  // expect surface
  MethodSpy, CallRecord,                // spy surface
  MockSnapshot, Sandbox,                // lifecycle
  MockedFunction, MockedClass,          // callable mocks / class mocks
  Matcher,                              // matcher brand
  Options,                              // debug options
} from 'deride'
```

## Sub-paths

### `deride/clock`

```typescript
import { useFakeTimers, isFakeTimersActive, restoreActiveClock, type FakeClock } from 'deride/clock'
```

See [`deride/clock`](../integrations/clock).

### `deride/vitest`

Side-effect import — registers `toHaveBeenCalled*` matchers on vitest's `expect`:

```typescript
import 'deride/vitest'
```

See [`deride/vitest`](../integrations/vitest).

### `deride/jest`

Side-effect import — registers the same matchers on jest's `expect`:

```typescript
import 'deride/jest'
```

See [`deride/jest`](../integrations/jest).
