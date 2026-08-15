# Design Readiness Review — Email prefs + data export

**Handoff:** `design/design_handoff_email_prefs_and_export`
**Covers:** #1572 (product-email toggle) · #1573 (download my data)
**Reviewed:** 2026-08-15
**Verdict:** 🟡 **Yellow** — build it, but five eng items are settled below rather
than discovered mid-PR. No design round is needed; nothing goes back to Design.

---

## Verdict by dimension

| Dimension | Verdict | Note |
|---|---|---|
| Scope clarity | ✅ | Two controls, two named homes. #1572 → `/me` ▸ Notifications. #1573 → `/me` ▸ Account, last row. |
| State coverage | ✅ | Toggle on/off; export `rest · pending · limited · failed`. The rate-limit state is covered even though the issue never mentioned the limit exists. |
| Data contract | 🟡 | Two mismatches with shipped code, both eng-side. See A and B. |
| Codebase fit | ✅ | Reuses `SectionRail`, `SettingsRowGroup`, `MeToggleRow`, `GroupFootnote`, `ToggleSwitch`, and the Save-to-calendar row anatomy verbatim. No new primitives. |
| Cross-cutting | 🟡 | The prefs-query error path and the legal-copy edit both need naming. See C and D. |
| Drift from reality | ✅ | Corrected. The handoff targets `/me`, not the `/settings` route that `design_handoff_profile_settings_v2` assumed and that has never existed. |
| Decision log | ✅ | Seven decisions, each with its rejected alternative. |

---

## Eng items settled here

### A. `productEmailsEnabled` is not on the preferences API

`packages/db/src/schema/user-notification-preferences.ts` has the column, and
`apps/api/src/routes/email-unsubscribe.ts` writes it on the one-click path. But
`apps/api/src/routes/me-push.ts` — the GET/PATCH the panel reads and writes —
has no `productEmailsEnabled` in either its response or its Zod body schema.

**Settled:** add the field to both in the first PR. This is the only backend
change the feature needs; everything else is already live.

### B. `wait` is not server-preformatted

The handoff says *"`wait` is a pre-formatted string from the server refusal —
design does not format durations."* The server sends a `Retry-After` header in
seconds plus a generic sentence (`'You can request one export per hour.'`), and
`apps/api/src/routes/users-export.ts` is not changing.

**Settled:** the client formats. Read `Retry-After`, render minutes above 60s
and seconds below, count down locally, re-enable at zero. Design's intent (the
refusal names a real wait, not "later") is preserved; only the seam moves.

### C. A prefs-query failure legitimately removes this control

`NotificationsSection` early-returns on `isError`, rendering the heading, the
load error, and `CrewActivityBlock`. `CrewActivityBlock` survives that return
because it reads a *different* data source. The Email-from-us group reads the
**same** failed preferences query, so it cannot render a truthful switch state.

**Settled:** no new error branch. The existing error state is correct here, and
the one-click link in every product email is the out-of-band opt-out. Reuse the
existing `toggleError.preference` banner for a failed write.

### D. Legal copy ships in the same PR, never before

`apps/web/src/app/legal/definitions/copy.ts:176-177` currently describes email
control in terms that don't name an in-app affordance. It gets updated in the PR
that ships the toggle — not earlier, not in a follow-up.

Same PR, same reason: `apps/api/src/routes/email-unsubscribe.ts` tells users
*"You can turn it back on any time from Settings → Notifications"* and *"manage
emails from your account settings."* Both point at a surface that does not exist
today. That is a live false claim on a prod page, and this feature is what makes
it true. Update the destination wording to `/me` ▸ Notifications in the same PR.

### E. `limited` does not survive a reload

The rate limiter is in-memory and keyed per user; the client's countdown is
session-local. A reload during the hour shows a pressable row that will refuse
on press, landing back in `limited` with a fresh wait. That is acceptable and
self-correcting — no persistence work.

---

## Copy-review pass — applied

Run in **apply** mode against `email-export.jsx`, with `README.md` and
`CLAUDE_CODE_PROMPT.md` synced to match. Five findings, all applied.

| String | Class | Verdict | Change |
|---|---|---|---|
| `railMeta: "ALWAYS AVAILABLE"` | Chrome | `CUT` | Removed, with the `meta` prop on the `SectionRail` call. The group is one always-available switch; the tag labels the obvious (rule 1) and pre-empts the "where's my toggle?" question the footnote already answers better. |
| `onDetail` | Chrome | `TIGHTEN` | *"Rare. A discount, a gift about to run out, a hello when someone gifts you a month."* → *"Rare. A discount, or a heads-up when a gift is running out."* Tricolon padding (rule 9); the third clause restates the second (rule 8). |
| `footnote` | Obligation | `TIGHTEN` | Em-dash → colon (rule 4). Wording untouched: it is the billing-exemption explanation and carries the class's defend. |
| `limited` | Recovery | `TIGHTEN` | *"One export an hour — that's the limit. Try again in {wait}."* → *"One export an hour. Try again in {wait}."* Em-dash, plus *"that's the limit"* restating *"an hour"* (rules 4, 8). |
| `failed` | Recovery | `TIGHTEN` | Em-dash → period (rule 4). Diagnosis and retry both kept (rule 6). |

`KEEP`: `rail`, `label`, `offDetail`, `export.label`, `restDetail`,
`pendingDetail`, `chipRest`, `chipPending`, `limitedRail`, `failedRail`.

**Separately — mock drift, not new copy.** The in-context `NotificationsSection`
mock reproduced the free-tier locked card as *"Follow artists — get a heads-up
when they play Denver"* / *"Alerts and the weekly digest live in here."* Neither
string is shipped. The real strings live in
`components/settings/notifications/definitions/copy.ts` as `'New show alerts'` /
`'Following artists is part of Premium. Upgrade and these switch on.'`. The mock
is now corrected to match, so an implementer reading the canvas does not "fix"
working copy to match a context sketch. Nothing in the shipped file changed.

**Why the em-dashes were not optional.** `apps/web/eslint.config.mjs` blocks
em-dashes in `src/**/definitions/copy.ts` at build time. Three of these strings
would have failed the build the moment they moved from the prototype into a
`copy.ts`, so the fix was mechanical either way.

**Self-check:** 1 CUT + 4 TIGHTEN over 15 strings = 7% cut, inside the 30% budget.
No two replacements share an opening construction. No `DEFEND` row changed for
brevity alone — the two Recovery rows lost punctuation and one redundant clause,
never a fact. Nothing frozen or design-locked was overruled.

---

## Decisions inherited from the handoff

1. Product email is its own group, outside the push master **and** outside the
   entitlement gate. This is the one that matters: the digest row sits inside an
   entitlement-gated group, so free users see only a "See Premium" card there.
   A legally-required opt-out cannot live behind an upgrade card.
2. The group sits **above** the gated group. The digest does not move.
3. Billing is a `<GroupFootnote>`, never a row — it explains rather than asserts.
   Consistent with `UNSUBSCRIBE_FAMILIES` deliberately excluding `billing`.
4. Plain two-way toggle, default ON, state carried in the detail line.
5. Export is the last row of Account, adjacent to Danger zone but not in it.
6. Pending renders inline; refusals render beneath the row so the label never
   doubles as an error message.
7. No filename anywhere. The server owns it, and it is deliberately not
   date-stamped — which contradicts #1573's issue text. The shipped code wins.

## Still open for product — not build-blocking

- **Two email switches in two places.** Accepted for now. If the digest ever
  leaves the Premium gate, both collapse into this group with no new components.
- **Billing footnote on desktop.** Reads fine at 620px; a two-column treatment
  is possible but not proposed.
