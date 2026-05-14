# Gap Report — Feedback Edge Tab (UI Update)

## IMPLEMENTED (4)

- `FeedbackEdgeTab` — Variant B edge tab entry point: `position: fixed`, `right: 0`, `top: 44%`, `var(--surface-1)` background, no right border, rounded left corners, accent dot with glow, vertical monospace text "Tell us · beta" matching design spec [apps/web/src/components/consumer/feedback/FeedbackEdgeTab.tsx:6]
- `SubmitButton` — renders "Sending…" label when `loading` is true (third-pass gap) [FeedbackModal.tsx:1099]
- Category chips wrapper — `opacity: disabled ? 0.55 : 1` on the group div so chips dim as a unit during loading (third-pass gap) [FeedbackModal.tsx:253]
- `SecondaryButton` — `borderRadius: 10` restored after `all: 'unset'` (third-pass gap) [FeedbackModal.tsx:1118]

## GAPS (0)

All gaps found across three review passes have been resolved.

## DEFERRED (0)

## Notes

- `FeedbackModal` gaps found in second review pass and fixed: screenshot slot (dashed, non-functional), error state body copy, error secondary button label ("Save and come back"), textarea transition + letterSpacing, desktop footer submit width (200px)
- `FeedbackModal` gaps found in third review pass and fixed: loading button label, chips group opacity, SecondaryButton border-radius
- `FeedbackPill.tsx` and `FeedbackPillGate.tsx` (Variant A, rejected) deleted
- Replaced in barrel export and `(protected)/layout.tsx` with `FeedbackEdgeTab` / `FeedbackEdgeTabGate`
- Design uses `fontFamily: "'JetBrains Mono', monospace"` directly; implementation uses `var(--font-mono)` per project convention — same result
