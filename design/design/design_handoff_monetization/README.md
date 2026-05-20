# Monetization · Upgrade Flow

> Tier comparison + payment modal + Founder window + role-holder voluntary support
> Beta target: Jun 30–Jul 6 · Eng handoff: ~Jun 16
> Status: **first pass, ready for Hugh's review**

---

## What's here

**`Monetization Upgrade Flow.html`** — the canvas. Open it, toggle **Tweaks** in the toolbar to drive a live preview that responds to theme · founder window state · urgency intensity · user state · trial CTA placement · role.

Component sources (load order matches the HTML):

| File                             | What it does                                                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `monetization-shared.jsx`        | Tier + role data, `MMark` (verbatim copy of `CCMark`), badges, scarcity rail, shared sheet/modal chrome                |
| `monetization-tiers.jsx`         | `<TierCard>`, `<TierComparisonMobile>` (bottom sheet), `<TierComparisonMatrix>` (desktop matrix), `<RoleHolderBanner>` |
| `monetization-card-variants.jsx` | Three card-direction explorations — `<TierComparisonPressed/Poster/Stack>`                                             |
| `monetization-extras.jsx`        | `<CompareFeaturesSheet/>` (mobile matrix), `<TrialEndedSurface/>`                                                      |
| `monetization-payment.jsx`       | `<PaymentSurface variant state tierKey trial role voluntary/>` — wraps Stripe Elements                                 |
| `monetization-settings.jsx`      | Plan card + role rail, Settings Desktop/Mobile mocks, user dropdown                                                    |

`theme-context.jsx`, `ios-frame.jsx`, `design-canvas.jsx`, `tweaks-panel.jsx` are copies of the canonical files.

---

## Sections in the canvas

0. **Live preview** — mobile sheet + desktop matrix, both wired to the Tweaks panel.
1. **Tier comparison · mobile · all themes** — Electric / Jade / Light side-by-side.
2. **Desktop · comparison matrix** — feature rows × tier columns. Spotify removed; new dimmed "★ more coming" row at bottom (Premium + Founder only). Artboards bumped to 1000px tall so the future row stays visible.
3. **Tier cards · tap to expand for full details** — each card has a 'What's included' chevron; tap expands the same feature list with one-line descriptions under each item. Collapsed default + Premium-open + Founder-open + all-open shown.
4. **Founder urgency · intensity variants** — Subtle / Medium / Loud. Default = **Medium**.
5. **Founder window · all states** — open-many / open-few / ending-soon / closed.
6. **User-state coverage** — logged-out / free / on-trial / paying-supporter / paying-premium / paying-founder.
7. **Role-holder voluntary support** — Beta / Admin / Promoter. Founder claimable.
8. **Trial-ended takeover** — day-15 sheet/modal. Re-ordered: Founder (best deal, primary) · Supporter (cheaper) · Premium (just an option) · Stay on Free. Premium isn't pushed.
9. **Payment · mobile bottom sheet**.
10. **Payment · desktop modal**.
11. **User Settings · plan + role separation** — user dropdown rebuilt around the `theme-picker.jsx` UserMenuRow pattern (single Theme row → popover, no 9-icon strip). Plan row gets a left-edge accent stripe matching the tier color (gradient for Founder).
12. **Badges · tier + role**.

---

## Design decisions (committed)

