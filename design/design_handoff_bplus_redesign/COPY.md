# B+ Redesign: Strings for Copy Review

Almost every screen reuses live copy word for word. The strings below are new or changed, and they are **drafts**: copy is the copy-writer's call (`copy-review` skill), not Design's. Change any of them in place, and never send the handoff back to Design over wording.

## New strings

| Where | String | Notes |
| --- | --- | --- |
| Browse loading | Loading shows | Shown next to the pink wave. Also used as the Load more label while fetching |
| Event page | 4 DAYS AWAY | The countdown eyebrow on the tilted card |
| Vibe filter sheet | Every genre has a color. It's the dot on each show, and the glow around its photo. | Teaches genre = color |
| Vibe filter, active | **DRAFT for Hugh:** `Only ${genre} shows, each marked by its dot.` Two genres (B25 only): `Only ${genreA} and ${genreB} shows, each marked by its dot.` | The legend line above the filtered list; see `04-genre-and-vibe` |
| Crew lens, empty | Show everyone | The action that clears the crew lens |
| Crews | Host, You're the host, HOST, You · Host | Replaces Keeper |
| Crews list | How crews work (three steps) | Only shown when you have a single crew |
| Artist page | **DRAFT for Hugh:** not following: `Follow and we'll tell you the day they book another Denver show.` Following: `You'll hear the day they book another Denver show.` | The dashed note under Upcoming. Reuses the promise live onboarding already makes ("Follow one and we'll tell you the day they book the next"), so it claims nothing new |
| Settings | Notifications subhead, Load 35 more, the stat labels, MIX TWO, OR KEEP IT SOLID, 1 fan confirmed | The board's billing strings are not ported; see Copy review below |
| Settings | Submitted prices | The section the boards title "My submissions" |
| Account menu | (no eyebrow) | The board's "BETA · FOUNDER" eyebrow is cut |
| Passport | NEXT STAMP, NEXT, VENUES COLLECTED, UP NEXT, SPREAD 1 OF 2, NEXT PAGE IS WAITING, SWIPE FOR PAGE 2, JUMP TO, the passport code line, + 1 more you're going to | |
| What's new | All card copy | It's a feature page now, not a release log |
| Show status | Report filed (screen), Already reported (screen), the What changed subtitle | Live has no success screen, and a second report shows a raw server error |
| Show status | No longer listed (chip, row and notification) | For shows the crawler hasn't seen for 14 days. Never "Cancelled" |
| Price submitted | Your price | The label on the pending stub on the success screen, which shows your price with its two confirm dots. Same label as the self-locked price card |
| Beta invite page | GOT AN INVITE?, Redeem, No code yet?, `${venueCount} VENUES · CHECKED EVERY NIGHT`, THIS WEEK IN DENVER | The code placeholder is `BETA-XXXX-XXXX`, the real multi-use format (`2026-11-10-invite-code-posters.md`); the board's `CRAWL-XXXX` was a guess. The venue count is live data, never a hardcoded 21 |
| Launch screen | DENVER | The only text |

## Vocabulary flags in live copy (not changed by the designs)

- **"submission"** appears in live price copy. The locked word is **Submitted prices**. Resolved in the copy review below: each string has its replacement, for the price restyle PR to apply.
- **"Follow / Following"** appears on the live artist and event pages. Not changed; on the Needs Hugh list below.

## Copy already locked (do not rewrite)

- The PWA cluster (install, push, offline) is voice-locked from `design_handoff_pwa_cluster` (READINESS Green).
- Empty states, errors and the crew invite use live strings, word for word.

## Copy review (2026-11-11)

