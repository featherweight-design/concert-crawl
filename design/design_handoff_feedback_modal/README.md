# Feedback Modal — Concert Crawl beta

In-app feedback surface. Pre-beta. Routes to Hugh.

## Files

- `Feedback Modal Canvas.html` — design canvas (entry points + states + theme parity)
- `feedback-modal.jsx` — `<FeedbackSurface variant state/>` component covering all states
- `feedback-entry-points.jsx` — `<MiniBrowse variant="A|B|C"/>` host scenes for the entry-point exploration
- `theme-context.jsx` / `ios-frame.jsx` / `design-canvas.jsx` — local copies of project primitives

## Entry point — DECIDED: B · Edge tab ✅

**Beta-only surface.** Vertical monospace tab pinned to the right edge — "TELL US · BETA" — with a small accent dot for status. Reads as a typographic anchor, not a button. Reaches every screen without competing with content.

**Swap from earlier pick:** we originally landed on the floating accent pill (Variant A). In review, the pill read as a marketing CTA and felt too present at the bottom-right of every screen. Edge tab is the quieter omnipresent option we'd already explored — it carries the same `BETA` signal without the visual weight.

Other variants explored (rejected for the beta window):

- A · Floating accent pill — too intrusive; competed with content and read as marketing
- C · Menu row + screenshot FAB — pattern lives on, but the menu surface itself is the post-beta home; pre-beta we want a discoverable on-canvas surface

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
