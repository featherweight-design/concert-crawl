# Auto-Versioning + Release Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `v0.4.2-beta` version string with automatic semver driven by `semantic-release`, wire a serialized CI → Release → Deploy Staging pipeline via GitHub Actions `workflow_run`, and surface the version from root `package.json` in the Next.js build.

**Architecture:** `semantic-release` runs as a new `release.yml` workflow triggered by `workflow_run` after CI passes on `main`. It bumps root `package.json`, writes `CHANGELOG.md`, commits both back to `main`, and creates a GitHub Release. `deploy-staging.yml` is re-triggered by `workflow_run` after `release.yml` completes (instead of directly on push), ensuring staging always deploys the released version. `apps/web/next.config.ts` imports root `package.json` at build time to construct `NEXT_PUBLIC_APP_VERSION`.

**Tech Stack:** `semantic-release` + Angular preset plugins, GitHub Actions `workflow_run`, pnpm workspaces, Next.js `next.config.ts` JSON import

---

## File Map

| Action | File | What changes |
|--------|------|--------------|
| Modify | `package.json` | Add `"version": "0.5.0"`, add 7 semantic-release devDependencies |
| Create | `.releaserc.json` | semantic-release config (branches, plugins) |
| Create | `.github/workflows/release.yml` | New Release workflow triggered by CI `workflow_run` |
| Modify | `.github/workflows/deploy-staging.yml` | Change trigger from `push` to `workflow_run` after Release |
| Modify | `apps/web/next.config.ts` | Import rootPkg, replace hardcoded version string |
| Modify | `docs/runbooks/production-launch.md` | Update 3 notes about version injection |
| Modify | `CLAUDE.md` | Record auto-versioning in Phase Sequence + Current Status |

All work is in the worktree at `.worktrees/feat/auto-versioning/`. Run all commands from there.

---

