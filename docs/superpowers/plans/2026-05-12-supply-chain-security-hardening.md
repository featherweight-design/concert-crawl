# Supply Chain Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close six supply chain security gaps identified after the Mini Shai-Hulud npm attack (May 2026): audit in CI, Dependabot, auto-merge for patch deps, install-script allowlist, minimal workflow permissions, and exact version pins.

**Architecture:** All changes are config-only — no application code is touched. CI is hardened first (audit + permissions), then dependency automation is layered on (Dependabot + auto-merge), then pnpm itself is locked down (onlyBuiltDependencies + version pins).

**Tech Stack:** GitHub Actions, pnpm 10, `dependabot/fetch-metadata@v2`, `gh` CLI (available in Actions runners).

**Worktree:** `/Users/huey/Projects/concert-crawl/.worktrees/chore/supply-chain-security`
**Branch:** `chore/supply-chain-security`

---

## File Map

| Action | Path |
|---|---|
| Modify | `.github/workflows/ci.yml` — add `security-audit` job + `permissions: read-all` |
| Modify | `.github/workflows/release.yml` — add `permissions: read-all` workflow floor |
| Modify | `.github/workflows/deploy-staging.yml` — add `permissions: read-all` |
| Modify | `.github/workflows/crawler.yml` — add `permissions: read-all` |
| Modify | `.github/workflows/crawler-staging.yml` — add `permissions: read-all` |
| Modify | `.github/workflows/smoke.yml` — add `permissions: read-all` |
| Modify | `.github/workflows/staging-e2e.yml` — add `permissions: read-all` |
| Create | `.github/dependabot.yml` — Dependabot config for npm + Actions |
| Create | `.github/workflows/dependabot-auto-merge.yml` — auto-approve/merge patch PRs |
| Modify | `package.json` — `onlyBuiltDependencies: []` + exact version pins |

---

## Task 1: Add `pnpm audit` job to CI + workflow-level permissions

**Files:**
- Modify: `.github/workflows/ci.yml`

This task adds two things to `ci.yml` simultaneously: a `security-audit` job that runs `pnpm audit --audit-level=high`, and `permissions: read-all` at the workflow level. No tests are needed — GitHub Actions validates workflow syntax at push time.

- [ ] **Step 1: Add `permissions: read-all` and `security-audit` job to `ci.yml`**

Open `.github/workflows/ci.yml`. Add `permissions: read-all` after the `on:` block (line 7), and add the `security-audit` job after the `install:` job block. The final file should look like this (showing the top and new job only — leave all existing jobs untouched):

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

permissions: read-all

jobs:
  install:
    # ... existing job unchanged ...

  security-audit:
    name: Security audit
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Audit dependencies
        run: pnpm audit --audit-level=high

  typecheck:
    # ... existing job unchanged ...
```

Note: `security-audit` has no `needs:` — it runs in parallel with all other jobs. `fetch-depth: 1` (not 2) is sufficient since this job doesn't use git history.

- [ ] **Step 2: Commit**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/chore/supply-chain-security
git add .github/workflows/ci.yml
git commit -m "chore(ci): add pnpm audit job and read-all permissions to CI workflow"
```

---

## Task 2: Add `permissions: read-all` to remaining five workflows

**Files:**
- Modify: `.github/workflows/release.yml`
- Modify: `.github/workflows/deploy-staging.yml`
- Modify: `.github/workflows/crawler.yml`
- Modify: `.github/workflows/crawler-staging.yml`
- Modify: `.github/workflows/smoke.yml`
- Modify: `.github/workflows/staging-e2e.yml`

Each workflow gets `permissions: read-all` inserted immediately after the `on:` block (or after the `concurrency:` block where one exists). Jobs that need write access already declare it at the job level — `release.yml`'s job already has `contents: write`, `issues: write`, `pull-requests: write`, which override the workflow-level floor.

- [ ] **Step 1: Add `permissions: read-all` to `release.yml`**

After the `concurrency:` block (line 11), insert:

```yaml
permissions: read-all
```

The `release` job's existing `permissions:` block at line 19 continues to apply and overrides the workflow-level default for that job.

- [ ] **Step 2: Add `permissions: read-all` to `deploy-staging.yml`**

After the `concurrency:` block, insert:

```yaml
permissions: read-all
```

- [ ] **Step 3: Add `permissions: read-all` to `crawler.yml`**

