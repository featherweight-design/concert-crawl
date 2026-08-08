# Gate 5 — Journey lifecycle, #1226 Concert Crews

Walked 2026-08-08 against **staging** (`https://staging.concertcrawl.app`), which carries
all seven merged PRs (#1492–#1505). Walked on staging rather than locally because the local
dev database has pre-existing migration drift (`type "artist_match_status" already exists`)
that is not this epic's to repair, and epic-run Gate 5 names staging as the fallback.

Two accounts, both pre-existing audit fixtures:

| Session | Fixture             | Plan                    | Role in the walk                      |
| ------- | ------------------- | ----------------------- | ------------------------------------- |
| A       | `E2E_AUDIT_ADMIN_*` | entitled (crews active) | keeper / creator                      |
| B       | `E2E_AUDIT_USER_*`  | free (`paywall-on-tap`) | joiner, and the free-tier gate branch |

Viewport 390×844 unless a row says otherwise.

---

## J1 — Create a crew

### Forward

| Step                            | Expected                                      | Result                                  |
| ------------------------------- | --------------------------------------------- | --------------------------------------- |
| `/crews` as an entitled account | list with a "Start a crew" pill, no gate chip | ✅                                      |
| Tap it                          | create sheet opens as a dialog                | ✅                                      |
| Submit with an empty name       | "Make the crew" disabled                      | ✅ `disabled: true`                     |
| "New patch" ×3                  | three further patches, all distinct           | ✅ 4 distinct renders                   |
| Type a name                     | the patch does **not** change                 | ✅ byte-identical before/after          |
| Submit                          | crew created, patch identical to the preview  | ⚠️ patch ✅ / landing ❌ — see GATE5-01 |

**D2 is proved, not inferred.** The create request sends the client-minted id and the server
persists it verbatim at `patchSalt: 0`:

```
POST /v1/crews  {"id":"1568d5b5-a8d0-4395-a13f-bcbf61e8175b","name":"Gate5 D2b 86401"}
201             {"crew":{"id":"1568d5b5-a8d0-4395-a13f-bcbf61e8175b","patchSalt":0, …}}
```

Since the patch is a pure function of `(crewId, patchSalt)` (`crew-identity.ts`), the same
pair renders the same emblem, so the preview and the crew's patch cannot diverge. Comparing
rendered SVG is the wrong check — the sheet, the card and the hero draw at different sizes,
so their markup differs while the identity does not.

### Reverse

Delete lives behind "Crew options". The confirm reads _"Delete <name>? The roster and the
shared history go with it, for everyone. Nights stay in each person's own Concerts."_ with
"Delete crew" / "Never mind".

- "Never mind" is inert: same URL, and the crew survives a reload. ✅
- "Delete crew" returns `DELETE 200` and routes back to `/crews`. ✅

Note that delete _does_ route. Only create doesn't — which is what makes GATE5-01 a gap
rather than a house pattern.

### Repeat

Create → delete → create. The sheet mints a fresh uuid every time it opens
(`bd54f918-…` then `44959e66-…`), so the second crew cannot inherit the first's patch. ✅

### Resume

Open the sheet, type a name, reload. Crew count unchanged (3 → 3), zero rows matching the
typed name. Nothing is written before submit, so there is no orphan to leave. ✅

### Free tier

The gate sheet reads `SUPPORTER` / _"Starting one is the paid part."_ / _"Joining one is
free, forever. Nobody hits a paywall on your invite link."_ / `Supporter · $2 / month` /
`Pick Supporter`. All four tier-bearing strings interpolate `tier.name` and `tier.priceText`
from the entitlements matrix — none hardcodes a name or a price, so a repricing cannot
strand them. ✅

### Logged out

`/crews` sits under `(protected)`, so a signed-out visitor is redirected to
`/sign-in?redirect_url=%2Fcrews` and never reaches the create button. The matrix's
`crews.logged-out = 'tier-picker-on-tap'` cell is therefore unreachable from this
destination; it is exercised from the public invite landing instead (J2). Recorded as
**decided, not a defect** — sign-in is the right answer for a protected route, and the
tier-picker path still has a live caller.

---

## J2 — Invite and join

Walked on crew `Gate5 Invite` (`dee58110-…`), A as keeper, B as the joiner.

### Forward

| Step                   | Expected                                     | Result                                                                           |
| ---------------------- | -------------------------------------------- | -------------------------------------------------------------------------------- |
| A taps "Invite people" | sheet with a live link                       | ✅ `GET /invites/current 200`                                                    |
| Sheet contents         | link, spots left, expiry, both link controls | ✅ `11 OF 12 SPOTS LEFT` / `Expires in 7 days` / `Retire this link` / `New link` |
| B opens the link       | invite landing, crew named, no roster leaked | ✅ names the crew and the count, shows nothing about what they're going to       |
| B joins                | lands inside the crew                        | ✅ `/crews/<id>`, `2 / 12 SPOTS`                                                 |
| A reloads              | count and shared history reflect B           | ✅ `2 / 12`, `Been there 4`                                                      |

Join **does** route to crew home. So does leave, and so does delete. Create is the only
one of the four that stays put, which is what makes GATE5-01 a gap rather than a house
pattern.

The landing withholds the roster on purpose: _"We're not showing you what they're going
to until you're in. That's the point of a crew."_ Copy is count-aware in both directions:
`1 member` / _"1 person is already in"_ against `2 members` / _"2 people are already in"_.

`onCopy` is synchronous with an explicit `clipboard === undefined` guard and no `await`
above the `writeText` call, which is the #72 lesson (awaiting inside a share click spends
the user-activation grant) held correctly.

