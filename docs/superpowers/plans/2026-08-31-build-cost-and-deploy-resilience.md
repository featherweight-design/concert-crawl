# Build cost and deploy resilience

**Date:** 2026-08-31
**Driver:** the 2026-08-29 → 08-31 build-minute exhaustion incident
**Shape:** 4 PRs plus a set of Render service-config changes applied out-of-band

---

## What happened, briefly

Render build minutes ran out on 2026-08-29. From 17:11 UTC every auto-deploy on all
six prod services returned `build_failed` in 0.4–1.3s — Render refusing to start a
build, not a compile error. Prod kept serving the last good build (`daa77d865`) and
drifted five commits behind `main` for roughly 17 hours.

Two things follow from that, and they are the whole scope of this plan:

1. **Prod was never broken, only stale.** So the auto-rollback correctly did not
   fire — there was nothing bad to roll back from. The detection gap is real but it
   is a *staleness* gap, not a rollback bug.
2. **The minutes ran out because one push to `main` costs six builds**, two of them
   Docker images that download Chromium. Reducing that is the durable fix; raising
   the spend cap only buys time.

The only genuine unreachable window was ~2.5 minutes during the manual recovery
redeploy, caused by `healthCheckPath` being empty (below).

---

## Why there is no `render.yaml` in this plan

The original proposal was to migrate all six services to a blueprint so the config
is version-controlled. **That is deliberately dropped**, and this section exists so
nobody re-proposes it without reading the reason.

Render's own documentation contradicts itself on what happens when a `render.yaml`
is introduced over services that already exist from the dashboard:

- The IaC docs say naming an existing resource makes Render *"apply the Blueprint's
  configuration to that existing service."*
- The blueprint-creation flow docs say Render *"appends a suffix to the name of each
  new resource to prevent collisions with your existing resources"* — i.e. it
  creates duplicates.

Neither statement is qualified in a way that tells us which one governs our case.
The failure mode if we guess wrong is a duplicate set of production services, and
syncing *"never deletes an existing resource"*, so a bad sync leaves orphans behind
rather than cleaning up after itself.

There is corroborating evidence in our own account that the collision-suffix path is
live: `concert-crawl-crawler-triggers` has the slug
`concert-crawl-crawler-triggers-5udw`.

Crucially, **we lose almost nothing by skipping it.** Every setting this plan needs
— `buildFilter`, `healthCheckPath`, and the build cache profile — is settable
through the Render REST API and the dashboard. The blueprint would buy version
control, and PR-D buys that instead with a checked-in reference table at a fraction
of the risk.

If we ever do want IaC, the safe sequence is: replicate one *non-production* service
name byte-exact, sync, confirm the preview says "update" and not "create", and only
then widen. That is a separate piece of work with its own rollback story.

---

## Workstream 1 — halve the fan-out (PR-A)

**Problem.** `.releaserc.json` writes release commits as
`chore(release): ${nextRelease.version} [skip ci]`. `[skip ci]` gates GitHub Actions
but Render's git integration does not honor it, so the release commit triggers a
second full six-service fan-out. Every merged PR therefore costs roughly **12
builds**, not 6.

**Fix.** Render honors `[skip render]` (and the `[render skip]`, `[skip deploy]`,
`[skip cd]` variants). Add one to the semantic-release commit template alongside the
existing `[skip ci]`.

**Expected effect.** Builds per merged PR drop from ~12 to ~6, before filters.

**Risk.** Low, and self-correcting: if the token were wrong the only consequence is
that we keep the behavior we have today. The token must land in the commit *message*
template, so it is worth confirming on the first real release commit after merge
that no Render deploy was queued.

**Watch for.** The release commit is what bumps `package.json` and `CHANGELOG.md`.
Nothing in the deployed runtime reads those, so suppressing its deploy does not
leave prod running a stale version string in any customer-visible place. Confirm
that during review rather than assuming it.

---