After the `on:` block (after the `workflow_dispatch:` line), insert:

```yaml
permissions: read-all
```

- [ ] **Step 4: Add `permissions: read-all` to `crawler-staging.yml`**

Same as `crawler.yml` — after the `on:` block.

- [ ] **Step 5: Add `permissions: read-all` to `smoke.yml`**

After the `on:` block.

- [ ] **Step 6: Add `permissions: read-all` to `staging-e2e.yml`**

After the `on:` block.

- [ ] **Step 7: Commit**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/chore/supply-chain-security
git add .github/workflows/release.yml \
        .github/workflows/deploy-staging.yml \
        .github/workflows/crawler.yml \
        .github/workflows/crawler-staging.yml \
        .github/workflows/smoke.yml \
        .github/workflows/staging-e2e.yml
git commit -m "chore(ci): add permissions: read-all to all remaining workflows"
```

---

## Task 3: Create `.github/dependabot.yml`

**Files:**
- Create: `.github/dependabot.yml`

- [ ] **Step 1: Create `.github/dependabot.yml`**

```yaml
version: 2

updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday
    open-pull-requests-limit: 10
    labels:
      - dependencies
      - automated
    groups:
      dev-dependencies:
        dependency-type: development
      production-dependencies:
        dependency-type: production

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
      day: monday
    labels:
      - dependencies
      - automated
```

The `groups` block means all devDependency updates ship as one PR per week rather than one per package. Production deps are grouped separately so they get individual review visibility.

- [ ] **Step 2: Commit**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/chore/supply-chain-security
git add .github/dependabot.yml
git commit -m "chore(deps): add Dependabot config for npm and GitHub Actions"
```

---

## Task 4: Create Dependabot auto-merge workflow

**Files:**
- Create: `.github/workflows/dependabot-auto-merge.yml`

This workflow auto-approves and enables auto-merge for patch-level Dependabot PRs. It requires `pull-requests: write` and `contents: write` at the workflow level (the minimum for `gh pr review` and `gh pr merge`). It uses `dependabot/fetch-metadata` to distinguish patch from minor/major updates.

**Important:** For auto-merge to actually land, the repository must have "Allow auto-merge" enabled in GitHub Settings → General → Pull Requests. This is a UI setting — verify it's on after deploying this workflow.

- [ ] **Step 1: Create `.github/workflows/dependabot-auto-merge.yml`**

```yaml
name: Dependabot auto-merge

on:
  pull_request:

permissions:
  pull-requests: write
  contents: write

jobs:
  auto-merge:
    name: Auto-merge patch updates
    runs-on: ubuntu-latest
    if: github.actor == 'dependabot[bot]'
    steps:
      - name: Fetch Dependabot metadata
        id: metadata
        uses: dependabot/fetch-metadata@v2
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Auto-approve and merge patch updates
        if: steps.metadata.outputs.update-type == 'version-update:semver-patch'
        run: |
          gh pr review "$PR_URL" --approve --body "Auto-approving patch update."
          gh pr merge "$PR_URL" --auto --rebase
        env:
          PR_URL: ${{ github.event.pull_request.html_url }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Minor and major updates are left untouched — they will appear in Dependabot's weekly PR batch for human review.

- [ ] **Step 2: Commit**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/chore/supply-chain-security
git add .github/workflows/dependabot-auto-merge.yml
git commit -m "chore(ci): add Dependabot auto-merge workflow for patch updates"
```

---

## Task 5: Add install-script allowlist to `package.json`

**Files:**
- Modify: `package.json`

pnpm's `onlyBuiltDependencies` config key is an explicit allowlist of package names permitted to run postinstall/install lifecycle scripts. Setting it to an empty array blocks all install scripts. This is safe: the lockfile currently has zero `requiresBuild` entries — no dep in this tree uses install scripts (esbuild 0.27+ uses optional peer deps for platform binaries instead of postinstall).

- [ ] **Step 1: Add `onlyBuiltDependencies: []` to the `pnpm` key in `package.json`**

The current `pnpm` key in `package.json`:

```json
"pnpm": {
  "overrides": {
    "fast-uri": "^3.1.2",
    "ip-address": "^10.2.0",
    "postcss": "^8.5.14"
  }
}
```

Update it to:

