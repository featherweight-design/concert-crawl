# Copilot instructions — Concert Crawl

Concert Crawl aggregates live-music events from Denver venue websites into a searchable calendar. pnpm + Turborepo monorepo: `apps/{web,api,crawler,e2e}`, `packages/{config,crawler-core,db,entitlements,logger,price-pipeline,types}`. `CLAUDE.md` at the repo root has broader project background, but **this file is authoritative for PR-review guidance** — where the two diverge (CLAUDE.md still describes a `packages/auth` wrapper, an unqualified single-character-identifier ban, and other conventions that predate the current code), follow this file.

## Findings already settled, and findings that are doc-sync

PR bodies here may carry two marked sections. Both are written by the PR author
and both are machine-read.

- **`## Settled`** records a finding that was raised, considered, and
  deliberately declined, with the reason. **Please do not re-raise a finding that
  section already answers.** If you believe the recorded reasoning is wrong, say
  so explicitly and name the entry rather than restating the original finding as
  if it were new.
- **`## Doc-sync`** names paths whose findings were comment, naming or PR-body
  accuracy only — no behaviour change.

Likewise, a thread you opened on an earlier round that has since been fixed does
not need restating in the summary of a later round. Two PRs here reached the
twelve-round ceiling; re-stated threads are a share of that.

## Architecture — do NOT flag these as problems

These are intentional and settled. Do not suggest changes that reverse them.

- **REST, not GraphQL.** Type safety comes from Zod + shared `packages/types`, not resolvers.
- **Postgres full-text search** (`tsvector` + GIN), not an external search service.
- **Drizzle for all DB access.** Raw string-built SQL is banned, but Drizzle's parameterized `sql` template tag is used and expected in non-migration TypeScript (e.g. seeds, crawler queries) — do not flag it as "raw SQL."
- **Auth is Clerk.** There is no `packages/auth` wrapper — Clerk is imported directly across `apps/web` and `apps/api`; treat that as normal.
- **Store timestamps in UTC, display Mountain Time.** Conversion happens at the API/display layer, not the DB.
- **Expand/contract migrations only.** Never destructive schema changes in a single deploy.
- **Crawler extraction cascade:** HTML fetch → JSON-LD structured data → Claude Haiku LLM fallback → manual admin entry. A per-venue `crawlWaitForSelector` (used with `page.waitForSelector` for render timing) is a legitimate, supported pattern — not a per-venue scraping selector to flag.
- **Styling is Tailwind + shadcn/ui.** Theming uses `data-theme` design tokens (Electric / Jade / Light), not Tailwind `dark:` variants.

## House rules — enforce these in review

Flag violations of the following:

- **No unsafe `as` type casts.** Prefer Zod `safeParse` at boundaries, type guards for union narrowing, or declaration merging. `as const` is fine and widely used — do not flag it.
- **Zod validation at every Hono API endpoint.** No raw input should reach the DB.
- **All API routes namespaced under `/v1/`.**
- **Descriptive identifiers** — ESLint `id-length` enforces a 2-char minimum (`err` not `e`, `ctx` not `c`), but explicitly permits `i`, `j`, `k`, `x`, `y`, `z`, and `_`. Do not flag those permitted single-char names.
- **Every `catch` block must log.** Fire-and-forget async goes through a `void` async IIFE, never a floating promise.
- **Customer-facing strings live in a `definitions/copy.ts` file**, never inline JSX literals. Copy/constants/types belong in `definitions/` folders.
- **Components (for new/changed code):** prefer arrow functions, semantic HTML, and logic extracted to `lib/`; avoid `handle*` handler names and native `title=` tooltips; extract shared UI into reusable components with keyboard/ARIA/touch accessibility in the same change. Legacy code predates these conventions and uses `export function` components, `handle*` handlers, and some native `title=` — do not flag existing usage, only new violations.
- **Mobile/desktop parity is non-negotiable** — behavioral parity must land in the same change, not a follow-up.
- **TypeScript strict mode** across all packages.

## Crawl safety (critical — the product has no data if crawls get blocked)

The crawler must always honor `robots.txt`, identify honestly with a `ConcertCrawl/1.0 (+https://concertcrawl.app/bot)` user agent (the `price-pipeline` package uses a `.com` variant — both are valid, don't flag either), apply a per-domain delay (default ~3s, applied with jitter), flag venues on 403/429, and pause a venue after repeated failures. Flag changes that weaken these protections; do not flag existing jitter or the exact delay value.

## PR conventions

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.
- **Do not add a "Generated with Claude Code" footer** to PR descriptions.
- New env vars must be documented in the PR body (name, purpose, creation steps). Never place real secrets in any tracked file — `.env.example` uses placeholders only.
- User-facing feature PRs add an entry to `apps/web/src/lib/definitions/releases.ts` on the same branch.

Focus review comments on correctness, the house rules above, and security (OWASP top 10 — this app ingests untrusted crawl and user input). Do not re-raise the settled architecture decisions.
