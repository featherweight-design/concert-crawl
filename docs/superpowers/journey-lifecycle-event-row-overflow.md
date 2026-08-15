# Journey lifecycle — Event Row Overflow (#1418)

Gate 5 of `epic-run`. Every journey the epic touches, run forward, in reverse,
twice, and resumed. Recorded per pass rather than per PR, because the journeys
here span PR-B through PR-E.

Exercised locally on 2026-08-15 against `next dev` at 320 / 390 / 1280, with the
API pointed at a scratch database (`concert_crawl_rowgate`) seeded with an artist
whose dates deliberately cover the awkward combinations: a tour name and no tour
name, two genres and none at all, a null price, a cancelled date, a postponed
date, and a four-night run.

## Journey 1 — read an artist's upcoming dates

| Pass    | What was done                                                          | What happened                                                                                                                               |
| ------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Forward | Loaded `/artists/gate-two` at 390 and 1280                             | Five one-off rows plus a run card. The tour name takes the title slot where there is one; the artist name falls into it where there is not. |
| Reverse | n/a                                                                    | Reading commits nothing, so there is nothing to undo. Recorded rather than skipped.                                                         |
| Repeat  | Loaded the page twice in the same session and again in a fresh context | Identical output. The row holds no state of its own.                                                                                        |
| Resume  | Reloaded mid-page and re-opened in a second browser context            | Five rows both times. Nothing about the row survives in component state or a single tab's memory.                                           |

## Journey 2 — expand and collapse the upcoming list

| Pass    | What was done                       | What happened                                                                                                          |
| ------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Forward | Clicked `Show all 8 shows`          | `aria-expanded` flips to `true`, the run card's nights come into the list, focus stays on the control.                 |
| Reverse | Clicked it again                    | `aria-expanded` returns to `false` and the list returns to five items. A genuinely pre-action state, not a hollow one. |
| Repeat  | Expanded, collapsed, expanded again | No drift. The toggle is plain component state keyed by nothing, so there is no key to outlive its subject.             |
| Resume  | Expanded, then reloaded             | Collapsed again, which is the correct default rather than a lost preference: the expansion is a glance, not a setting. |

**Mutation feedback sub-check.** This epic adds no mutation. The one mutating
control on the row is the Watch button, which PR-E passes through unchanged from
the shipped `WatchShowButton` and which already carries its own optimistic path.
No new server-rendered mutation was introduced, so the "I'm going!" failure shape
has no new instance here.

## Journey 3 — a date that stops being true

| Pass    | What was done                           | What happened                                                                                                     |
| ------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Forward | Seeded a cancelled and a postponed date | The status takes the price slot and the strike lands on the date and the time only. The venue link is not struck. |
| Reverse | Returned both rows to `upcoming`        | The price returns to the slot and the strike lifts. No residue.                                                   |
| Repeat  | Cancelled, restored, cancelled again    | Same output each time. Lifecycle is read straight off the row's data with nothing cached alongside it.            |
| Resume  | Reloaded on a cancelled row             | Unchanged. The state is server data, not a client flag.                                                           |

## Key-death check

Gate 5's third pass asks what key each remembered thing is stored under, and
whether that key dies when its subject dies. This epic stores nothing: no
dismissal, no "seen" marker, no one-time banner, no `localStorage` flag. The
collapse toggle is per-mount component state. There is nothing here that can
outlive its subject the way #70's `eventId`-keyed nudge did.

## Not exercisable locally

- **The genre reorder against real crawled data.** Local fixtures are hand-written,
  so the ordering only proves the function, not the taxonomy's fit. Walk
  `/artists/*` on staging, where the rows carry crawled genres.
