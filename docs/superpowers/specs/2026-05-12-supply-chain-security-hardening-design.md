# Supply Chain Security Hardening

**Date:** 2026-05-12
**Trigger:** Mini Shai-Hulud npm supply chain attack (TeamPCP, May 2026) — 42 TanStack router packages injected with credential-harvesting malware via compromised CI/CD OIDC tokens and `prepare` lifecycle hooks. Concert Crawl was not affected but has meaningful exposure gaps.

---

## Current Posture

**Already solid:**
- `--frozen-lockfile` on every `pnpm install` across all 6 workflows
- `pnpm.overrides` in root `package.json` patching 3 known-vulnerable transitive deps
- Job-level timeouts on all CI jobs

**Gaps:**
- No `pnpm audit` in CI — known-critical vulnerabilities not flagged on PRs
- No Dependabot — no automated dependency updates for npm or GitHub Actions
- No auto-merge for Dependabot patch PRs — stale dep backlogs are a known security hygiene failure
- No install-script allowlist — any postinstall/prepare hook in any dep runs unchecked
- No `permissions` blocks on most workflows — jobs inherit broad defaults
- `devDependencies` use `^` ranges — `pnpm install` can silently resolve newer (potentially compromised) versions

---

## Design

### 1. `pnpm audit` in CI

Add a `security-audit` job to `ci.yml` that runs in parallel with typecheck/lint/test/build. It runs `pnpm audit --audit-level=high`, which fails the job on any dependency with a HIGH or CRITICAL severity CVE.

`--audit-level=high` rather than `critical` catches the widest dangerous set without flagging noisy low/moderate advisories. The job has no `needs:` dependency — it can run immediately on checkout.

### 2. Dependabot Configuration

Create `.github/dependabot.yml` with two ecosystems:

**npm** (`package-ecosystem: npm`):
- Directory: `/` (root, pnpm workspaces auto-discovered)
- Schedule: weekly on Monday
- Groups: `dev-dependencies` (all devDependencies together), `production-dependencies` separately
- Open PRs limit: 10
- Labels: `dependencies`, `automated`

**GitHub Actions** (`package-ecosystem: github-actions`):
- Directory: `/`
- Schedule: weekly on Monday
- Labels: `dependencies`, `automated`

Weekly (not daily) keeps PR noise manageable. Grouping dev deps means one PR per week for the whole devDependency surface rather than 15 individual PRs.

### 3. Dependabot Auto-Merge

Add `.github/workflows/dependabot-auto-merge.yml`. It triggers on `pull_request` events from `dependabot[bot]` and:

1. Uses `dependabot/fetch-metadata` to read the update type
2. For **patch** updates: approves the PR with `gh pr review --approve` and enables auto-merge (`gh pr merge --auto --rebase`)
3. For **minor** and **major** updates: leaves them for human review

Auto-merge only fires after all required CI checks pass (branch protection enforcement). This prevents stale patch backlogs while keeping humans in the loop for anything that could introduce breaking changes or new attack surface.

The workflow needs `pull-requests: write` and `contents: write` permissions.

### 4. Install-Script Allowlist

Add `onlyBuiltDependencies: []` to the `pnpm` key in root `package.json`. This tells pnpm to block all postinstall/install lifecycle scripts from running for any dependency.

This is safe: the lockfile currently has zero `requiresBuild` entries — no dependency in the tree currently relies on install scripts (esbuild 0.27+ uses optional peer deps for platform binaries instead). This directly closes the attack vector used by Mini Shai-Hulud, which hijacked `prepare` hooks to execute at install time.

If a future dependency legitimately needs an install script (e.g. a native addon), add it explicitly to the array by name.

### 5. Minimal Workflow Permissions

Add `permissions: read-all` at the top-level of every workflow that doesn't currently declare permissions. This sets the default for all jobs in that workflow to read-only. Jobs that need write access declare it explicitly at the job level.

Workflows and their required elevations:
- `ci.yml` — `read-all` at workflow level; no job needs write
- `release.yml` — already declares `contents: write`, `issues: write`, `pull-requests: write` at job level; add `permissions: read-all` at workflow level as a floor
- `deploy-staging.yml` — `read-all` at workflow level; no job needs write (uses deploy hook URLs)
- `crawler.yml` / `crawler-staging.yml` — `read-all` at workflow level; no write needed
- `smoke.yml` — `read-all` at workflow level
- `staging-e2e.yml` — `read-all` at workflow level
- `dependabot-auto-merge.yml` (new) — `pull-requests: write`, `contents: write` at workflow level (minimum needed for approve + auto-merge)

### 6. Exact Version Pins for `devDependencies`

Replace `^` ranges with exact versions in root `package.json` `devDependencies`. The current lockfile already pins these via `pnpm-lock.yaml`, but the `package.json` ranges mean a fresh `pnpm install --no-frozen-lockfile` (e.g. in a new environment or after manual lockfile deletion) could resolve newer, potentially compromised versions.

Current → exact versions (from what's already resolved in the lockfile):
- `turbo`: `^2.0.0` → `2.9.6`
- `prettier`: `^3.0.0` → `3.8.3`
- `@commitlint/cli`: `^19.0.0` → `19.8.1`
- `@commitlint/config-conventional`: `^19.0.0` → `19.8.1`
- `husky`: `^9.0.0` → `9.1.7`
- `lint-staged`: `^15.0.0` → `15.5.2`
- `semantic-release` and all `@semantic-release/*` packages: pin to currently resolved versions

---

## What This Does Not Cover

- **SHA pinning of GitHub Actions** — recommended long-term, deferred post-launch. Dependabot for Actions (item 2) provides fast detection of compromised tags with much lower maintenance overhead. Revisit when Renovate or a similar tool can automate SHA bumps.
- **CODEOWNERS file** — valuable for enforcing review requirements but separate from supply chain concerns; out of scope here.
- **Branch protection rules** — these are configured in GitHub UI, not in files. Verify that `main` requires all CI checks to pass and at least one approval before auto-merge can fire.

---

## Success Criteria

- `pnpm audit --audit-level=high` runs on every PR and blocks merge on HIGH/CRITICAL findings
- Dependabot opens weekly PRs for both npm and GitHub Actions updates
- Patch-level Dependabot PRs merge automatically after CI passes, with no human action required
- `pnpm install` with a malicious package containing a postinstall hook produces an error, not silent execution
- All workflows declare explicit minimum permissions; no workflow inherits broad defaults
- Root `package.json` devDependencies have no `^` or `~` ranges