## Workstream 2 — stop rebuilding Chromium on every push (PR-B)

**Problem.** `apps/crawler/Dockerfile` is ordered:

```dockerfile
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter=@concert-crawl/crawler-core exec playwright install --with-deps chromium
RUN pnpm turbo build --filter=...
```

`COPY . .` invalidates every layer beneath it. Any change anywhere in the build
context re-runs the dependency install, the `apt-get` for Chromium's X11/font/audio
libs, and the Chromium download from `playwright.azureedge.net`. This is the single
most expensive thing in the pipeline and it currently runs on almost every push, for
**two** cron services.

`.dockerignore` already excludes `docs`, `.claude`, and `apps/e2e`, so a docs-only
commit is genuinely free. But a change confined to `apps/web` — which cannot affect
the crawler image at all — pays the full cost twice.

**Fix.** Standard manifest-first ordering:

1. Copy only the workspace manifests (`package.json`, `pnpm-lock.yaml`,
   `pnpm-workspace.yaml`, and each workspace package's `package.json`).
2. `pnpm install --frozen-lockfile`.
3. `playwright install --with-deps chromium`.
4. `COPY . .`.
5. `pnpm turbo build`.

Then a source-only change re-runs step 5 alone.

**Constraints that must survive the rewrite.**

- The `pwuser` non-root user stays; Chromium's sandbox refuses to run as root.
- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` and `PLAYWRIGHT_BROWSERS_PATH` keep their
  current values, and the final `chown -R pwuser:pwuser` must still cover both
  `/app` and the browsers path.
- Do **not** switch the base image away from `node:22-bookworm`. The header comment
  records that `mcr.microsoft.com/playwright` was abandoned over MCR's anonymous-pull
  rate limits throttling Render's build pool. Preserve that comment.
- The `playwright install` step is invoked through the workspace
  (`pnpm --filter=@concert-crawl/crawler-core exec`), so it genuinely depends on step
  2 having run. Keep that dependency rather than pinning a loose `npx playwright`
  version that could drift from the lockfile.

**Open question to settle during implementation, not now.** Copying every workspace
`package.json` individually is verbose and easy to let rot when a package is added.
Check whether a single `COPY` with a glob preserves the directory structure under
pnpm's workspace layout; if it does not, prefer the explicit list and accept the
verbosity, because a silently-missed manifest surfaces as a confusing install error
rather than a clean failure.

**Verification.** Build the image locally twice — once cold, once after touching a
file under `apps/crawler/src` — and confirm the second build reports cached layers
for install and Chromium. Then confirm the container still starts as `pwuser` and
can launch Chromium.

---

## Workstream 3 — detect staleness (PR-C)

**Problem.** This is the actual detection gap. Three layers all failed to surface a
17-hour outage:

- `prod-smoke-after-deploy.yml` **did** catch it — run `33335570095` failed with
  exit code 125, the purpose-built "deploys are disabled or stalled" signal. But a
  failed Actions run is an email, and it went unread.
- The independent 6-hourly smoke is off. `smoke.yml` gates on the repo Actions
  variable `SMOKE_ENABLED` with `if: vars.SMOKE_ENABLED == 'true'` — a string
  compare, so anything other than the literal `true` (including unset) is off.
  It is currently `false`. That is a deliberate cost decision (~$35/mo of idle
  runner minutes) and this plan does **not** reverse it.
- Sentry was correctly silent. The app was healthy. It was just old.

Nothing anywhere answers the question "is prod running what `main` says it should?"

**Fix.** A scheduled workflow that reads the live deploy SHA for the prod API from
the Render API, compares it to `origin/main`, and fails when the gap exceeds a
threshold in *time* rather than commit count — a five-commit gap ten minutes after a
merge is normal; the same gap twelve hours later is not.

**Design constraints.**

- Must not page on the normal post-merge window. Threshold on the age of the newest
  un-deployed commit.
- Must distinguish "behind" from "deploys are failing." Those want different
  responses and the message should say which it saw.
- Runs on a cron, so it costs runner minutes. Keep the job small and infrequent
  enough that it does not recreate the cost problem it exists to police — this is a
  handful of API calls, not a Playwright suite.
- It reads prod deploy state, so it needs the Render token. Scope its permissions to
  match the existing workflows rather than inventing a new secret.

**Explicit non-goal.** This does not auto-remediate. It reports. Auto-redeploying on
staleness is how you turn a quiet stall into a loud loop, and the existing
`deploy-prod.yml` already owns the deploy path.

---

## Workstream 4 — write down the config and the incident (PR-D)

Three documents, all in `docs/runbooks/`:

1. **Render service config reference.** A table of all six services: id, type, plan,
   build command, `rootDir`, `buildFilter`, `healthCheckPath`, cache profile,
   schedule. This is what the blueprint was going to buy us. It is a *reference*,
   not a synced artifact — deliberately markdown and not `render.yaml`, so that
   nothing in Render ever acts on it. Say that in the document, with the reason,
   or a future reader will "helpfully" convert it.
2. **Incident post-mortem** for 2026-08-29 → 08-31: timeline, the
   stale-not-down distinction, why rollback correctly did not fire, and why exit
   code 125 was the right signal that nobody read.
3. **Rollback runbook extension.** `rollback-prod.yml` covers the three Render
   services. The gaps a reader hits during an incident are that Vercel web is a
   manual dashboard promote, and that **cron jobs cannot be rolled back through
   Render's API at all** (`render-rollback.sh` warns and exits 0 for `crn-*`). Both
   need to be stated where someone will find them at 2am.

---

## Render service-config changes (applied out-of-band, not a PR)

These are REST API calls, tracked here so the epic is auditable.

### The services in scope, by id

The workspace holds eleven `concert-crawl` services. Six auto-deploy today; the
other five are suspended and do not build. **Only the six active ones are in
scope** — but the suspended five are listed because un-suspending one silently
re-enters it into the fan-out, and it would then carry none of the filters below.

| # | Service | ID | Env | Runtime | In scope |
| --- | --- | --- | --- | --- | --- |
| 1 | `concert-crawl-api` | `srv-d7lngqfavr4c73eme3b0` | prod | node (web) | ✅ |
| 2 | `concert-crawl-api-staging` | `srv-d7lnkdmgvqtc73f8eec0` | staging | node (web) | ✅ |
| 3 | `concert-crawl-crawler-triggers` | `crn-d8o7c10k1i2s7389t3v0` | prod | **docker** | ✅ |
| 4 | `concert-crawl-crawler-daily` | `crn-d8o7egog4nts73d2tni0` | prod | **docker** | ✅ |
| 5 | `concert-crawl-match-artists` | `crn-d9nm08e7bikc73c6q39g` | prod | node | ✅ |
| 6 | `concert-crawl-spotify-weekly` | `crn-d9e46ad7vvec73dsn7bg` | prod | node | ✅ |
| 7 | `concert-crawl-crawler-triggers-staging` | `crn-d7vcv1j7uimc73el15og` | staging | docker | suspended |
| 8 | `concert-crawl-crawler-daily-staging` | `crn-d7vd0afaqgkc73943af0` | staging | docker | suspended |
| 9 | `concert-crawl-match-artists-staging` | `crn-d9nm0a7lk1mc738e92kg` | staging | node | suspended |
| 10 | `concert-crawl-spotify-weekly-staging` | `crn-d9e4173bc2fs73f6qk10` | staging | node | suspended |
| 11 | `concert-crawl-billing-jobs-staging` | `crn-d9c4556q1p3s73b143m0` | staging | node | suspended |

Note that #11 has no production counterpart. That is not addressed here, but it is
worth someone confirming deliberately rather than discovering later.

### The changes, per service

| Change | Applies to | Why |
| --- | --- | --- |
| `healthCheckPath` → `/v1/health` | #1, #2 | Both are `""` today. With no readiness gate Render cannot hold traffic on the old instance; recovery logs show the old instance took SIGTERM a full minute *after* the new one went live. This is the entire 2.5-minute gap. |
| Clear `cache.profile: "no-cache"` | #1, #2 | Build cache is explicitly disabled on both. The four crons carry no `cache` field at all. |
| `buildFilter` — API + `packages/db` paths | #1, #2 | ⚠️ **must** include `packages/db/**` — see below. |
| `buildFilter` — crawler paths | #3, #4 | These are the Playwright/Docker images. Highest cost, and entirely unaffected by `apps/web`. |
| `buildFilter` — API job paths | #5, #6 | Both build `@concert-crawl/api` and run a single job script out of `apps/api/dist/jobs/`. |

**The one that can break prod.** #1 and #2 build with
`pnpm install && pnpm db:migrate && pnpm turbo build --filter=@concert-crawl/api`.
Migrations run *inside the build*. So their `buildFilter` **must** include
`packages/db/**`, or a migration-only PR merges, no build runs, and the migration
silently never applies. This is the highest-consequence line in the epic.

Related, lower severity: filtering #3–#6 means a migration can land while those
services run older code. CLAUDE.md mandates expand/contract migrations only, which
is exactly the property that makes this safe — but it becomes load-bearing rather
than belt-and-braces, so it belongs in the runbook.

Two notes from the docs review: `buildFilter` paths are repo-root-relative *even
when `rootDir` is set* (all eleven services have `rootDir: ""`, so this is moot
today but will not stay moot), and on any future blueprint sync an omitted
`buildFilter` **clears** dashboard-set filters.

**Rollout.** One service at a time, verifying with a real push between each. A wrong
filter stops prod deploying — the identical symptom to the incident this plan
exists to prevent. Do not batch them.

---

## Cron redeploy

All four crons are live on pre-outage code:

| Cron | Live commit | Behind `main` |
| --- | --- | --- |
| `concert-crawl-crawler-triggers` | `520a73904` | 5 |
| `concert-crawl-crawler-daily` | `520a73904` | 5 |
| `concert-crawl-match-artists` | `daa77d865` | 4 |
| `concert-crawl-spotify-weekly` | `daa77d865` | 4 |

All four predate **`442e56c20`**, which stopped the price tier-1 fetcher identifying
itself as `https://concertcrawl.com/bot` — *a domain we do not own*. Under "crawl
ethics are existential" that is a live correctness problem, and
`concert-crawl-crawler-triggers` runs every 10 minutes.

**Sequencing:** redeploy after PR-B merges. The Dockerfile fix makes the rebuild
cheaper, and the fix ships with it. Redeploying first pays full price for an image
we are about to replace.

---

## Sequencing

PR-A and PR-B are independent and can run in parallel. PR-C and PR-D touch no shared
files. The service-config changes depend on nothing but should land after PR-A so
the two effects can be measured separately. The cron redeploy is last.

```
PR-A ─┐
PR-B ─┼─→ service config (one at a time) ─→ cron redeploy
PR-C ─┤
PR-D ─┘
```

## Success criteria

- A merged PR triggers ~6 builds, not ~12.
- A change confined to `apps/web` triggers no crawler image build.
- A source-only crawler change reuses the cached Chromium layer.
- A deploy swap serves no 5xx and no connection refusal.
- Prod being >N hours behind `main` produces a loud, actionable failure.
- All four crons run code no older than `main` at their last deploy.

## Out of scope

- Setting the `SMOKE_ENABLED` repo variable to `true`. Deliberate cost decision,
  unchanged.
- Turborepo remote caching. Real savings, but it needs a cache backend and
  credentials; separate effort with its own cost question.
- Migrating to `render.yaml`. See above.
- Any change to `deploy-prod.yml`'s rollback logic, which behaved correctly.
