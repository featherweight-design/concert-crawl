# Automatic Versioning + Release Notes Infrastructure

**Date:** 2026-05-10
**Issue:** #154
**Status:** Approved

---

## Overview

Remove the hardcoded version prefix (`v0.4.2-beta`) from `apps/web/next.config.ts` and replace it with automatic semver driven by conventional commits via `semantic-release`. Wire a standalone `release.yml` GitHub Actions workflow into the existing CI pipeline. Surface the version string from root `package.json` at Render build time. Generate a `CHANGELOG.md` and GitHub Releases as the foundation for the future in-app release notes UX (tracked separately in issue #168).

---

## Section 1 — Pipeline Architecture

The pipeline is a serialized three-stage chain triggered by a push to `main`:

```
push to main
  → CI (existing ci.yml, unchanged)
  → Release (new release.yml, workflow_run after CI)
  → Deploy Staging (existing deploy-staging.yml, workflow_run after Release)
```

**CI (`ci.yml`)** — unchanged. Runs typecheck, lint, test, build, integration tests on every push to main and every PR.

**Release (`release.yml`)** — new workflow. Triggers via `workflow_run` when CI completes successfully on `main`. Runs `semantic-release`, which:
- Analyzes conventional commits since the last tag
- Bumps root `package.json` version
- Writes/updates `CHANGELOG.md`
- Commits `CHANGELOG.md` + `package.json` back to `main` with message `chore(release): <version> [skip ci]`
- Creates a git tag and GitHub Release

Uses `concurrency: { group: release, cancel-in-progress: false }` — queues releases, never cancels. If two CI runs complete close together, the second release waits for the first to finish.

Pushes use `GITHUB_TOKEN`, which does not re-trigger GitHub Actions workflows — no infinite loop risk.

**Deploy Staging (`deploy-staging.yml`)** — trigger changes from `push: branches: [main]` to `workflow_run: workflows: [Release], types: [completed]` with condition `if: github.event.workflow_run.conclusion == 'success'`. Already has `concurrency: { group: deploy-staging, cancel-in-progress: false }`. Unchanged otherwise.

**No-release case:** If semantic-release finds no releasable commits (only `chore:`/`docs:`), it exits 0 without bumping the version. `release.yml` still reports `success`, staging still deploys — correct, because new code landed on `main` regardless.

**Future production deploy:** A `deploy-production.yml` workflow (not built in this issue) can trigger on `release: published` event, ensuring prod deploys only happen when a version tag exists.

**Branch protection caveat:** The `github-actions[bot]` actor must be added as a bypass actor in the branch protection rule for `main` (Settings → Branches → Edit rule → Bypass list). Without this, semantic-release's commit back to `main` will be rejected.

---

## Section 2 — semantic-release Configuration

**`.releaserc.json`** at the repo root:

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    ["@semantic-release/npm", { "npmPublish": false }],
    ["@semantic-release/git", {
      "assets": ["CHANGELOG.md", "package.json"],
      "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
    }],
    "@semantic-release/github"
  ]
}
```

**Plugin roles:**

| Plugin | Role |
|---|---|
| `commit-analyzer` | `feat:` → minor, `fix:`/`perf:` → patch, `BREAKING CHANGE:` → major, `chore:`/`docs:`/`refactor:`/`test:` → no release |
| `release-notes-generator` | Formats changelog entry (Angular preset: Features / Bug Fixes / Performance) |
| `changelog` | Prepends formatted entry to `CHANGELOG.md` |
| `npm` (`npmPublish: false`) | Bumps `version` in root `package.json`; never publishes to npm |
| `git` | Commits `CHANGELOG.md` + `package.json` back to `main` |
| `github` | Creates GitHub Release with generated notes and git tag |

**Initial version:** Root `package.json` version set to `0.5.0` — the start of the auto-versioned era. First `fix:` after merge → `0.5.1`; first `feat:` → `0.6.0`.

**Semver approach:** Clean semver only (`v0.5.0`, not `v0.5.0-beta`). "Beta" is a UI-only label — it stays in the UserMenu status footer as a static string and has no connection to the version tag.

**Dev dependencies added to root `package.json`:**
- `semantic-release`
- `@semantic-release/commit-analyzer`
- `@semantic-release/release-notes-generator`
- `@semantic-release/changelog`
- `@semantic-release/npm`
- `@semantic-release/git`
- `@semantic-release/github`

---

## Section 3 — Version Injection

**Current (`apps/web/next.config.ts` line 8):**
```typescript
NEXT_PUBLIC_APP_VERSION: `v0.4.2-beta · ${process.env['RENDER_GIT_COMMIT']?.slice(0, 7) ?? 'dev'}`,
```

**Replacement:**
```typescript
import rootPkg from '../../package.json'