## Task 1: Set Root Version and Install semantic-release

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml` (updated by install)

- [ ] **Step 1: Add version field and dev dependencies to root `package.json`**

  Open `package.json`. Add `"version": "0.5.0"` as the second field after `"name"`, and add the following to `devDependencies`:

  ```json
  {
    "name": "concert-crawl",
    "version": "0.5.0",
    "private": true,
    "scripts": {
      "dev": "turbo run dev",
      "build": "turbo run build",
      "test": "turbo run test",
      "lint": "turbo run lint",
      "format": "prettier --write .",
      "typecheck": "turbo run typecheck",
      "db:generate": "turbo run db:generate --filter=@concert-crawl/db",
      "db:migrate": "turbo run db:migrate --filter=@concert-crawl/db",
      "db:seed": "turbo run db:seed --filter=@concert-crawl/db",
      "prepare": "husky"
    },
    "devDependencies": {
      "@commitlint/cli": "^19.0.0",
      "@commitlint/config-conventional": "^19.0.0",
      "@semantic-release/changelog": "^6.0.0",
      "@semantic-release/commit-analyzer": "^13.0.0",
      "@semantic-release/git": "^10.0.0",
      "@semantic-release/github": "^11.0.0",
      "@semantic-release/npm": "^12.0.0",
      "@semantic-release/release-notes-generator": "^14.0.0",
      "husky": "^9.0.0",
      "lint-staged": "^15.0.0",
      "prettier": "^3.0.0",
      "semantic-release": "^24.0.0",
      "turbo": "^2.0.0"
    },
    "lint-staged": {
      "**/*.{ts,tsx,js,json,md}": [
        "prettier --write"
      ]
    },
    "packageManager": "pnpm@10.33.2",
    "engines": {
      "node": ">=20",
      "pnpm": ">=9"
    }
  }
  ```

- [ ] **Step 2: Install to update the lockfile**

  ```bash
  pnpm install
  ```

  Expected: Installs new packages, updates `pnpm-lock.yaml`. No errors.

- [ ] **Step 3: Commit**

  ```bash
  git add package.json pnpm-lock.yaml
  git commit -m "chore: add semantic-release deps and set initial version 0.5.0"
  ```

---

## Task 2: Create `.releaserc.json`

**Files:**
- Create: `.releaserc.json`

- [ ] **Step 1: Create `.releaserc.json` at repo root**

  ```json
  {
    "branches": ["main"],
    "plugins": [
      "@semantic-release/commit-analyzer",
      "@semantic-release/release-notes-generator",
      "@semantic-release/changelog",
      ["@semantic-release/npm", { "npmPublish": false }],
      [
        "@semantic-release/git",
        {
          "assets": ["CHANGELOG.md", "package.json"],
          "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
        }
      ],
      "@semantic-release/github"
    ]
  }
  ```

  **Plugin roles:**
  - `commit-analyzer`: `feat:` → minor, `fix:`/`perf:` → patch, `BREAKING CHANGE` → major, `chore:`/`docs:`/`refactor:`/`test:` → no release
  - `release-notes-generator`: formats changelog entry (Angular preset: Features / Bug Fixes / Performance)
  - `changelog`: prepends formatted entry to `CHANGELOG.md`
  - `npm` (`npmPublish: false`): bumps `version` in root `package.json` only — never publishes to npm
  - `git`: commits `CHANGELOG.md` + `package.json` back to `main`
  - `github`: creates GitHub Release with generated notes and git tag

- [ ] **Step 2: Commit**

  ```bash
  git add .releaserc.json
  git commit -m "chore: add semantic-release config"
  ```

---

## Task 3: Create `release.yml` GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create `.github/workflows/release.yml`**

  ```yaml
  name: Release

  on:
    workflow_run:
      workflows: [CI]
      types: [completed]
      branches: [main]

  # Queue releases — never cancel. If two CI runs complete close together,
  # the second release waits for the first to finish.
  concurrency:
    group: release
    cancel-in-progress: false

  jobs:
    release:
      name: Release
      if: github.event.workflow_run.conclusion == 'success'
      runs-on: ubuntu-latest
      timeout-minutes: 10
      permissions:
        contents: write
        issues: write
        pull-requests: write
      steps:
        - name: Checkout
          uses: actions/checkout@v4
          with:
            fetch-depth: 0
            persist-credentials: false

        - name: Setup pnpm
          uses: pnpm/action-setup@v4

        - name: Setup Node.js
          uses: actions/setup-node@v4
          with:
            node-version: 24
            cache: pnpm

        - name: Install dependencies
          run: pnpm install --frozen-lockfile

        - name: Release
          run: pnpm exec semantic-release
          env:
            GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
            GIT_AUTHOR_NAME: github-actions[bot]
            GIT_AUTHOR_EMAIL: github-actions[bot]@users.noreply.github.com
            GIT_COMMITTER_NAME: github-actions[bot]
            GIT_COMMITTER_EMAIL: github-actions[bot]@users.noreply.github.com
  ```

  **Key design notes:**
  - `workflow_run` with `branches: [main]` — only fires for CI runs on `main`, not PRs
  - `if: github.event.workflow_run.conclusion == 'success'` — only runs if CI passed
  - `fetch-depth: 0` — semantic-release needs full git history to find the last tag
  - `persist-credentials: false` — semantic-release manages its own git auth via `GITHUB_TOKEN`
  - `GITHUB_TOKEN` pushes do not re-trigger GitHub Actions — no infinite loop risk
  - No-release case: if semantic-release finds no releasable commits (`chore:`/`docs:` only), it exits 0 and the workflow reports `success` — deploy-staging still fires correctly

- [ ] **Step 2: Commit**

  ```bash
  git add .github/workflows/release.yml
  git commit -m "chore(ci): add Release workflow triggered by CI workflow_run"
  ```

---

## Task 4: Update `deploy-staging.yml` Trigger

**Files:**
- Modify: `.github/workflows/deploy-staging.yml`

- [ ] **Step 1: Replace the `on:` trigger in `.github/workflows/deploy-staging.yml`**

  Current file content:
  ```yaml
  name: Deploy to Staging

  on:
    push:
      branches: [main]

  # Serialize all staging deploys. cancel-in-progress: false means a queued
  # deploy waits for the running one to finish rather than being replaced.
  concurrency:
    group: deploy-staging
    cancel-in-progress: false

  jobs:
    deploy-api:
      name: Deploy API (staging)
      environment: staging
      runs-on: ubuntu-latest
      timeout-minutes: 20
      steps:
        - name: Trigger Render deploy
          run: |
            curl --fail -X POST "${{ secrets.RENDER_DEPLOY_HOOK_API }}"

    deploy-web:
      name: Deploy Web (staging)
      environment: staging
      needs: deploy-api
      runs-on: ubuntu-latest
      timeout-minutes: 20
      steps:
        - name: Trigger Render deploy
          run: |
            curl --fail -X POST "${{ secrets.RENDER_DEPLOY_HOOK_WEB }}"
  ```

  Replace the `on:` block so the full file becomes:

  ```yaml
  name: Deploy to Staging

  on:
    workflow_run:
      workflows: [Release]
      types: [completed]
      branches: [main]

  # Serialize all staging deploys. cancel-in-progress: false means a queued
  # deploy waits for the running one to finish rather than being replaced.
  concurrency:
    group: deploy-staging
    cancel-in-progress: false

  jobs:
    deploy-api:
      name: Deploy API (staging)
      if: github.event.workflow_run.conclusion == 'success'
      environment: staging
      runs-on: ubuntu-latest
      timeout-minutes: 20
      steps:
        - name: Trigger Render deploy
          run: |
            curl --fail -X POST "${{ secrets.RENDER_DEPLOY_HOOK_API }}"

    deploy-web:
      name: Deploy Web (staging)
      environment: staging
      needs: deploy-api
      runs-on: ubuntu-latest
      timeout-minutes: 20
      steps:
        - name: Trigger Render deploy
          run: |
            curl --fail -X POST "${{ secrets.RENDER_DEPLOY_HOOK_WEB }}"
  ```

  **What changed:**
  - `on:` changed from `push: branches: [main]` to `workflow_run: workflows: [Release], types: [completed], branches: [main]`
  - Added `if: github.event.workflow_run.conclusion == 'success'` to `deploy-api` job (the first job; `deploy-web` already inherits the failure gate via `needs: deploy-api`)

  **Why:** Previously, deploy-staging fired on every push to `main` — which ran before semantic-release could bump the version, so staging would display the old version string. Now it fires only after the Release workflow completes successfully.

- [ ] **Step 2: Commit**

  ```bash
  git add .github/workflows/deploy-staging.yml
  git commit -m "chore(ci): retrigger deploy-staging after Release workflow_run"
  ```

---

## Task 5: Wire Version Injection in `next.config.ts`

**Files:**
- Modify: `apps/web/next.config.ts`

Note: `resolveJsonModule: true` is already set in `packages/config/tsconfig.base.json` and inherited by `apps/web/tsconfig.json` — no tsconfig change needed.

- [ ] **Step 1: Update `apps/web/next.config.ts`**

  Current file content:
  ```typescript
  import type { NextConfig } from 'next'
  import { withSentryConfig } from '@sentry/nextjs'

  const config: NextConfig = {
    reactStrictMode: true,
    transpilePackages: ['@concert-crawl/types'],
    env: {
      NEXT_PUBLIC_APP_VERSION: `v0.4.2-beta · ${process.env['RENDER_GIT_COMMIT']?.slice(0, 7) ?? 'dev'}`,
    },
  }

  export default withSentryConfig(config, {
    org: 'concert-crawl',
    project: 'concert-crawl-web',
    // Suppress output locally; print in CI for source map upload confirmation
    silent: !process.env['CI'],
    widenClientFileUpload: true,
    // Delete source maps from the build output after uploading to Sentry
    sourcemaps: {
      deleteSourcemapsAfterUpload: true,
    },
    webpack: {
      // Tree-shake Sentry logger statements from the client bundle
      treeshake: {
        removeDebugLogging: true,
      },
      automaticVercelMonitors: false,
    },
  })
  ```

  Replace with:
  ```typescript
  import type { NextConfig } from 'next'
  import { withSentryConfig } from '@sentry/nextjs'
  import rootPkg from '../../package.json'

  const config: NextConfig = {
    reactStrictMode: true,
    transpilePackages: ['@concert-crawl/types'],
    env: {
      NEXT_PUBLIC_APP_VERSION: `v${rootPkg.version} · ${process.env['RENDER_GIT_COMMIT']?.slice(0, 7) ?? 'dev'}`,
    },
  }

  export default withSentryConfig(config, {
    org: 'concert-crawl',
    project: 'concert-crawl-web',
    // Suppress output locally; print in CI for source map upload confirmation
    silent: !process.env['CI'],
    widenClientFileUpload: true,
    // Delete source maps from the build output after uploading to Sentry
    sourcemaps: {
      deleteSourcemapsAfterUpload: true,
    },
    webpack: {
      // Tree-shake Sentry logger statements from the client bundle
      treeshake: {
        removeDebugLogging: true,
      },
      automaticVercelMonitors: false,
    },
  })
  ```

  **Expected behavior after this change:**
  - Local dev: displays `v0.5.0 · dev` (no `RENDER_GIT_COMMIT` at dev time)
  - Staging/prod: displays `v0.5.1 · a3f9c12` once a release tag exists
  - `../../package.json` resolves correctly because Render's build step runs `pnpm build` from the workspace root

- [ ] **Step 2: Run typecheck to verify the JSON import is valid**

  ```bash
  pnpm typecheck
  ```

  Expected: No errors. TypeScript resolves `rootPkg.version` as `string` from the JSON import.

  If you see `Cannot find module '../../package.json'` — verify that `apps/web/tsconfig.json` extends `@concert-crawl/config/tsconfig` and that `packages/config/tsconfig.base.json` contains `"resolveJsonModule": true`. Both are true in this codebase; this error should not occur.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/next.config.ts
  git commit -m "feat(web): inject version from root package.json instead of hardcoded string"
  ```

