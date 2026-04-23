# CLAUDE.md

Guidance for Claude Code when working in this repo. Keep this file short and accurate; it is loaded into Claude's context automatically. If a rule below becomes stale, fix it or delete it — outdated guidance is worse than no guidance.

## What this repo is

`deride` — a **TypeScript-first mocking library** published to npm. Consumed as a devDependency by other projects' test suites. Zero runtime dependencies beyond `debug`. ESM-first with CJS fallback.

User-facing docs live at [guzzlerio.github.io/deride](https://guzzlerio.github.io/deride/). Source of truth for API reference is the TSDoc on public exports (enforced by `jsdoc/require-jsdoc` lint rule).

## Quick commands

```bash
pnpm lint            # eslint (src + tests)
pnpm typecheck       # tsc --noEmit
pnpm test            # vitest watch mode
pnpm test --run      # vitest single run
pnpm test:coverage   # vitest run + coverage report
pnpm build           # tsup (cjs + esm + .d.ts)
pnpm docs:dev        # VitePress dev server
pnpm docs:build      # VitePress production build
pnpm release:dry-run # semantic-release dry-run to preview next version
```

Always use `pnpm`, never `npm`. The lockfile is `pnpm-lock.yaml`. Dev setup: Node 20+, pnpm 10+.

## Release workflow — read this before touching `master`

**Branches:**
- `develop` — default branch, integration trunk. All PRs target develop.
- `master` — release branch. Merging `develop` → `master` publishes to npm.
- Both are protected — no direct pushes, only PRs.

**How releases work:**
1. `develop` accumulates conventional-commit PRs.
2. Open a PR from `develop` → `master` when ready to release.
3. **Merge with "Create a merge commit" or "Rebase and merge"** — preserves the individual conventional-commit messages.
4. `.github/workflows/release.yml` runs on `master` push, invokes semantic-release, publishes to npm, creates the git tag, posts a GitHub release.

**Do NOT squash-merge release PRs.** Squash collapses every `feat:` / `fix:` / `docs:` into one commit with the PR title as the message. If that title isn't a conventional-commit type semantic-release recognises (`feat:` / `fix:` / `perf:` / `refactor:` / `revert:` / `docs(README):` per `.releaserc.json`), **the release silently no-ops** — workflow succeeds, nothing publishes.

If a squash is unavoidable, rename the squash commit message to `feat: …` or `fix: …` at merge time so the release rule matches.

**`@semantic-release/git` and `@semantic-release/changelog` are intentionally not used.** Both would try to push a `chore(release):` commit back to `master`, which branch protection rejects. `package.json` and `CHANGELOG.md` in the repo are not auto-maintained — the authoritative record is the [GitHub Releases page](https://github.com/guzzlerio/deride/releases).

**Secrets required by the release workflow:** `NPM_TOKEN` (automation token with publish + provenance rights). `GITHUB_TOKEN` is provided automatically.

## Conventional Commits — enforced on every PR

Commitlint runs in CI with `@commitlint/config-conventional`. Accepted types and release effect:

| Type | Release |
|------|---------|
| `feat` | minor |
| `fix` / `perf` / `refactor` / `revert` | patch |
| `docs(README)` | patch — only the README scope triggers a release |
| `docs`, `test`, `build`, `ci`, `chore`, `style` | no release |
| Anything with `BREAKING CHANGE:` footer or `!` after type | major |

Merge commits are exempt via commitlint's default-ignore pattern — but only if they match the shape `Merge branch 'X' into Y` or `Merge pull request #N from …`. Arbitrary phrasing (`Merge develop for v2.1 release`) gets linted and fails. If you're creating a manual merge locally, let `git merge` generate the default message.

## Architecture notes

The runtime engine is a single `MethodMock` class in `src/method-mock.ts`, split across focused modules:

- `src/method-mock.ts` — the orchestrator class; manages calls and behaviour list
- `src/mock-setup.ts` — `setup.*` DSL factory + `TypedMockSetup` type
- `src/mock-expect.ts` — `expect.*` assertions + `called` / `everyCall` via shared `buildAssertions(quantifier)`
- `src/mock-spy.ts` — `spy.*` read-only surface + `stableSerialise` + `historySuffix`
- `src/call-record.ts` — `CallRecord` + `MockSnapshot` types + global monotonic sequence counter
- `src/matchers.ts` — `match.*` namespace + brand symbol + `matchValue`
- `src/matchers-runtime.ts` — helpers shared between `deride/vitest` and `deride/jest`
- `src/sandbox.ts` — `sandbox()` lifecycle helper
- `src/in-order.ts` — `inOrder(...)` cross-mock ordering
- `src/stub.ts` / `src/wrap.ts` / `src/func.ts` — factory entries
- `src/clock.ts` — `deride/clock` sub-path
- `src/vitest.ts` / `src/jest.ts` — matcher integrations (side-effect imports)

**Dispatch rule in `invoke()`:** time-limited behaviours (bounded by `.once()` / `.twice()` / `.times(n)`) are tried first in registration order (FIFO). When none match, the **last** registered unlimited behaviour wins. This lets later `setup.x.toReturn(y)` override earlier ones. Time-limit a `when()` match to beat a later default.

**`cloneDeep` handles Date/RegExp/Map/Set/ArrayBuffer/TypedArray/DataView explicitly** — don't regress back to iterating `Reflect.ownKeys` on them (breaks `instanceof` checks on recorded args).

**`stableSerialise` renders built-ins deterministically** (Date → ISO string, RegExp → `/p/flags`, Error → `[Name: message]`, Map/Set/TypedArray → tagged objects). Needed for snapshot testing stability across Node versions.

## Testing

- 387 tests in vitest, single directory (`test/`), file-per-feature naming.
- CI matrix: Node 20/22 × ubuntu/macos/windows (6 cells). Coverage uploaded only from ubuntu/Node 22.
- Coverage thresholds: statements/lines/functions 90%, branches 85%.
- Type-level tests live in `test/types.test.ts` — add `// @ts-expect-error` for rejected cases.
- **Never add `// @ts-ignore` to tests.** Use `as any` (or `as unknown as T`) for intentional type escape hatches — it's grep-able and localised.

## Backwards compatibility

The 148 pre-existing v2.0 tests must continue to pass unchanged through any future refactor. When the internal `callArgs: unknown[][]` was refactored to `calls: CallRecord[]` in v2.1, a back-compat getter was added so old assertion code still worked. Follow the same pattern if you change internals.

## TSDoc on public exports

Every public declaration in `src/**.ts` must have a JSDoc comment — enforced by `jsdoc/require-jsdoc`. This covers exported functions, classes, interfaces, type aliases, `const`/`let`, and interface method signatures. Fix the doc, don't disable the rule.

## GitHub Pages / docs deployment

`.github/workflows/docs.yml` builds the VitePress site on push to `develop` and deploys to `/next/` on the `gh-pages` branch via `peaceiris/actions-gh-pages@v4`. Release docs (`/latest/` and `/v{major}/`) are deployed by `.github/workflows/release.yml` after a successful npm publish. **Pages source must be set to "Deploy from a branch" (`gh-pages`)** in Settings → Pages.

The site is served under `/deride/` on the live URL with versioned subdirectories (`/deride/latest/`, `/deride/next/`, `/deride/v2/`). Doc pages live under `docs/next/` (develop) and `docs/v2/` (release snapshot). `docs/latest` is a symlink to `docs/v2`. For local preview: `DERIDE_BASE=/ pnpm docs:build` + `pnpm docs:preview`.

## Logo / brand assets

Six variants in `brand/`:

- `logo.png` — solid-BG composition (for READMEs)
- `logo-white.png` — white-ink composition on transparent (for dark surfaces)
- `logo-transparent.png` / `logo-transparent-white.png` — original brand sheet (dark / white ink)
- `logo-icon.png` / `logo-icon-white.png` — standalone D icon (for navbars, favicons)
- `logo-full.png` / `logo-full-white.png` — tightly-trimmed D + wordmark (for hero images)

VitePress config uses `{ light, dark }` per-theme logo — no CSS filter hacks. If you need a new size/crop variant, regenerate from the originals with ImageMagick (see `brand/README.md`).

## "For Agents" docs section (`docs/ai/`) — keep this current

The docs site has a section written specifically for AI agents at `docs/ai/`. It exists because agent-generated code fails most often when the agent can't disambiguate between similar APIs (`stub` vs `wrap` vs `func`, `expect` vs `spy`, which setup for which task). The section captures those decisions explicitly so agents have an authoritative source.

**Pages you must keep synced whenever the main guide changes:**

| Guide change | Also update |
|--------------|-------------|
| New factory or new setup method | `docs/ai/decision-tree.md` (add row), `docs/ai/canonical-examples.md` if it's a common pattern |
| New matcher | `docs/ai/decision-tree.md` → "which matcher" table |
| New expectation method | `docs/ai/decision-tree.md` → "which expect" table |
| Change to an existing idiomatic pattern | `docs/ai/canonical-examples.md` (update the blessed snippet) |
| Discovered anti-pattern / common footgun | `docs/ai/common-mistakes.md` (add entry with wrong/right) |
| New sub-path export | `docs/ai/decision-tree.md` + `docs/ai/feeds.md` if discoverability changes |

**Feed infrastructure** — `docs/.vitepress/emit-llm-assets.ts` runs on every build and emits:

- `dist/<page>.md` — a clean Markdown copy of every page
- `dist/llms.txt` — [llmstxt.org](https://llmstxt.org) index (sorted, grouped)
- `dist/llms-full.txt` — all pages concatenated

Adding a new page under `docs/` picks up automatically. If you move or rename a page, verify the feeds still include it (check `pnpm docs:build` log output).

**The deal:** AI-authored PRs that change an API but leave the `docs/ai/` pages stale should be held in review until they're synced. Human contributors are encouraged to do the same but there's no CI enforcement (we could add one — grep `docs/ai/*.md` for every public export; not done yet).

## Things to avoid

- **Don't add runtime dependencies beyond `debug`.** The 15 KB footprint claim was deliberate; keep the package lean.
- **Don't monkey-patch objects.** This library is specifically built to wrap rather than mutate — that's its differentiator. Any new feature that requires mutating a user-supplied object is off-brand.
- **Don't break the v2.0 API.** Back-compat was explicit in v2.1.
- **Don't bypass branch protection** (no force-pushes, no direct pushes to `develop`/`master`, no `--no-verify`).
- **Don't commit `.vitepress/dist/` or `.vitepress/cache/`.** They're gitignored.
- **Don't publish from a feature branch.** Release only happens on `master`.

## Further reading

- [README.md](./README.md) — user-facing overview, API summary, examples
- [CONTRIBUTING.md](./CONTRIBUTING.md) — commit rules, scripts, release steps
- [docs/](./docs/) — VitePress site source (guide, API reference, recipes, for-agents)
- [docs/ai/](./docs/ai/) — pages written for AI agent consumption — sync these with the guide
- [docs/.vitepress/emit-llm-assets.ts](./docs/.vitepress/emit-llm-assets.ts) — build hook that emits llms.txt + .md variants
- [brand/README.md](./brand/README.md) — brand asset usage
- [.releaserc.json](./.releaserc.json) — release rules
- [.github/workflows/](./.github/workflows/) — CI (`ci.yml`), release (`release.yml`), docs (`docs.yml`)

## Published feeds (for pointing agents at)

- <https://guzzlerio.github.io/deride/llms.txt> — llmstxt.org index
- <https://guzzlerio.github.io/deride/llms-full.txt> — all docs concatenated
- Any page `.md` variant, e.g. <https://guzzlerio.github.io/deride/guide/quick-start.md>
