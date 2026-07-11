# Design Property Table — Tier Picker (PR 3.2, monetization_tier_states R6)

Source files: `design/design_handoff_monetization_tier_states/monetization-tier-states.jsx`,
`monetization-shared.jsx`, `README.md`. Breakpoint: 640px.

## Data — R5_TIERS (locked; supersedes shared TIERS)

| Tier      | priceText | priceUnit             | tagline                             | rationale                                                          | features                                                                                                                                                |
| --------- | --------- | --------------------- | ----------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Free      | $0        | forever               | The whole point. Always free.       | No backend cost to scale, no reason to charge.                     | Browse/search/filter · Save shows you're watching · See community-submitted prices · Submit prices yourself                                             |
| Supporter | $2        | / month               | Stuff we can run without scaling.   | Existing infrastructure. You're just chipping in.                  | Everything in Free · Supporter badge on your profile · The warm, smug glow of keeping us alive + badgeOnlyNote "No Premium unlocks — that's the point." |
| Premium   | $5        | / month               | Stuff that actually costs us money. | Notification workers, email at volume, price polling, Spotify API. | Everything in Free · Concert history · Calendar export · Follow artists + new-show alerts · Price-drop alerts + Spotify sync · ★ More coming (future)   |
| Founder   | $3        | / mo · locked forever | Full Premium. Permanent discount.   | First 100 subscribers. Claimable at public launch.                 | Everything in Premium · $3/mo — never goes up, ever · Founder badge (first 100 only) · ★ More coming (future)                                           |

## Component: tierShell (tone shells)

| Tier      | background                                                                                                                                         | border                                                                 | accent          | shadow                                                        |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------- | ------------------------------------------------------------- |
| free      | var(--surface-1)                                                                                                                                   | 1px solid var(--border)                                                | var(--fg-muted) | none                                                          |
| supporter | color-mix(in oklch, var(--accent) 5%, var(--surface-1))                                                                                            | 1px solid color-mix(in oklch, var(--accent) 28%, var(--border))        | var(--accent)   | none                                                          |
| premium   | color-mix(in oklch, var(--signal) 5%, var(--surface-1))                                                                                            | 1px solid color-mix(in oklch, var(--signal) 45%, var(--border-strong)) | var(--signal)   | 0 0 0 1px color-mix(in oklch, var(--signal) 22%, transparent) |
| founder   | linear-gradient(155deg, color-mix(in oklch, var(--accent) 10%, var(--surface-1)) 0%, color-mix(in oklch, var(--signal) 8%, var(--surface-1)) 100%) | 1px solid color-mix(in oklch, var(--signal) 40%, var(--border-strong)) | var(--signal)   | 0 0 0 1px color-mix(in oklch, var(--accent) 18%, transparent) |

Neutral accent = accent === var(--fg-muted); stampColor = neutral ? var(--border-strong) : shell.accent.

## Component: TierStateCard (desktop)

### Card container

| Property                       | Mobile | Desktop                                                                           |
| ------------------------------ | ------ | --------------------------------------------------------------------------------- |
| border-radius                  | —      | 14px                                                                              |
| padding                        | —      | 14px 14px 12px                                                                    |
| display / flex-direction / gap | —      | flex / column / 10                                                                |
| border (current)               | —      | 2px solid stampColor                                                              |
| box-shadow (current)           | —      | inset 0 0 0 1px (neutral: var(--border); else color-mix(accent 30%, transparent)) |

### Current-plan banner

| Property      | Mobile | Desktop                                                                             |
| ------------- | ------ | ----------------------------------------------------------------------------------- |
| margin        | —      | -14px -14px 0                                                                       |
| padding       | —      | 7px 14px                                                                            |
| background    | —      | neutral: var(--surface-2); else color-mix(in oklch, accent 18%, var(--bg-elevated)) |
| border-bottom | —      | 1px solid stampColor                                                                |
| font          | —      | mono 800 / 9.5px / 0.18em / uppercase                                               |
| color         | —      | neutral: var(--fg); else shell.accent                                               |
| check svg     | —      | 10×10 viewBox 0 0 10 10, path M2 5 L4 7 L8 3, stroke-width 1.7, round caps/joins    |
| text          | —      | "Your plan" / founder: "Your plan · locked $3/mo"                                   |

