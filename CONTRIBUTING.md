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

Releases are scoped to the `master` branch. This keeps work on `develop`
accumulating without every merge triggering a publish.

**Branch roles:**

| Branch | Role |
|--------|------|
| `develop` | Default integration branch. All PRs target it. |
| `master` | Release branch. Merging `develop` → `master` cuts a release. |
| `feature/*`, `fix/*` | Work branches, PR'd into `develop`. |

**Cutting a release:**

1. Land the relevant conventional-commit PRs on `develop`.
2. Open a PR from `develop` → `master` (or fast-forward if preferred).
3. Merge it. [semantic-release](https://github.com/semantic-release/semantic-release) runs automatically on `master`:
   - computes the next version from the commits since the last tag,
   - creates the git tag,
   - publishes to npm with provenance,
   - posts a GitHub release with auto-generated notes.
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
