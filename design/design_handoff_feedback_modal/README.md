# Feedback Modal — Concert Crawl beta

In-app feedback surface. Pre-beta. Routes to Hugh.

## Files

- `Feedback Modal Canvas.html` — design canvas (entry points + states + theme parity)
- `feedback-modal.jsx` — `<FeedbackSurface variant state/>` component covering all states
- `feedback-entry-points.jsx` — `<MiniBrowse variant="A|B|C"/>` host scenes for the entry-point exploration
- `theme-context.jsx` / `ios-frame.jsx` / `design-canvas.jsx` — local copies of project primitives

## Entry point — DECIDED: A · Floating accent pill ✅

**Beta-only surface.** Doubles as a `BETA` status indicator so it doesn't read as a marketing CTA. After beta, feedback moves into the user settings menu (see `design_handoff_user_menu/` for the menu pattern that will receive it).

Other variants explored (rejected for the beta window):

- B · Edge tab — too quiet for the discovery we need pre-beta
- C · Menu row + screenshot FAB — pattern lives on, but the menu surface itself is the post-beta home; pre-beta we want the pill's discoverability

## Form contract

- **category** (chips, single-select, REQUIRED) — Bug · Idea · Praise · Other
- **body** (textarea, REQUIRED) — no length cap shown
- **screenshot** (optional, preferred) — single attach, dashed slot
- **auto-context** — silently captures `route`, `theme`, `build`, `device`, `user`. Surfaced via collapsible "what we'll send" disclosure for transparency.

Severity / urgency are determined on Hugh's end, not user-submitted. Email is not collected — Clerk already has it.

## States covered

`form` · `filled` · `validate` · `loading` · `success` · `error` · `offline`

Success and error use the empty-state Hybrid pattern, voice-matched to onboarding step 5 ("Loud and clear." / "Signal lost.").

## Layout

- **Mobile** — bottom sheet, ~85% viewport (62% on success/error). Drag handle, header rail, sticky submit footer.
- **Desktop** — 520-wide centered card, scrim + blur. Right-aligned Cancel + Send footer.

## Voice locked

- Headline: "Holler at us."
- Sub: "Bug, idea, or praise. We read all of it — usually within a couple days."
- Validation: "Pick a vibe so we know how to read this." / "Don't leave us hanging — give us a sentence."
- Success: "Loud and clear."
- Error: "Signal lost."
- Offline: "We'll send when you're back."

## Out of scope (per founder)

- No `hugh@concertcrawl.app` email affordance
- No FAQ / help center / "Was this helpful?" links
- No user-facing severity selector
- No email field (Clerk has it)
