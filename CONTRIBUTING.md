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

Releases are fully automated by [semantic-release](https://github.com/semantic-release/semantic-release):

- CI runs on every push to `develop` / `main`.
- If any of the commits since the last tag are release-worthy, semantic-release
  computes the next version, updates `CHANGELOG.md` and `package.json`, tags the
  commit, publishes to npm with provenance, and creates a GitHub release.
- Nothing to do manually — just land conventional commits.

To preview what a branch would release:

```bash
pnpm release:dry-run
```

The dry-run also runs automatically on every PR and posts the predicted bump.