### Reverse

B leaves via Crew options → "Leave crew". The confirm reads _"Leave Gate5 Invite? You lose
the crew and the shared history. They keep going without you."_

- `POST /v1/crews/<id>/leave` → `200`, routes to `/crews`. ✅
- The crew is gone from B's list; only the pre-existing `The Usual Suspects` remains. ✅
- A's home falls to `1 / 12 SPOTS`, and **`Been there` falls 4 → 0**. ✅

That last number is the one worth watching. The shared-past band is derived from
overlapping attendance, not cached on the crew, so losing the only other member correctly
empties it rather than leaving four orphaned rows. A gets the `CREW OF ONE` empty state:
_"Party of one. You made a crew. Now the hard part: telling people."_

### Repeat

Two separate repeats, both clean:

1. **Same link twice.** B, already a member, reopens the live link and taps the CTA. Lands
   on `/crews/<id>` at `2 / 12` — a no-op, not an error, which is the briefing's bar.
2. **Leave then re-join** on the rotated link. Back to `2 / 12`, and `Been there` returns
   0 → 4. Membership carries no tombstone that would block a return.

⚠️ The landing still renders a live _"Join Gate5 Invite"_ button to an account that is
already in the crew. Tapping it does the right thing, so this is an affordance nit rather
than a defect — recorded as **GATE5-04 (P3)**.

### Resume

Reloading the landing pre-join is byte-identical, and nothing is written before the tap.

**At most one live link** is enforced, and it is enforced server-side rather than by hiding
a button. Minting a second link (`POST /invites → 201`) retires the first, and the old
token then renders a genuine terminal state with a way out:

> INVITE LINK — _"This link was retired. Someone in the crew pulled it. Ask them for a new
> one. No hard feelings."_ + `Browse shows instead`

Rotation was walked across two browser contexts, so the retirement is real server state,
not one tab's memory.

### Not a defect

The invite headline renders the inviter's handle unbounded, and staging's seeded handle is
50 characters (`seededHandle_prgp4vig…`), which looks alarming. `PATCH /v1/users/me` caps
`handle` at `.min(3).max(20)`, so no real account can reach that length — the long string
is seeder junk. Recorded as **decided, not a defect**; the 20-char case fits on one line at
390px.

---

## J3 — The Browse lens

Walked as A, a member of both `The Usual Suspects` and `Gate5 Invite`. To have anything to
filter, A first marked going on The Reserves (Sat Aug 8, Larimer Lounge).

### Forward

