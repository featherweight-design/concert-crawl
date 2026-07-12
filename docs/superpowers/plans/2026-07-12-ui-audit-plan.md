# UI Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the on-demand `ui-audit` workflow — a Playwright-driven route × viewport × interaction-state sweep of staging (PR 3, in-repo), plus the orchestrating `~/.claude/skills/ui-audit/` skill and its first calibration run (PR 4, out-of-repo authoring). Findings are filed as GitHub issues with embedded screenshots, but only after Hugh reviews the report.

**Architecture:** The sweep engine lives in `apps/e2e/src/audit/` and is invoked via `pnpm --filter e2e audit`. It reuses `apps/e2e`'s existing Clerk auth setup, walks a repo-owned route manifest, captures screenshots and DOM-heuristic JSON per (route × viewport × state), and writes to `apps/e2e/audit-output/<run-id>/` (gitignored). The skill reads captures, runs vision triage in parallel subagents, presents a report, and — on Hugh's go-ahead — commits screenshots to an orphan `ui-audit-artifacts` branch (never merged; solely to make `raw.githubusercontent.com` URLs resolve) and opens labeled issues via `gh` REST.

**Tech Stack:** Playwright (existing in `apps/e2e`, `@playwright/test@^1.61`), Vitest for unit-testing DOM heuristics, `gh` CLI + REST for issue filing, `git` orphan-branch mechanics for artifact hosting. No new production dependencies.

## Global Constraints

- Sweep targets staging URLs. Never target prod — prod smokes already exist. Read base URL from `PLAYWRIGHT_AUDIT_BASE_URL` env var; default to `https://staging.concertcrawl.app`.
- Single theme only (default). No dark-mode / light-mode / token-drift checks in v1.
- Judgment bar for triage: **pure UI breakage** only (horizontal overflow, unreadable text wrapping, overlapping elements, broken images, crushed tap targets). No UX judgment. No pixel-diff.
- Findings default state is **report only**. Nothing gets filed to GitHub without an explicit Hugh go-ahead. This is a locked spec decision — auto-file is not v1.
- All GitHub issues opened by the skill carry the `ui-audit` label so cross-run dedupe works. The label is created once at the start of PR 4's calibration run.
- No CI/cron scheduling in v1. Sweep runs on demand only.
- The audit-output directory is gitignored. Screenshots that make it into issues live on the orphan `ui-audit-artifacts` branch, never on `main`.
- Type safety in shipped code: no `as` value casts. Manifest and heuristic types are Zod-parsed where they cross module boundaries. Exceptions: `as const` for readonly literal narrowing is fine (compile-time widening prevention, not a value cast); and unit-test mocks may use `as any` where reconstructing Playwright/Drizzle types would dwarf the test.

**Reference spec:** `docs/superpowers/specs/2026-07-11-ui-audit-staging-seeder-design.md` §2a–§2d, "Failure handling", "Testing", and "Build sequence".

**Track 1 dependency:** the sweep and skill both assume the staging seeder from `2026-07-12-staging-seeder-plan.md` has landed. Empty-state renders (seeder not run) are handled — see PR 3 Task 6 and PR 4 §"Empty-state marking" — but the primary use case is staging populated by `pnpm db:seed:staging`.

---

## PR 3 — Sweep Engine (repo)

**Deliverable:** `pnpm --filter e2e audit -- --tags=admin` (or `--tags=consumer`, or omit for full sweep) captures full-page screenshots + DOM-heuristic JSON for every (route × viewport × state) combination the tag filter selects. Output lands under `apps/e2e/audit-output/<run-id>/`. Use the equals form (`--tags=…`) consistently — the CLI parser in Task 4 splits on `=`.

### Task 1: Manifest schema + types

**Files:**

- Create: `apps/e2e/src/audit/manifest-types.ts`
- Create: `apps/e2e/src/audit/manifest-types.test.ts`

**Interfaces:**

