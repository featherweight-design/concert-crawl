# Spotify Sync — Design Brief

**Status:** Locked decisions, ready for Design handoff
**Ticket:** [#763](https://github.com/HartiganHM/concert-crawl/issues/763) (`type: design, source: internal, phase: beta, priority: normal`)
**Authored:** 2026-07-11
**Authors:** Hugh Hartigan, Claude (full brainstorm — 7 questions)

**Related:**

- **Monetization vertical** (design ✅ complete; build in flight): #781 tier states, #780 lifecycle, #782 failure/a11y/microcopy, #783 email touchpoints
- **Consumer notification UI gap:** [#737](https://github.com/HartiganHM/concert-crawl/issues/737) — hard sequencing dep for the push-alert Premium feature
- **Profile settings v2:** `design/design_handoff_profile_settings_v2/` — in flight; Spotify connection surfaces in Settings, not on public profile
- **Adjacent social discovery:** [#762](https://github.com/HartiganHM/concert-crawl/issues/762) (Who else is watching) — future territory Spotify data could power if we open up visibility later
- **Beta-to-launch plan:** `docs/superpowers/specs/2026-05-09-beta-to-launch-design.md`

---

## Purpose

This brief locks the pre-Design decisions for a Spotify sync feature that lets Concert Crawl use each user's Spotify taste — followed artists + top artists from listening history — to surface Denver shows they care about. Free tier gets passive taste-informed browsing + an auto-watch shortcut; Premium tier unlocks a richer suite (weekly digest, discovery surface, alerts, filtering).

This is a **design brief**, not an eng spec. OAuth provider path (Clerk vs. direct Spotify SDK), token refresh mechanics, sync-cron infrastructure, rate-limit handling, and Spotify API cost budgeting are eng-owned and land in an implementation plan after Design's hi-fi handoff is audited Green.

## App context

- **Auth:** Clerk. Spotify OAuth is a supported Clerk provider but not enabled in the dashboard today.
- **Watching:** shipped. `user_events.status = 'watching'` per row. Free tier per the locked monetization matrix. Auto-watch will reuse this mechanism — no net-new watching state.
- **Monetization tier system:** `subscription_tier` enum now includes `supporter` + `founder` after PR #878 (execution plan Phase 2.1 merged). Premium-gating a feature is unblocked schema-wise.
- **Notifications:** `notifications` table exists but consumer surfacing is [#737](https://github.com/HartiganHM/concert-crawl/issues/737). Push alerts in this brief are DESIGNED but won't fire until #737 lands.
- **Email:** #783 email touchpoints brief locked 10 templates; Resend infra folded into #775. Weekly digest is a new template family that lives alongside the monetization emails.
- **Profile:** `design/design_handoff_profile_settings_v2/` is in flight. Spotify connection surfaces in Settings only (never public per Q6 lock).
- **Browse card density note (from brainstorm):** the browse card is already dense on mobile. Adding a new "you follow" signal is an opportunity — and an ask — to re-evaluate the whole card's hierarchy, not just tack on another badge.

## What Design will produce from this brief

1. **Connect flow surfaces** — first-run entry point (Settings? profile shelf? bottom-drawer prompt?), Clerk/Spotify OAuth redirect chrome (Spotify branding + our "we never see your password" honesty rail), post-connect success state.
2. **Auto-watch opt-in modal** — fires once, immediately after connect success. Two explicit choices: "Yes, auto-watch matching shows" vs. "Just highlight them (no auto-watch)". Dismissal (X or tap-outside) is treated as equivalent to highlight-only — the connected baseline. Design owns shape + timing + exact copy.
3. **"You follow" highlight treatment** across event surfaces (browse card, hero card, event detail). **Includes the browse card hierarchy audit** — prune, group, or restructure to make room for the new signal without adding noise.
4. **Settings > Connections surface** — connected state (which Spotify account, when last synced, how many artists we're tracking), on-demand "Refresh my taste" button, disconnect action, disconnect confirmation dialog.
5. **Discovery surface (Premium-gated)** — layout for "Denver shows based on your taste." Dedicated tab? Section on browse? Feed on a new tab? Design's call.
6. **Weekly digest email (Premium-gated)** — new template alongside the #783 family. Same email-design conventions (constrained inline palette, table layout, plain-text fallback, mobile-first responsive).
7. **Push alert copy + preview (Premium-gated, pending #737)** — what the notification says when a followed artist announces a Denver show; how it looks on lock screens; in-app receipt.
8. **Taste-informed filter (Premium-gated)** — chip/toggle on FilterBar that limits browse to "shows by artists I follow." Design owns the pattern (chip vs. toggle vs. section header).
9. **Empty state** — user connects but has zero Denver-relevant artists. Copy + affordance.
10. **Failure states** — Spotify down or rate-limited at connect; token refresh fails after inactivity; user revokes externally in Spotify settings; sync fails mid-week.
11. **A11y annotation pass** across every new surface — connect flow, modal, highlights, settings, digest email, filter, alerts. WCAG AA. Screen-reader phrasing for the "you follow" signal (announced as decorative? as list metadata? as trust marker?).
12. **Mobile + desktop parity** everywhere; **all 9 themes** rendered token-only.

## Locked decisions

### 1. Tier gate — Free connection + Premium-gated advanced features

Everyone can connect Spotify. Free users get passive highlighting on browse/detail + the auto-watch opt-in shortcut. Premium users get the rich suite (weekly digest, discovery surface, alerts, filtering).

**Rationale:** Mirrors the locked Watching-is-Free pattern (per #781 R6 amendment) — low DB cost, high user value = free entry. Advanced features become the natural upgrade lever without gating the core value moment (connecting Spotify for the first time is the excited moment; paywalling it kills the vibe). Best of both worlds — conversion story preserved without user-experience regression.

### 2. Free-tier UX — passive highlighting + auto-watch opt-in modal

**Free tier gets:**
- Passive "you follow this artist" signal on browse cards + event detail (Design owns the visual — badge, glyph, color, size)
- One-time opt-in modal at connect with two explicit choices: auto-watch matching shows, OR highlight-only (no auto-watch). Dismissal defaults to highlight-only — the connected baseline is never in doubt. Design owns exact copy + affordance shape.
- Auto-watch (if opted-in) reuses the shipped Watching mechanism — no net-new state, no schema change

**Fallback shape:** if the opt-in modal feels intrusive during handoff iteration, drop it entirely and default to passive-highlighting-only. Auto-watch stays as a Settings toggle instead. Design's call during iteration.

### 3. Premium features — the full rich suite

Premium users get all four:

- **Weekly digest email** — "This week in Denver: 5 shows by artists you follow on Spotify." Uses the #783 template family conventions.
- **Dedicated discovery surface** — "Denver shows based on your taste." Uses richer taste data (top artists from listening history, not just followed) to surface shows the user might miss. Design owns whether this is a tab, a section on browse, or a new feed.
- **Push alerts** — notification when a followed Spotify artist announces a Denver show. **Sequenced behind [#737](https://github.com/HartiganHM/concert-crawl/issues/737).** Design specs the alert; it won't fire until #737 ships.
- **Taste-informed filter** — chip or toggle on FilterBar that scopes browse to "shows by artists I follow."

### 4. Data scope — followed artists + top artists from listening history

Pull two sources from Spotify:

- **Followed artists** (explicit taste signal, transparent, matches user's intentional choices)
- **Top artists from listening history** (~50 top artists over 6 months via Spotify's top-artists endpoint)

**Skipped intentionally:**
- Playlists (messy artist-name mapping from playlist tracks; risks capturing work/exercise playlists that don't reflect concert taste)
- Detailed track-by-track listening history (privacy overreach for beta)
- Saved albums (redundant with top artists)

**Rationale:** Familiar territory for users (Spotify Recap uses the same signals). Rich enough to power discovery + digest without being invasive. If discovery quality is weak post-launch, we revisit scope in a follow-up.

### 5. Sync frequency — weekly background + on-demand refresh

- Background sync runs weekly (cheap on API + our infra)
- Settings surfaces a "Refresh my taste" button for immediate on-demand re-pull
- Alerts + auto-watch may be up to a week stale for newly-followed artists between syncs unless user hits refresh

**Rationale:** Weekly matches most users' taste evolution rate; on-demand gives users control when they've just added new follows or want a fresh state.

### 6. Privacy — internal-only

Spotify connection + data are used to power the user's own experience only. **Never surfaced publicly, no profile footprint, no social features on top of it in v1.** Matches Watching's current pattern.

**If we later want social features** ("X follows Artist Y" or "people who like your artists also like these Denver shows"), that's a separate design cycle with its own opt-in surface — probably adjacent to [#762](https://github.com/HartiganHM/concert-crawl/issues/762) (Who else is watching).

### 7. Disconnect — purge everything

When the user disconnects (or Spotify revokes us externally):

- Delete all Spotify-sourced data (followed artists, top artists, sync metadata, refresh tokens) immediately
- **Auto-watched shows STAY watched** — that's the user's Watching intent, not Spotify's
- Highlighting reverts to nothing across all surfaces
- Premium features that depend on Spotify data (discovery surface, digest, alerts, taste filter) disable gracefully

**Rationale:** Matches internal-only posture. "Disconnect = we forget" is a clean privacy story.

## Technical requirements

- **Responsive:** 320px mobile baseline → desktop. Connect flow + modal + Settings must be usable on the tightest phone width.
- **A11y:** WCAG AA. Keyboard-operable connect flow. Screen-reader phrasing for the "you follow" signal (decision Design owns — decorative, list metadata, or trust marker). Auto-watch modal traps focus, escape closes.
- **Token-only colors** across all 9 themes. New surfaces get token treatments — if a new "connected" accent is needed, it's a token, not a hardcoded hex. Spotify green may appear on brand-fidelity surfaces (e.g., the connect button), but even it must be referenced via a named token (e.g., `--spotify-green` defined once in the token layer), NOT a hardcoded hex value in any component. All adjacent chrome uses our existing tokens.
- **Voice — Sour Patch Kids**, warm-permissive throughout. Never use phrasing that reads as "we're watching what you listen to" — always "here's what you told Spotify you love." The auto-watch modal wants a light, offered-not-imposed tone.
- **Copy** — every string in `apps/web/src/components/consumer/**/definitions/copy.ts` (or a `spotify/definitions/copy.ts` scope). Artist names, Spotify account username, dates, and counts are data. Everything else is copy.
- **Mobile + desktop parity** — visual differences fine, behavioral asymmetry not.
- **Preserves existing surfaces:** the "you follow" signal is additive; it doesn't restructure browse/detail beyond the browse-card audit called out in §2 above. Watching state stays as-is. FilterBar's `filterWhen` control stays as-is.

## What's NOT in this brief

| Concern | Owner |
|---|---|
| OAuth provider path (Clerk vs. direct Spotify SDK) | Eng — decide in the implementation plan |
| Token refresh + expiry handling | Eng — implementation plan |
| Sync cron infrastructure + retry policy | Eng — implementation plan |
| Spotify API rate-limit handling + budget | Eng — implementation plan |
| Push alert delivery mechanism | [#737](https://github.com/HartiganHM/concert-crawl/issues/737) (consumer notification UI gap) — hard sequencing dep |
| Weekly digest email infrastructure | Part of #783 email family + monetization Phase 5 build |
| `subscription_tier` enum expansion for Premium gating | Already merged (PR #878, monetization Phase 2.1) |
| Public profile visibility of Spotify connection | Deferred — internal-only per Q6 lock |
| Social features (who else follows this artist) | Adjacent — [#762](https://github.com/HartiganHM/concert-crawl/issues/762) |
| Playlist syncing or full listening history | Out of scope entirely per Q4 lock |
| Recommendations engine tuning / ML | Out of scope — Design specs the surface, eng picks aggregation logic |

## Decisions inherited

These remain locked from prior work and apply here:

- **Watching is FREE** (per #781 R6 amendment). Auto-watch reuses this — no premium gate on the Watching mechanism itself.
- **Sour Patch Kids voice.** Warm + permissive on connect/modal; formal-leaning is inappropriate here (no tax records).
- **9 themes token-only** — no hardcoded hex anywhere, including Spotify green (defined once as a named token like `--spotify-green` in the token layer; referenced by CSS var, never inline). Adjacent chrome uses existing tokens.
- **Mobile + desktop parity.** Non-negotiable.
- **Definitions / copy.ts.** All customer-facing strings externalized.
- **Grandfather-forever price policy** (per #782). If Premium ships with Spotify features locked at Supporter tier, users who signed up at that price keep those features forever — never re-tiered.

## Open for Design to call

These are decisions Design owns inside the locked frame:

- **Connect flow entry point** — where's the "Connect Spotify" affordance? Settings only? Also a prompt during onboarding? Post-first-watch nudge? Design's call based on where taste-informed value pays off.
- **Auto-watch modal shape + timing + copy** — one-time on connect, or on first browse post-connect? Modal, sheet, inline banner? What are the exact copy options? Design owns.
- **"You follow" visual signal** — badge, glyph, dot, color, size, placement on the card. This is the browse-card-hierarchy question dropped in Design's lap: audit the card first, then decide where the signal belongs.
- **Discovery surface layout** — dedicated tab, section on browse, feed, list? How does it differ visually from the standard browse card grid so it reads as "curated for you"?
- **Weekly digest email design** — hero shape, tone (mirrors welcome_paid family from #783), how many shows to feature, layout for tour name / venue / date. Uses email-only palette (per #783 lock).
- **Push alert copy + lock-screen preview** — what the notification says. Voice = "Big Head Todd just added a show at Fillmore for October — added to your Watching." Design owns exact copy.
- **Taste-informed filter treatment** — chip on FilterBar? Section header? Toggle? How does it read alongside existing filters?
- **Settings > Connections layout** — where the connect button lives; how the "connected" state looks (last-synced timestamp, artist count, refresh button, disconnect); disconnect confirmation dialog copy.
- **Empty state** — "You connected but we don't see any of your Spotify artists coming through Denver soon" — treatment + affordance.
- **Failure states** — Spotify down at connect, token refresh fails, external revoke detection. Each needs a treatment consistent with the app's honesty rail.
- **Highlight persistence during a de-synced state** — if we've lost sync but data hasn't purged yet, does highlighting still show? Design's call on the visual honesty.

## Cross-references

- **Related tickets:** [#763](https://github.com/HartiganHM/concert-crawl/issues/763) (this), [#737](https://github.com/HartiganHM/concert-crawl/issues/737) (notification consumer UI gap), [#762](https://github.com/HartiganHM/concert-crawl/issues/762) (Who else is watching — future social)
- **Sister briefs (monetization vertical):** `docs/superpowers/specs/2026-06-24-monetization-tier-states-entitlements-design.md`, `docs/superpowers/specs/2026-06-25-monetization-lifecycle-design.md`, `docs/superpowers/specs/2026-06-26-monetization-failure-a11y-microcopy-design.md`, `docs/superpowers/specs/2026-06-27-monetization-emails-design.md`
- **Design pipeline workflow:** `docs/superpowers/design-pipeline.md`
- **Beta-to-launch plan:** `docs/superpowers/specs/2026-05-09-beta-to-launch-design.md`
- **Profile-adjacent handoff:** `design/design_handoff_profile_settings_v2/`
- **Watching-adjacent handoff:** built already; Watching pattern reference in `apps/web/src/components/consumer/`
- **Email family (Premium digest sits alongside):** `design/design_handoff_monetization_lifecycle/` (email conventions carry through)
