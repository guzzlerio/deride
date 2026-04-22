---
layout: home

hero:
  name: deride
  text: Mocking that wraps, not patches.
  tagline: TypeScript-first test doubles for frozen objects, sealed classes, and any coding style — with matchers, spies, and first-class fake timers.
  image:
    src: /logo-transparent.png
    alt: deride
  actions:
    - theme: brand
      text: Get started
      link: /guide/quick-start
    - theme: alt
      text: Why deride?
      link: /guide/philosophy
    - theme: alt
      text: View on GitHub
      link: https://github.com/guzzlerio/deride

features:
  - icon: 🧊
    title: Works with frozen objects
    details: Composition-based. Wraps your real objects instead of mutating them, so `Object.freeze`, sealed classes, and prototype-based code just work.
  - icon: 🔍
    title: Matcher-first assertions
    details: A composable <code>match.*</code> namespace — any, string, number, objectContaining, gte, regex, allOf — reusable across setup and expectations.
  - icon: 🧠
    title: Spy + expect, split by purpose
    details: <code>expect.*</code> throws on mismatch for assertions. <code>spy.*</code> reads call history as data — feed it forward, snapshot it, print it.
  - icon: 🧵
    title: Cross-mock call ordering
    details: <code>inOrder(a.spy.x, b.spy.y, …)</code> asserts first-call sequence; <code>inOrder.strict</code> enforces no interleaved extras.
  - icon: 🧪
    title: Integrates where you test
    details: <code>deride/vitest</code> and <code>deride/jest</code> ship first-class <code>toHaveBeenCalled*</code> matchers. <code>deride/clock</code> is a dependency-free fake timers helper.
  - icon: 📐
    title: Type-safe by default
    details: Setup methods are constrained to your method signatures. Full generic inference. <code>as any</code> escape hatch for testing error paths.
  - icon: 🏗️
    title: Auto-discovers class methods
    details: <code>stub(MyClass)</code> walks the prototype chain. <code>stub.class&lt;typeof C&gt;()</code> mocks constructors with <code>expect.constructor</code> and per-instance setup.
  - icon: 🔄
    title: Snapshot and restore
    details: Capture any mock's behaviours and call history, mutate freely, roll back to the snapshot. <code>sandbox()</code> fans out across every registered mock at once.
  - icon: 🪶
    title: Zero runtime dependencies
    details: Ships with only <code>debug</code> as a runtime dep. Sub-paths (<code>clock</code>, <code>vitest</code>, <code>jest</code>) tree-shake cleanly. Under 40 KB packed.
---

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
