# Readiness Review — 404 page

**Verdict:** 🟡 Yellow
**Audited:** 2026-06-23
**Auditor:** Claude (autonomous Readiness Review)
**Related ticket(s):** #68 (`404 page` — `type: polish, source: internal, phase: beta, priority: normal`). Slated for Beta wk 2 (Jun 23–29) per `docs/superpowers/progress.md` line 169 and `2026-05-09-beta-to-launch-design.md` line 121.
**Plan PR target:** TBD (`docs/superpowers/plans/404-page.md` — next step)

## Summary

Handoff is unusually thorough and ready to plan against. README states scope, non-goals, exact token map, type system, three flavors with route-level guidance, a11y rules, and three explicit open questions. The JSX prototypes (`not-found-screen.jsx`, `not-found-canvas.jsx`) are buildable references that already use `var(--*)` tokens that exist in `apps/web/src/theme/themes.ts`. The two non-trivial engineering items the handoff itself flags as open questions — (a) how to source `attemptedPath` on App Router and (b) whether to ship a soft-404 variant for unknown event slugs — are decisions eng can make in the plan PR without going back to Design. One drift item worth raising in plan-PR review: middleware does not currently inject `x-pathname`, so the plan must either add that or pick a different source. Overall: greenlight the plan PR with the clarifications enumerated below.

## Per-dimension findings

### 🗺️ Scope clarity
- [✅] Surface boundary is explicit: a single full-bleed screen mounted at `apps/web/src/app/not-found.tsx`, no `AppBar` / `FilterBar` / bottom nav.
- [✅] Three flavors (`show` / `generic` / `display`) defined with explicit route-level guidance; `display` is reserved and flagged "flag for product discussion before shipping."
- [✅] Non-goals are stated clearly under "Out of scope": soft-404 for unrecognised event slugs, 5xx / maintenance pages, auth-aware variants.
- [✅] Open questions section enumerates exactly three items — none are blockers.

### 🎭 State coverage
- [✅] Mobile + desktop parity is documented in the "At a glance" table; both breakpoints share the same `<NFContent>` so copy and layout-token changes propagate. Per `feedback_mobile_desktop_parity.md`, parity is required and present.
- [✅] Theme coverage: Electric / Jade / Light all rendered in the canvas; tokens used (`--scrim`, `--fg-on-accent`, `--fg-muted`, `--fg-subtle`, etc.) all exist in `apps/web/src/theme/themes.ts` (verified).
- [✅] Flavor coverage: three flavors with distinct copy + poster meta; the `NF_FLAVORS` lookup in `not-found-screen.jsx` is the canonical source.
- [🟡] No explicit "loading" or "error" state — but the surface is itself an error state served statically; no fetch occurs. Documenting that intent in the plan PR is sufficient.
- [🟡] No designed behaviour for very long `attemptedPath` strings beyond `wordBreak: "break-all"` in the prototype. A 2KB pasted URL would still render but stretch the mono footer. Worth a length cap or truncation policy in the plan PR.

### 🔌 Data contract
- [✅] Component is purely presentational; the only inputs are `posterName` (string), `attemptedPath` (string), `themeKey` (`"electric" | "jade" | "light"`), `flavor` (`"show" | "generic" | "display"`), `chrome` (`"mobile" | "desktop"`). All trivially typeable.
- [✅] No backend / schema work required. `IdentityArt` already exists at `apps/web/src/components/consumer/identity-art/IdentityArt.tsx` with `identityFor`, `ia_isDark` exports — matches the API the prototypes call against `window`.
- [🟡] `attemptedPath` source on App Router is unresolved. Middleware (`apps/web/src/middleware.ts`) does not currently inject `x-pathname` or `x-invoke-path`. The plan PR must either (a) add a middleware header pass-through, (b) read from `headers()` if Next.js exposes the requested path natively, or (c) ship a `"/"` fallback for v1. Handoff Open Question #1 explicitly defers this to eng.

### 🧱 Codebase fit
- [✅] All visual tokens used (`--bg`, `--fg`, `--fg-muted`, `--fg-subtle`, `--accent`, `--signal`, `--border`, `--scrim`, `--fg-on-accent`) exist in every theme in `themes.ts`. Verified.
- [✅] Reuses existing `IdentityArt` engine (single source of truth `apps/web/src/components/consumer/identity-art/IdentityArt.tsx`) and the canonical `CCMark` lockup (`apps/web/src/components/brand/cc-mark/CCMark.tsx`) — handoff calls this out explicitly: "import IdentityArt from its single source of truth — don't ship the local copy."
- [✅] Status rail anatomy references `<EmptyState variant="hybrid">` which is real (`apps/web/src/components/consumer/empty-state/EmptyState.tsx`). Plan PR should verify the rail's exact dot/rule/code styling against the live `EmptyState` for parity rather than re-derive from the JSX prototype.
- [🟡] Copy strings (eyebrow, headline, body, CTA label, "You tried", "tonight · 8pm", "Cancelled") are hardcoded inline in the prototype JSX. Per `feedback_definitions_copy_rule.md` they must move to a `definitions/copy.ts` (likely `apps/web/src/app/_components/not-found/definitions/copy.ts` or similar). Plan PR to specify.
- [🟡] Wordmark in the prototype uses inline `<span style={…}>` rather than the shared wordmark component. Codebase pattern is `CCMark` + a sibling wordmark consumed via `AppHeader`. Plan PR should reuse the existing wordmark rather than re-implementing inline.
- [✅] Arrow-function components, no single-char variables, semantic HTML (`<h1>`, real `<a href>`) all line up with conventions.