- Produces:
  - `type AuditInteraction = { id: string; description: string; run: (page: Page) => Promise<void> }`
  - `type AuditRoute = { id: string; path: string; tags: ('consumer' | 'admin')[]; auth: 'none' | 'user' | 'admin'; interactions?: AuditInteraction[] }`
  - `type AuditManifest = readonly AuditRoute[]`
  - `AuditRouteSchema: z.ZodType<Omit<AuditRoute, 'interactions'>>` — Zod schema for the serializable subset (interactions are functions, not schema-validatable). Used to validate manifest entries at load.
  - `validateManifest(manifest: unknown): AuditManifest` — throws `ManifestValidationError` on bad shape; also enforces uniqueness of `route.id` and non-empty `tags`.

- [ ] **Step 1: Failing tests.**

```ts
import { describe, it, expect } from 'vitest'
import { validateManifest } from './manifest-types.js'

describe('validateManifest', () => {
  it('accepts a well-formed manifest', () => {
    expect(() =>
      validateManifest([
        { id: 'a', path: '/a', tags: ['consumer'], auth: 'none' },
        { id: 'b', path: '/b', tags: ['admin'], auth: 'admin' },
      ]),
    ).not.toThrow()
  })
  it('rejects duplicate route ids', () => {
    expect(() =>
      validateManifest([
        { id: 'a', path: '/a', tags: ['consumer'], auth: 'none' },
        { id: 'a', path: '/a2', tags: ['consumer'], auth: 'none' },
      ]),
    ).toThrow(/duplicate route id/i)
  })
  it('rejects empty tags', () => {
    expect(() =>
      validateManifest([{ id: 'a', path: '/a', tags: [], auth: 'none' }]),
    ).toThrow(/at least one tag/i)
  })
  it('rejects unknown tag values', () => {
    expect(() =>
      validateManifest([
        { id: 'a', path: '/a', tags: ['marketing'], auth: 'none' },
      ]),
    ).toThrow()
  })
})
```

- [ ] **Step 2: Implement types + `validateManifest`.** Use Zod for shape (`z.object({...})`), then post-process for uniqueness. Do NOT ship a barrel file — import types directly.

- [ ] **Step 3: Tests pass.**

- [ ] **Step 4: Commit.**

```bash
git add apps/e2e/src/audit/manifest-types.ts apps/e2e/src/audit/manifest-types.test.ts
git commit -m "feat(audit): manifest schema + validator (Zod, unique ids, non-empty tags)"
```

### Task 2: Initial manifest

**Files:**

- Create: `apps/e2e/src/audit/manifest.ts`

**Interfaces:**

- Consumes: `AuditManifest`, `AuditInteraction`, `validateManifest`.
- Produces:
  - `manifest: AuditManifest` — the initial route list. Passes through `validateManifest` at import time (top-level `const manifest = validateManifest([...])`).
  - Initial entries — the smallest set that exercises the machinery and covers the spec's motivating example:
    - `{ id: 'browse', path: '/', tags: ['consumer'], auth: 'none' }`
    - `{ id: 'event-detail', path: '/events/staging-seed-example', tags: ['consumer'], auth: 'none' }` — hardcoded slug; picks a well-known staging event. If the slug 404s, the sweep records a load error (spec: "route fails to load → recorded as a sweep error in the report") — a follow-up PR can make this dynamic once the audit stabilizes.
    - `{ id: 'venue-detail', path: '/venues/ogden-theatre', tags: ['consumer'], auth: 'none' }`
    - `{ id: 'my-shows', path: '/my/shows', tags: ['consumer'], auth: 'user' }`
    - `{ id: 'admin-feedback', path: '/admin/feedback', tags: ['admin'], auth: 'admin', interactions: [{ id: 'expand-first-card', description: 'Expand the first feedback card to reveal the CONTEXT column (the motivating mobile-layout bug)', run: async (page) => { await page.getByRole('button', { name: /expand/i }).first().click(); await page.waitForLoadState('networkidle') } }] }`
    - `{ id: 'admin-contests', path: '/admin/contests', tags: ['admin'], auth: 'admin' }`
    - `{ id: 'admin-events', path: '/admin/events', tags: ['admin'], auth: 'admin' }`

- [ ] **Step 1: Write the manifest file** with the seven entries above.

- [ ] **Step 2: Add a `describe('manifest')` block to `manifest-types.test.ts` (or a new `manifest.test.ts`)** that asserts the imported `manifest` passes `validateManifest` — this is a compile-time guarantee via the top-level call, but a test ensures nobody removes the call in a future refactor.

