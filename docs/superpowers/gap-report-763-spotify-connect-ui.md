# Design Review Gap Report — #763 Spotify Connect UI (PR 5)

**Property table:** `docs/superpowers/design-tables/763-spotify-connect-ui.md`
**Design sources:** `design/design_handoff_spotify_sync/{connect-flow,connections-settings,spotify-states,spotify-shared}.jsx`
**Verdict: PASS — 0 gaps remaining** (Agent 2: 4 Minor / 0 Blocking; all fixed and confirmed by Agent 3)

## Agent 2 findings → resolutions

| #   | Finding (severity)                                                                                               | Resolution                                                                                                                                                                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Broken-state secondary CTAs ("Not now" / "Leave it unlinked") not rendered in Settings broken states (Minor)     | `ConnectionsPanel.tsx` BrokenState now renders the `TextButton` secondary; clicking collapses the full state card to the handoff's compact in-settings banner variant (`SpotifyStatusBanner`). Two new tests cover both collapse paths. |
| 2   | `SignalButton` vertical padding 13px vs ConnectButton spec 14px (Minor)                                          | md padding now follows the handoff's two lg variants: logo-bearing ConnectButton = `14px 18px`, plain no-logo SignalButton = `13px 18px` (`spotify-shared.jsx`).                                                                        |
| 3   | `FirstWatchNudge` buttons used full-size atoms instead of the sm spec (9px 14px / 13px font / 16px logo) (Minor) | `SignalButton` and `TextButton` gained a `size="sm"` variant matching the spec; `FirstWatchNudge` uses it. Only sm consumer, verified by call-site sweep.                                                                               |
| 4   | Mobile settings omitted the Connections `sectionSub` copy (desktop-only) (Minor)                                 | `SettingsRoute.tsx` now renders `SPOTIFY_COPY.connectEntry.sectionSub` under the section label — copy parity with desktop.                                                                                                              |

## State reachability (Agent 2, Pass 2)

All 14 states in the coverage table are reachable and traced to real triggers: connection statuses (`disconnected`/`connected`/`error`/`revoked`) from `GET /v1/spotify/connection` with `error`/`revoked` written by the sync engine; return-flow branches on `spotify=return` + Denver match counts; auto-watch backfill via the `spotify_alert_log` ledger; nudge single-fire enforced server-side (`spotifyNudgeSeenAt`).

## Accepted deviations (documented)

Denver-match payload extension; `connectPending` copy addition; nudge as fixed card via layout-level gate (mock's inline placement unavailable); `NoAnswerGlyph` extracted to shared glyphs; `chipHue` hash for artist chips; settings query-error treated as disconnected (safe/idempotent connect); `#0A0A0A` on-accent values rendered as `var(--fg-on-accent)` (theme-correct equivalent).
