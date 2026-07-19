# #1053 — Duplicate event rows (title-variant dedup gap): root-cause analysis + options

**Status:** Approach approved + implemented (PR #1121). Option 1 chosen — re-key dedup to `(venue_id, date, canonical_artist, show_time)`; prod backfill signed off by Hugh 2026-07-19.
**Author:** autonomous session, 2026-07-19.

## Confirmed root cause (not the issue's stated hypothesis)

The issue hypothesises a "hash that includes the full title." That is close but not
literal. The dedup key is a **partial UNIQUE index** on
`(venue_id, date, canonical_title) WHERE status = 'upcoming'` (migration `0044`),
and `canonicalizeTitle` (packages/crawler-core/src/lib/canonical-title.ts)
**deliberately does not split on separators** — it keeps the full billing string,
only normalising diacritics / apostrophes / markdown / whitespace / case.

So the three prod variants of one show produce three _distinct_ canonical titles and
three rows:

```
"Hilary Duff"                              → "hilary duff"
"Hilary Duff with La Roux and Jade LeMac"  → "hilary duff with la roux and jade lemac"
"Hilary Duff with La Roux, Jade LeMac"     → "hilary duff with la roux, jade lemac"
"Hilary Duff La Roux, Jade LeMac"          → "hilary duff la roux, jade lemac"
```

The unique index holds perfectly for its own key: **0 exact residual dupes** on
`(venue, date, canonical_title)` among upcoming rows. Every dupe is a title _variant_.

## Why the obvious fixes each fall short

**History:** dedup key was `(venue, date, canonical_artist)` → moved to
`canonical_title` in #821/#822/#0044 precisely because `canonical_artist` drifted
(the LLM picked different substrings of compound titles). So we've already been
burned by an artist key. But `canonical_title` now under-collapses on billing
variants. Neither pure key is correct.

**Separator/entity normalisation alone is insufficient.** The Kitchen Dwellers
cluster shows the entity gap clearly (`&#8211;` vs `–` vs `—`), so entity-decode +
separator canonicalisation _would_ help there. But it **cannot** collapse
`"Hilary Duff"` (no tail) against `"Hilary Duff with La Roux, Jade LeMac"` (full
tail) — they differ by the presence of the entire supporting-artist tail, not by
separator style. Only a headliner-based key collapses no-tail-vs-with-tail variants.

## The enabler that changed since #821

Post-#643, extraction separates the headliner (`artist` / `canonical_artist`) from
`supporting_artists` / `canonical_supporting`. Prod evidence: `canonical_artist` is
**stable across the variant rows** for the observed clusters:

| Cluster (venue/date)                          | rows | canonical_artist             |
| --------------------------------------------- | ---- | ---------------------------- |
| Red Rocks / Hilary Duff 2026-07-19            | 4    | all `hilary duff`            |
| Red Rocks / Cross Canadian Ragweed 2026-07-23 | 4    | all `cross canadian ragweed` |
| Cervantes / Kitchen Dwellers 2026-07-23       | 7    | all `kitchen dwellers`       |

So re-keying on the headliner _would_ collapse these. **But drift is not fully
gone:** "Jeff Austin Tribute ft…" split into `canonical_artist` = `jeff austin` (1)
vs `jeff austin tribute` (2) on the same venue/date — the #821 failure mode persists
for a minority of listings.

## Backfill scope (prod, upcoming rows)

- **283 clusters / 510 rows** would be collapsed by a `(venue, date, canonical_artist)` key.
- Current `(venue, date, canonical_title)` key: **0** exact residual dupes.
- **Over-collapse risk:** 11 clusters have >1 distinct `show_time` within
  venue+day+artist. Most are time-extraction drift on the _same_ show (e.g. CCR
  18:00 vs 18:30). A few are ambiguous genuine double-headers, e.g. **Kristin Key
  2026-09-19 at 16:00 and 19:00** (matinee + evening). A pure artist key would merge
  those — a real, if rare, data-loss bug that needs a product ruling.

## Options (for decision)

1. **Re-key dedup to `(venue, date, canonical_artist)`** + consolidation backfill.
   Directly implements the issue; collapses all observed clusters; only key that
   handles no-tail-vs-tail. Risks: (a) over-collapse of genuine same-artist-same-day
   double-headers (~a handful; mitigate by adding `show_time` to the key or a
   time-bucket); (b) still misses headliner-drift cases (Jeff Austin) — those stay
   as residual dupes until artist extraction stabilises.

2. **Headliner-derived title key:** strip the `canonical_supporting` tokens (and a
   trailing "with/w//&/ft./," opener run) from `canonical_title` before hashing,
   yielding a headliner key while retaining more title specificity than pure artist.
   More surgical, lower over-collapse risk, more code. Still needs the backfill.

3. **Normalisation-only (entity decode + separator canonicalisation), keep title
   key.** Lowest risk, no re-key. But provably insufficient — cannot collapse the
   no-tail variants that dominate the observed clusters. Rejected as a standalone
   fix; worth folding into 1 or 2 as defence-in-depth (the `&#8211;` entities should
   be decoded regardless).

**Recommendation:** Option 1 with `show_time` (or a coarse time bucket) added to the
dedup key to defuse the double-header over-collapse, plus entity-decode as
defence-in-depth. Follows the expand/contract rollout of #0044 (consolidation script
runs to completion _before_ the unique-index swap). Requires human approval of the
prod backfill and a ruling on the double-header handling before implementation.

## Open questions for Hugh

1. Approve re-key to a headliner-based key (Option 1), or prefer the more surgical
   Option 2?
2. Double-headers: add `show_time` to the dedup key, or accept that same-artist
   same-day shows collapse (treating the rare matinee+evening as one listing)?
3. Backfill: OK to run the 510-row consolidation on prod (with a staging dry-run
   first, mirroring the #821 rollout)?