- [ ] **Step 3: Add a follow-up-convention comment at the top of `manifest.ts`.**

```ts
// PRs that add a new consumer- or admin-facing surface should add a
// manifest entry in the same PR. When the ui-audit skill proves itself,
// this convention will move into CLAUDE.md's Code section.
```

- [ ] **Step 4: Commit.**

```bash
git add apps/e2e/src/audit/manifest.ts apps/e2e/src/audit/manifest-types.test.ts
git commit -m "feat(audit): initial route manifest — admin + consumer surfaces"
```

### Task 3: DOM heuristics module

**Files:**

- Create: `apps/e2e/src/audit/heuristics.ts`
- Create: `apps/e2e/src/audit/heuristics.test.ts`

**Interfaces:**

- Consumes: nothing external — runs inside the page context via `page.evaluate`.
- Produces:
  - `type HeuristicSnapshot = { hasHorizontalScroll: boolean; offscreenElements: { selector: string; rightEdgePx: number }[]; smallTapTargets: { selector: string; widthPx: number; heightPx: number }[]; brokenImages: { src: string }[] }`
  - `collectHeuristicsScript: string` — the stringified function body run inside the page. Written as a string so `page.evaluate` accepts it verbatim. Exported so it can be unit-tested against DOM fixtures with jsdom.
  - `collectHeuristics(page: Page, viewportWidthPx: number): Promise<HeuristicSnapshot>` — the caller-facing async wrapper.

- [ ] **Step 1: Failing tests.** Use `vitest` + `happy-dom` (already available via existing test setup — verify at implementation) to construct crafted HTMLs.

```ts
import { describe, it, expect } from 'vitest'
import { collectHeuristicsScript } from './heuristics.js'

const runInDom = (html: string, viewportWidthPx: number) => {
  document.body.innerHTML = html
  Object.defineProperty(document.documentElement, 'clientWidth', {
    value: viewportWidthPx,
    configurable: true,
  })
  // eslint-disable-next-line no-new-func
  return new Function(
    `return (${collectHeuristicsScript})(${viewportWidthPx})`,
  )()
}

describe('collectHeuristicsScript', () => {
  it('flags horizontal overflow', () => {
    const snap = runInDom(
      '<div style="width: 2000px; height: 10px"></div>',
      320,
    )
    expect(snap.hasHorizontalScroll).toBe(true)
  })
  it('lists offscreen elements past the viewport right edge', () => {
    const snap = runInDom(
      '<div id="x" style="position: absolute; left: 500px; width: 100px; height: 100px"></div>',
      320,
    )
    expect(snap.offscreenElements.some((e) => e.selector.includes('#x'))).toBe(
      true,
    )
  })
  it('flags tap targets smaller than 32x32', () => {
    const snap = runInDom(
      '<button id="tiny" style="width: 20px; height: 20px"></button>',
      320,
    )
    expect(snap.smallTapTargets.some((t) => t.selector.includes('#tiny'))).toBe(
      true,
    )
  })
  it('does not flag 32x32 or larger tap targets', () => {
    const snap = runInDom(
      '<button id="ok" style="width: 40px; height: 40px"></button>',
      320,
    )
    expect(snap.smallTapTargets).toEqual([])
  })
  it('flags images with naturalWidth 0', () => {
    const snap = runInDom(
      '<img src="broken.png" data-natural-width="0" />',
      320,
    )
    // Test hook: our script reads Element#naturalWidth on <img>; in DOM
    // fixtures we can't paint an image, so the script also honors
    // data-natural-width for testability.
    expect(snap.brokenImages.length).toBeGreaterThanOrEqual(1)
  })
})
```

- [ ] **Step 2: Implement `collectHeuristicsScript`** as a function that runs entirely inside the page (no imports). The function reads `document.documentElement.scrollWidth > document.documentElement.clientWidth`, enumerates elements via `document.querySelectorAll('*')` and skips those with `display: none`, computes `getBoundingClientRect()` for each, and returns the four arrays. For images: narrow with `img instanceof HTMLImageElement && img.naturalWidth === 0`, OR `img.getAttribute('data-natural-width') === '0'` (the data-* check is only used to make tests deterministic under happy-dom; documented inline).