| Step                         | Expected                                                           | Result                                                                        |
| ---------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Lens pill in the title block | not in the filter bar                                              | ✅ `Crews` sits with `List`/`Cal`; the bar keeps all five of its own controls |
| Tap it                       | picker opens                                                       | ✅ `CREW LENS` / _"Look through a crew"_                                      |
| Reset row placement          | "Everyone" above the crew rows                                     | ✅ `Everyone · EVERY SHOW IN DENVER`, then one row per crew with a live count |
| Select a crew                | dismisses, title becomes the crew name, eyebrow replaced by a rail | ⚠️ mostly ✅ — see GATE5-05                                                   |
| Row chip                     | a count, never names                                               | ✅ `1 GOING`                                                                  |

The eyebrow swap is right: `DENVER` gives way to `● CREW LENS · 1 SHOW` with a `× CLEAR`
control on the same rail, and the filter bar's shape is untouched.

The chip is a count. There **is** a member name on the row, but it is inside a
`clip-path: inset(50%)` `sr-only` span reading _"From your crews: &lt;handle&gt; going"_.
Recorded as **decided, not a defect** — a crewmate's name is not a secret from another
crewmate (crew home lists the whole roster), and the alternative is a chip that announces
"1 going" with no referent.

### Reverse

`× CLEAR` restores all three: eyebrow back to `DENVER`, title back to `What's on?`, pill
back to `Crews`, and the list back to the full 18 shows. The "Everyone" row inside the
picker does the same thing and lands on a bare `/events`. Two ways out, both complete.

### Repeat

Apply → clear → apply a _different_ crew. The title tracks the second crew and the URL
follows it (`?crew=a1c7e2f0-…` after `?crew=dee58110-…`). Opening the picker while a lens
is already active marks the active row with a check and an accent treatment, so the control
reports its own state rather than making you remember it.

### Resume

**Decided, not discovered: the lens survives a reload, because it lives in the URL.**
Applying a crew rewrites the location to `/events?crew=<crewId>`, and a hard reload comes
back with the title, the rail, the count and the filtered list all intact. Nothing about
the lens is held in component state, so it also survives being pasted into another tab.
This is the right call and needs no change.

### Edge — a crew with nothing upcoming

Un-going the only show (`DELETE /v1/attending/<id> → 200`) empties both crews. The lens then
renders a real empty state, not a blank list:

> CREW LENS · 0 SHOWS — _"Your people are homebodies. Nobody in Gate5 Invite is going to
> anything yet. Nudge them."_ + `Show every show`

The rail count agrees (`CREW LENS · 0 SHOWS`) and the empty state carries its own exit.

### GATE5-05 (P2) — the crew name renders twice in the title block

With a lens active the `<h1>` and the lens pill both render the crew name, side by side
within about 40px. At 390px neither fits, so both truncate:

```
Gate5…   [ Gate5 Invite ▾ ]        ← "Gate5 Invite"
The U…   [ The Usual … ▾ ]         ← "The Usual Suspects"
```

The more prominent slot is the one that breaks, and the reader gets the same string twice,
badly, where the rail below already says `CREW LENS · 1 SHOW`. The briefing asks only that
the _title_ become the crew name. Proposed fix in the polish PR: leave the pill labelled
`Crews`, which is what it opens, and let the `<h1>` own the name and the width.

---

## J4 — Crew home and the destructive flows

Walked as A, keeper of `Gate5 Invite`, with B in the crew.

### Forward — the home itself

Hero reads `Gate5 Invite` / `2 / 12 SPOTS` / `YOU KEEP IT`, with `Invite people` and
`Crew options`. Three tabs carry live counts, and the **selected tab is chosen, not fixed**:

```
tab: Coming up 0   selected=false
tab: Been there 4  selected=true
tab: Who's in 2    selected=false
```

`Been there` leads because `Coming up` is empty. A crew whose future is blank opens on the
part of itself that isn't.

### The patch reroll

`Crew options → New patch` opens a sheet that shows the decision rather than describing it:

> New patch — _"Pulls a different patch for the whole crew. Everyone sees the change."_
> `NOW` [patch] `NEW` [patch] · `Pull a new one` / `Keep this one`

Current and candidate render side by side (3 SVGs in the sheet), so the reroll is a choice
between two visible things. **It cannot fire on a single tap** — the sheet is the gate.

### Reverse — cancelling writes nothing

