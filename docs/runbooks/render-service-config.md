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
adopts an existing service of the same name or creates a _new_ one with a
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

Six services build from `main`. All have `autoDeployTrigger: commit`,
`rootDir: ""`, region `oregon`, plan `starter`.

`autoDeploy` is **not** uniform. Staging auto-deploys on every eligible push —
each service's `buildFilter` still decides eligibility, so a docs-only or
web-only commit deploys nothing. All five prod services are `no`, because prod
is promoted only by dispatching
`.github/workflows/deploy-prod.yml`. See
`docs/runbooks/auto-deploy-prod.md` for the promotion model.

| #   | Service                          | ID                         | Env     | Runtime | `autoDeploy` | Schedule       |
| --- | -------------------------------- | -------------------------- | ------- | ------- | ------------ | -------------- |
| 1   | `concert-crawl-api`              | `srv-d7lngqfavr4c73eme3b0` | prod    | node    | `no`         | (web service)  |
| 2   | `concert-crawl-api-staging`      | `srv-d7lnkdmgvqtc73f8eec0` | staging | node    | `yes`        | (web service)  |
| 3   | `concert-crawl-crawler-triggers` | `crn-d8o7c10k1i2s7389t3v0` | prod    | docker  | `no`         | `*/10 * * * *` |
| 4   | `concert-crawl-crawler-daily`    | `crn-d8o7egog4nts73d2tni0` | prod    | docker  | `no`         | `0 9 * * *`    |
| 5   | `concert-crawl-match-artists`    | `crn-d9nm08e7bikc73c6q39g` | prod    | node    | `no`         | `0 16 * * *`   |
| 6   | `concert-crawl-spotify-weekly`   | `crn-d9e46ad7vvec73dsn7bg` | prod    | node    | `no`         | `30 15 * * 1`  |

`concert-crawl-billing-jobs` is declared for prod in `render.yaml` but **no such
live prod service exists** — only `concert-crawl-billing-jobs-staging`, which is
suspended. See the `render.yaml` caveat above; nothing promotes it, and the
promotion workflow does not reference it.

Cron schedules are **UTC**. `0 9 * * *` is the 3 AM MT daily crawl during
MDT; it drifts an hour relative to local time across the DST boundary,
which is accepted.

### Suspended services

Five staging services are suspended on purpose, as a cost measure. They
are listed so that "why is this not deploying?" has an answer that is not
an investigation.

| Service                                  | ID                         | Runtime |
| ---------------------------------------- | -------------------------- | ------- |
| `concert-crawl-crawler-triggers-staging` | `crn-d7vcv1j7uimc73el15og` | docker  |
| `concert-crawl-crawler-daily-staging`    | `crn-d7vd0afaqgkc73943af0` | docker  |
| `concert-crawl-match-artists-staging`    | `crn-d9nm0a7lk1mc738e92kg` | node    |
| `concert-crawl-spotify-weekly-staging`   | `crn-d9e4173bc2fs73f6qk10` | node    |
| `concert-crawl-billing-jobs-staging`     | `crn-d9c4556q1p3s73b143m0` | node    |

A suspended service is one of the two conditions
`.github/scripts/render-check-deploy-health.sh` alerts on — which is why
that checker is pointed at the five prod services only, and not at
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

### ⚠️ `NPM_CONFIG_PREFIX` keeps `npm install -g pnpm` working

From Node 24.22.1, Render serves Node from a read-only `/usr/lib` that
already holds a pnpm. The build command's first step, `npm install -g pnpm`,
then fails with `EROFS: read-only file system` before anything else runs.
That stopped every Node build on 2026-10-27, after #1758 bumped
`.node-version` from 24.20.0.

