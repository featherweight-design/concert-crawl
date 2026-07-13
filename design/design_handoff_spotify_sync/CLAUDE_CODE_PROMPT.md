# Claude Code handoff prompt — Spotify Sync (R1 + R2)

> Paste everything in the code block below to Claude Code to kick off implementation.
> It points at this folder and locks the non-negotiable design constraints.

```
Context: Concert Crawl (private-beta concert-discovery app for Denver). We're
implementing the Spotify Sync feature. Design is complete and lives as HTML/JSX
prototypes in design/design_handoff_spotify_sync/ — READ THAT FOLDER'S README.md
FIRST, then the .jsx files. These are design references (React-in-browser mocks),
NOT production code — reimplement them in our real app stack, matching layout,
copy, and behavior exactly.

The feature ships in two rounds, audited together:
- R1 "connect chapter" (Free): entry points (Settings ▸ Connections + a one-time
  post-first-watch nudge), OAuth honesty-rail handoff, connect success, the
  one-time auto-watch opt-in, connected settings (refresh / disconnect), the
  "Following" treatment on browse/hero/detail, and all empty + failure states.
  Canvas: "Spotify Sync Connect.html".
- R2 "premium payoff" (paid): the taste filter chip on the FilterBar, a
  "Based on your taste" discovery shelf on Browse, the weekly digest email, and
  new-show push alerts. Canvas: "Spotify Sync R2.html".

Build against these HARD design constraints (all enforced in the mocks):
- Token-only theming across all 9 themes. Every color reads from CSS vars
  (var(--bg), --fg, --signal, --accent, etc.) defined in theme-context.jsx.
  No raw hex in screen code. EXCEPTION: the digest email uses inline hex (email
  clients can't read CSS vars) — that's intentional.
- Color semantics are load-bearing: --accent = "Watching a show" (existing pill,
  don't touch). --signal = connect actions / status / CTAs / active filter chip.
  The "follow an artist" signal is a NEUTRAL, Spotify-marked chip — never accent.
- Spotify green appears ONLY inside the official Spotify logo asset. Do NOT paint
  UI with green. The mocks use a neutral placeholder (SpotifyLogo) — replace it
  with Spotify's official brand-guideline logo asset (their SVG, their green,
  correct clear-space). Never recreate the logo by hand.
- Voice: warm/permissive ("Sour Patch"), recognition never surveillance — e.g.
  "here's what you told Spotify you love", never "we saw you listen to…". Keep
  copy terse (no over-explaining). All customer-facing strings externalize to
  apps/web/src/components/consumer/**/definitions/copy.ts.
- WCAG AA: status never rides on color alone (icon/dot + text); 44px min targets;
  toggles/radios have roles + keyboard nav + aria-pressed/aria-live where noted.
  Per-surface A11Y notes are on each canvas — honor them.
- Mobile 320px baseline → desktop. Visual differences fine; behavioral asymmetry
  is not.

Integration TODOs / dependencies:
- Spotify OAuth: read-only scope (top + followed artists). We never see the
  password (honesty rail copy depends on this being true). Store token per user;
  weekly background refresh; disconnect wipes the token + taste match immediately.
- Gating: R2's four surfaces gate on subscription_tier `premium || founder`.
  Supporter stays badge-only (per the entitlements matrix). Connecting Spotify +
  the free "Following" tag stay FREE; the filter/discovery/digest/push are the paid
  payoff. Free (and Supporter) see the taste filter locked → upsell (reuse existing paywall).
- Push alerts: DELIVERY is gated on #737 (consumer notification UI). Copy +
  lock-screen rendering are ready; the in-app notifications tray also depends on
  #737. Ship push-only for v1 if #737 lags.
- Auto-watch setting (R1) drives push copy variants (auto-on vs highlight-only) —
  keep them wired to the same preference.

Start by reading design_handoff_spotify_sync/README.md, then ask me anything
ambiguous before writing code.
```