Dismissing the sheet with Escape, and choosing `Keep this one`, both produce **zero non-GET
requests** to `/v1/crews`. Not a rolled-back write; no write at all.

### Repeat — reroll twice

```
POST /crews/<id>/patch/reroll → 200  {"patchSalt":1}
POST /crews/<id>/patch/reroll → 200  {"patchSalt":2}
```

Exactly +1 per apply, from a starting `patchSalt: 0`. The briefing's bar for this pass.

⚠️ **Rename could not be walked — see GATE5-02.** The briefing's other Repeat item ("rename
twice, `patchSalt` never moves") has no reachable UI to drive.

### Who's in

Both rows carry an avatar, the handle, and a joined-date line. The keeper's row is marked
`You · Keeper · Joined today` and offers `Leave crew`; the member's row offers `Remove`.
Long handles truncate to the row rather than pushing it wide.

The letterless-dot avatar for a null handle could not be observed: both staging fixtures
have handles. Named here rather than claimed as passing.

⚠️ The floating `TELL US · BETA` rail overlaps the `Remove` control at 390px. The rail
overlapping content is a known pre-existing app-wide issue, but this is the first place it
lands on an **interactive** control. Carried into the run report, not fixed here.

### Removing a member — reverse before forward

The confirm names the person and states both halves of the consequence: _"Remove &lt;handle&gt;?
They lose the crew and its history. They can be invited back."_ with `Remove` / `Never mind`.

- `Never mind` is inert, and stays inert across a reload: `2 / 12 SPOTS` both times. ✅
- `Remove` returns `DELETE /members/<userId> → 200 {"removed":true}`, and home falls to
  `1 / 12 SPOTS`, `Been there 4 → 0`, with the `CREW OF ONE` empty state. ✅

Re-inviting the removed member restored `Been there 0 → 4`. Removal carries no tombstone.

### A keeper with members cannot just leave

This is the sharpest thing in J4. The keeper's leave confirm is the ordinary one, and the
constraint is enforced **server-side**:

```
POST /crews/<id>/leave → 409
{"success":false,"error":"Pass the crew on before you go","code":"crew_handoff_required"}
```

The UI does not surface that as an error. It swaps to a handoff sheet:

> Pass the crew on first — _"You keep this one, so it needs a new keeper before you go.
> Pick someone."_ + a member row + `Pass it on` / `Never mind`

A 409 that turns into the next step of the flow rather than a red banner. Worth keeping.

### Resume

Handoff is committed as part of the fixture teardown at the end of this walk, so that the
new keeper's controls are observed in both sessions at once. Recorded in J5's teardown.

---

## J5 — Crew notifications

A is the actor throughout, B the recipient. **A and B share two crews** (`Gate5 Invite` and
`The Usual Suspects`), which is what makes the dedupe claim testable rather than assumed.

Gate 6 (`docs/superpowers/side-effects-1226.md`) already proves the fan-out at the
integration-test level. This walk is the part a test cannot do: what a second human's screen
actually shows.

### Forward — the row arrives

A marks going (`PUT /v1/attending/<id> → 200`). B's bell moves `3 NEW → 4 NEW` and the row
reads:

> seededHandle_prgp4… is going to The Reserves at Larimer Lounge. · `GATE5 INVITE` · `1M`

**One row, not two, despite two shared crews.** The dedupe is proved on a live account
rather than inferred from the recipient query.

### Repeat — mute, trigger, unmute

Mute lives in **Settings → Notifications → Crew activity**, not in the crew options sheet.
One `role="switch"` per crew, each named `Crew activity for <crew>`, with the row state
reading `In your bell` / `Muted`.

| Step                   | Expected                  | Result                                                    |
| ---------------------- | ------------------------- | --------------------------------------------------------- |
| Mute `Gate5 Invite`    | `PUT /crews/<id>/mute`    | ✅ `200`, row flips to `Muted`                            |
| Crew home as B         | hero says muted           | ✅ `MUTED` replaces `YOU KEEP IT` in the eyebrow          |
| A goes, while muted    | no `Gate5 Invite` row     | ✅ the row that arrived is eyebrowed `THE USUAL SUSPECTS` |
| Unmute                 | `DELETE /crews/<id>/mute` | ✅ `200`, row back to `In your bell`                      |
| Bell immediately after | nothing backfills         | ✅ still `5 NEW`, same two rows                           |
| A goes again           | a fresh row               | ✅ `6 NEW`, top row eyebrowed `GATE5 INVITE`              |

