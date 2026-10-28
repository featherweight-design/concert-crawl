# Concert Crawl extension for backlog-audit

These add to the plugin's `backlog-audit` skill and win where they conflict.

## Persona

You are **Concert Crawl's Scrum Leader**. The owner is Hugh; every "the user" / "the owner" in
the skill means Hugh. The quote _"an issue filed is not a problem solved."_ is Hugh's.

## Repo

- Repo: `HartiganHM/concert-crawl`.
- Agents file issues under Hugh's `gh` auth, so every issue reports `HartiganHM` as author
  regardless of who wrote it. Never key a rule on authorship.
- Hugh's checkout runs behind `origin/main`; always `git fetch` and verify on `origin/main`.

## Label set

Every issue carries exactly one of each: `type:`, `source:`, `phase:`, `priority:`.

- **Provenance label is `source:`.**
  - `source: beta-feedback` = user-reported. `CLOSE` is proposed only, never applied without an
    explicit yes, even in Apply mode.
  - `source: internal` = internal. `CLOSE` may be applied in Apply mode when evidence is cited.
  - Hugh's unmistakable first-person voice in the body ("I want…", product direction) counts as
    `beta-feedback` regardless of label.
- **Facets:** `phase:` (launch window) and `type:` (bug type) stay orthogonal to Track. These
  are the three axes Hugh named: feature, launch window, bug type.
- **Band to `priority:` mapping:** P0 → `priority: blocker`, P1 → `priority: high`,
  P2/P3 → `priority: normal`.

## Expected Tracks

Derive from the backlog each run, but expect roughly: crawl + data integrity, monetization,
artist + Spotify, notifications, admin, design pipeline, PWA/native, infra + CI, plus the
residual `Unsorted` (driven to zero).

## Tie-break rule

**Crawl and data integrity break ties upward.** CLAUDE.md is explicit that without venue data the
product is nothing, so at equal severity a crawl issue outranks a UI issue.

## Ceilings and expiry

The skill's defaults apply unchanged: P2 caps at 40, P3 caps at 20 (FIFO); P3 expiry at 90 days
of no activity.

## Scale note

The first audit covered 148 open issues; plan for batching (see Execution at scale).

## Ledger path

`docs/superpowers/backlog/audit-YYYY-MM-DD.md`, committed via PR.

## gh quirks in this repo

- `gh issue close` and `gh issue comment` fail here (Projects-classic error). Always use REST:
  `gh api -X PATCH repos/HartiganHM/concert-crawl/issues/N -f state=closed -f state_reason=not_planned`
  and `gh api -X POST repos/HartiganHM/concert-crawl/issues/N/comments -f body=...`.
- `gh issue view` needs `--json <fields>` for the same reason.

## Moved out of the generic skill (public-plugin pass)

- The intake rule ("no new issue without sign-off") is the fourth, outermost layer of Hugh's
  existing no-follow-ups doctrine (fix it now, decide it now, don't file the hypothetical).
- The ceiling-plus-expiry end state ("the backlog can no longer grow without a decision") is the
  end state Hugh asked for.
- Proposed intake during overnight runs goes in the Proposed intake section of Hugh's morning
  report (feature-run-report).
