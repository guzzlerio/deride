<p align="center">
  <img src="./brand/logo.png" alt="deride" width="200"/>
</p>

# Contributing

## Development

```bash
pnpm install
pnpm lint         # eslint (src + tests)
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest (watch mode)
pnpm test:coverage
pnpm build        # tsup (cjs + esm + types)
```

## Commit messages — Conventional Commits

All commits (and PR titles, if you squash-merge) MUST follow
[Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional-scope>): <subject>

[optional body]

[optional footer(s)]
```

Accepted types and their release effect:

| Type       | Release  | Example                                                   |
|------------|----------|-----------------------------------------------------------|
| `feat`     | minor    | `feat(matchers): add match.arrayContaining`               |
| `fix`      | patch    | `fix(stub): walk inherited prototype methods`             |
| `perf`     | patch    | `perf(utils): avoid allocating in hot path`               |
| `refactor` | patch    | `refactor(spy): extract CallRecord type`                  |
| `docs`     | none     | `docs: clarify inOrder semantics`                         |
| `docs(README)` | patch | (README-scoped docs trigger a patch so fixes ship)       |
| `test`     | none     | `test(spy): cover non-Error throws`                       |
| `build`    | none     | `build: bump tsup`                                        |
| `ci`       | none     | `ci: add windows runner to test matrix`                   |
| `chore`    | none     | `chore: reformat`                                         |
| `revert`   | patch    | `revert: feat(stub): ...`                                 |

Breaking changes: include `BREAKING CHANGE:` in the footer OR append `!`
to the type (`feat!:`). This triggers a major bump.

Commitlint runs on every PR. Locally, you can test a message:

```bash
echo "feat(matchers): add match.bigint" | pnpm commitlint
```

## Releases

Trunk-based: `main` is the only long-lived branch. Every conventional-commit
merge into `main` is potentially a release.

**Branch roles:**

| Branch | Role |
|--------|------|
| `main` | Trunk. Every push runs CI; every conventional-commit merge can publish a release. |
| `feature/*`, `fix/*`, `chore/*` | Short-lived work branches, PR'd into `main`. Delete on merge. |

**Cutting a release:**

1. Open a PR from a short-lived branch into `main` with a conventional-commit title.
2. Squash-merge it — the squash commit message must keep the conventional prefix
   (`feat:`, `fix:`, `perf:`, `refactor:`, `revert:`, or `docs(README):`) so
   [semantic-release](https://github.com/semantic-release/semantic-release)
   recognises it. Plain `chore:` / `merge:` / `ci:` titles will be skipped.
3. semantic-release runs automatically on `main`:
   - computes the next version from the commits since the last tag,
   - creates the git tag,
   - publishes to npm,
   - posts a GitHub release with auto-generated notes,
   - snapshots `docs/next` → `docs/v<major>` and deploys the docs site.
4. Nothing to do manually.

`package.json` and `CHANGELOG.md` in the repo are **not** auto-updated —
branch protection would require us to push a commit back, which we
deliberately don't do. Authoritative release history lives on the
[GitHub Releases page](https://github.com/guzzlerio/deride/releases).

To preview what a merge would release:

```bash
pnpm release:dry-run
```

The dry-run also runs automatically on every PR and posts the predicted bump.