```json
"pnpm": {
  "overrides": {
    "fast-uri": "^3.1.2",
    "ip-address": "^10.2.0",
    "postcss": "^8.5.14"
  },
  "onlyBuiltDependencies": []
}
```

- [ ] **Step 2: Verify `pnpm install` still works**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/chore/supply-chain-security
pnpm install --frozen-lockfile
```

Expected: install completes with no errors. If any package prints a warning about a blocked install script, that package must be added to `onlyBuiltDependencies` by name (e.g. `["esbuild"]`).

- [ ] **Step 3: Commit**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/chore/supply-chain-security
git add package.json
git commit -m "chore(security): block all dependency install scripts via onlyBuiltDependencies"
```

---

## Task 6: Pin exact versions for root `devDependencies`

**Files:**
- Modify: `package.json`

Replace all `^` ranges in `devDependencies` with exact versions taken directly from `pnpm-lock.yaml`. This prevents a fresh `pnpm install --no-frozen-lockfile` from silently resolving a newer (potentially compromised) version.

- [ ] **Step 1: Update `devDependencies` in `package.json`**

Replace the entire `devDependencies` block with:

```json
"devDependencies": {
  "turbo": "2.9.6",
  "prettier": "3.8.3",
  "@commitlint/cli": "19.8.1",
  "@commitlint/config-conventional": "19.8.1",
  "husky": "9.1.7",
  "lint-staged": "15.5.2",
  "semantic-release": "24.2.9",
  "@semantic-release/changelog": "6.0.3",
  "@semantic-release/commit-analyzer": "13.0.1",
  "@semantic-release/git": "10.0.1",
  "@semantic-release/github": "11.0.6",
  "@semantic-release/npm": "12.0.2",
  "@semantic-release/release-notes-generator": "14.1.1"
}
```

- [ ] **Step 2: Verify `pnpm install` still works**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/chore/supply-chain-security
pnpm install --frozen-lockfile
```

Expected: install completes cleanly. `--frozen-lockfile` verifies the lockfile is consistent with the new exact-version declarations. If pnpm errors with a lockfile mismatch, run `pnpm install` (without the flag) once to update the lockfile, then re-run with `--frozen-lockfile` to confirm.

- [ ] **Step 3: Commit**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/chore/supply-chain-security
git add package.json pnpm-lock.yaml
git commit -m "chore(security): pin root devDependencies to exact versions"
```

---

## Task 7: Open PR closing issue #275

- [ ] **Step 1: Rebase onto latest main**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/chore/supply-chain-security
git fetch origin
git rebase origin/main
```

- [ ] **Step 2: Run typecheck and lint to confirm nothing broken**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/chore/supply-chain-security
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
```

Expected: both pass with no errors.

- [ ] **Step 3: Push and open PR**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/chore/supply-chain-security
git push -u origin chore/supply-chain-security
gh pr create \
  --title "chore(security): supply chain hardening — audit, Dependabot, install allowlist, permissions, version pins" \
  --body "$(cat <<'EOF'
## Summary

- Adds `pnpm audit --audit-level=high` job to CI — blocks merge on HIGH/CRITICAL CVEs
- Adds `.github/dependabot.yml` — weekly PRs for npm + GitHub Actions updates
- Adds `dependabot-auto-merge.yml` — patch updates auto-merge after CI passes
- Adds `onlyBuiltDependencies: []` to pnpm config — blocks all dependency install scripts (closes the attack vector used by Mini Shai-Hulud)
- Adds `permissions: read-all` to all 7 workflows — principle of least privilege
- Pins all root `devDependencies` to exact versions — no silent resolution of newer versions

Closes #275

## Notes for reviewer

- Auto-merge requires "Allow auto-merge" to be enabled in repo Settings → General → Pull Requests (UI setting, not in code)
- `onlyBuiltDependencies: []` is safe: the lockfile has zero `requiresBuild` entries today. If a future dep needs an install script, add it by name to the array.
- Minor/major Dependabot PRs are intentionally left for human review.

## Test plan

- [ ] CI passes on this PR (including the new `security-audit` job)
- [ ] Verify `pnpm audit` job appears in the Actions run for this PR
- [ ] After merge, confirm Dependabot opens PRs on the next Monday schedule
- [ ] Verify repo Settings → General → Pull Requests has "Allow auto-merge" enabled
- [ ] Verify branch protection for `main` includes `security-audit` as a required check
EOF
)"
```
