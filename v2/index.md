<br/>

<div class="vp-doc" style="max-width: 960px; margin: 0 auto; padding: 0 24px;">

## At a glance

```typescript
import { stub, match } from 'deride'

interface Database {
  query(sql: string): Promise<unknown[]>
  findById(id: number): Promise<unknown>
}

const mockDb = stub<Database>(['query', 'findById'])
mockDb.setup.query.toResolveWith([{ id: 1, name: 'alice' }])
mockDb.setup.findById.when(match.gte(100)).toRejectWith(new Error('not found'))

const result = await mockDb.query('SELECT * FROM users')

mockDb.expect.query.called.once()
mockDb.expect.query.called.withArg(match.regex(/FROM users/))
mockDb.expect.findById.called.never()
```

**No monkey-patching.** `mockDb` is a wrapper around a fresh object. Your real `Database` class is untouched. That's why deride works on frozen objects, sealed classes, and any coding style.

</div>

<br/>