### Scarcity rail placement

Founder card only, when founderState.open. intensity=medium.

### Header (name/price)

| Property   | Mobile                                                             | Desktop                                                              |
| ---------- | ------------------------------------------------------------------ | -------------------------------------------------------------------- |
| name font  | 900 / 19px / -0.02em                                               | 900 / 22px / -0.02em                                                 |
| tier badge | size sm, non-free only                                             | size sm, non-free only                                               |
| tagline    | 600 / 12.5px / var(--fg-muted) / -0.01em / nowrap ellipsis         | 600 / 13px / var(--fg-muted) / -0.01em                               |
| priceText  | 900 / 21px / -0.04em / lh 1 / free: var(--fg-muted) else var(--fg) | 900 / 26px / -0.04em / lh 1 / same color rule                        |
| priceUnit  | mono 700 / 8px / var(--fg-subtle) / 0.08em / uppercase             | mono 700 / 9px / var(--fg-subtle) / 0.1em / uppercase / margin-top 4 |

### Rationale rail

| Property     | Both                                             |
| ------------ | ------------------------------------------------ |
| font         | mono / 10px / var(--fg-subtle) / 0.04em / lh 1.5 |
| padding-left | 9px                                              |
| border-left  | 2px solid shell.accent                           |
| opacity      | 0.85                                             |

### Feature list

| Property           | Mobile                                                                           | Desktop |
| ------------------ | -------------------------------------------------------------------------------- | ------- |
| ul gap             | 6                                                                                | 5       |
| li                 | flex, align flex-start, gap 8, 500 / 13px / var(--fg) / -0.005em                 | same    |
| future row opacity | 0.65                                                                             | 0.65    |
| check svg          | 12×12, path M2 6 L5 9 L10 3, stroke shell.accent, width 1.8, round, margin-top 4 | same    |
| future ★           | width 12, margin-top 1, color shell.accent, 12px 800 mono, center, lh 1.2        | same    |

### badgeOnlyNote (Supporter)

mono / 9.5px / var(--fg-subtle) / 0.08em / uppercase.

### CTA button (shared desktop + mobile — TierCtaButton)

| Property                  | Value                                                                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| padding / radius / width  | 11px 14px / 10px / 100%                                                                                                                                                    |
| font                      | 700 / 13.5px / -0.005em                                                                                                                                                    |
| disabled opacity / cursor | 0.55 / default                                                                                                                                                             |
| background                | signal: var(--signal); founder: linear-gradient(135deg, var(--signal), color-mix(in oklch, var(--accent) 60%, var(--signal))); current: var(--surface-2); else transparent |
| color                     | signal/founder: var(--fg-on-accent); current: var(--fg); ghost-accent: var(--accent); ghost: var(--fg-muted)                                                               |
| border                    | current: 1px solid stampColor; ghost-accent: 1px solid color-mix(accent 50%, var(--border-strong)); ghost: 1px solid var(--border); else transparent                       |
| box-shadow (founder)      | 0 0 18px color-mix(in oklch, var(--accent) 30%, transparent)                                                                                                               |
| current check             | 12×12 check svg in stampColor when tone=current && !disabled                                                                                                               |

## Component: ScarcityRail (medium intensity)

| Property        | Value                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------- |
| layout          | column, gap 6                                                                               |
| top row         | flex, space-between, gap 8                                                                  |
| claimed eyebrow | mono 10px 0.14em, hot: var(--accent) else var(--signal); text "{claimed} / {total} claimed" |
| time eyebrow    | mono 10px 0.14em var(--fg-muted); "{d}d {h}h left" (daysLeft ≥1) else "{h}h left"           |
| bar track       | height 3, radius 3, var(--surface-2), overflow hidden                                       |
| bar fill        | width pct%, hot: var(--accent) else var(--signal), radius 3                                 |
| hot condition   | state.hot OR seatsLeft ≤ 15 OR daysLeft ≤ 3                                                 |