---

## Task 6: Update Production Runbook

**Files:**
- Modify: `docs/runbooks/production-launch.md`

- [ ] **Step 1: Update line 109 (the note under the concert-crawl-web env var table)**

  Find this line:
  ```
  > `NEXT_PUBLIC_APP_VERSION` is auto-injected at build time from `RENDER_GIT_COMMIT` — no manual setup required.
  ```

  Replace with:
  ```
  > `NEXT_PUBLIC_APP_VERSION` is auto-injected at build time: the version prefix comes from the `version` field in root `package.json` (bumped automatically by `semantic-release`), and the commit hash suffix comes from `RENDER_GIT_COMMIT`. No manual setup required.
  ```

- [ ] **Step 2: Update line 178 (the note after Auto-Deploy configuration in Step 5)**

  Find this line:
  ```
  > A `deploy-production.yml` workflow (mirroring `deploy-staging.yml`) is needed to automate production deploys via GitHub Actions. Until that workflow exists, trigger production deploys manually from the Render dashboard.
  ```

  Replace with:
  ```
  > A `deploy-production.yml` workflow triggered on the `release: published` GitHub event is needed to automate production deploys. Each merge to `main` that contains a releasable commit (`feat:` or `fix:`) automatically creates a GitHub Release via `release.yml`. Until `deploy-production.yml` exists, trigger production deploys manually from the Render dashboard after a release appears in the GitHub Releases tab.
  ```