The fix is an environment variable, not a build-command change:
`NPM_CONFIG_PREFIX=/opt/render/.npm-global` moves npm's global prefix to a
writable directory, so the install succeeds. It is set on the four live Node
services (#1, #2, #5, #6). The suspended staging crons and the never-deployed
prod billing-jobs cron do not have it; **add it before resuming or creating
any of them**, or their first build fails the same way.

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

### Node version is pinned by `.node-version`

The repo-root `.node-version` file is the single source of truth for the
Node major/minor running the four node services (#1, #2, #5, #6) _and_ every
GitHub Actions job — the workflows read it via `node-version-file` rather
than repeating a literal. Change the pin in one place and both follow.

Render's precedence is `NODE_VERSION` env var → `.node-version` → `.nvmrc` →
`package.json` `engines`. No service sets `NODE_VERSION`, so `.node-version`
wins. Root `engines.node` is a deliberately looser but **bounded** range
(`^24.0.0`) — it is a compatibility floor for contributors, not the pin.
`.node-version` is the pin.

**Always bound the `engines` range.** It previously read
`^20.20.0 || >=22.22.0` — no upper bound — so Render auto-selected the newest
satisfying major and prod drifted onto Node 26.8.1, a **non-LTS** release,
while CI tested exclusively on 24. Render's own docs call this out.

`.node-version` is in the build filters of the **four node services only**
(#1, #2, #5, #6). Without it there, a Node bump would change no filtered path,
Render would skip the build, and prod would stay on the old runtime while the
repo claimed otherwise — the same silent-skip class as the `packages/db/**`
trap above.

It is deliberately **excluded** from the two docker crawler crons (#3, #4).
`apps/crawler/Dockerfile` pins its own base image, so `.node-version` cannot
change what Node that image runs — including it would rebuild two Chromium
images on every Node bump for no effect. This is the one place the
"bias filters broad" rule is knowingly inverted, because the file provably
does not enter the docker build.

The crawler base image is pinned separately in `apps/crawler/Dockerfile`, but
it tracks the same release as `.node-version` (both 24.22.1 since 2026-10-28),
so a Node security release is one version to patch rather than two. **Bump the
Dockerfile `FROM` line by hand in the same PR as `.node-version`**: nothing
rebuilds the crawler images when only `.node-version` changes, so a missed
`FROM` leaves both crawler crons on the old runtime. The `crawler-image` CI
workflow builds the image and launches Chromium as `pwuser`, which is the
compatibility check for the new base.

## Settings that need to stay set

| Setting           | Services | Value        | Why                                                                                                                                                                                        |
| ----------------- | -------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `healthCheckPath` | 1, 2     | `/v1/health` | With this empty, Render cuts traffic to the old instance before the new one is serving. That is the entire cause of the ~2.5-minute prod outage on 2026-08-31; the deploy itself was fine. |
| `buildFilter`     | all 6    | see below    | Every service rebuilds on every commit to `main`, so a web-only PR burns six builds.                                                                                                       |
| `autoDeploy`      | 2        | `yes`        | Staging is the validation surface the promotion decision rests on — it deploys on every push its `buildFilter` matches. `no` here means nothing is ever validated before a promotion.       |
| `autoDeploy`      | 1, 3–6   | `no`         | This is the production promotion gate. `yes` on any prod service reopens the push-to-prod path and bypasses the dispatch entirely.                                                          |

`healthCheckPath` can be set over the API:

```bash
curl -s -X PATCH -H "Authorization: Bearer $RENDER_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"serviceDetails":{"healthCheckPath":"/v1/health"}}' \
  https://api.render.com/v1/services/<service-id>
```

### ⚠️ `cache.profile: no-cache` is not a problem — do not go hunting for it

Both API services report `serviceDetails.cache.profile: "no-cache"`. This
looks alarming and is not. It was briefly recorded here as a cold-build cause
and an open action item; that was wrong, and the correction is kept rather
than deleted so nobody rediscovers the string and repeats the chase.

What is actually true:

- **Builds are already cached.** A representative API build downloads the
  cache (`Downloaded 889MB in 11s`), completes `pnpm install
--frozen-lockfile` in ~3 seconds, and finishes in 2m31s total. A cold build
  cannot resolve a pnpm store that fast.
- **There is no dashboard control for it.** Render's Settings page exposes
  Deploy, Build, Build Filters, and Edge Caching. Edge Caching is CDN
  response caching for a web service's _traffic_ — unrelated to build cache,
  and not the toggle.
- **It cannot be set over the API.** `default`, `cache`, `enabled`, and `""`
  all return `500 internal server error` on a PATCH that succeeds when the
  field is omitted.
- **It is undocumented.** The field appears in neither Render's blueprint
  spec nor its deploy docs.

Read it as an internal field Render reports but does not let you edit, and
which does not describe build-cache behavior. If build times regress, read
the build log's cache lines — not this field.

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

Note that a filtered service is _supposed_ to sit behind `main` when
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
`.serviceDetails.healthCheckPath`, `.serviceDetails.envSpecificDetails`,
`.serviceDetails.schedule`.

`.serviceDetails.cache.profile` is also reported for node web services (cron
jobs omit it), but it is neither editable nor meaningful — see above.

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