- **Voice = "Sour Patch Kids."** Slight cheek in headlines ("Pick a lane."), gratitude in body ("Thanks — we mean it."). Honesty rail under each tier: _"Stuff we can run without scaling" / "Stuff that actually costs us money."_
- **Cards carry the personality, not banners.** No giant pricing hero. Each tier feels distinct: Free = outlined neutral, Supporter = subtle accent stripe, Premium = signal border + signal CTA, Founder = signal+accent gradient + scarcity rail.
- **Founder countdown = information, not pressure.** Default urgency = **Medium** (mono eyebrow + thin progress hairline). Loud variant exists for stress-testing but isn't recommended.
- **Scarcity = seats + time, both visible**, mono meta. Loud variant leads with a big seats number; Subtle is mono-only.
- **Trial CTA defaults to inline on the Premium card.** Banner placement is opt-in via Tweaks.
- **Role-holders see the same picker** with: a "You're in already" banner, Founder hidden (only purchasable from launch), Free hidden (no downgrade story for them), Supporter recoloured as voluntary. Headline shifts to "Wanna chip in?"
- **Payment surface wraps Stripe Elements.** Dashed placeholder so it's obvious eng wires in the real `<PaymentElement>`. Trial path shows `$0.00 due today` + `$5.00 in 14 days`. Founder shows scarcity rail at top.
- **Token-only colors.** Every accent reads from `var(--signal)` / `var(--accent)`. Cross-theme parity verified.

---

## Tier copy (final-ish; let me know what to edit)

| Tier      | Tagline                             | Rationale (mono eyebrow)                                           | CTA                     |
| --------- | ----------------------------------- | ------------------------------------------------------------------ | ----------------------- |
| Free      | The whole point. Always free.       | No backend cost to scale, no reason to charge.                     | You're here.            |
| Supporter | Stuff we can run without scaling.   | Existing infrastructure. You're chipping in.                       | Become a Supporter      |
| Premium   | Stuff that actually costs us money. | Notification workers, email at volume, Spotify API, price polling. | Start 14-day free trial |
| Founder   | Full Premium. Permanent discount.   | First 100 subscribers or 30 days. Whichever comes first.           | Claim Founder pricing   |

Success-state headlines:

- Trial: _"Trial's running."_
- Founder: _"Founder. Locked in."_
- Supporter: _"You're a Supporter."_
- Premium (paid): _"You're in."_

---

## Badges

**Tier badges** (cosmetic, status):

- **Supporter** — accent tinted chip, `+` glyph
- **Premium** — signal tinted chip, ★ glyph
- **Founder** — accent→signal gradient, crown-ish wave glyph

**Role badges** (utility, relationships):

- **Admin** — neutral surface, warning dot
- **Promoter** — neutral surface, accent dot
- **Beta** — neutral surface, signal dot
- **Member** — no badge (neutral fallback)

Both render in 3 sizes (sm/md/lg). `<BadgeRow tier role/>` composes them.

---

## Round 4 changes (May 18, final)

- **Tier details modal** (`<TierDetailSheet/>`) — tap a card's "See what's included" button to open a full-screen modal showing every feature with one-line descriptions.
- **Current-plan stamp** — banner across the top of the current tier's card (`✓ YOUR PLAN`), with a 2px accent border on the card and a neutral "Manage subscription" CTA with checkmark.
- **Trial-ended emphasis** — Supporter no longer styled as primary even when Founder is closed. Founder is the only glowing CTA; Supporter and Premium share the same secondary treatment.
- **Switch-tier picker** — inline CTA at the bottom of the picker card; removed the sticky footer that was creating an awkward empty gap.
- **Matrix borders + badge stacking** — Free and Supporter columns use `--border-strong` (was `--border`) for visible card framing. Tier name + badge stack vertically in every matrix column for consistency.
- **Plan-row accent stripes** in the dropdown, with Supporter / Premium / Trial / Founder all covered.

## Known visual issue (catch in dev)

- **Founder CTA glow extends past the matrix card bottom edge.** The button itself fits the cell, but its 18px accent glow (`box-shadow`) bleeds beyond the card's bottom border. We tried `overflow: hidden` to clip it — Hugh rightly pushed back: the glow is intentional and the right fix is to size the button to fit the container. Punting to dev — see `monetization-tiers.jsx` line ~700, button styling inside `TierComparisonMatrix`.

---

## What's intentionally out

Per the brief:

- Stripe Elements form internals (Stripe owns; we render a dashed slot)
- Artist following UI · notification prefs (separate items)
- Subscription management / cancel flow
- Granular admin role assignment