- [ ] **Step 3: Implement `collectHeuristics(page, viewportWidthPx)`** — `await page.evaluate(new Function(\`return (\${collectHeuristicsScript})(\${viewportWidthPx})\`))`.

- [ ] **Step 4: Verify tests pass.**

- [ ] **Step 5: Commit.**

```bash
git add apps/e2e/src/audit/heuristics.ts apps/e2e/src/audit/heuristics.test.ts
git commit -m "feat(audit): DOM heuristics — overflow, offscreen, tap targets, broken images"
```

### Task 4: Sweep runner

**Files:**

- Create: `apps/e2e/src/audit/sweep.ts`
- Create: `apps/e2e/src/audit/sweep-helpers.ts`
- Create: `apps/e2e/src/audit/sweep-helpers.test.ts`

**Interfaces:**

- Consumes: `AuditManifest`, `AuditInteraction`, `collectHeuristics`, Playwright `Page`.
- Produces:
  - `type SweepArgs = { tags?: ('consumer' | 'admin')[]; runId?: string }`
  - `type SweepResult = { runId: string; captures: number; errors: { routeId: string; kind: 'load' | 'interaction' | 'auth'; message: string }[] }`
  - `filterManifest(manifest: AuditManifest, tags?: readonly string[]): AuditManifest` — pure helper; if tags is empty/undefined returns full manifest, else keeps entries where any tag matches.
  - `outputPathFor(runId: string, routeId: string, state: string, viewportLabel: string, ext: 'png' | 'json'): string` — pure helper. Returns e.g. `apps/e2e/audit-output/2026-07-12T18-04-11/admin-feedback__expand-first-card__390x844.png`.
  - `runSweep(args: SweepArgs): Promise<SweepResult>` — the entry point.

**Sweep matrix (per spec §2b):** viewports `{ label: '320x568', width: 320, height: 568 }`, `{ label: '390x844', width: 390, height: 844 }`, `{ label: '1440x900', width: 1440, height: 900 }`. Capture states = `default` (post-load) plus one capture per declared interaction.

**Stability rules:** await `networkidle` then `page.evaluate(() => document.fonts.ready)`; emulate `prefers-reduced-motion: reduce` to avoid mid-transition captures.

- [ ] **Step 1: Failing tests for pure helpers.**

```ts
import { describe, it, expect } from 'vitest'
import { filterManifest, outputPathFor } from './sweep-helpers.js'

describe('filterManifest', () => {
  const manifest = [
    { id: 'a', path: '/a', tags: ['consumer'] as const, auth: 'none' as const },
    { id: 'b', path: '/b', tags: ['admin'] as const, auth: 'admin' as const },
    {
      id: 'c',
      path: '/c',
      tags: ['consumer', 'admin'] as const,
      auth: 'user' as const,
    },
  ]
  it('returns everything when no tags given', () => {
    expect(filterManifest(manifest, undefined).map((r) => r.id)).toEqual([
      'a',
      'b',
      'c',
    ])
  })
  it('filters by admin tag', () => {
    expect(filterManifest(manifest, ['admin']).map((r) => r.id)).toEqual([
      'b',
      'c',
    ])
  })
})

describe('outputPathFor', () => {
  it('builds the canonical filename', () => {
    expect(
      outputPathFor(
        '2026-07-12T18-04-11',
        'admin-feedback',
        'expand-first-card',
        '390x844',
        'png',
      ),
    ).toBe(
      'apps/e2e/audit-output/2026-07-12T18-04-11/admin-feedback__expand-first-card__390x844.png',
    )
  })
})
```

- [ ] **Step 2: Implement the two helpers.** Verify tests pass.

- [ ] **Step 3: Implement `runSweep`.** Pseudocode:

