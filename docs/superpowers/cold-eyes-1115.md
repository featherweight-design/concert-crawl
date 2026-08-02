# Cold-eyes review — #1115 artist page

Run 2026-08-02, after PR-E (route shell) landed and the artist page became reachable
end-to-end on staging. Capture: `pnpm --filter @concert-crawl/e2e audit:sweep --tags=consumer`
against `https://staging.concertcrawl.app`, run `2026-08-02T08-19-47`, 27 captures, 0 errors.
Critic subagent given only the screenshot reel, the design handoff, the locked vocabulary and
the defect-class list — no plan, no diffs, no PR bodies.

Follow and the Spotify embed were excluded from the brief: they ship in PR-F.

## Prerequisite the sweep surfaced

The sweep could not run at all until the `artists` table had data. `backfillArtists` had no
caller outside `seed.ts` (local-only), so the table was empty in staging and prod and every
`/artists/:slug` 404'd. Fixed in PR #1323. **This is the highest-value finding of the run** —
the code was correct at every layer, so no per-PR gate could see it. Only querying the
deployed database directly did.

## Findings

| #   | Sev  | Finding                                                                                                                                                                                                                                                                                                                                   | Disposition                             |
| --- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 1   | High | At 320/390 the `2 SHOWS` count and the first row's `PRICE TBD` are clipped. Verified against the 320 capture: the clip is caused by the fixed "TELL US · BETA" tab overlaying the right gutter, not by column width — the second price row, which sits below the tab, renders in full. Affects every consumer surface, not just this one. | PR-F                                    |
| 2   | High | At 320/390 the `AB` monogram tile sits _outside_ the striped plate and overlaps the "A" of the artist name. Desktop nests it correctly. Reads as a broken image.                                                                                                                                                                          | PR-F                                    |
| 3   | High | Nothing below the shows list. On desktop the right column ends at ~40% viewport height and reads as a page that failed to load. With Follow absent this is expected mid-run, but it needs a checked answer once PR-F lands.                                                                                                               | Re-check after PR-F                     |
| 4   | Med  | Show rows carry no Watch affordance, while the same object on venue detail does. A user who just decided they care about this artist cannot act on the two shows in front of them.                                                                                                                                                        | PR-F                                    |
| 5   | Med  | "First time we've caught them" is correct per `historyNone` but reads as a data bug on a globally famous artist.                                                                                                                                                                                                                          | Accept — the honesty rail is deliberate |
| 6   | Med  | `Upcoming` and `2 SHOWS` say the same thing in a two-row list; it is also the string that clips at 320.                                                                                                                                                                                                                                   | PR-F — drop the count                   |
| 7   | Low  | The mobile back chip has little contrast against the light stripe of the plate.                                                                                                                                                                                                                                                           | PR-F                                    |
| 8   | Low  | Desktop reads as a stretched mobile layout — 320px plate, wide empty left rail, content ending at ~600px of 1440.                                                                                                                                                                                                                         | Handoff-compliant; leave                |

## Vocabulary and voice

Clean. No heart icon, no "Saved"/"Favorites"/"Bookmarked", "Following" correctly scoped to
artists and "Watching" to shows. One emphatic beat in the honesty rail, which is the budget.

## Effect on the remaining plan

Findings 1, 2, 4, 6 and 7 fold into PR-F rather than becoming follow-ups. Finding 1 is a
cross-surface bug the artist page merely exposed — swept as its own change, not patched on
this route alone.
