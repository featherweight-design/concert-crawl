# Monetization · Subscription Lifecycle + Management (#780 · Round 1)

> Extends `design_handoff_monetization/` (original Plan card + payment) and sits on
> top of `design_handoff_monetization_tier_states/` (#781 — locked tier picker,
> atoms, 9-theme tokens, Sour Patch voice). **Nothing from #781 is redesigned.**
> This round adds Plan-card lifecycle variants + the net-new management surfaces.
> Status: **first pass, ready for Hugh's review.**

Open `Subscription Lifecycle.html` and toggle **Tweaks** in the toolbar to drive
the Section 0 live Plan card across lifecycle state · tier · trial day · all 9
themes.

---

## What's here

| File | What it does |
|---|---|
| `Subscription Lifecycle.html` | The canvas — 11 sections, mobile + desktop throughout. |
| `lifecycle-plan-cards.jsx` | `<LifecyclePlanCard user variant/>` + `getLifecycleContent()`. All Plan-card variants (active P/S/F, trial early/13/14, cancel-grace, post-cancel-grace Free ×2, post-trial-expired Free) on the locked card shell. |
| `lifecycle-manage.jsx` | `<ManageSheet variant tier/>` — the in-app Manage subscription sheet/modal. |
| `lifecycle-flows.jsx` | `<CancelFlow/>`, `<DowngradeFlow/>`, `<UpgradeFlow/>`, `<ChangesDisclosure/>`. |
| `lifecycle-deletion.jsx` | `<DeleteWarningSheet variant gifted/>` + `<DeleteConfirmSheet variant email/>` (live type-to-confirm). |
| `lifecycle-takeover.jsx` | `<TrialEndedTakeover variant founderKind/>` (wraps the #781 picker) + `<DayThirteenBanner variant inline/>`. |
| `monetization-shared.jsx`, `monetization-tier-states.jsx`, `theme-context.jsx`, `ios-frame.jsx`, `design-canvas.jsx`, `tweaks-panel.jsx` | Canonical deps, copied verbatim from #781. |

---

## Sections in the canvas

0. **Live preview** — Plan card wired to Tweaks (state · tier · trial day · all 9 themes).
1. **Plan card variants · mobile** — full lifecycle matrix in the Settings · Plan rail.
2. **Plan card variants · desktop** — same matrix, desktop card.
3. **Manage subscription sheet** — mobile sheet + desktop modal + Supporter context.
4. **Cancel flow** — mobile + desktop.
5. **Downgrade** (Premium → Supporter) — mobile + desktop + the expanded disclosure detail.
6. **Upgrade** (Supporter → Premium) — mobile + desktop.
7. **Account deletion** — sheet 1 (warning) + sheet 2 (confirm-twice), mobile + desktop, + Gifted variant.
8. **Trial-ended takeover** — full-bleed, mobile + desktop + Founder-window-closed case.
9. **Day-13 banner** — pinned strip (mobile + desktop) + inline variant.
10. **Theme parity** — key surfaces across Light / Pulse / Forge / Drip.

---

## Decisions log — the "Open for Design to call" items

The brief left these to Design's judgment. Calls made for this pass (all easy to
flip — flag any you want changed):

1. **Manage sheet grouping → two groups, not a flat list.** "On Concert Crawl"
   (Change plan, Cancel) sits up top where our voice + retention live; "Billing &
   receipts" holds the Stripe-portal rows, each tagged a `Stripe ↗` chip. The
   in-app/portal split is a real routing distinction, so grouping reads cleaner
   than chips sprinkled through one list.
2. **Downgrade data-handling → calm one-liner that expands.** Default shows a
   single quiet line ("your history, follows & alerts stay safe for 90 days");
   tapping it expands a full **Here's what changes** list (stays-on vs
   switches-off + the 90-day restore note). Best of both — calm by default,
   complete on demand. (Expanded state shown as its own artboard in §5.)
3. **Cancel-grace "Resubscribe" → one-tap restore.** The user never lost access
   (still inside grace), so Resubscribe just flips auto-renew back on — no trip
   through the picker/checkout.
4. **Post-cancel-grace eyebrow decay → ~30 days, then plain Free.** The
   "You were Premium until {date} · come back?" context persists for ~a month,
   then the card falls back to the standard Free card. Both states are in §1/§2
   (`post-cancel-grace` and the `decayed` variant). Toggle "Eyebrow decayed" in
   Tweaks to compare.