```ts
export const runSweep = async (args: SweepArgs): Promise<SweepResult> => {
  const baseUrl =
    process.env['PLAYWRIGHT_AUDIT_BASE_URL'] ??
    'https://staging.concertcrawl.app'
  const runId =
    args.runId ?? new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const routes = filterManifest(manifest, args.tags)
  const viewports = [
    { label: '320x568', width: 320, height: 568 },
    { label: '390x844', width: 390, height: 844 },
    { label: '1440x900', width: 1440, height: 900 },
  ]
  const errors: SweepResult['errors'] = []
  let captures = 0

  const browser = await chromium.launch()
  try {
    for (const route of routes) {
      const storageState =
        route.auth === 'none'
          ? undefined
          : route.auth === 'admin'
            ? '.auth/audit-admin.json'
            : '.auth/audit-user.json'
      for (const vp of viewports) {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          reducedMotion: 'reduce',
          storageState,
          baseURL: baseUrl,
        })
        const page = await context.newPage()
        try {
          await page.goto(route.path, { waitUntil: 'networkidle' })
          await page.evaluate(() => document.fonts.ready)
          await captureState(runId, route.id, 'default', vp, page)
          captures++
          for (const interaction of route.interactions ?? []) {
            try {
              await interaction.run(page)
              await page.waitForLoadState('networkidle')
              await captureState(runId, route.id, interaction.id, vp, page)
              captures++
            } catch (err) {
              // Selector drift or missing state — capture as-is + record.
              await captureState(
                runId,
                route.id,
                `${interaction.id}__stale`,
                vp,
                page,
              )
              errors.push({
                routeId: route.id,
                kind: 'interaction',
                message: String(err),
              })
            }
          }
        } catch (err) {
          errors.push({ routeId: route.id, kind: 'load', message: String(err) })
        } finally {
          await context.close()
        }
      }
    }
  } finally {
    await browser.close()
  }
  return { runId, captures, errors }
}
```

`captureState` writes both `<path>.png` (full-page) and `<path>.json` (heuristic snapshot). Ensure the output dir exists with `fs.mkdirSync(..., { recursive: true })`.

- [ ] **Step 4: CLI entry.** Bottom-of-file `pathToFileURL` guard reads `process.argv` for `--tags=admin,consumer` (comma-separated) and prints the `SweepResult` as JSON. Follow the same guard shape as `scripts/2026-07-11-gifted-comps-backfill.ts`.

- [ ] **Step 5: Commit.**

```bash
git add apps/e2e/src/audit/sweep.ts apps/e2e/src/audit/sweep-helpers.ts apps/e2e/src/audit/sweep-helpers.test.ts
git commit -m "feat(audit): sweep runner — viewport matrix, interactions, heuristics per capture"
```

### Task 5: Wiring — pnpm script, gitignore, auth-state prep

**Files:**

- Modify: `apps/e2e/package.json` — add `"audit": "tsx src/audit/sweep.ts"` under `scripts`. Add `tsx` to `devDependencies` if not already available at the workspace root (check with `pnpm --filter e2e list tsx` before adding).
- Create: `apps/e2e/audit-output/.gitkeep` (empty file, just to make the directory exist).
- Modify: `apps/e2e/.gitignore` (create if missing) — add `audit-output/*` and `!audit-output/.gitkeep` and `.auth/audit-*.json`.
- Modify: `apps/e2e/src/fixtures/auth.ts` — extract the login helper into a reusable exported `loginAndSave(email, password, outputPath, baseURL)` so both the existing `globalSetup` and the audit sweep can call it. Do NOT change the existing e2e globalSetup default output path (`.auth/user.json`).
- Create: `apps/e2e/src/audit/audit-auth.ts` — co-located with the sweep code; wraps `loginAndSave` to produce `.auth/audit-user.json` and `.auth/audit-admin.json`.

**Interfaces:**

- Produces:
  - `pnpm --filter e2e audit -- --tags=admin` runs `tsx src/audit/sweep.ts --tags=admin`.
  - `prepareAuditAuth(role: 'user' | 'admin'): Promise<void>` — logs the appropriate fixture user in and writes `.auth/audit-<role>.json`. Fixture user IDs live in `scripts/seed-staging/fixture-users.ts` (from PR 2); credentials come from `E2E_AUDIT_USER_EMAIL` / `E2E_AUDIT_USER_PASSWORD` / `E2E_AUDIT_ADMIN_EMAIL` / `E2E_AUDIT_ADMIN_PASSWORD` env vars.
  - New `audit-auth-setup` invocation happens as the sweep runner's first step (once per run, before the route loop) — call `prepareAuditAuth('user')` and `prepareAuditAuth('admin')` upfront if any route requires them.