Run with the `copy-review` skill in apply mode. **Coverage:** this file, the README and the plan (`docs/superpowers/plans/2026-11-11-bplus-redesign.md`). The live canvas could not be read from this session, so strings that exist only on the boards (the Settings subhead and stat labels, the Passport code line, How crews work, What's new cards) were not reviewed, and no adjacency was checked on the boards themselves. Those need a pass from the canvas before B5.

### Changes

Live strings are in `apps/web/src/components/consumer/definitions/copy.ts` unless noted. "Board" means the string exists only on the canvas.

| # | Before | After | Class | Verdict |
| --- | --- | --- | --- | --- |
| 1 | Off. Nothing from us but billing. (board, Settings email toggle) | Off. (matches live `NOTIFICATIONS_COPY.productEmail.offDetail`) | Chrome | CUT the billing clause: the app is free |
| 2 | Billing email always sends: receipts, a failed charge, a card about to expire. (board, Settings) | (nothing) | Obligation | CUT: there is no billing email to promise |
| 3 | …handle, email, and plan are gone… (board, delete account) | This is permanent. Your handle, email, and profile are gone. … (live, word for word) | Recovery | STALE board copy; port the live string |
| 4 | BETA · FOUNDER (board, account menu eyebrow; live `badge: 'Beta · founder'`) | (no eyebrow) | Chrome | CUT: founder is a paid-era tier |
| 5 | My submissions (board title and live `submissionsSection`) | Submitted prices | Chrome | RENAME (locked vocabulary; matches the account menu row) |
| 6 | Prices are capped at $2,000. Submissions stay pending until fans confirm. | Prices are capped at $2,000 and stay pending until fans confirm. | Recovery | RENAME |
| 7 | Edit submission | Edit your price | Chrome | RENAME (matches live "Your price is pending") |
| 8 | Your submission (`yourSubmissionLabel`, also the success-screen stub) | Your price | Chrome | RENAME |
| 9 | Something went wrong withdrawing your submission. Try again or come back later. | Something went wrong withdrawing your price. Try again or come back later. | Recovery | RENAME |
| 10 | No submissions yet. (`submissionList.noSubmissions`, event page) | No submitted prices yet. | Chrome | RENAME |
| 11 | 21 VENUES · CRAWLED EVERY MORNING (board, invite page) | `${venueCount} VENUES · CHECKED EVERY NIGHT` | Teaching | TIGHTEN: "crawled" is machinery; "check … every night" is the poster's wording; a hardcoded count goes stale |
| 12 | CRAWL-XXXX (board, invite code placeholder) | BETA-XXXX-XXXX | Data | STALE: the real code format |
| 13 | (legend line placeholder, Vibe active) | DRAFT, see table above | Teaching | DRAFT for Hugh |
| 14 | (dashed note placeholder, Artist page) | DRAFT, see table above | Teaching | DRAFT for Hugh |

Every other string in the table above was reviewed and kept. MIX TWO, OR KEEP IT SOLID is six words against the five-word eyebrow cap; kept as deliberate voice, since "keep it solid" is the only place the single-color option is named.

Rows 5 to 10 change live strings, so the PR that applies them updates `SubmitPriceModal.test.tsx` ("Edit submission") and `PendingCardB.test.tsx` ("Your submission") in the same change. Live `submission` wording outside price surfaces (the account handle and delete-account copy, legal) is outside this handoff and was left alone.

### Needs Hugh (not changed)

- **"Follow / Following" on artists.** CLAUDE.md's locked list bans "Following", but the copy-review binding (`.claude/fwd/copy-review.md`) locks **Following** for artists only, and the live artist and event pages use it. The two sources disagree; the call is which one wins. Blocks B10 and the Artists tab in B12.
- **The Product email toggle.** "News, offers, and the occasional nudge" and its on-detail "Rare. A discount, or a heads-up when a gift is running out." are paid-era with billing gone. Whether the toggle survives, and what it promises, is a product call.
- **The two DRAFTs** (Vibe legend line, Artist note).

### Self-check

- Every cut or renamed literal grepped with `rg -F`: the only non-copy hits are the two tests named above. The board-only strings have no repo hits.
- No surface lost more than 30% of its strings: Settings loses two board lines, the account menu its eyebrow.
- No two replacements share an opening construction; each was read aloud.
- No DEFEND row changed without a reason: rows 2, 3, 6, 9 and 11 each state theirs.
- Nothing locked was overruled: the PWA cluster strings and live empty states and errors are untouched, and no locked term was redefined.
- Em-dashes: none in any string in this file.
