# Render Service Configuration — Reference

Why each Render service is configured the way it is, and which settings
cannot be allowed to drift.

Render's live config is edited in Render's dashboard. Nothing in this repo
pushes to it. **When you change a service's settings, update `render.yaml`
and this file in the same session** — a record that silently drifts is
worse than none, because it gets trusted.

Last verified against the live API: **2026-09-01**. On that day both API
services gained `healthCheckPath: /v1/health` and all six active services
gained a `buildFilter`, applied over the Render API and mirrored into
`render.yaml` in the same change.

## `render.yaml` is descriptive, not synced

The repo root holds a `render.yaml` listing every service with its build
command, schedule, and env-var inventory. **It is not a live Blueprint.**
Editing it deploys nothing and changes nothing; it is a version-controlled
record that is kept in sync by hand, and its own header says so.

Two records exist because they answer different questions. `render.yaml`
carries the full service shape — every env var, every start command — in
the schema Render itself uses. This file carries the operational layer:
which settings are load-bearing and what breaks when they are wrong, the
build-filter constraints, the commit tokens Render honors, and how to read
live config without the dashboard. Neither is derivable from the other.

**Hand-sync has already failed twice**, and both lapses were found on
2026-08-31 by diffing the file against the live API:

- It declared `healthCheckPath: /v1/health` on both API services while the
  live services had it empty. That gap is the whole cause of the
  ~2.5-minute prod outage that day.
- It declares a prod `concert-crawl-billing-jobs` cron. **No such service
  exists.** Only `concert-crawl-billing-jobs-staging` does, and it is
  suspended. The block is kept — billing jobs are still intended to reach
  prod — but it now carries a `NOT DEPLOYED` marker so it cannot be misread
  as inventory.

Treat `render.yaml` as a statement of intent to be checked against the live
API, never as evidence of current state.

### Why it is not turned into a real Blueprint

Making it live would put config genuinely under version control, and is the
obvious fix. It was evaluated and **rejected for now** — but on a narrower
basis than it first appeared.

Render's own docs contradict each other on whether syncing a blueprint
adopts an existing service of the same name or creates a *new* one with a
collision suffix. The failure mode if it creates rather than adopts is
duplicate prod crons running against the same production database, and
blueprint sync **never deletes**, so cleanup is manual. Against a config
surface that changes a few times a year, that risk is not worth taking on
an undocumented behavior.

**The suffixed slugs in our account are _not_ evidence of this.** It is
tempting to read them that way — prod `concert-crawl-crawler-triggers`
holds the slug `concert-crawl-crawler-triggers-5udw` and
`concert-crawl-crawler-daily` holds `concert-crawl-crawler-daily-99ux`. But
the staging triggers service, created five weeks earlier, holds the slug
`concert-crawl-crawler-triggers` outright: it was created under that name,
later renamed to `-staging`, and kept its original slug. The prod service
then took a suffix because the slug was genuinely taken. That is a rename
artifact, not a blueprint collision. Slugs are immutable; names are not.

Revisit if Render documents adoption semantics unambiguously.

## Active services

Six services deploy from `main`. All have `autoDeploy: yes`,
`autoDeployTrigger: commit`, `rootDir: ""`, region `oregon`, plan
`starter`.

| # | Service | ID | Env | Runtime | Schedule |
| - | ------- | -- | --- | ------- | -------- |
| 1 | `concert-crawl-api` | `srv-d7lngqfavr4c73eme3b0` | prod | node | (web service) |
| 2 | `concert-crawl-api-staging` | `srv-d7lnkdmgvqtc73f8eec0` | staging | node | (web service) |
| 3 | `concert-crawl-crawler-triggers` | `crn-d8o7c10k1i2s7389t3v0` | prod | docker | `*/10 * * * *` |
| 4 | `concert-crawl-crawler-daily` | `crn-d8o7egog4nts73d2tni0` | prod | docker | `0 9 * * *` |
| 5 | `concert-crawl-match-artists` | `crn-d9nm08e7bikc73c6q39g` | prod | node | `0 16 * * *` |
| 6 | `concert-crawl-spotify-weekly` | `crn-d9e46ad7vvec73dsn7bg` | prod | node | `30 15 * * 1` |

Cron schedules are **UTC**. `0 9 * * *` is the 3 AM MT daily crawl during
MDT; it drifts an hour relative to local time across the DST boundary,
which is accepted.

### Suspended services

Five staging services are suspended on purpose, as a cost measure. They
are listed so that "why is this not deploying?" has an answer that is not
an investigation.

| Service | ID | Runtime |
| ------- | -- | ------- |
| `concert-crawl-crawler-triggers-staging` | `crn-d7vcv1j7uimc73el15og` | docker |
| `concert-crawl-crawler-daily-staging` | `crn-d7vd0afaqgkc73943af0` | docker |
| `concert-crawl-match-artists-staging` | `crn-d9nm0a7lk1mc738e92kg` | node |
| `concert-crawl-spotify-weekly-staging` | `crn-d9e4173bc2fs73f6qk10` | node |
| `concert-crawl-billing-jobs-staging` | `crn-d9c4556q1p3s73b143m0` | node |

A suspended service is one of the two conditions
`.github/scripts/render-check-deploy-health.sh` alerts on — which is why
that checker is pointed at the three prod services only, and not at
everything in the account.

## Build and start commands