- [ ] **Step 1: Refactor auth helper.** Move the `page.goto → fill → click` sequence out of `globalSetup` into an exported `loginAndSave(email, password, outputPath, baseURL)` function; have `globalSetup` call it. Add a test that asserts `loginAndSave` throws when creds are missing (do not test the actual login — that requires a live Clerk).

- [ ] **Step 2: Wire `prepareAuditAuth`** on top of that helper.

- [ ] **Step 3: `apps/e2e/.gitignore` edits + `audit-output/.gitkeep`.**

- [ ] **Step 4: package.json script wiring.**

- [ ] **Step 5: Smoke-test the wiring** with a tag-scoped run against a live staging: `PLAYWRIGHT_AUDIT_BASE_URL=… E2E_AUDIT_ADMIN_EMAIL=… E2E_AUDIT_ADMIN_PASSWORD=… pnpm --filter e2e audit -- --tags=admin`. Confirm PNG + JSON files land under `apps/e2e/audit-output/<run-id>/`.

- [ ] **Step 6: Commit.**

```bash
git add apps/e2e/package.json apps/e2e/.gitignore apps/e2e/audit-output/.gitkeep apps/e2e/src/fixtures/auth.ts apps/e2e/src/audit/audit-auth.ts
git commit -m "feat(audit): pnpm --filter e2e audit wiring + audit-scoped auth state"
```

### Task 6: Empty-state marker + failure notes

**Files:**

- Modify: `apps/e2e/src/audit/sweep.ts` — after each `captureState`, if the heuristic snapshot's `<main>` element has fewer than 5 direct children, tag the JSON output with `"insufficientData": true`. The vision-triage stage in PR 4 keys off this to skip judgment and log "run the seeder". This heuristic is deliberately narrow — content density is the reliable signal; interactive-element counts vary too much across pages to gate the flag.

- [ ] **Step 1: Extend `HeuristicSnapshot` and `collectHeuristics`** to include `contentDensity: { mainChildren: number }`. Add a heuristic test for the counts.

- [ ] **Step 2: Extend `runSweep`** to compute `insufficientData` = `snapshot.contentDensity.mainChildren < 5`; store it in the JSON output.

- [ ] **Step 3: Commit.**

```bash
git add apps/e2e/src/audit/heuristics.ts apps/e2e/src/audit/heuristics.test.ts apps/e2e/src/audit/sweep.ts
git commit -m "feat(audit): mark thin renders as insufficientData for triage skip"
```

**PR-close steps for PR 3:**

- [ ] All `pnpm test:scripts` (root) + `pnpm --filter e2e typecheck` pass.
- [ ] One smoke sweep run (tag `admin`, staging) produces the expected number of PNG+JSON pairs — 3 admin-tagged routes (`admin-feedback`, `admin-contests`, `admin-events`) × 3 viewports × 1–2 states each (only `admin-feedback` declares an interaction) = 12 captures — with no unhandled errors.
- [ ] Open PR titled `feat(audit): manifest + Playwright sweep engine` linking spec + PR 1 / PR 2.

---

## PR 4 — `ui-audit` skill authoring + calibration (out-of-repo)

**Deliverable:** A user-level skill at `~/.claude/skills/ui-audit/` that orchestrates: preflight → run sweep → vision triage → report → approval gate → filing. Plus the `ui-audit` GitHub label. Plus one calibration run whose output is Hugh-reviewed.

**Note:** This PR does NOT touch the repo. The tasks below still get tracked and reviewed by Hugh directly — there is no Copilot review for a personal-skill authoring session. Track completion in memory (`~/.claude/projects/*/memory/`), not in the repo.

### Task 1: Skill scaffolding

**Files (user-level, not repo):**

- Create: `~/.claude/skills/ui-audit/SKILL.md`
- Create: `~/.claude/skills/ui-audit/triage-brief-template.md` — the prompt template the orchestrator hands each triage subagent.
- Create: `~/.claude/skills/ui-audit/report-template.md` — the shape of the pre-approval report.

**SKILL.md structure** (per superpowers:writing-skills):