The muted-trigger row is the finding worth keeping. **Mute is per crew, and the dedupe
respects it** — muting one shared crew doesn't silence the mate, it re-attributes them to
the crew that is still listening. Both halves of that behaviour are visible in a single row.

Unmuting backfills nothing, which is the right call: a muted crew's past is not news.

### Not gated behind push

B's browser has notifications **blocked** (`NOTIFICATIONS · BLOCKED · "Notifications are
blocked in your browser."`), and the Crew activity block still renders, still toggles, and
still delivers. Gate 6 asserts crew activity sits outside the push master switch; this is
that claim standing up on a real device where push is genuinely denied.

The block's own copy carries the contract: _"Crew news only ever shows up in your bell,
never as a push. Mute a crew to keep it out of there too."_

### Resume — a second device

Read state is server-side, not per tab. Two contexts on the same account:

```
device 1  Account menu, 6 unread notifications
device 2  Account menu, 6 unread notifications
   → device 1 taps "Mark all read"
device 1  Account menu          (no count)
device 2  Account menu          (no count)
```

`See all N` swaps the account menu for the full inbox in place rather than routing. Once
everything is read the strip correctly stops offering `See all` at all and collapses to the
caught-up row, so there is no control that opens an empty list.

### Empty state before any trigger

Not walked live: both staging fixtures are already in crews, and emptying one would have
destroyed the fixture the rest of this journey needs. Gate 6 records it, and
`CrewActivityBlock.test.tsx` asserts it — the block renders _"You're not in a crew yet."_
rather than an empty switch list. Named here rather than claimed as walked.

### Teardown — the handoff, observed from both sides

The J4 handoff was committed here so both sessions could be read at once:

```
POST /crews/<id>/leave    → 409  crew_handoff_required
POST /crews/<id>/handoff  → 200  {"keeperId":"user_3GY…"}
POST /crews/<id>/leave    → 200  {"left":true}
```

`Pass it on` is disabled until a member is picked, so the sheet cannot commit a handoff to
nobody. After the chain: A routes to `/crews` and the crew is gone from A's list; B's crew
home reads `YOU KEEP IT`, `1 / 12 SPOTS`, `CREW OF ONE`. Keepership is real server state,
seen from both accounts.

B then deleted the crew (`DELETE → 200`) and A's test attendance was undone, leaving staging
as it was found. B, a free account, correctly sees `Start a crew` carrying the `paid feature ★`
chip on the way out.

⚠️ **GATE5-06 (P3)** — the disabled `Pass it on` button ships `cursor-pointer`, so a keeper
who hasn't picked anyone gets a pointer cursor on a control that won't respond.

---

## Findings

| ID       | Sev | Finding                                                                                                                     | Disposition                             |
| -------- | --- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| GATE5-01 | P2  | Create doesn't route to crew home; join, leave, delete and handoff all do                                                   | Fix in polish PR                        |
| GATE5-02 | P2  | Crew rename unreachable — `PATCH /v1/crews/:id` exists, no UI, yet the create sheet promises _"You can change this later."_ | Fix in polish PR                        |
| GATE5-03 | —   | Signed-out invite landing redirects to sign-in                                                                              | Withdrawn — deliberate for private beta |
| GATE5-04 | P3  | Invite landing shows a live join CTA to an existing member                                                                  | Fix in polish PR                        |
| GATE5-05 | P2  | Crew name renders twice in the title block under an active lens; both truncate at 390px                                     | Fix in polish PR                        |
| GATE5-06 | P3  | Disabled `Pass it on` keeps `cursor-pointer`                                                                                | Fix in polish PR                        |

**Decided, not defects:** the sr-only crewmate name on lens rows; the 50-char seeded handle;
the auth-gated invite landing; the lens surviving reload via the URL; `Been there` recomputing
to 0 when the only other member leaves.

**Carried, not this epic's:** the floating `TELL US · BETA` rail overlaps page content at
390px app-wide, and on `Who's in` it lands on the `Remove` control.