## Component: TierBadge

| Property     | sm      | md      | lg       |
| ------------ | ------- | ------- | -------- |
| padding      | 3px 7px | 4px 9px | 5px 11px |
| font-size    | 9       | 10      | 11       |
| glyph size   | 8       | 9       | 10       |
| gap / radius | 5 / 4   | 5 / 5   | 6 / 6    |

Shared: inline-flex, mono 800, 0.12em, uppercase, nowrap, lh 1, 1px solid border.

- supporter: bg color-mix(accent 14%), border color-mix(accent 36%), fg var(--accent), glyph mono 800 "+"
- premium: bg color-mix(signal 14%), border color-mix(signal 38%), fg var(--signal), glyph star polygon 5,0 6.3,3.4 10,3.7 7.1,6 8.1,9.7 5,7.6 1.9,9.7 2.9,6 0,3.7 3.7,3.4 fill currentColor
- founder: bg linear-gradient(135deg, color-mix(accent 18%), color-mix(signal 18%)), border color-mix(signal 50%), fg var(--fg), crown path M1 7 L1 3 L3 5 L5 1 L7 5 L9 3 L9 7 Z fill var(--signal) stroke var(--accent) sw 0.7
- free/absent: renders null

## Component: TierRowMobile (accordion)

| Property             | Value                                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| container            | radius 14, overflow hidden, shell.bg; border 2px solid stampColor when current OR expanded, else shell.border                                  |
| left stripe          | paid tiers only: absolute, width 3, shell.accent                                                                                               |
| header button        | flex, gap 10, padding 13px 14px, width 100%, aria-expanded, aria-controls tier-row-detail-{key}                                                |
| "· Your plan" inline | mono 800 / 8.5px / 0.14em / uppercase; neutral: var(--fg-muted) else shell.accent                                                              |
| Popular chip         | premium && !current && state !== 'founder'; padding 2px 7px, radius 4, bg color-mix(signal 14%), mono 800 8.5px 0.14em uppercase var(--signal) |
| chevron              | 14×14, path M3 5 L7 9 L11 5, sw 1.7, var(--fg-subtle), rotate(180deg) when expanded, transition .18s                                           |
| expanded region      | id tier-row-detail-{key}, role region, aria-label "{name} tier details", padding 0 14px 14px, column gap 11                                    |
| expanded content     | scarcity rail (founder+open) → rationale → features (gap 6) → badgeOnlyNote → TierCtaButton                                                    |
| default expanded     | current plan, else premium, else first                                                                                                         |

## Component: Picker surface (TierPicker)

### Header rail (RailHeader)

| Property | Value                                                  |
| -------- | ------------------------------------------------------ |
| layout   | flex, center, gap 10, full width                       |
| dot      | 6×6, radius 6, tone color, box-shadow 0 0 8px tone     |
| eyebrow  | mono 10 / 700 / uppercase / 0.16em / tone color        |
| hairline | flex 1, height 1, var(--border)                        |
| code     | mono 10 / 700 / 0.14em / var(--fg-subtle); "{n} tiers" |
| tone     | logged-out: accent; else signal                        |

### Title block

| Property | Mobile                                                                                          | Desktop                             |
| -------- | ----------------------------------------------------------------------------------------------- | ----------------------------------- |
| title    | 900 / 29px / -0.035em / lh 1.06                                                                 | 900 / 36px / -0.035em / lh 1.02     |
| sub      | 500 / 14px / var(--fg-muted) / -0.005em / lh 1.45                                               | 500 / 14.5px / same / max-width 560 |
| copy     | "Pick a lane." + infrastructure sub; logged-out: "Save the ones you can't miss." + Watching sub | same                                |

### Sign-in link (logged-out)

"Already have an account?" 600 / var(--fg-muted); "Sign in →" 700 / var(--signal). Mobile margin-top 2.

### Layout

