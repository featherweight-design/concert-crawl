# Ambiguous-artist auto-match: plan

**Ruling (Hugh, 2026-11-10):** a wrong artist is easier to fix than an unmatched one. So auto-pick the best candidate when it clears a sensible confidence bar, record that it was auto-matched so admin can find and correct it, and leave only the genuinely unmatchable rows in the queue. **Any production data pass needs Hugh's explicit OK.**

This reverses an earlier stance: "nothing auto-resolves from the snapshot", and in the MusicBrainz work, "the cross-check is the entire safety property". That stance priced a wrong press photo above an empty artist page. The ruling prices it the other way, provided the auto-matched rows can be found and reversed in one click. That proviso is what this plan builds.

## What the data says (staging, read-only, 2026-11-10)

- 678 `ambiguous` rows that aren't hidden, 667 of them with a `spotifyCandidates` snapshot. **195 have an upcoming show**; that is the admin queue's default view.
- 649 of the 678 have two or more candidates whose name is exactly the act's name. That is why they are ambiguous: the matcher's photo tiebreak (`artist-match.ts:178`) settles only "exactly one exact-name candidate has a photo".
- The snapshot carries no usable popularity. Spotify dropped it for this app in February 2026, and 900 of 35k candidates have it. Genres are null. **The only signals are name equality, photo presence and Spotify's own result order.** Spotify ranks search results by relevance, which weighs popularity, so its order is the popularity signal that's left.

## The bar

Auto-match a row when all of these hold:

1. **Spotify's top result is the act.** The candidate at rank 0 folds to the row's `canonicalName` with `canonicalizeArtist`, the same test the matcher uses.
2. **That candidate has a photo.** A namesake with no image is usually an empty stub, and the photo is what the artist page shows.
3. **The row names one whole act.** `normalizeArtistName(name).trim()` equals `canonicalName`. That excludes a truncated billing such as `Beacons & Brews` (canonical `beacons`), where the "act" is an event title cut at a separator. Those rows stay for a human or the reaper.

Staging yield: **173 of 195** upcoming rows (565 of 667 all-time) pass 1 and 2. Condition 3 removes about 7 more. **About 22–29 upcoming rows stay in the queue**: no exact top hit, no photo, or not a whole act. Those are the genuinely unmatchable ones.

**Rejected:** taking the *first exact-name candidate anywhere in the list*. That clears 192 of 195, but for `pearl` it picks a namesake that Spotify ranked below Pearl Jam. Nothing marks it as the act playing Denver, so it's a guess dressed as a match.

Exhausted rows (`matchAttempts = MATCH_ATTEMPT_LIMIT`, set by the MusicBrainz pass's "several exact matches" verdict) are **in scope**. That verdict says the name is shared. It doesn't say the top hit is wrong, and the ruling accepts that risk.

## Recording it

- **Migration 0092** (expand-only): `artists.auto_matched_at timestamptz NULL`. It is non-null exactly while the current match came from this rule. Rollback: the column is ignorable, and its drop is a later contract migration.
- An auto-match writes what the admin picker writes (`admin/artists.ts:311-332`): `spotifyArtistId`, `matchStatus = 'matched'`, `matchConfidence = null`, `matchAttempts = 0`, `matchCheckedAt`, a cleared photo so the photo job fetches the chosen act's own, and `autoMatchedAt = now()`.
- **Every admin write to the match clears `autoMatchedAt`**: the `PATCH /:id` re-pick, a confirm, `no_match`, `not_an_artist`. A human answer replaces the rule's.
- **Audit:** the one-off pass writes one `audit_log` row per artist (`action = 'artist.match.auto'`, `actorId = 'system:auto-match'`, metadata `{spotifyArtistId, rule: 'top-exact-with-photo'}`), so a bad pick can be traced to the pass that made it.

## Where the rule lives

- **The pure decision**, `pickBestEffortCandidate(snapshot, row)`, goes in `packages/types`, next to `canonicalizeArtist`. Both callers can import it there; `packages/db` can't import from `apps/api`. It returns the candidate or the reason it declined (`no-snapshot`, `top-not-exact`, `top-no-photo`, `not-a-whole-act`), so the dry run can tally reasons the way the MusicBrainz script does.
- **Going forward:** the match job (`apps/api/src/jobs/match-artists.ts`) calls it wherever `matchArtist` would return `ambiguous`. It writes the match with `autoMatchedAt`, so the queue doesn't refill. The candidate snapshot is written as it is today.
- **The backlog:** a one-off script, `packages/db/src/scripts/auto-match-ambiguous.ts`, plus `run-auto-match-ambiguous.ts`. It reads stored snapshots only, makes no Spotify calls, and costs nothing. It defaults to a dry run, applies with `--apply`, and takes `--limit=N`. It selects `ambiguous` rows that are not hidden and carry a snapshot, and guards each write on the row still being `ambiguous`. A re-run is idempotent.

## Admin

- `GET /v1/admin/artists` accepts `autoMatched=true`, which filters `matched` rows with `autoMatchedAt IS NOT NULL`, and returns `autoMatchedAt` in the select. `/counts` gains an `autoMatched` figure.
- The artists page gets an **Auto-matched** tab beside Ambiguous, and each auto-matched row shows a small "Auto" mark. The existing candidate picker re-picks, and a **Looks right** action confirms (a `PATCH` with the same `spotifyArtistId`, which clears `autoMatchedAt`). This is admin copy, so it goes through copy-review; admin copy is em-dash-exempt.

## PRs (no stacking; each from fresh `main`)

1. **This plan** (doc only).
2. **Rule + recording + backlog script**: migration 0092 and the schema field; the pure rule and its unit tests (the three conditions, each decline reason, `pearl`, `Beacons & Brews`); the script, its runner and integration tests (applies, skips non-ambiguous rows, idempotent, writes audit rows, dry run writes nothing); the match-job hook and its test; and `PATCH /:id` clearing `autoMatchedAt`, with a test. Comments asserting "nothing auto-resolves" get updated (`schema/artists.ts:138`, `artist-match.ts` header). About 12 files. **Risky** (migration, API route): `/code-review medium` plus the checklist.
3. **Admin surface**: the list and counts params, the tab, the mark, the confirm action, copy, and tests. About 8 files. Risky (API route).

## Runs owed to Hugh (lanes cannot write to staging or prod)

After PR 2 merges and its migration is on the target:

```
pnpm --filter @concert-crawl/types --filter @concert-crawl/db build
DATABASE_URL=<staging> pnpm --filter @concert-crawl/db db:auto-match-ambiguous            # dry run: tally by reason
DATABASE_URL=<staging> pnpm --filter @concert-crawl/db db:auto-match-ambiguous --apply
```

Then the same against prod, **only on Hugh's explicit OK**, with the dry-run count reported first. Run it from a fresh worktree on `origin/main` (see the MusicBrainz memory for why).

## Open questions (default chosen, override if wrong)

- **Photo required?** Yes. Without it, the yield drops by two rows and the page would show an empty portrait for a guessed act.
- **Include exhausted rows?** Yes, per the ruling.
- **Run the rule in the nightly job, not just once?** Yes. Otherwise the queue refills as the matcher meets new shared names.