- Frontmatter:
  - `name: ui-audit`
  - `description: Use when auditing the concert-crawl app for pure UI breakage — horizontal overflow, unreadable wrapping, overlapping elements, broken images, crushed tap targets — across staging routes and mobile/desktop viewports. Report-first; nothing files without user approval.`
- Sections (in order):
  - **Overview** — 1-paragraph what/why.
  - **When to Use** — bullet list of triggers (Hugh says "ui audit", "check for mobile breaks", "run the audit skill"). When NOT to use (dark-mode drift, UX vibes, prod scanning).
  - **Preflight (before every run)** — verify the checked-out repo has `apps/e2e/src/audit/manifest.ts`; run `git -C <repo> pull` if stale; confirm staging is populated (query the events count via the staging API or the DB — script to be added at authoring time). If insufficient, prompt Hugh to run `pnpm db:seed:staging`.
  - **Run the sweep** — exact command: `pnpm --filter e2e audit -- --tags=<user-supplied or "">` from `"${REPO:-$HOME/Projects/concert-crawl}"` (or the currently active worktree). Capture the run id from stdout.
  - **Vision triage** — the parallel-subagent dispatch shape. One subagent per (tag section) worth of screenshots; each is given `triage-brief-template.md` + a batch of screenshots + their heuristic JSON. The subagent returns findings in a strict JSON shape (spec §2c). Orchestrator concatenates.
  - **Dedupe** — within-run collapse (same root cause across viewports/states = one finding); cross-run dedupe against open `gh issue list --label ui-audit --state open --json title,body`.
  - **Report** — write `apps/e2e/audit-output/<run-id>/REPORT.md` following `report-template.md`, present a summary table in chat.
  - **Approval gate** — STOP. Wait for Hugh. Explicitly prohibit any `gh` mutation before approval. Include a red-flag rationalization table.
  - **Filing** — on approval only: commit approved screenshots to orphan branch `ui-audit-artifacts` (see Task 2 for the exact mechanics), then `gh api /repos/HartiganHM/concert-crawl/issues -X POST` per finding with the label bundle.

- [ ] **Step 1: Write SKILL.md** following the above structure. Aim for <400 lines total (getting-started + reference guidance from writing-skills).

- [ ] **Step 2: Write the triage-brief-template.md.** The template must forbid the subagent from filing to GitHub (defense in depth), must reference the pure-UI-breakage bar, and must specify the exact finding JSON shape (`class` is one of `"overflow" | "wrap" | "overlap" | "image" | "tap-target"`; `severity` is one of `"balk" | "degraded"`):

```json
{
  "findings": [
    {
      "routeId": "admin-feedback",
      "viewport": "390x844",
      "state": "expand-first-card",
      "severity": "balk",
      "class": "overflow",
      "oneLiner": "Context column wraps one character per line at mobile widths.",
      "screenshotPath": "apps/e2e/audit-output/<run-id>/admin-feedback__expand-first-card__390x844.png"
    }
  ]
}
```

- [ ] **Step 3: Write report-template.md.**

- [ ] **Step 4: Commit to your Claude config repo** (if one exists) or note the skill files in the session memory.

### Task 2: `ui-audit-artifacts` orphan branch mechanics

Document in SKILL.md the exact `gh` + `git` sequence for uploading a screenshot such that its `raw.githubusercontent.com` URL resolves in an issue body:

```bash
# Resolve repo path once — defaults to the standard checkout, overridable
# per-machine via the REPO env var.
REPO="${REPO:-$HOME/Projects/concert-crawl}"

# One-time per environment: verify branch exists (create if not). The
# creation path uses a two-step add-worktree-then-orphan pattern that
# works on any Git version — it does NOT rely on `git worktree add
# --orphan`, which only exists in Git ≥ 2.42.
git -C "$REPO" fetch origin ui-audit-artifacts:ui-audit-artifacts 2>/dev/null || (
  # Truly first-run: land a temp worktree on any branch, orphan-checkout
  # inside it, commit empty, push, then clean up the temp branch.
  git -C "$REPO" worktree add -b ui-audit-artifacts-init .worktrees/ui-audit-artifacts HEAD
  (
    cd "$REPO/.worktrees/ui-audit-artifacts"
    git checkout --orphan ui-audit-artifacts
    git rm -rf . 2>/dev/null || true
    git commit --allow-empty -m "chore: init ui-audit-artifacts orphan branch"
    git push -u origin ui-audit-artifacts
  )
  git -C "$REPO" branch -D ui-audit-artifacts-init
)