| Property       | Mobile         | Desktop                                    |
| -------------- | -------------- | ------------------------------------------ |
| tier container | column, gap 10 | grid repeat(n, 1fr), gap 12, align stretch |
| modal width    | sheet (~90%)   | 1000 (4 tiers) / 780 (3 tiers); gifted 560 |
| content gap    | 12 (outer col) | 16                                         |

### Footer mono rail

| Property | Mobile                                                         | Desktop                                                 |
| -------- | -------------------------------------------------------------- | ------------------------------------------------------- |
| text     | Tap a tier to compare · cancel any time · Stripe handles cards | Cancel any time · billed monthly · Stripe handles cards |
| font     | mono 9.5 / 0.12em / uppercase / var(--fg-subtle) / centered    | mono 10 / 0.14em / uppercase / same                     |

## Component: GiftedThankYou

| Property         | Mobile                                                                                                    | Desktop               |
| ---------------- | --------------------------------------------------------------------------------------------------------- | --------------------- |
| rail             | eyebrow "Lifetime Premium · Beta", code "On us", tone accent                                              | same; modal width 560 |
| mark cluster     | 56×56 MMark/CCMark, halo radial-gradient color-mix(accent 40%) inset -6 radius 22                         | same                  |
| badges           | TierBadge premium lg + Beta chip (surface-2, border-strong, mono 700 10px 0.16em, signal dot 5×5)         | same                  |
| title            | 900 / 32px / -0.035em / lh 1.03; "You're already in."                                                     | 900 / 40px            |
| body             | 500 / 14px / var(--fg-muted) / lh 1.5 / max-width 460                                                     | 500 / 15.5px          |
| signature        | mono italic 12.5px / var(--accent) / 0.02em; "—— Seriously. We owe you one."                              | same                  |
| perks box        | radius 14, padding 16px, bg color-mix(signal 5%, surface-1), border color-mix(signal 30%, border), gap 12 | same                  |
| perks eyebrow    | mono 10 var(--signal) "Everything Premium, switched on"                                                   | same                  |
| perks grid       | 1fr                                                                                                       | 1fr 1fr               |
| perk row         | gap 8, 500/13px, check 13×13 signal sw 1.9                                                                | same                  |
| discovery button | "See everything you've got" + chevron; 12px 16px, radius 11, 1px solid var(--border-strong), 700/13.5px   | same                  |
| footer           | mono 9.5 / 0.12em / uppercase / var(--fg-subtle); "No card on file · nothing to cancel · just enjoy it"   | same                  |

## State Coverage

| State                 | Triggering condition                                | Rendered                                                    | Key behavior                                                                                                                   |
| --------------------- | --------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| logged-out            | PlanState.plan='logged-out'                         | picker, accent tone                                         | feature-anchored header, sign-in link, all CTAs → sign-up                                                                      |
| free                  | plan='free'                                         | picker                                                      | Free stamped current; paid CTAs start checkout                                                                                 |
| supporter             | plan='supporter'                                    | picker                                                      | Supporter stamped, Manage CTA; cross-tier CTAs designed labels (flows are #780/PR 4.5 — disabled in this PR)                   |
| premium               | plan='premium'                                      | picker                                                      | Premium stamped, Manage; Switch CTAs designed labels (disabled, #780)                                                          |
| founder               | plan='founder'                                      | picker                                                      | Founder stamped "Your plan · locked $3/mo"; premium row "Already yours, via Founder" disabled; visible even when window closed |
| gifted                | plan='gifted' OR roleComped                         | GiftedThankYou replaces surface                             | no cards, no billing affordances                                                                                               |
| founder window open   | founder-window state='open'                         | founder card + scarcity rail                                | seats/time from GET /v1/billing/founder-window                                                                                 |
| founder window closed | state='closed'                                      | founder card hidden unless state==='founder'                | r5VisibleTiers                                                                                                                 |
| founder pre-launch    | state='pre-launch' (eng spec; not in design canvas) | founder card visible, CTA disabled "Opens at public launch" | locked judgment call                                                                                                           |
| price promise         | brief #782                                          | Supporter + Premium cards                                   | "Whatever you pay, you pay. We won't raise it." (microcopy addition on top of R6 canvas)                                       |
