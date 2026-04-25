# Module mocking

deride creates mock **objects**; your test runner handles substituting them at import time. Use the two together.

## Vitest

```typescript
import { describe, it, vi } from 'vitest'
import { stub } from 'deride'
import type { Database } from './database'

// Create the mock up front
const mockDb = stub<Database>(['query', 'findById'])
mockDb.setup.query.toResolveWith([{ id: 1 }])

// Substitute the import
vi.mock('./database', () => ({
  db: mockDb,
}))

// Code under test imports './database' and uses the mock
import { userService } from './user-service'

describe('userService', () => {
  it('queries the database', async () => {
    await userService.listUsers()
    mockDb.expect.query.called.once()
  })
})
```

Vitest hoists `vi.mock` to the top of the file, so it runs before `import { userService }` resolves the module graph.

## Jest

```typescript
import { stub } from 'deride'
import type { Database } from './database'

const mockDb = stub<Database>(['query'])

jest.mock('./database', () => ({
  db: mockDb,
}))

import { userService } from './user-service'
```

Same story — `jest.mock` is hoisted. If you're using jest ESM, use `jest.unstable_mockModule` instead and dynamic-import the module under test.

## Node `node:test` test runner

```typescript
import { describe, it, mock } from 'node:test'
import { stub } from 'deride'
import type { Database } from './database'

const mockDb = stub<Database>(['query'])
mock.module('./database', () => ({
  db: mockDb,
}))

const { userService } = await import('./user-service')
```

Node's `mock.module` is ESM-friendly but not hoisted — use a dynamic import for the module under test.

## When hoisting doesn't play nicely

Some setups (e.g. tests that construct `new URL()` during static analysis, or tests where the mock depends on data from the test) can't hoist `vi.mock`/`jest.mock` nicely. Two options:

### Inject the dependency instead

The cleanest fix is almost always to restructure the code under test to accept the dependency via constructor or factory:

```typescript
// user-service.ts
export class UserService {
  constructor(private db: Database) {}
  async listUsers() { return this.db.query(...) }
}

// user-service.test.ts — no vi.mock needed
const mockDb = stub<Database>(['query'])
const service = new UserService(mockDb)
```

This is deride's preferred style. It makes your tests shorter, clearer, and runner-agnostic.

### Dynamic factories

For cases where injection isn't an option, use the runner's module-factory hooks:

```typescript
// vitest — the factory runs once, lazily
vi.mock('./database', async () => {
  const { stub } = await import('deride')
  return { db: stub<Database>(['query']) }
})
```

Referencing the mock after this returns something subtly different — use `vi.mocked(...)` to get a typed handle.

## Partial module mocks

Sometimes you want to mock **some** exports from a module and keep others real:

```typescript
// vitest
vi.mock('./utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./utils')>()
  return {
    ...actual,
    parseConfig: stub<typeof actual.parseConfig>(['parseConfig']).parseConfig,
  }
})
```

For the mocked function specifically, [`wrap`](../api/wrap) is usually simpler — wrap the real function and override only when needed:

```typescript
const wrappedParseConfig = wrap(actual.parseConfig)
wrappedParseConfig.setup.toReturn({ fake: 'config' })
```

## Typescript + mock type preservation

```typescript
// vitest
import { vi } from 'vitest'
import { stub, type Wrapped } from 'deride'
import { db } from './database'

vi.mock('./database', () => ({
  db: stub<typeof db>(['query']),
}))

// Help TypeScript see the type:
const mockDb = vi.mocked(db) as unknown as Wrapped<typeof db>
mockDb.setup.query.toResolveWith([])
```

## When to avoid module mocking

- **When you can inject the dependency.** Constructor/parameter injection means your tests don't need any runner-specific mocking at all. deride works best with this style.
- **For pure utility modules.** If the module is side-effect-free and fast, just call it. Mocking pure computation is usually a smell.

## See also

- [Creating mocks](../guide/creating-mocks) — factories
- [Philosophy](../guide/philosophy) — why composition & injection beat monkey-patching