# Per approved-finding upload — copies the screenshot into the orphan
# worktree, commits, pushes. URL becomes:
# https://raw.githubusercontent.com/HartiganHM/concert-crawl/ui-audit-artifacts/<runId>/<file>
```

- [ ] **Step 1: Document the sequence in SKILL.md.** Test the sequence by hand once in a scratch directory before the first calibration run.
- [ ] **Step 2: Add safety rails.** SKILL.md must state explicitly: the orphan branch is never merged; if the branch ever accidentally appears in a PR, close the PR immediately.

### Task 3: `ui-audit` GitHub label

- [ ] **Step 1: Create the label** (one-shot, before first filing):

```bash
gh label create ui-audit \
  --repo HartiganHM/concert-crawl \
  --color BFDADC \
  --description "Findings from the ui-audit skill sweep"
```

Verify: `gh label list --repo HartiganHM/concert-crawl | grep ui-audit`.

### Task 4: Calibration run

- [ ] **Step 1: Run `pnpm db:seed:staging`** to give the sweep something to render.
- [ ] **Step 2: Invoke the skill** as Hugh would: `Use ui-audit — full sweep`. Skill runs preflight → sweep → triage → report.
- [ ] **Step 3: Present the report** to Hugh, listing every finding + severity + screenshot preview. STOP.
- [ ] **Step 4: On Hugh's go-ahead**, file the approved findings. Confirm each issue lands with all five labels (`type: bug`, `source: internal`, `phase: beta`, `priority: high` or `priority: normal`, `ui-audit`) and a resolving screenshot URL in the body.

### Task 5: Post-calibration memory update

- [ ] **Step 1: Update `~/.claude/projects/-Users-huey-Projects-concert-crawl/memory/project_pickup_ui_audit_seeder.md`** to record: skill deployed, first calibration run count of findings, any adjustments made to the triage bar afterward. This memory becomes the "audit is live" pickup for future sessions.
- [ ] **Step 2: If any triage adjustments were made** (bar too tight / too loose / dedupe missed something), commit the SKILL.md edits and note the rationale in memory.

**PR 4 completion criteria:**

- [ ] Skill exists at `~/.claude/skills/ui-audit/SKILL.md` and is loadable.
- [ ] `ui-audit` label exists on the repo.
- [ ] One calibration run has completed end-to-end: sweep → report → Hugh approval → issues filed with screenshots resolving via orphan branch.
- [ ] Memory updated with completion state.

---

## Self-Review Checklist for PR 3 + PR 4

- [ ] Spec §2a coverage: manifest type, route entries with tags + auth + interactions. Landed as PR 3 Tasks 1–2.
- [ ] Spec §2b coverage: staging URLs, viewports 320×568 / 390×844 / 1440×900, capture output shape, DOM heuristics (four categories), stability rules. Landed as PR 3 Tasks 3–6.
- [ ] Spec §2c coverage: vision triage against pure-UI-breakage bar, `balk` / `degraded` severities, dedupe (within-run + cross-run), parallel subagent dispatch. Landed as PR 4 Task 1.
- [ ] Spec §2d coverage: report file, Hugh approval gate, orphan `ui-audit-artifacts` branch, `gh` issue creation with label bundle including new `ui-audit` label. Landed as PR 4 Tasks 1–4.
- [ ] Failure handling: load/auth failures recorded as sweep errors, interaction failures capture as-is + flag stale, empty renders tagged `insufficientData`. Landed across PR 3 Tasks 4 + 6.
- [ ] Testing: manifest validator, DOM heuristics against fixtures, sweep helpers pure-unit-tested, smoke sweep against known-good route. Landed as PR 3 Tasks 1, 3, 4, and PR-close steps.
- [ ] Type-safety rule: production code stays free of `as` value casts (heuristics narrows images with `instanceof HTMLImageElement`; manifest goes through Zod). `as const` in interaction handlers and unit-test `as any` mock shims are called out as exemptions in Global Constraints.
