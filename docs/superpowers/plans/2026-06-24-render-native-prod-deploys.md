# Render-native prod deploys — migration plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `workflow_run`-chained prod deploy pipeline with Render's native git auto-deploy, smoked by a new push-triggered workflow that waits for Render to be live on the pushed SHA and rolls back on smoke failure.

**Architecture:** Push to `main` → Render auto-deploys the three prod services (`concert-crawl-api`, `concert-crawl-crawler-triggers`, `concert-crawl-crawler-daily`) on their own git integration. In parallel, `prod-smoke-after-deploy.yml` fires on the same `push: main` event, waits up to 5 min for the API to reach `live` on `github.sha` via the existing `render-wait-for-live.sh`, then runs the Playwright smoke suite against prod. On smoke failure it invokes `render-rollback.sh` for the API and emits warnings for the two cron services (Render's API rejects cron rollback). `deploy-prod.yml` keeps every gate, deploy, smoke, and rollback job intact but is reduced to `workflow_dispatch`-only as a defense-in-depth escape hatch.

**Tech Stack:** GitHub Actions, Render REST API, Playwright (E2E + smoke), Resend (admin notifications), bash + jq.

## Why push-triggered, not cron-polled

An earlier draft proposed a 5-minute cron that polled Render for the live API SHA and smoked when it changed. That design was rejected on three grounds:

- **Brittleness:** GH Actions schedule cron is one of the least reliable triggers in the system. `push` is one of the most.
- **Cost:** the cron's idle runs cost ~$35/mo more in private-repo runner minutes than the push-triggered design (4,320 idle min/month at $0.008/min).
- **Latency:** the cron has a 5-min worst-case detection lag; the push-triggered workflow is already running by the time Render finishes building.

The "we don't have a webhook telling us when Render is done" argument that motivated the cron was confused: we don't need a deploy-complete signal — we need a "main moved" signal, which GitHub gives us natively. The "wait for Render" piece is unavoidable in any design, but at ~2-min typical Render deploys (verified across 15 recent deploys: 1:50–2:26, median ~2:00) it's a bounded 5-min inner-loop wait, not an outer-loop cron.

## Global Constraints

- **Never delete the existing gate or rollback logic in `deploy-prod.yml`.** Per the issue brief, the SHA-drift gate and the smoke/rollback jobs stay as defense-in-depth for the `workflow_dispatch` escape hatch. Only the `workflow_run:` trigger is removed.
- **All file changes in worktree `.worktrees/feat-render-native-prod-deploys/`.** Main repo (`/Users/huey/Projects/concert-crawl`) stays clean.
- **Branch `feat/render-native-prod-deploys`.** This branch carries the plan PR. Implementation lands in a subsequent PR on a new branch.
- **Conventional commits.** `feat:`, `chore:`, `docs:` per `CLAUDE.md`.
- **Two-character minimum identifier length** (ESLint rule applies even to bash; use `idx` not `i`).
- **No `--no-verify` on commits.** Husky pre-commit hooks must pass.
- **Run typecheck + lint + test in the worktree before push** (applies to the implementation PR; this plan-only PR has no code).
- **Issue closes-link.** Implementation PR body includes `Closes #786`; this plan PR body uses `Refs #786`.
- **Release notes:** infra, not user-facing. **No `releases.ts` entry.** No `progress.md` row.
- **Env vars in PR description.** New env vars listed in the implementation PR body. This plan introduces one: `PROD_SMOKE_RECONCILER_ENABLED` repo variable (kill switch, defaults to `false`).

## Open question for human review (does not block plan PR merge)

**The issue's "Migration sequence" step 1 says:**

> Add branch protection rules requiring CI + Staging Smoke Tests as passing status checks before merge.

**Reality check:**
- The 6 CI job names (`Install dependencies`, `Lint`, `Test`, `Typecheck`, `Build`, `Security audit`) are **already required** on `main` via Ruleset 15513412.
- `Staging Smoke Tests` runs on `workflow_run` after `Deploy to Staging`, which itself runs on `workflow_run` after `CI`. **Staging Smoke never reports against PR head SHAs.** Adding it as a required check today would block every PR merge indefinitely.

**Three resolutions:**

1. **No-op for branch protection.** CI already required → nothing to add. Staging-smoke stays as a post-merge alert (failure surfaces via GHA email + Sentry). **Recommended** — matches the architecture and is achievable in this PR.
2. **Add `Staging Smoke Tests` as a required check on push to `main`** via the ruleset's `strict_required_status_checks_policy`. Cosmetic post-merge enforcement; doesn't change behavior.
3. **Promote staging-smoke to a true pre-merge gate.** Requires PR-specific staging or GitHub merge queue. **Out of scope** — separate spec.

**Default in this plan: option 1.** Hugh picks during plan PR review; if option 2 is chosen, I'll add a one-step task. Option 3 spawns a follow-up issue.

## File map (all paths relative to repo root)

**Create:**
- `.github/workflows/prod-smoke-after-deploy.yml` — new push-triggered workflow.

**Modify:**
- `.github/scripts/render-wait-for-live.sh` — add optional 3rd arg for timeout (default 600s, backward-compatible). New workflow passes 300s; staging-smoke's existing call is unchanged.
- `.github/workflows/deploy-prod.yml` — remove `workflow_run:` trigger; keep every job. Remove the now-unreachable `Verify staging-smoke gate` step. Update header comment to reflect manual-escape-hatch role. Leave the `if: github.event_name == 'workflow_run'` SHA-drift guards in place per issue brief — they're unreachable but kept so re-enabling the trigger is a one-line revert.
- `docs/runbooks/auto-deploy-prod.md` — rewrite "Pipeline overview" + "Enabling the pipeline" sections; add `PROD_SMOKE_RECONCILER_ENABLED` to the variables table.
- `docs/runbooks/production-launch.md` — light edits to deploy-pipeline language.

**Render dashboard actions (operator, post-merge of implementation PR):**
- `concert-crawl-api` (srv-d7lngqfavr4c73eme3b0): flip `Auto-Deploy: yes`
- `concert-crawl-crawler-triggers` (crn-d8o7c10k1i2s7389t3v0): flip `Auto-Deploy: yes`
- `concert-crawl-crawler-daily` (crn-d8o7egog4nts73d2tni0): flip `Auto-Deploy: yes`

**GH repo configuration (operator, post-merge):**
- New repo variable `PROD_SMOKE_RECONCILER_ENABLED=true` (Settings → Variables → Actions).

## This-branch vs. implementation-branch split

This branch (`feat/render-native-prod-deploys`) carries **only this plan document**. Open a PR for human + Copilot review of the plan itself; merge after approval.

Implementation tasks below execute on a new branch (`feat/render-native-prod-deploys-impl` or similar) opened after the plan PR merges. The implementation PR carries all code/runbook changes and is the one Hugh validates end-to-end.

## Migration sequence

1. **Plan PR (this branch):** plan document only. Copilot reviews + merges.
2. **Implementation PR (new branch):** Tasks 1–4 below. Opens with new branch, all code + runbook changes, Copilot review loop, then merge.
3. **Operator action (Hugh, post-implementation-merge):** flip `Auto-Deploy: yes` on the three Render prod services + set `PROD_SMOKE_RECONCILER_ENABLED=true`.
4. **Validate:** trigger a no-op merge to `main`; confirm Render builds without GH dispatch + smoke workflow runs and turns green.
5. **Failure-path validation:** temporarily flip `PROD_API_URL` to a bogus value, `workflow_dispatch` the smoke workflow, confirm rollback fires.

## Rollback story for the migration itself

- **Render auto-deploy starts deploying broken code.** Flip `Auto-Deploy: no` on all three prod services. `deploy-prod.yml workflow_dispatch` retains every job — manual deploys still work.
- **`prod-smoke-after-deploy.yml` fires falsely or rolls back when it shouldn't.** Flip `PROD_SMOKE_RECONCILER_ENABLED=false`. Render still auto-deploys but smoke + rollback stop.
- **Bad SHA already in prod, smoke didn't catch it.** Invoke `rollback-prod.yml workflow_dispatch` — unchanged manual path.
- **Total revert.** `git revert <PR merge commit>` on main restores the `workflow_run:` trigger on `deploy-prod.yml`. The 4-deep chain returns.

---

## Task 1: Make `render-wait-for-live.sh` timeout configurable

**Files:**
- Modify: `.github/scripts/render-wait-for-live.sh`

**Interfaces:**
- Consumes: same env (`RENDER_API_TOKEN`), same first two args (`<service-id> <expected-sha>`). New optional 3rd arg: `<timeout-seconds>` (default 600).
- Produces: same — exit 0 when service is live on expected SHA; exit 1 on timeout.

- [ ] **Step 1: Edit the script to accept an optional timeout arg.**

Replace the existing `timeout=600` line near the top of the loop block with:

```bash
SERVICE_ID="${1:?service id required}"
EXPECTED_SHA="${2:?expected commit sha required}"
# Optional 3rd arg: timeout in seconds. Defaults to 600 (10 min) for
# backward compatibility with the staging-smoke caller. The new
# prod-smoke-after-deploy.yml passes 300 (5 min) because the prod
# API deploys consistently take ~2 min on Render — see plan
# 2026-06-24-render-native-prod-deploys.md for the deploy-time data.
timeout="${3:-600}"

: "${RENDER_API_TOKEN:?RENDER_API_TOKEN must be set}"

# Validate timeout is a positive integer. A bad value (e.g. "5m" or
# "300s") would silently coerce to 0 in arithmetic context and the
# loop would exit immediately; fail loud instead.
if ! [[ "${timeout}" =~ ^[0-9]+$ ]] || [ "${timeout}" -le 0 ]; then
  echo "✗ timeout arg must be a positive integer (seconds); got '${3}'" >&2
  exit 1
fi
```

(The arithmetic-coercion validation is the only new logic; default-600 keeps every existing caller working.)

- [ ] **Step 2: Update the user-facing echo line to reference the dynamic value.**

```bash
echo "→ Waiting for service ${SERVICE_ID} to be live on ${EXPECTED_SHA} (up to ${timeout}s)"
```

(Already uses `${timeout}` in the original — confirm no string concat changes are needed.)

- [ ] **Step 3: Verify existing staging-smoke usage still works.**

```bash
grep -n 'render-wait-for-live.sh' .github/workflows/staging-smoke.yml
```

Expected: one call site, two args only (`"${{ vars.RENDER_SERVICE_ID_API_STAGING }}" "${{ steps.wait_target.outputs.sha }}"`). No change needed — the default-600 keeps it working.

- [ ] **Step 4: Manual smoke test against staging (read RENDER_API_TOKEN from worktree's apps/api/.env.local).**

```bash
RENDER_API_TOKEN=<token> bash .github/scripts/render-wait-for-live.sh \
  srv-d7lnkdmgvqtc73f8eec0 \
  $(git rev-parse origin/main) \
  300
```

Expected: either ✓ "live on ${SHA} after Ns" (Render is up to date), or a clean "did not reach live within 300s" timeout. Either is fine — confirms the timeout arg is plumbed correctly.

- [ ] **Step 5: Commit.**

```bash
git add .github/scripts/render-wait-for-live.sh
git commit -m "feat(deploy-prod): accept optional timeout arg in render-wait-for-live

Default stays at 600s for backward compat (staging-smoke). New
prod-smoke-after-deploy.yml passes 300s — prod API deploys take ~2 min
consistently (15-deploy sample), so 5 min is plenty.

Refs #786"
```

---

## Task 2: Add `prod-smoke-after-deploy.yml`

**Files:**
- Create: `.github/workflows/prod-smoke-after-deploy.yml`

**Interfaces:**
- Consumes: `vars.RENDER_SERVICE_ID_API`, `vars.RENDER_SERVICE_ID_CRAWLER_*`, `vars.PROD_URL`, `vars.PROD_API_URL`, `vars.ADMIN_EMAIL`, `vars.PROD_SMOKE_RECONCILER_ENABLED` (new kill switch), `secrets.RENDER_API_TOKEN`, `secrets.RESEND_API_KEY`, `secrets.SENTRY_DSN_SMOKE`, `secrets.E2E_TEST_USER_*`.
- Produces: smoke-test job result + Resend admin email on rollback.

- [ ] **Step 1: Create the workflow with push + workflow_dispatch trigger and the kill switch gate.**

```yaml
name: Prod smoke (after Render auto-deploy)

# Triggered on every push to main. Waits up to 5 min for Render to
# deploy github.sha to the prod API service, then runs the Playwright
# smoke suite against prod. On smoke failure, rolls back via
# render-rollback.sh (API only — Render's API rejects cron rollback;
# the two crawler crons emit warnings).
#
# Replaces the smoke + rollback jobs that used to run inside
# deploy-prod.yml under the workflow_run-triggered chain. Under the
# new model Render's git integration auto-deploys prod on push to main
# (no GH Actions dispatch involved); this workflow runs in parallel
# with that deploy, waits for it to be live, then smokes.
#
# Why push, not cron: GH Actions schedule cron is unreliable, costs
# ~$35/mo more in idle runner minutes (private-repo billing), and
# adds a 5-min worst-case detection lag. Push is the most reliable
# trigger in the system and fires the moment main moves. See plan
# doc 2026-06-24-render-native-prod-deploys.md for the analysis.
#
# Why no [skip ci] filter: semantic-release lands a release commit
# (`chore(release): X.Y.Z [skip ci]`) ~3 min after each merge. The
# [skip ci] convention automatically prevents this workflow from
# firing for that commit. The merge commit's smoke workflow runs
# against Render's live SHA at the time of smoke — by then Render
# may already be on the release commit (which is the merge commit's
# code + a package.json version bump). Smoke validity is preserved
# either way.
#
# Disabled by default. Flip PROD_SMOKE_RECONCILER_ENABLED to 'true'.
# See docs/runbooks/auto-deploy-prod.md.

on:
  push:
    branches: [main]
  workflow_dispatch:

# Share concurrency group with deploy-prod.yml + rollback-prod.yml so
# the smoke can't race a manual deploy or a manual rollback against
# the same services. cancel-in-progress: false means a queued smoke
# waits rather than being replaced — matches the rest of the prod
# pipeline.
concurrency:
  group: prod-pipeline
  cancel-in-progress: false

# Default read; this workflow doesn't push tags or commit.
permissions:
  contents: read

jobs:
  smoke:
    name: Wait for Render, smoke prod, rollback on failure
    runs-on: ubuntu-latest
    # 20 min: 5 min Render wait + ~3 min pnpm/Playwright install
    # (cold cache) + ~7 min smoke = ~15 min worst case. 20 leaves a
    # safety margin.
    timeout-minutes: 20
    if: vars.PROD_SMOKE_RECONCILER_ENABLED == 'true'
    outputs:
      assertions_failed: ${{ steps.evaluate_smoke.outputs.assertions_failed }}
    steps:
      # Pin checkout to github.sha — the SHA that just landed on main.
      # The Playwright code we run must match the SHA Render is
      # building. If main has moved by the time this job starts (rare
      # but possible during a fast-follow merge), the wait below would
      # eventually time out because Render is building a newer SHA;
      # we exit gracefully then.
      - name: Checkout pushed SHA
        uses: actions/checkout@v7
        with:
          ref: ${{ github.sha }}

      # Preflight on every required var/secret. Fail loud with a clear
      # list if anything's missing — easier to diagnose than an opaque
      # curl error mid-script.
      - name: Verify required config
        env:
          RENDER_API_TOKEN: ${{ secrets.RENDER_API_TOKEN }}
        run: |
          missing=()
          [ -z "$RENDER_API_TOKEN" ] && missing+=("RENDER_API_TOKEN (secret)")
          [ -z "${{ vars.RENDER_SERVICE_ID_API }}" ] && missing+=("RENDER_SERVICE_ID_API (variable)")
          [ -z "${{ vars.RENDER_SERVICE_ID_CRAWLER_TRIGGERS }}" ] && missing+=("RENDER_SERVICE_ID_CRAWLER_TRIGGERS (variable)")
          [ -z "${{ vars.RENDER_SERVICE_ID_CRAWLER_DAILY }}" ] && missing+=("RENDER_SERVICE_ID_CRAWLER_DAILY (variable)")
          [ -z "${{ vars.PROD_URL }}" ] && missing+=("PROD_URL (variable)")
          [ -z "${{ vars.PROD_API_URL }}" ] && missing+=("PROD_API_URL (variable)")
          if [ ${#missing[@]} -gt 0 ]; then
            echo "✗ Missing required configuration:"
            printf '  - %s\n' "${missing[@]}"
            exit 1
          fi
```

- [ ] **Step 2: Add the Render-wait step (5-min timeout, graceful exit on timeout).**

```yaml
      # Wait for Render to be live on github.sha. 300s = 5 min. The
      # prod API deploys consistently take ~2 min on Render (verified
      # across 15 recent deploys: 1:50–2:26, median ~2:00), so 5 min
      # is 2x safety factor.
      #
      # continue-on-error: a timeout here is benign — it means Render
      # has moved past github.sha (e.g. a fast-follow merge superseded
      # this deploy, or semantic-release's release commit raced past).
      # We don't want to fail the workflow in that case; just skip
      # smoke and let the next push's run pick up.
      - name: Wait for prod API to be live on pushed SHA
        id: wait_for_live
        continue-on-error: true
        env:
          RENDER_API_TOKEN: ${{ secrets.RENDER_API_TOKEN }}
        run: |
          bash .github/scripts/render-wait-for-live.sh \
            "${{ vars.RENDER_SERVICE_ID_API }}" \
            "${{ github.sha }}" \
            300

      - name: Skip smoke if Render didn't reach github.sha
        id: should_smoke
        run: |
          if [ "${{ steps.wait_for_live.outcome }}" = "success" ]; then
            echo "should_smoke=true" >> "$GITHUB_OUTPUT"
            echo "Render is live on ${{ github.sha }}; proceeding to smoke."
          else
            echo "should_smoke=false" >> "$GITHUB_OUTPUT"
            echo "::warning title=Smoke skipped::Render did not reach live on ${{ github.sha }} within 5 min. Most likely cause: a fast-follow merge superseded this deploy. The next push's smoke run will validate the latest deployable code."
          fi
```

- [ ] **Step 3: Add the Playwright setup + smoke steps (gated on `should_smoke == 'true'`).**

```yaml
      - name: Setup pnpm
        if: steps.should_smoke.outputs.should_smoke == 'true'
        uses: pnpm/action-setup@v6

      - name: Setup Node.js
        if: steps.should_smoke.outputs.should_smoke == 'true'
        uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: 'pnpm'

      - name: Install dependencies
        if: steps.should_smoke.outputs.should_smoke == 'true'
        run: pnpm install --frozen-lockfile

      - name: Cache Playwright browsers
        if: steps.should_smoke.outputs.should_smoke == 'true'
        uses: actions/cache@v6
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('apps/e2e/package.json') }}
          restore-keys: playwright-${{ runner.os }}-

      - name: Install Playwright browsers
        if: steps.should_smoke.outputs.should_smoke == 'true'
        run: pnpm --filter @concert-crawl/e2e install-browsers

      # continue-on-error so evaluate_smoke can write the assertions_failed
      # output regardless of Playwright exit code. Mirrors the existing
      # deploy-prod.yml smoke pattern — distinguishing "Playwright ran
      # and asserted a failure" (rollback) from "the job died for
      # another reason" (not rollback-worthy).
      - name: Run smoke tests against production
        id: run_smoke
        if: steps.should_smoke.outputs.should_smoke == 'true'
        continue-on-error: true
        run: pnpm --filter @concert-crawl/e2e test:smoke
        env:
          PLAYWRIGHT_SMOKE_BASE_URL: ${{ vars.PROD_URL }}
          PLAYWRIGHT_API_URL: ${{ vars.PROD_API_URL }}
          E2E_TEST_USER_EMAIL: ${{ secrets.E2E_TEST_USER_EMAIL }}
          E2E_TEST_USER_PASSWORD: ${{ secrets.E2E_TEST_USER_PASSWORD }}
          SENTRY_DSN: ${{ secrets.SENTRY_DSN_SMOKE }}
          SENTRY_ENVIRONMENT: production

      - name: Evaluate smoke outcome
        id: evaluate_smoke
        if: steps.should_smoke.outputs.should_smoke == 'true'
        run: |
          if [ "${{ steps.run_smoke.outcome }}" = "failure" ]; then
            echo "assertions_failed=true" >> "$GITHUB_OUTPUT"
            echo "Playwright smoke asserted a failure → rollback will fire."
          else
            echo "assertions_failed=false" >> "$GITHUB_OUTPUT"
            echo "Playwright smoke passed."
          fi

      - name: Upload failure artifacts
        if: steps.run_smoke.outcome == 'failure'
        uses: actions/upload-artifact@v7
        with:
          name: prod-smoke-failure-${{ github.run_id }}
          path: apps/e2e/test-results/
          retention-days: 14
```

- [ ] **Step 4: Add the rollback steps (gated on `assertions_failed == 'true'`).**

```yaml
      - name: Roll back API service
        if: steps.evaluate_smoke.outputs.assertions_failed == 'true'
        env:
          RENDER_API_TOKEN: ${{ secrets.RENDER_API_TOKEN }}
        run: bash .github/scripts/render-rollback.sh "${{ vars.RENDER_SERVICE_ID_API }}" "concert-crawl-api"

      - name: Roll back crawler triggers cron
        if: steps.evaluate_smoke.outputs.assertions_failed == 'true'
        env:
          RENDER_API_TOKEN: ${{ secrets.RENDER_API_TOKEN }}
        run: bash .github/scripts/render-rollback.sh "${{ vars.RENDER_SERVICE_ID_CRAWLER_TRIGGERS }}" "concert-crawl-crawler-triggers"

      - name: Roll back crawler daily cron
        if: steps.evaluate_smoke.outputs.assertions_failed == 'true'
        env:
          RENDER_API_TOKEN: ${{ secrets.RENDER_API_TOKEN }}
        run: bash .github/scripts/render-rollback.sh "${{ vars.RENDER_SERVICE_ID_CRAWLER_DAILY }}" "concert-crawl-crawler-daily"
```

- [ ] **Step 5: Add the Resend admin-notification step.**

Copy the entire `Notify admin — auto-rollback fired` step from `.github/workflows/deploy-prod.yml` (lines 622–690 in the current file) verbatim, with these changes:

- `if:` — change to `if: always() && steps.evaluate_smoke.outputs.assertions_failed == 'true'`.
- `COMMIT_SHA` env — change to `${{ github.sha }}` (was `${{ github.event.workflow_run.head_sha || github.sha }}`).
- Email body HTML — change "Production auto-rollback was **triggered**" to "Production auto-rollback was **triggered by the post-deploy smoke workflow**" (one-line tweak so the recipient knows which path fired).
- Subject — leave unchanged ("[concert-crawl] Prod auto-rollback fired; manual cron + Vercel action required").

- [ ] **Step 6: Add the final "Surface smoke failure" step so the job exits non-zero when Playwright failed.**

```yaml
      - name: Surface smoke failure
        if: steps.run_smoke.outcome == 'failure'
        run: |
          echo "Playwright smoke failed; failing the job after rollback steps completed."
          exit 1
```

- [ ] **Step 7: Lint.**

```bash
# Confirm actionlint isn't a project dev dep:
grep -r actionlint package.json packages/*/package.json apps/*/package.json
# If not (expected), install locally:
brew install actionlint
actionlint .github/workflows/prod-smoke-after-deploy.yml
```

Expected: no errors. If actionlint complains about anything other than YAML expression warnings (which are expected for `vars.*` references), fix before committing.

- [ ] **Step 8: Dry-run validation against staging.**

In the worktree:

1. Temporarily edit a copy of the workflow to point at staging (`RENDER_SERVICE_ID_API_STAGING`, `STAGING_URL`, `STAGING_API_URL`). Do NOT commit this version.
2. Push the branch.
3. `gh workflow run "Prod smoke (after Render auto-deploy)" --ref <branch-name>`
4. Watch the run end-to-end. Confirm wait + smoke + (success-path) tag/notify flow works.
5. Force a failure: set `STAGING_URL` to a bogus value, dispatch again, confirm rollback steps invoke render-rollback.sh and the Resend email fires.
6. Revert local edits before commit.

- [ ] **Step 9: Commit.**

```bash
git add .github/workflows/prod-smoke-after-deploy.yml
git commit -m "feat(deploy-prod): add push-triggered prod smoke + rollback workflow

Fires on every push to main; waits up to 5 min for Render to be live
on github.sha; runs Playwright smoke against prod; rolls back on
failure via existing render-rollback.sh.

Replaces deploy-prod.yml's smoke + rollback jobs as the auto path.
deploy-prod.yml keeps the same jobs intact for manual workflow_dispatch
as a defense-in-depth escape hatch.

Disabled by default — flip PROD_SMOKE_RECONCILER_ENABLED=true to turn on.

Refs #786"
```

---

## Task 3: Modify `deploy-prod.yml` to drop the `workflow_run` trigger

**Files:**
- Modify: `.github/workflows/deploy-prod.yml`

- [ ] **Step 1: Remove the `workflow_run:` block from the `on:` trigger.**

Before:
```yaml
on:
  workflow_run:
    workflows: [Staging Smoke Tests]
    types: [completed]
    branches: [main]
  workflow_dispatch:
    inputs:
      reason:
        description: 'Why are you manually deploying prod?'
        required: true
        type: string
```

After:
```yaml
on:
  workflow_dispatch:
    inputs:
      reason:
        description: 'Why are you manually deploying prod?'
        required: true
        type: string
```

- [ ] **Step 2: Remove the now-unreachable `Verify staging-smoke gate` step from the `gate` job.**

The step's `if: github.event_name == 'workflow_run'` becomes always-false now. Delete the entire step (lines 110–126 in the current file). It's a true delete, not a comment-out — the only reason to keep dead workflow_run-conditional code is for one-line revertability, and this particular step would need re-wiring anyway if the trigger ever returned.

Keep these in place (per issue brief — "leave the gate logic in place as defense-in-depth"):
- `Refuse workflow_dispatch from non-main ref` — still valid for dispatch.
- `Verify upstream SHA is still main HEAD` (gate job) — unreachable under dispatch-only but kept; comment updated below.
- `Re-verify upstream SHA is still main HEAD` (deploy job) — same.

- [ ] **Step 3: Update the workflow header comment to reflect the new role.**

Replace the existing top-of-file comment block (lines 3–36 of the current `deploy-prod.yml`) with:

```yaml
name: Deploy to Production

# Manual prod-deploy escape hatch. Under normal operation, prod deploys
# happen via Render's native git auto-deploy on push to main — no GH
# Actions trigger is involved. The post-deploy smoke + rollback path is
# in prod-smoke-after-deploy.yml.
#
# This workflow exists for manual operator intervention:
#   - rerun a deploy after a transient Render failure
#   - re-deploy a known-good commit when Render's auto-deploy is paused
#   - emergency dispatch when the auto path is blocked
#
# All gates + the deploy/smoke/rollback chain stay in place as defense-
# in-depth. The SHA-drift gates' `if: github.event_name == 'workflow_run'`
# conditions are now always-false (no workflow_run trigger) and the
# steps are unreachable under workflow_dispatch — kept so re-enabling
# workflow_run in the future is a one-line revert.
#
# See docs/runbooks/auto-deploy-prod.md.
```

- [ ] **Step 4: Update comment on the two SHA-drift guard steps to note unreachability.**

Above each `Verify upstream SHA is still main HEAD` / `Re-verify upstream SHA is still main HEAD` step, prepend this comment:

```yaml
      # Under workflow_dispatch-only (post-#786), this step is
      # unreachable — `if: github.event_name == 'workflow_run'` is
      # always false. Left in place as defense-in-depth so re-enabling
      # the workflow_run trigger is a one-line change. See #779 for
      # the original drift-detection rationale.
```

- [ ] **Step 5: Verify the `github.event.workflow_run.head_sha || github.sha` fallbacks still resolve correctly.**

```bash
grep -n 'workflow_run.head_sha' .github/workflows/deploy-prod.yml
```

Confirm every reference has the `|| github.sha` fallback. Under `workflow_dispatch`, `workflow_run.head_sha` is always empty, so the fallback kicks in cleanly — no behavioral change needed.

- [ ] **Step 6: Lint.**

```bash
actionlint .github/workflows/deploy-prod.yml
```

Expected: no errors.

- [ ] **Step 7: Commit.**

```bash
git add .github/workflows/deploy-prod.yml
git commit -m "feat(deploy-prod): drop workflow_run trigger; keep manual escape hatch

deploy-prod.yml becomes workflow_dispatch-only. Render's native git
auto-deploy handles the normal path (prod-smoke-after-deploy.yml
smokes + rolls back); this workflow is the manual operator escape
hatch.

All gate / deploy / smoke / rollback jobs left intact for the manual
path. SHA-drift gate steps' workflow_run conditions become unreachable
but the steps are kept so re-enabling the trigger is a one-line revert.

Refs #786"
```

---

## Task 4: Update `docs/runbooks/auto-deploy-prod.md`

**Files:**
- Modify: `docs/runbooks/auto-deploy-prod.md`

- [ ] **Step 1: Rewrite the "Pipeline overview" section.**

Replace the existing diagram + workflow table (lines 11–35 of the current file) with:

```markdown
## Pipeline overview

\`\`\`
push to main
   │
   ├──► CI ──► Deploy to Staging ──► Staging Smoke
   │
   ├──► Render git auto-deploy
   │       ├──► concert-crawl-api
   │       ├──► concert-crawl-crawler-triggers
   │       └──► concert-crawl-crawler-daily
   │              │
   │              ▼
   │      (Render builds + serves)
   │
   └──► Prod smoke (after Render auto-deploy)
              │  waits up to 5 min for Render to be live on github.sha
              ▼
        Playwright smoke against prod
              ├──► success: workflow ends green
              └──► failure: render-rollback.sh + Resend admin email
\`\`\`

Render's git integration handles prod deploys directly — there is no
GH Actions chain from CI → Deploy-staging → Staging-smoke → Deploy-prod
anymore. The four-deep `workflow_run` chain that hit GitHub's 3-level
depth cap is gone.

| Workflow                              | Path                                              | Trigger                          | Kill switch                          |
| ------------------------------------- | ------------------------------------------------- | -------------------------------- | ------------------------------------ |
| CI                                    | `.github/workflows/ci.yml`                        | push to `main`, PRs              | (always on)                          |
| Deploy to Staging                     | `.github/workflows/deploy-staging.yml`            | CI success                       | (always on)                          |
| Staging Smoke Tests                   | `.github/workflows/staging-smoke.yml`             | Deploy to Staging success        | `STAGING_SMOKE_ENABLED`              |
| Prod smoke (after Render auto-deploy) | `.github/workflows/prod-smoke-after-deploy.yml`   | push to `main` + workflow_dispatch | `PROD_SMOKE_RECONCILER_ENABLED`      |
| Deploy to Production (manual)         | `.github/workflows/deploy-prod.yml`               | `workflow_dispatch` only         | `AUTO_DEPLOY_PROD_ENABLED`           |
| Rollback Production (manual)          | `.github/workflows/rollback-prod.yml`             | `workflow_dispatch` only         | (always available)                   |
```

- [ ] **Step 2: Add a "How the smoke workflow works" section.**

After the pipeline overview, insert:

```markdown
## How the prod smoke workflow works

`prod-smoke-after-deploy.yml` fires on every push to `main`. Each run:

1. Checks out `github.sha` — the SHA that just landed.
2. Calls `render-wait-for-live.sh "$RENDER_SERVICE_ID_API" "$github.sha" 300` — polls Render every 10s for up to 5 min, waiting for the API service to be `live` on the pushed SHA.
3. If Render reaches `live` in time: runs the Playwright smoke suite against prod.
4. If Render doesn't reach `live` in 5 min: emits a `::warning::` annotation ("smoke skipped — Render didn't reach github.sha; likely a fast-follow merge superseded this deploy") and exits success. The NEXT push's smoke run will validate the latest deployable code.
5. On smoke success: workflow ends green.
6. On smoke failure: invokes `render-rollback.sh` for all three prod services, sends a Resend admin email, ends in `failure`.

### Why push, not cron

GH Actions schedule cron is famously droppy under load. `push` is one of the most reliable triggers in the system, and it fires the moment main moves. The "wait for Render" piece is unavoidable (Render's deploy is async), but at ~2-min typical Render deploys it's a bounded inner-loop wait.

A cron design was evaluated and rejected: it would have cost ~$35/mo more in idle runner minutes (private-repo billing) and added a 5-min worst-case detection lag, with no correctness benefit.

### Semantic-release release commits

semantic-release lands a `chore(release): X.Y.Z [skip ci]` commit ~3 min after every merge. The `[skip ci]` convention prevents this workflow from firing for that commit. The merge commit's smoke workflow does fire — by the time it smokes prod, Render may already be on the release commit (merge-commit code + a `package.json` version bump). Smoke validity is preserved either way.
```

- [ ] **Step 3: Rewrite "Enabling the pipeline" to reflect Render-native enablement.**

The existing Stage 1 (enable staging-smoke) is unchanged.

Replace Stage 2 with:

```markdown
### Stage 2 — enable Render auto-deploy on prod

After stage 1 has been stable through a handful of merges:

1. Render dashboard → `concert-crawl-api` → Settings → Build & Deploy → set **Auto-Deploy** to `Yes`. Repeat for `concert-crawl-crawler-triggers` and `concert-crawl-crawler-daily`.
2. The next push to `main` triggers Render auto-deploy automatically — no GitHub `workflow_run` involved.
3. Leave `AUTO_DEPLOY_PROD_ENABLED=true` so the manual `deploy-prod.yml` escape hatch stays usable.

### Stage 3 — enable the prod smoke workflow

After the first auto-deploy from stage 2 succeeds:

1. Set `PROD_SMOKE_RECONCILER_ENABLED=true` in repo variables (Settings → Variables → Actions).
2. Trigger a small no-op merge to `main`.
3. Watch `Prod smoke (after Render auto-deploy)` run end-to-end: wait → install → smoke → green.

### Disabling

- To pause auto-deploy: flip `Auto-Deploy: no` on the three Render services.
- To pause the smoke workflow: flip `PROD_SMOKE_RECONCILER_ENABLED=false`. Render keeps auto-deploying, but smoke + rollback stop.
- To disable the manual escape hatch: flip `AUTO_DEPLOY_PROD_ENABLED=false`.
```

- [ ] **Step 4: Update the repo variables table — add `PROD_SMOKE_RECONCILER_ENABLED`.**

Append to the table:

```markdown
| `PROD_SMOKE_RECONCILER_ENABLED` | prod-smoke-after-deploy | **new** — default `false`; set to `true` in Stage 3. Gates the push-triggered smoke + rollback workflow. |
```

- [ ] **Step 5: Update the "Testing the rollback path" section.**

Replace the existing "auto-rollback path" instructions with:

```markdown
**For the auto-rollback path** (smoke → rollback inside `prod-smoke-after-deploy.yml`): the cleanest way to verify the wiring without breaking real prod is to temporarily point `PROD_API_URL` at a bogus hostname, then `workflow_dispatch` the **Prod smoke (after Render auto-deploy)** workflow. The wait step exits success (Render is still live on the real SHA), the smoke step fails against the bogus URL, the rollback steps fire, and Render shows new deploys on the API service matching the previous-prior commit SHA. Restore `PROD_API_URL` afterward.
```

- [ ] **Step 6: Commit.**

```bash
git add docs/runbooks/auto-deploy-prod.md
git commit -m "docs(deploy-prod): rewrite runbook for Render-native + push-triggered smoke

Pipeline overview, smoke workflow mechanics, enable/disable stages,
and rollback-test instructions all rewritten. PROD_SMOKE_RECONCILER_ENABLED
added to the variables table.

Refs #786"
```

---

## Task 5: Light edits to `docs/runbooks/production-launch.md`

**Files:**
- Modify: `docs/runbooks/production-launch.md`

- [ ] **Step 1: Find the deploy-pipeline references.**

```bash
grep -n -i 'workflow_run\|deploy-prod\|auto-deploy\|render auto\|pipeline' docs/runbooks/production-launch.md
```

- [ ] **Step 2: For each match that describes the old chain, replace with one of:**

- "Render's git auto-deploy on push to main triggers the three prod services." (for code-change deploy descriptions)
- "See `docs/runbooks/auto-deploy-prod.md` for the full pipeline mechanics." (for cross-references)
- Or — if the match is a step that's no longer needed under the new model — delete it.

- [ ] **Step 3: Verify there are no remaining references to `workflow_run` deploy chains in this runbook.**

```bash
grep -n 'workflow_run' docs/runbooks/production-launch.md
```

Expected: no matches.

- [ ] **Step 4: Commit.**

```bash
git add docs/runbooks/production-launch.md
git commit -m "docs(production-launch): point deploy section at Render auto-deploy

Pipeline references updated for the post-#786 model. Mechanics live in
auto-deploy-prod.md; this runbook just points there.

Refs #786"
```

---

## Task 6: Rebase, pre-checks, open implementation PR

**Files:** (none)

- [ ] **Step 1: Rebase on latest main.**

```bash
git fetch origin
git rebase origin/main
```

If clean: continue. If conflicts: resolve, `git rebase --continue`.

- [ ] **Step 2: Run typecheck + lint + test.**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Expected: all green.

- [ ] **Step 3: Verify main repo is clean.**

```bash
git -C /Users/huey/Projects/concert-crawl status
```

Expected: `nothing to commit, working tree clean`.

- [ ] **Step 4: Push.**

```bash
# If rebase reported "up to date":
git push -u origin <impl-branch>
# If rebase rewrote commits:
git push --force-with-lease -u origin <impl-branch>
```

- [ ] **Step 5: Open the implementation PR.**

```bash
gh pr create --title "feat(deploy-prod): migrate prod deploys to Render-native auto-deploy" --body "$(cat <<'EOF'
## Summary

- Drops the `workflow_run`-chained prod deploy pipeline. Prod deploys now go via Render's native git auto-deploy on push to main.
- Adds `prod-smoke-after-deploy.yml` — a push-triggered workflow that waits up to 5 min for Render to be live on `github.sha`, runs Playwright smoke against prod, and rolls back on failure.
- `render-wait-for-live.sh` now accepts an optional timeout arg (default 600s for backward compat; new workflow passes 300s).
- `deploy-prod.yml` keeps every job intact but is reduced to `workflow_dispatch`-only as a defense-in-depth escape hatch. SHA-drift gates' `if: workflow_run` conditions become unreachable; the steps are kept in place per the issue brief so re-enabling the trigger is a one-line revert.
- Runbook updates: `auto-deploy-prod.md` rewritten; `production-launch.md` updated to point at it.

Closes #786.

## Operator actions (post-merge)

1. **Render dashboard:** flip `Auto-Deploy: yes` on `concert-crawl-api`, `concert-crawl-crawler-triggers`, `concert-crawl-crawler-daily`.
2. **GH repo variables → Actions:** set `PROD_SMOKE_RECONCILER_ENABLED=true`.
3. **No-op merge** to main; watch Render auto-deploy + the smoke workflow.
4. **Simulated failure test** — see `auto-deploy-prod.md` § "Testing the rollback path".

## New env / repo configuration

| Name | Type | Purpose | Where to create |
| ---- | ---- | ------- | --------------- |
| `PROD_SMOKE_RECONCILER_ENABLED` | repo variable | Kill switch for the push-triggered prod smoke + rollback workflow. Defaults to `false`. Flip to `true` after Render auto-deploy is enabled. | Settings → Secrets and variables → Actions → Variables tab |

No new secrets. No new app env vars.

## Test plan

- [ ] Dry-run smoke workflow against staging via `workflow_dispatch` — confirms wait + smoke + tag/notify flow
- [ ] Simulated failure dispatch with bogus `PROD_API_URL` — confirms rollback path fires
- [ ] No-op merge to main after Render auto-deploy enabled — confirms Render builds without GH dispatch and smoke workflow turns green
- [ ] Manual `deploy-prod.yml workflow_dispatch` — confirms escape hatch still works end-to-end (gate → deploy → smoke → rollback chain intact)

## Rollback (if this PR itself goes sideways)

- Flip `Auto-Deploy: no` on the three Render services → returns prod to manual-only mode.
- Flip `PROD_SMOKE_RECONCILER_ENABLED=false` → smoke workflow stops; deploys still go via Render but unvalidated.
- `git revert <PR merge commit>` → restores the `workflow_run` trigger on `deploy-prod.yml`. The 4-deep chain returns.
EOF
)"
```

- [ ] **Step 6: Request Copilot review.**

```bash
gh api repos/HartiganHM/concert-crawl/pulls/<PR-NUMBER>/requested_reviewers \
  --method POST \
  --input - <<'EOF'
{"reviewers": ["copilot-pull-request-reviewer[bot]"]}
EOF
```

Verify response includes `copilot-pull-request-reviewer[bot]` in `requested_reviewers[].login` (per the Copilot auto-review memory: `["Copilot"]` returns 200 but doesn't actually request; only the `[bot]` form works).

- [ ] **Step 7: Iterate Copilot review per multi-round cadence.**

Min 2 successful (not errored) reviews. Address Crit/High/Medium; apply valid Low/Nits; skip invalid. Pause + ask Hugh if Copilot is down for hours.

---

## Self-review against the issue's acceptance criteria

| Criterion | Covered by |
| --------- | ---------- |
| Branch protection on main requires CI + Staging Smoke Tests | **Partial.** CI already required; Staging Smoke Tests flagged as open question for Hugh to pick option 1/2/3. |
| Prod Render services have `autoDeploy: yes` | Operator action documented in implementation PR body + runbook stage 2. |
| `prod-smoke-after-deploy.yml` exists, smokes prod after deploy, triggers rollback on failure | Task 2. |
| `deploy-prod.yml` no longer triggers on `workflow_run`; manual dispatch path preserved with `reason` input | Task 3. |
| Runbook updated | Tasks 4 + 5. |
| Test merge to main reaches prod via Render auto-deploy without manual intervention | Operator actions step 3 + test plan checklist. |
| Simulated smoke failure triggers auto-rollback | Operator actions step 4 + test plan checklist. |

## Self-review against the user's standing rules

- ✓ Worktree-first: `.worktrees/feat-render-native-prod-deploys` created before any file change.
- ✓ `.env.local` files copied into the worktree.
- ✓ Conventional commits throughout.
- ✓ PR body uses template-style structure (Summary + Test plan + new-env-vars table).
- ✓ Copilot review requested via REST API with the verified-working bot login.
- ✓ `progress.md` row deliberately **NOT** added (infra, not user-facing).
- ✓ `releases.ts` deliberately **NOT** updated (no user-facing change).
- ✓ Rebase before push.
- ✓ Pre-check before push (typecheck + lint + test).
- ✓ No `--no-verify`.