5. **Day-13 banner placement → pinned strip (primary) + inline variant.** Thin
   strip above the app bar is the default; an inset rounded variant under the bar
   ships for surfaces where a pinned strip is too heavy. Both shown in §9.
6. **Cancel retention nudge → price-led, Premium/Founder only.** Leads with
   "If it's the $5 — Supporter's $2," plus one line on what switches off, and a
   one-tap "Switch to Supporter instead" path into the downgrade flow (brief's
   locked off-ramp). **Supporter cancel uses a thinner flow** — confirmation +
   date breakdown only, no down-sell (nothing cheaper to step to) and no 90-day
   data note (Supporter is badge-only per the §6 matrix, so there's no Premium
   data to preserve). `<CancelFlow tier="supporter">`, shown in §4.
7. **Cancel-flow CTA hierarchy → brief default, kept on purpose.** "Cancel
   subscription" is the clear **primary** confirm (danger-toned, findable);
   "Never mind — keep {tier}" is the ghost back-out. R1 briefly inverted this
   (Keep = primary, Cancel = danger ghost); reverted because retention already
   lives in the nudge card above, and burying the cancel button to win retention
   reads as a dark pattern. Honesty rail > friction. Easy to flip if you'd
   rather lead with Keep.
8. **Account-deletion voice → mostly plain, one wry line.** Sheet 1 carries
   exactly one bit of cheek ("no restore-from-trash"); sheet 2 is fully sober.
   This is the one place the Sour Patch cheek steps back.

---

## Locked decisions honored (from the brief)

- **Hybrid management** — in-app for emotional moments (cancel/downgrade/upgrade/
  manage entry/deletion), Stripe portal for tooling (card/invoices/email/tax),
  surfaced via the `Stripe ↗` rows in the Manage sheet.
- **Trial-end = next-session full-bleed takeover**, dismissible, single-fire
  (eng owns the `last_trial_ended_shown_at` trigger). Picker beneath the headline
  is the **locked #781 picker** (`TierStateCard` / `TierRowMobile`), not a reskin.
- **Cancel = `cancel_at_period_end`** grace; Plan card flips to cancel-grace,
  then post-cancel-grace Free. No refunds.
- **Proration = immediate switch + Stripe credit**, disclosed plainly on the
  up/downgrade surfaces.
- **90-day preserve-then-purge** surfaced as the downgrade/cancel data note
  (Watching never purged, so it's framed as always-safe).
- **Day-13 nudge = Plan card emphasis + one-time banner**; ends-today is Plan
  card emphasis only (no banner re-fire — Design's default per brief).
- **Account deletion in scope** with the cancel-sub-only off-ramp; gifted body
  variant included.
- **Token-only across all 9 themes**; mobile + desktop parity on every surface;
  atoms (`TierBadge`, `MonoEyebrow`, `RailHeader`, `SheetChrome`, `ModalChrome`,
  `DragHandle`, `MMark`) reused, never reinvented. `CCMark`/`MMark` untouched.

---

## Out of scope (owned elsewhere — do not pull back in)

- Past-due / 3DS / SCA / retry / multi-card, a11y annotations, required
  microcopy disclosures → **#782**.
- Welcome / renewal / dunning / cancel-ack / win-back / day-13 / pre-purge
  emails → **#783**.
- Stripe wiring, schema (`cancel_at_period_end`, `trial_ends_at`,
  `last_trial_ended_shown_at`, `day_thirteen_banner_dismissed_at`,
  `premium_data_expires_at`, `downgrade_credit_balance`), webhooks, the
  90-day-purge job, the trial-end check, the banner trigger eval,
  `DELETE /v1/users/me` Stripe cleanup → **#775**.
- Tier picker visuals + entitlements matrix → **#781** (✅ done; reused here).
- Logged-out broader UX → **#794**.

---

## Dev / handoff notes

- **Sequencing risk (brief §8):** no past-due Plan card variant exists in #780.
  Ship #782's past-due variant in lockstep, or accept that `past_due` users see
  "Active" during the gap (Stripe email dunning informs them). Plan-PR call.
- The trial-ended takeover renders the #781 picker **inline** (not in its
  `SheetChrome`/`ModalChrome`) via the exported `TierStateCard` / `TierRowMobile`,
  so the full-bleed surface owns the chrome. CTA targets are #781/#775's.
- `DeleteConfirmSheet` uses a real input; the destructive button enables only on
  an exact case-insensitive email match. Pass `email` per user at integration.
- All customer-facing strings still externalize to `copy.ts` at integration time
  (per `feedback_definitions_copy_rule`) — not done here, plan-PR-stage work.
