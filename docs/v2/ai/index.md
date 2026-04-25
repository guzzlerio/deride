# For Agents

**Context-dense docs for Claude, Cursor, Copilot, and other AI assistants writing code against deride.** Everything under `/ai/` is written for machine consumption first — terse, scannable, example-led — while still being useful to humans.

If you're a human reader looking for the full guide, head to [**Introduction**](../guide/introduction). If you're an agent or an agent-assisted developer, start here.

## What's in this section

| Page | Purpose |
|------|---------|
| [Decision tree](./decision-tree) | "Which factory / setup / expect do I use?" — flat tables, no prose. |
| [Canonical examples](./canonical-examples) | ONE blessed snippet per common task. Use these verbatim; they're the idiomatic shape. |
| [Common mistakes](./common-mistakes) | Anti-patterns and their fixes, phrased the way an agent is likely to produce them. |
| [Agent-ready feeds](./feeds) | `llms.txt`, `llms-full.txt`, per-page `.md` variants — the feeds you should point your agent at. |

## Quick agent primer

deride is a **TypeScript-first mocking library**. It wraps rather than monkey-patches, so it works with frozen objects, sealed classes, and any coding style.

Three factories:

```typescript
import { stub, wrap, func } from 'deride'

stub<Interface>(['methods'])   // build from method names
stub(existingInstance)         // mirror an instance's methods
stub(MyClass)                  // walk a class prototype
wrap(realObject)               // partial mock — real methods run by default
func<F>()                      // standalone mocked function
```

Three facades on every mock:

```typescript
mock.setup.method.toReturn(...)         // configure behaviour
mock.expect.method.called.once()        // assert (throws)
mock.spy.method.lastCall.returned       // inspect (reads data)
```

The full flavour — matchers, sandbox, inOrder, sub-paths — is in the [Guide](../guide/introduction). This section is the lean reference.

## Pointing your agent at these docs

Three options, from least to most context-hungry:

1. **Give the agent `/llms.txt`** — a short index of every page with one-line summaries and links to the `.md` variants. ~3 KB, fits in any context window.
2. **Give the agent `/llms-full.txt`** — every page's markdown concatenated. ~80 KB at the time of writing. Fits in any modern long-context window (Claude, GPT-4.1, Gemini 2.5, etc.).
3. **Let the agent fetch individual `.md` variants** by appending `.md` to any URL it encounters. e.g. [`/guide/quick-start.md`](../guide/quick-start.md), [`/ai/decision-tree.md`](./decision-tree.md).

Full feed URLs and example MCP / tool configurations live on [Agent-ready feeds](./feeds).

## Design principles for this section

1. **One idiomatic shape per task.** No "here are three ways…" — we pick one and document it. Agents generate from the patterns they see.
2. **Tables over prose.** Agents don't need prose to understand a rule; they need the rule.
3. **Negative examples alongside positive.** "Don't do X" is more useful than "do Y" alone because it steers generation away from common failure modes.
4. **No hidden context.** Everything referenced in an example is self-contained or linked.
5. **Conventional-commit language.** This reinforces the conventions used elsewhere in the project — useful because the agent will often be writing the commit message too.

## Contributing

If you're updating the main Guide or API reference, **also update the matching page here** when it changes a common pattern or introduces a new one. See the [Decision tree](./decision-tree) as the first thing to sync.

The `CLAUDE.md` at the repo root tells automated contributors (and Claude sessions) to keep this section current; human contributors should check `CONTRIBUTING.md`.
