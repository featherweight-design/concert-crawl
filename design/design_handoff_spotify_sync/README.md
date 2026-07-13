# Spotify Sync · Connect Chapter — Track 2 · Round 1

> **⚠️ Spec note:** the brief referenced `docs/superpowers/specs/2026-07-11-spotify-sync-design.md` — that file is **not in the project** (the `docs/` folder is empty). This round is built from the handoff prompt's own decision summary + the locked entitlements matrix in `uploads/2026-06-24-monetization-tier-states-entitlements-design.md` (which already fixes Spotify's tier gating: Premium-gated, hidden-not-locked for Free). If the real spec differs on any of the 7 locked decisions, flag and I'll adjust.

Open **`Spotify Sync Connect.html`** (R1) and **`Spotify Sync R2.html`** (R2) and toggle **Tweaks** to drive each Section 0 live preview across surface × theme (all 9). ★ marks my lean where a call was open.

---

## What's in R1 (the connect chapter)

| # | Section | Deliverable |
|---|---|---|
| 0 | Live preview | Tweaks-driven surface × theme + `--spotify-green` token note |
| 1 | Entry points | Settings ▸ Connections (primary) + post-first-watch nudge (secondary) |
| 2 | OAuth handoff | Honesty-rail interstitial, mobile + desktop |
| 3 | Success + auto-watch | Success recognition + one-time opt-in (auto vs highlight) |
| 4 | Connected settings | Account · count · last-synced · Refresh · auto-watch toggle · Disconnect + confirm |
| 5 | Browse card audit + You follow | **before / rejected / after** row audit, in-context browse, hero + detail |
| 6 | Empty + failure states | 0-in-Denver empty; Spotify-down, token-refresh, external-revoke; warning banners |
| 7 | Theme parity | `--spotify-green` × 9 themes + key surfaces reskinned |

## Files
- `theme-context.jsx` — the canonical 9-theme system **+ the new `--spotify-green` token** on every theme.
- `spotify-shared.jsx` — `SpotifyLogo` (neutral placeholder for the **official** Spotify asset — never a recreated logo), `HonestyRail`, buttons, `ArtistChip`, `A11yNote`.
- `connect-flow.jsx` — `ConnectEntry`, `FirstWatchNudge`, `OAuthHandoff`, `ConnectSuccess`, `AutoWatchSheet`.
- `connections-settings.jsx` — `ConnectionsConnected`, `ConnectionsRefreshing`, `DisconnectConfirm`.
- `follow-highlight.jsx` — `AuditStrip`, `EventRowCC`, `HeroCardCC`, `DetailFollowStrip`, `BrowseWithFollows`.
- `spotify-states.jsx` — empty + all failure states + `RevokeBanner`.
- Canonical deps copied verbatim: `ios-frame.jsx`, `design-canvas.jsx`, `tweaks-panel.jsx`, `monetization-shared.jsx`.

---

## Decisions on the "Open for Design" items (★ = my lean)