### ♿ Cross-cutting
- [✅] A11y rules are explicit and correct: one `<h1>`, status rail is decorative (no heading), CTA is a real `<a href>` (works without JS, middle-click, cmd-click), poster has no `alt` needed, WCAG AA verified across themes.
- [✅] Performance: no client-side fetches, no images beyond IdentityArt (which is SVG/canvas). Fine.
- [🟡] Telemetry guidance is "no granular event tracking; Sentry breadcrumb if you want the attempted-path in error reports." Sentry is wired (`apps/web/sentry.{client,server,edge}.config.ts`). Plan PR should make a concrete call: either ship the Sentry breadcrumb in v1 or document the deferral.
- [🟡] HTTP status: handoff says "respond `200 OK` (Next.js soft 404) for client routing and `404 Not Found` for direct hits. Standard `not-found.tsx` behaviour — nothing custom needed." That is correct for App Router `not-found.tsx`. Plan PR should add a smoke / unit test asserting the route returns 404 on direct fetch.

### ⏰ Drift from reality
- [✅] Handoff was authored against the current 3-theme system (Electric / Jade / Light) per `theme-context.jsx` mention; current `themes.ts` has six themes registered but the three named in the handoff are all present and use the same token keys. No drift on tokens.
- [✅] `IdentityArt` API the prototype calls (`identityFor`, `ia_isDark`, `IdentityArt`, `showInitials={false}`) matches the current implementation in `apps/web/src/components/consumer/identity-art/IdentityArt.tsx`. Verified via export grep.
- [✅] `EmptyState` is the current pattern source; component exists.
- [🟠] Middleware does not currently inject `x-pathname`. Handoff suggests `headers().get('x-invoke-path')` as one option but that header is Next.js-internal and not guaranteed across versions. Eng-side decision required in plan PR (covered under Data contract above).
- [✅] No existing `not-found.tsx` in `apps/web/src/app/` (only `(protected)/error.tsx` and `(protected)/admin/error.tsx`). Clean slate — no merge conflict with existing surface.

### 📝 Decision log
- [✅] README locks: no router-back affordance, single CTA to `/`, no "Report this" affordance in v1, poster is theme-independent by design, `posterName="404"` is the ship default.
- [✅] Tentative items called out as tentative: poster name rotation (curated list provided but default is the single seed), `display` flavor reserved for product discussion.
- [✅] Out-of-scope list is explicit (soft-404 for event slugs, 5xx/maintenance, auth-aware variants).

## Eng-side clarifications (Yellow)

Plan PR resolves these without re-engaging Design:

1. **`attemptedPath` source.** Pick one of: (a) add `x-pathname` injection in `apps/web/src/middleware.ts` and read via `headers()`, (b) accept a `"/"` fallback for v1 and only show the "You tried" footer when the path is known. Recommend (a) — middleware addition is one line and the footer is brand-significant.
2. **Copy externalization.** Create a `definitions/copy.ts` for the not-found surface and move all string literals (flavor copy table, "You tried", "Cancelled", "tonight · 8pm", CTA label, eyebrow text). Per `feedback_definitions_copy_rule.md`.
3. **Wordmark component reuse.** Use the shared `CCMark` + the existing wordmark from `AppHeader` rather than the inline `NFWordmark` in the prototype.
4. **`attemptedPath` length policy.** Cap display length (e.g. truncate with ellipsis after ~120 chars) so a pasted-URL outlier doesn't blow up the mono footer height.
5. **Telemetry call.** Decide: Sentry breadcrumb with `{ attemptedPath }` on render — yes for v1 or deferred. Either is defensible; document the choice.
6. **Soft-404 for event slugs (handoff Open Question #2).** Plan PR should explicitly defer this to a follow-up ticket. Default behaviour: unknown event slugs hit the same global `not-found.tsx` with `flavor="show"`. A dedicated `apps/web/src/app/events/[slug]/not-found.tsx` with richer "we couldn't find that show — try these artists/venues" content is a separate Track 2 design ticket.
7. **Poster rotation (handoff Open Question #3).** Plan PR should lock the deterministic `posterName="404"` default and skip the rotation list for v1. Easy to revisit.
8. **Smoke test.** Add a Playwright smoke that fetches `/this-definitely-does-not-exist` and asserts (a) HTTP 404, (b) `<h1>` text matches the `show` flavor, (c) wordmark + CTA render.
9. **`flavor` selection at route mount.** Handoff shows per-route mounts (e.g. `apps/web/src/app/shows/[slug]/not-found.tsx`). Plan PR should enumerate which segments get bespoke `not-found.tsx` files (likely `/events/[slug]`, `/artists/[slug]`, `/venues/[slug]` → `flavor="show"`) versus the global root → `flavor="generic"`. Note tension with Open Question #2: a `not-found.tsx` per segment IS the soft-404 mechanism if we choose to scope it minimally.

## Decisions inherited

Plan PR must respect these locked decisions from the handoff README:

- Single CTA only — `Browse tonight's shows → /`. No secondary CTA, no router-back link, no search box.
- Poster is theme-independent. `IdentityArt` palette is hashed from `posterName`, not retinted by the active theme. Do not override.
- One `<h1>` per page (the headline). Status rail stays decorative.
- CTA is a real `<a href="/">` — not a `<button>`, not a router-only handler.
- No "Report this" affordance in v1.
- Three flavors only; `display` flavor reserved (do not ship without product sign-off).
- Default ship is `posterName="404"`, `flavor="show"` at event-shaped routes, `flavor="generic"` at the global catch-all.
- Use existing `IdentityArt` and `CCMark` — do not ship the local copies bundled in the handoff folder.
- All tokens used must come from the existing token set; no new tokens proposed or required.
- Inter (UI) + JetBrains Mono (metadata), per CLAUDE.md and the type-system table.
