# Concert Crews — Design Brief (#1226)

**Ticket:** #1226 · `type: design` · `phase: launch` · `priority: normal`
**Track:** 2 (needs design) — full brainstorm, 12 questions, locked 2026-08-02
**Handoff folder:** `design/design_handoff_concert_crews/`

---

## 1. Purpose

There is no way to coordinate a show with the people you would actually go with. The app knows who is watching a show, and since #70 it knows who is attending — but that signal never reaches your friends. Deciding to go to a show is a social act, and the app is silent on it.

A **Concert Crew** is a small, invite-only group of friends. Its job is to answer one question well: *what are my people going to?*

This was scoped in the original 2026-04-23 spec ("'I'm going' + friend groups") and quietly dropped from the 2026-05-09 tier table with no note. This brief is the deliberate revival.

---

## 2. App context

What already exists, and what Design should not assume.

| Thing | State |
|---|---|
| `userProfiles.handle` | **Exists**, unique, populated. #762's watcher rail already renders handles + `avatarColor` monograms. Issue #86 covers only the public profile *page* at `/u/<handle>` — the handle itself is shipped. |
| `userEvents.attendingAt` | **The only attendance signal.** Nullable timestamp. The only *user-facing* write path is `GoingButton` on event detail; backend maintenance also touches it (admin event merge coalesces it, the daily billing job purges it only at the end of the 90-day preserve-then-purge window, never on a simple lapse — so attendance stays stable when a user drops below Premium). The legacy `status` enum's `going`/`interested` values are dead. |
| Follow / friend graph | **Does not exist.** `userArtistFollows` is artist follows. Crews are net-new schema. |
| Who else is watching (#762) | Shipped 2026-07-30 on event detail. Names up to 3 handles, folds the rest into a count, degrades to count-only when nobody has a handle. Design principle: **don't fake identity.** |
| Notifications (#737) | Shipped 2026-08-02. In-app bell plus web push. Categories are `watch.*`, `contest.*`, `spotify.new_show`. Push eligibility is a curated allowlist — `contest.*` is deliberately bell-only. **There is no batching or digest layer of any kind.** |
| Entitlements | Keys are `watching`, `concert-history`, `calendar-export`, `following`, `alerts`, `spotify-sync`, `price-drop-alerts`. Cell states: `visible-active`, `paywall-on-tap`, `tier-picker-on-tap`, `hidden`. **There is no crew key.** |
| Sign-up gating | `/sign-up` is invite-code-gated until `NEXT_PUBLIC_PUBLIC_BROWSE` flips at the Aug 18–22 launch window. Crews is `phase: launch` and lands on the public side of that flip. |

---

## 3. Locked decisions

Each was resolved in the 2026-08-02 brainstorm. Rejected options are recorded with reasons so they are not re-proposed.

### 3.1 The crew is a lens on your people

The payoff is scanning: *what are my people going to?* Crews are discovery-shaped, not roll-call-shaped.

**Rejected — per-event coordination as the core.** It only pays off on shows you already found, and it stacks straight onto #762's rail. **Rejected — notification-first.** It would make the app's first social notification category carry the entire feature, with no batching layer to protect it.

### 3.2 Two surfaces, two jobs

- **The Browse lens** — the discovery mechanic. Browse flips to a crew view and the existing calendar filters to shows a crew member is attending. This is what makes Browse more than an events page.
- **The Crews destination** — the social home. Who is in it, what is coming up, and **what the crew has already been to together**. It is the place to congregate and reminisce, not just a roster.

The shared past is the part that makes the destination worth revisiting when nothing is coming up. It is the group-scale sibling of Concert History (#70) and the Passport card (#85).

### 3.3 A crew show is defined by tense

| Tense | Bar | Why |
|---|---|---|
| Upcoming | **≥ 1 member going** | Forward-looking is discovery. Finding out one friend is going alone is precisely the moment you decide to join them. |
| Past | **≥ 2 members going** | A memory is only shared if you were both there. |

A member's solo past show stays in their own Concerts and never appears in the crew's history. This one rule is what stops the crew home from degrading into a merged activity feed.

**Rejected — always inclusive.** History becomes a feed of individual nights and reminiscing loses its point. **Rejected — always ≥2.** Kills the discovery moment the feature exists for.

### 3.4 A user can belong to many crews

People do not have one friend group. Invite-only keeps each crew small and intentional. This is also forced by the invite mechanic: with a one-crew limit, accepting a friend's invite means abandoning your own.

Consequences: the Browse lens needs a crew picker, and the destination is list-then-detail.

**Rejected — exactly one crew.** Hostile at the invite moment. **Rejected — many crews with one "active" lens crew.** A hidden piece of state that silently explains why an expected show is missing.

### 3.5 A crew has a name and generative art — on its own visual system

Crews must **not** reuse the generative language built for event and venue imagery. A crew drawn by the same generator as an event poster reads as another piece of content rather than as *your people*, and it rings hollow. Design owns what the crew's visual language is.

One constraint: the art must be seeded by something **stable** to the crew's own identity, not by its membership. An identity that reshuffles when someone joins is not something you can recognize in a picker.

**Rejected — member-avatar collage.** Unstable identity, for exactly that reason. **Rejected — name only.** With several crews it is a list of words, and the destination has no reason to feel like a place.

### 3.6 Entry is a shareable invite link

The creator generates a link and drops it into the group thread where these people already talk — which is where the ticket says coordination belongs. It requires no people-search directory, works for friends who have not set a handle, and is the only mechanic that works on someone who is not a user yet.

Because links can be forwarded, the link needs an expiry and a revoke, and the crew cap is the real backstop.

**Invite-by-handle is a deliberate mid-term follow-up**, filed separately. It is not in this brief.

### 3.7 A crew invite is an acquisition surface

Invited people may not have accounts. A signed-out invite landing shows the crew's name, its art, who invited you, and the headcount — then one CTA that lands you inside the crew on completion. You are not signing up for an app; you are joining your friends.

**It shows identity, never attendance.** A forwarded link must not publish any member's plans. That constraint is what preserves the invite-only promise the whole feature rests on.

**Rejected — bare sign-up with the crew held in the background.** Loses the entire emotional pull. **Rejected — read-only crew shows.** Leaks members' attendance to anyone holding the link.

### 3.8 Event detail keeps one social rail, with crew at the front

A single social line: named crew members who are **going** first, then the ambient watching count already shipped by #762. Knowing someone you know is going is a different order of information from knowing fourteen strangers are watching.

This honours #762's "don't fake identity" principle — crew members are named people who opted into being visible to exactly these people.

**Rejected — two visually distinguished rails.** This is the "two competing social rails" outcome the ticket named as the thing to avoid.

### 3.9 Free to join, Premium to create

| Action | Tier |
|---|---|
| Join a crew | **Free** |
| Create a crew | **Premium** |

A new `crews` entitlement key is required. The invite link must never dead-end a new user at a paywall — that is what keeps the growth loop working, the same reasoning that kept Watching free because it drives share virality. Creating is the wow-factor for paid users the ticket is chasing, and every crew has exactly one payer: the person who wanted it enough to organize it.

**Rejected — free end to end.** Gives away the most premium-feeling item in the backlog as the launch tier story needs something to sell. **Rejected — Premium end to end.** Points an acquisition surface directly at a paywall.

### 3.10 There is no "can't go" signal in v1

The lens answers *who is going*. Not-going is the default state everyone is already in. A decline would mean every member owes every crew show an answer, turning a calendar you enjoy scanning into an inbox of unanswered RSVPs — and it would need a third attendance state that leaks into Concert History and #1357.

Ship the lens; see whether anyone misses the decline. This deliberately narrows the ticket's Shape section.

### 3.11 Crew notifications are bell-only, with per-crew mute

A new `crew.*` category that lands in the in-app bell and is **excluded from push**, exactly as `contest.*` already is. The signal is there when you open the app and can never buzz a pocket fifteen times — which is what buys the right to ship without first building a batching layer. Per-crew mute handles the one crew that goes feral.

**Rejected — no notifications.** A crew with nothing happening gives no reason to open it again. **Rejected — push with a digest.** Builds a notification subsystem before we know anyone wants crew pings.

### 3.12 A lapsed subscription never touches an existing crew

Premium buys the act of creating a crew, not the crew's continued existence. On lapse, the crew, its roster, its lens and its history all keep working for everyone. What the creator loses is the ability to start *another* one, which becomes `paywall-on-tap`.

A payment problem must not punish four people who never paid anything, and it must not make a private billing state visible to the group. This matches the grandfather-forever price promise and #782's non-punitive voice.

**Rejected — freeze the crew.** Becomes a nag aimed at people who cannot fix it. **Rejected — transfer ownership to another paying member.** An involuntary transfer of something with your name on it.

---

## 4. What Design will produce

Deliverables land in `design/design_handoff_concert_crews/`, mirroring the structure of `design/design_handoff_monetization_lifecycle/`.

1. **The Crews destination** — the list-then-detail pair. Crew home covering identity, roster, upcoming, and the shared past.
2. **The Browse lens** — how Browse enters and exits crew view, and how the crew picker reads in the filter bar on both mobile and desktop.
3. **Crew visual identity** — the generative art system, explicitly distinct from event/venue imagery, with its stable seed.
4. **The signed-out invite landing** — the acquisition surface.
5. **Crew presence on event detail** — the single reconciled social rail, shown against the shipped #762 treatment.
6. **Creation and invite flows** — including the Premium gate at creation and the link's expiry/revoke affordances.
7. **All empty and edge states** — no crews yet, crew of one, nothing upcoming, no shared past yet, crew at cap, expired invite, revoked invite, member with no handle.
8. **Copy** — every customer-facing string, in the Sour Patch voice.
9. **a11y annotation** — WCAG AA, keyboard paths, touch targets.

---

## 5. Technical requirements

- **Token-only color.** Production ships nine themes off one token set; Design mocks the three base themes (Electric, Jade, Light). No hardcoded hex anywhere, including in the generative crew art.
- **Mobile and desktop parity is behavioral, not visual.** Layouts may differ; capabilities may not.
- **All customer-facing strings belong in `definitions/copy.ts`.** None hardcoded in JSX.
- **Consume `attendingAt` — do not invent a second RSVP signal.** Crew membership is new schema; attendance is not.
- **Handles may be absent.** Follow #762's precedent and degrade honestly rather than inventing a display name.
- **Reuse the existing event card.** The Browse lens filters the calendar; it does not fork it.
- **Prefer no new dependencies**, especially for the generative art.
- **The crew cap is roughly 10–15.** This is a group of friends, not a network. The exact number is Design's call.

---

## 6. What is NOT in this brief

| Out of scope | Owner |
|---|---|
| Any in-app communication — chat, threads, comments, DMs | Permanently out. Reaching out happens where these people already talk. |
| Public crews, crew discovery, follow/follower semantics | Permanently out. |
| Invite by handle | Mid-term follow-up, filed separately |
| Public profile pages at `/u/<handle>` | #86 |
| An explicit "can't go" signal | Deferred; revisit only if members ask |
| Push delivery or notification batching for crew activity | Deferred with §3.11 |
| Attending signal on event detail for non-crew users | #1096 — deliberately parked |
| A crew-scale share artifact | Adjacent to #85 Passport; not this cycle |

---

## 7. Decisions inherited

- **Watching vocabulary is locked.** Watching is the only show-tracking concept; its icon is an eye, never a heart. "My shows" is the container label. Crews introduces no synonym for either.
- **#762's "don't fake identity"** — never render a person the app cannot honestly name.
- **#1357's tense split** — the History sub-tab becomes `Concerts`, holding Upcoming above Past. The crew home's own tense split should read as a deliberate sibling of it.
- **Grandfather-forever pricing and #782's non-punitive failure voice** — never blame the user for a payment state.
- **Tier vocabulary** — Free, Supporter, Premium, Founder, Gifted.

---

## 8. Open for Design to call

- The crew's generative visual language, and what stable value seeds it.
- The exact crew cap within the 10–15 range.
- How the crew picker reads in the Browse filter bar without the bar gaining visual weight.
- Whether the crew home leads with upcoming or with the shared past when both are populated.
- What a crew of one looks like before anyone accepts — the first thing every creator sees.
- How the shared past is expressed: a list, something more artifact-shaped, or something else entirely.
- Whether crew presence on a Browse card in crew view differs from the event-detail rail, and how.
- Invite link expiry duration, and how expiry and revocation are communicated to both sides.
- Roster management: who can invite, whether members can leave, whether the creator can remove people, and what each looks like.

---

## 9. Cross-references

- Ticket: #1226
- Source spec: `docs/superpowers/specs/2026-04-23-denver-concert-calendar-design.md` (§Future Features, §Monetization, §In-App Notification System)
- Sibling social work: #762 (shipped), #1096 (parked), #86 (open)
- Attendance model: #70 (shipped), #1357 (specified)
- Adjacent identity work: #72 / #85 shareable cards and Passport
- Pipeline: `docs/superpowers/design-pipeline.md`, `docs/superpowers/design-pipeline-status.md`