- [ ] **Step 3: Update line 279 (the Notes section)**

  Find this line:
  ```
  - `NEXT_PUBLIC_APP_VERSION` is injected at build time from `RENDER_GIT_COMMIT` — no manual setup needed
  ```

  Replace with:
  ```
  - `NEXT_PUBLIC_APP_VERSION` is injected at build time: version prefix from root `package.json` (auto-bumped by `semantic-release`), commit hash suffix from `RENDER_GIT_COMMIT` — no manual setup needed
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add docs/runbooks/production-launch.md
  git commit -m "docs(runbook): update version injection notes for semantic-release"
  ```

---

## Task 7: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add auto-versioning to Current Status bullet list**

  In the Current Status section, add a new bullet after the last "Active Claude workers" line:

  ```
  - Auto-versioning + release notes infrastructure in PR (feat/auto-versioning): semantic-release wired to CI pipeline; closes #154
  ```

- [ ] **Step 2: Add auto-versioning to Phase Sequence table**

  Add a new row to the Phase Sequence table (after the Genre tagger resilience row, before Pre-beta row):

  ```
  | —           | Auto-versioning + release notes          | 🔄 In PR (feat/auto-versioning, issue #154) |
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add CLAUDE.md
  git commit -m "chore: update CLAUDE.md — auto-versioning PR in progress"
  ```