Both web services (#1, #2):

```
build: npm install -g pnpm && pnpm install --frozen-lockfile && pnpm db:migrate && pnpm turbo build --filter=@concert-crawl/api
start: node apps/api/dist/index.js
```

Node crons (#5, #6) share the same build command minus `pnpm db:migrate`,
and differ only in start command
(`node apps/api/dist/jobs/match-artists.js`,
`node apps/api/dist/jobs/spotify-weekly.js`).

Docker crons (#3, #4) build from `./apps/crawler/Dockerfile` with context
`.` and no override `dockerCommand` — the image's own `CMD` runs.

### ⚠️ `pnpm db:migrate` runs inside the API build command

This is the single most important fact on this page, and it constrains
everything below.

Drizzle migrations are applied by the **API service's build**, not by a
separate migration step. So:

- If the API service does not build, migrations do not apply. A stalled
  API deploy is a stalled schema.
- **Any build filter on the API services must include `packages/db/**`.**
  Without it, a migration-only PR touches no path in the filter, Render
  skips the build, and the migration silently never runs while everything
  reports green. The expand/contract policy means the app keeps working —
  which is exactly what makes this failure quiet.

## Settings that need to stay set

| Setting | Services | Value | Why |
| ------- | -------- | ----- | --- |
| `healthCheckPath` | 1, 2 | `/v1/health` | With this empty, Render cuts traffic to the old instance before the new one is serving. That is the entire cause of the ~2.5-minute prod outage on 2026-08-31; the deploy itself was fine. |
| `cache.profile` | 1, 2 | unset (not `no-cache`) | Both were pinned to `no-cache`, so every build re-downloaded and re-resolved from scratch. Nothing required it. |
| `buildFilter` | all 6 | see below | Every service rebuilds on every commit to `main`, so a web-only PR burns six builds. |
| `autoDeploy` | all 6 | `yes` | Anything else means merged code never reaches the service. Alerted on. |

`healthCheckPath` can be set over the API:

```bash
curl -s -X PATCH -H "Authorization: Bearer $RENDER_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"serviceDetails":{"healthCheckPath":"/v1/health"}}' \
  https://api.render.com/v1/services/<service-id>
```

**`cache.profile` cannot.** Every value tried against
`serviceDetails.cache.profile` — `default`, `cache`, `enabled`, `""` — comes
back `500 internal server error` on a request that succeeds when the field is
omitted. It is read-only over the API in practice; change it in the dashboard.

### Build filters

Filters are live on all six active services as of 2026-09-01, and the exact
path lists are mirrored in `render.yaml`. They are derived from each service's
real workspace dependency closure, not hand-guessed — read the `buildFilter`
block there rather than retyping one.

The shape that matters:

- **API services (1, 2, 5, 6)** — must include `packages/db/**` for the
  migration reason above, plus `apps/api/**`, the shared packages they
  import, and root manifests (`package.json`, `pnpm-lock.yaml`,
  `pnpm-workspace.yaml`, `turbo.json`).
- **Docker crawler crons (3, 4)** — `apps/crawler/**`,
  `packages/crawler-core/**`, `packages/price-pipeline/**`,
  `packages/db/**`, the other packages in the crawler's dependency graph,
  root manifests, and `.dockerignore`.

A filter that is too narrow does not fail loudly — it just stops deploying,
and you find out later. When editing one by hand, apply it and watch a real
push before moving to the next service.

The 2026-09-01 batch was applied differently and it is worth saying so: the
path lists were generated from each service's workspace dependency closure
rather than typed, every service was read back to assert `packages/db/**` and
the root manifests survived, and the lists were biased deliberately broad. An
over-broad filter costs a few builds; a narrow one costs a silent missed
migration. **Read-back is not proof, though** — the first real push after a
filter change is, so check that the services you expect to build did.

Note that a filtered service is *supposed* to sit behind `main` when
recent commits do not touch its paths. This is why the deploy-health
checker asks Render about deploy status rather than comparing the live SHA
to `main` — once filters exist, SHA drift is no longer evidence of
anything.

## Commit tokens that skip a Render deploy

Render honors `[skip render]`, `[render skip]`, `[skip deploy]`, and
`[skip cd]` in a commit message.

**Render does not honor `[skip ci]`.** That is a GitHub Actions
convention, and assuming it covered Render is why every merged PR used to
fan out twice across six services: once for the merge commit, then again
~3 minutes later for semantic-release's `chore(release):` commit. The
release commit only touches `CHANGELOG.md` and `package.json`, which no
service builds from. `.releaserc.json` now appends `[skip render]`
alongside `[skip ci]`.

## Reading config without the dashboard

```bash
curl -s -H "Authorization: Bearer $RENDER_API_TOKEN" \
  https://api.render.com/v1/services/<service-id> | jq
```

Useful fields: `.autoDeploy`, `.suspended`, `.rootDir`,
`.serviceDetails.healthCheckPath`, `.serviceDetails.cache.profile`,
`.serviceDetails.envSpecificDetails`, `.serviceDetails.schedule`.

`cache.profile` is reported for node web services only; cron jobs omit it.

Recent deploys, newest first:

```bash
curl -s -H "Authorization: Bearer $RENDER_API_TOKEN" \
  "https://api.render.com/v1/services/<service-id>/deploys?limit=20" \
  | jq '[.[] | (.deploy // .)] | .[] | {status, createdAt, sha: .commit.id}'
```

The `(.deploy // .)` normalization is not optional. Some Render endpoints
wrap each entry as `{deploy: {...}}` and others return the deploy object
flat; the same expression appears in `render-wait-for-live.sh`,
`render-rollback.sh`, and `render-check-deploy-health.sh`.

`.commit` is an **object** (`{id, message, createdAt}`), not a SHA string.

## Related

- `render.yaml` — the descriptive service inventory: build commands, schedules, env vars
- `docs/runbooks/auto-deploy-prod.md` — the deploy pipeline, smoke, and rollback
- `docs/incidents/2026-08-29-render-build-minutes.md` — the incident these settings came out of
- `docs/superpowers/plans/2026-08-31-build-cost-and-deploy-resilience.md` — the epic plan