1. **Brand mark — official Spotify logo asset, via a placeholder slot.** We do **not** redraw Spotify's trademarked logo (their brand guidelines require the official file + exact green; recreating it is off-limits). `SpotifyLogo` is a neutral, clearly-marked placeholder that the official asset drops into at integration, always paired with the plain word "Spotify."
2. **Color — Spotify green pulled back to near-zero ★.** Green is *not* an app accent (it was overwhelming the palette). Our own tokens carry everything: `--signal` for connect actions + status, `--accent` reserved for **Watching a show**, and the follow-artist signal stays **neutral + Spotify-marked**. The only green left lives inside the official logo asset; the `--spotify-green` token is retained solely for that (screens don't paint with it).
3. **Entry points — ship both ★.** Settings ▸ Connections is the durable home; the post-first-watch nudge is the conversion moment. Shared flow, low cost, no nag (nudge single-fires).
4. **Connecting is free.** The taste-informed *highlighting* it powers is the free-tier payoff — no paywall at the door. Premium value (discovery feed / alerts / digest) is a separate upsell, R2.
5. **Auto-watch default = highlight-only ★.** Auto-adding someone's whole Watching list without an explicit yes is too presumptuous. Both choices are equal-weight radios; dismissing resolves to highlight. Reversible forever via the Settings toggle.
6. **Card audit + Follow vs Watch ★.** Rebuilt on the *live* browse row (headline · tour line · venue·time · genre chips), with the eye/**watch button removed from browse** (watch lives on event detail as an outline pill). Crucially, **`--accent` is reserved for Watching a show** — the shipped pill. **Following an *artist*** never uses accent (that was the collision); it's a **neutral, Spotify-marked chip** in the chip row — the small Spotify logo is the disambiguator (a show's Watching never carries it). On event detail, the follow signal is a neutral attribution line beneath the accent Watching pill — secondary, never mimicking it. Hero: `Following` owns the eyebrow slot when the artist is followed. Label is `Following` (was "You follow") to fit the chip row; the fuller recognition sentence lives on the detail strip where there's room. **Watching uses the eye icon** (the heart was retired a while back).
7. **Disconnect ★** — two-step (button → confirm sheet), plain three-line "here's what happens," and explicit reassurance that watched shows survive. Warm, not scary.
8. **Voice** — recognition, never surveillance. "Here's what you told Spotify you love," not "we scanned your account." Failures use the Hybrid empty-state register ("Spotify's not picking up." / "We lost the Spotify thread.").

---

## A11y pass (WCAG AA)
Every section carries an on-canvas `A11Y` note. Cross-cutting: connect/CTA buttons use dark text on `--signal` (AA all themes); all status uses icon/dot **+ text**, never color alone; connect/reconnect targets ≥44px; radios and the auto-watch switch have roles + keyboard nav; failure states lead with a recovery action.

---

# Spotify Sync · Premium Payoff — Track 2 · Round 2

Open **`Spotify Sync R2.html`**. Four Premium-gated surfaces built on R1's connect + recognition spine. All gate on **`premium || founder`** per the R2 brief + entitlements matrix. Supporter stays badge-only.

## What's in R2

| # | Section | Deliverable |
|---|---|---|
| 0 | Live preview | Tweaks-driven surface · tier · theme (all 9) |
| 1 | Taste filter | FilterBar toggle chip (on / off / Free-locked) + upsell sheet |
| 2 | Discovery | "Based on your taste" shelf on Browse + empty + failure |
| 3 | Weekly digest email | 5-show template · zero-week variant · plain-text fallback |
| 4 | Push alerts | iOS + Android lock screens · in-app tray · copy variants |
| 5 | Theme parity | key surfaces across Light / Pulse / Forge / Cedar / Gloss |

## R2 files
- `taste-filter.jsx` — `FollowFilterChip`, `TasteFilterBar`, `TasteFilterScreen`, `TasteUpsellSheet`.
- `discovery-surface.jsx` — `TastePickCard`, `DiscoveryShelf`, `DiscoveryScreen`, `DiscoveryEmpty`, `DiscoveryFailure`.
- `digest-email.jsx` — `DigestEmail` (+ zero-week), `DigestPlainText`.
- `push-alert.jsx` — `CCAppIcon`, `PushBanner`, `LockScreen`, `InAppReceipt`, `PUSH_COPY`.
- Reuses R1's `theme-context`, `spotify-shared`, `follow-highlight` (`EventRowCC`), `monetization-shared`, `ios-frame`, `design-canvas`, `tweaks-panel`.

## R2 decisions (★ = my lean)

1. **Taste filter = a toggle chip leading the existing FilterBar ★.** It's a scope, so it sits before the dimension chips (date/venue/price/genre) with no chevron. **Additive** with the other filters (AND), not a separate mode. Active uses `--signal` (the shipped active-chip color) so it obeys the filter system; the Spotify mark keeps it identifiable. `--accent` stays reserved for Watching.
2. **Free tier sees the filter, locked ★.** Tapping opens the upsell (reuses monetization voice) — natural-moment discovery of the paid perk, matching the hybrid-gating call. Connecting + the free `Following` tag stay free; slicing the whole calendar is the power tool.
3. **Discovery = a section on Browse, not a new tab ★.** A curated "Based on your taste" shelf pinned to the top of Browse — visually distinct (Spotify-marked header, reason chips, richer cards) but in the main flow. Uses richer taste data than follows alone, so reasons vary ("You play them a lot" / "In your top 5" / "Following"). Empty = neutral "quiet month"; failure = warning + Reconnect.
4. **Digest email — inline hex, single palette ★.** Email clients can't read CSS vars, so the digest uses inline hex (electric-derived) — the token rule governs app screens, not email. Table layout, mobile-first, plain-text fallback. Features up to 5 shows + "+N more". **Zero week → still send, but light** (calm note + 2 taste picks) so it never lands blank. **Unsubscribe: per-family first** ("turn off the weekly digest") + global secondary.
5. **Push copy varies by the R1 auto-watch setting ★.** Auto-on states the outcome ("added to your Watching"); highlight-only invites the tap ("want in?"). Recognition voice, never surveillance. v1 can ship push-only; once **#737** lands, the same event drops into the in-app tray (follow-triggered rows carry the Spotify mark so the *why* is explicit).

## R2 A11y
Per-surface `A11Y` notes on the canvas. Highlights: taste chip is `role=button` + `aria-pressed` (locked = `aria-disabled` but still opens the upsell); the scope banner is an `aria-live` update; discovery cards are a labelled list with accessible names = artist + venue + date, reason chips are real read content; digest images need `alt` = artist; push copy front-loads artist/venue/date; unread = dot + bold, never color alone.

## Still deferred
Nothing from the R2 brief is deferred. Downstream, real Spotify logo assets + press photos land at integration; push **delivery** is gated on #737; the in-app tray depends on #737 shipping.