---

## Task 8: Push and Open PR

- [ ] **Step 1: Push the branch**

  ```bash
  git push -u origin feat/auto-versioning
  ```

- [ ] **Step 2: Open the PR**

  ```bash
  gh pr create \
    --title "feat: automatic semver versioning via semantic-release" \
    --body "$(cat <<'EOF'
  ## Summary

  - Removes hardcoded `v0.4.2-beta` from `apps/web/next.config.ts`; version is now sourced from root `package.json` at build time
  - Adds `semantic-release` to root devDependencies with Angular preset plugins; initial version set to `0.5.0`
  - Creates `.github/workflows/release.yml` — triggered by `workflow_run` after CI passes on `main`; serialized via concurrency group
  - Updates `deploy-staging.yml` trigger from `push: branches: [main]` to `workflow_run` after Release completes, so staging always deploys the released version
  - Updates production runbook notes to document the new version injection approach

  ## Pipeline flow after this PR

  ```
  push to main
    → CI (unchanged)
    → Release (new — bumps package.json, writes CHANGELOG.md, creates GitHub Release)
    → Deploy Staging (now triggered by Release completion, not push)
  ```

  ## Post-merge manual step required

  **Branch protection:** Add `github-actions[bot]` as a bypass actor in the branch protection rule for `main` (Settings → Branches → Edit rule → Bypass list). Without this, semantic-release's commit back to `main` (the `chore(release): x.x.x [skip ci]` commit) will be rejected.

  ## Test plan

  - [ ] CI passes (typecheck, lint, test, build, integration)
  - [ ] After merge: verify Release workflow fires in Actions tab
  - [ ] If any `feat:` or `fix:` commits are included: verify GitHub Release is created and `package.json` version is bumped
  - [ ] Verify staging deploy fires after Release completes (not directly on push)
  - [ ] Verify staging app displays updated version string (e.g. `v0.5.1 · <commit>`)

  Closes #154
  EOF
  )"
  ```

- [ ] **Step 3: Note the post-merge manual action**

  After the PR merges, the repo owner must add `github-actions[bot]` as a bypass actor in the branch protection rule for `main`. Without this, semantic-release's commit back to `main` will be rejected by branch protection. Path: **GitHub → Settings → Branches → Edit rule for `main` → Bypass list → Add `github-actions[bot]`**.

---

## Post-Merge Verification Checklist

These steps are for the person who merges the PR:

1. Go to **Actions** tab — verify the `Release` workflow fires after CI completes
2. If the merge commit includes a releasable commit (`feat:` or `fix:`): confirm a new GitHub Release appears in the **Releases** tab with an auto-generated changelog
3. Confirm `Deploy to Staging` fires after `Release` completes (not directly on push)
4. Check the staging app's version string in the user menu footer — should show the bumped version + commit hash
5. Confirm `github-actions[bot]` has been added to the branch protection bypass list (otherwise the release commit will fail)