// in config:
NEXT_PUBLIC_APP_VERSION: `v${rootPkg.version} · ${process.env['RENDER_GIT_COMMIT']?.slice(0, 7) ?? 'dev'}`,
```

Requires `resolveJsonModule: true` in `apps/web/tsconfig.json` (verify; add if missing).

No new env vars. No Render config changes. Render's build step runs `pnpm build` from the workspace root, so `../../package.json` resolves correctly.

**Local dev:** displays `v0.5.0 · dev` (no commit hash at dev build time).
**Staging/prod:** displays `v0.5.1 · a3f9c12` once a release tag exists.

**UserMenu display:** `apps/web/src/components/consumer/user-menu/UserMenu.tsx` already splits `APP_VERSION` on ` · ` into `buildLabel` and `commitLabel` — no changes needed there. The future in-app changelog link (issue #168) will be added to this component by Design.

---

## Section 4 — Monorepo Considerations

Single root version, no per-package versioning.

- The `version` field in root `package.json` is the canonical version for the entire Concert Crawl product.
- Workspace packages (`packages/db`, `packages/types`, `packages/logger`, etc.) are internal and do not publish to npm. Their `package.json` version fields are irrelevant and untouched.
- `@semantic-release/npm` with `npmPublish: false` bumps only the root `package.json`.
- Root `package.json` already has `"private": true` — semantic-release respects this and will not publish regardless, but `npmPublish: false` is kept for explicit clarity.
- Only `apps/web` imports the version string at build time. `apps/api` and `apps/crawler` do not surface a version string and require no changes.

---

## Production Runbook Updates

The following lines in `docs/runbooks/production-launch.md` must be updated as part of this implementation:

**Line 109** (Step 4 — concert-crawl-web table note):
- Current: "`NEXT_PUBLIC_APP_VERSION` is auto-injected at build time from `RENDER_GIT_COMMIT` — no manual setup required."
- Updated: "`NEXT_PUBLIC_APP_VERSION` is auto-injected at build time: the version prefix comes from the `version` field in root `package.json` (bumped automatically by `semantic-release`), and the commit hash suffix comes from `RENDER_GIT_COMMIT`. No manual setup required."

**Line 178** (Step 5 — note after Auto-Deploy configuration):
- Current: "A `deploy-production.yml` workflow (mirroring `deploy-staging.yml`) is needed to automate production deploys via GitHub Actions. Until that workflow exists, trigger production deploys manually from the Render dashboard."
- Updated: "A `deploy-production.yml` workflow triggered on the `release: published` GitHub event is needed to automate production deploys. Each merge to `main` that contains a releasable commit (`feat:` or `fix:`) automatically creates a GitHub Release via `release.yml`. Until `deploy-production.yml` exists, trigger production deploys manually from the Render dashboard after a release appears in the GitHub Releases tab."

**Line 279** (Notes section):
- Current: "`NEXT_PUBLIC_APP_VERSION` is injected at build time from `RENDER_GIT_COMMIT` — no manual setup needed"
- Updated: "`NEXT_PUBLIC_APP_VERSION` is injected at build time: version prefix from root `package.json` (auto-bumped by `semantic-release`), commit hash suffix from `RENDER_GIT_COMMIT` — no manual setup needed"

---

## Summary

| Concern | Solution |
|---|---|
| Auto semver | `semantic-release` on root `package.json` |
| Commit → bump mapping | `feat:` → minor, `fix:`/`perf:` → patch, breaking → major |
| Release trigger | `workflow_run` after CI, serialized via concurrency group |
| Staging deploy trigger | `workflow_run` after Release, serialized via concurrency group |
| Version in UI | `import rootPkg from '../../package.json'` in `next.config.ts` |
| Changelog | `CHANGELOG.md` + GitHub Releases |
| In-app UX | Deferred to issue #168 (Design) |
| Monorepo scope | Root version only; workspace packages unversioned |
| Initial version | `0.5.0` |
| Branch protection | Add `github-actions[bot]` as bypass actor on `main` |
