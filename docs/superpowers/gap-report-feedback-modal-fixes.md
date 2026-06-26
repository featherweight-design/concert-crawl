# Gap Report — Feedback Modal Fixes (#828, #829, #830)

Bundle of three related defects in the consumer-side feedback modal.
No design handoff exists — these are bug fixes against existing UI, with
copy additions for the new "saved draft restored" affordance.

## Scope

- **#828**: cannot submit multiple feedback items in one session
- **#829**: user notes are cleared when submission errors
- **#830**: "Save and come back" does not persist the in-progress draft

## Root causes (verified in source)

### #828 — Rate limit too aggressive

`apps/api/src/routes/feedback.ts` rate-limits to **1 submission per user
per hour**. Second submission within the window is rejected with 429.
This is far too tight for a beta channel where a single user routinely
files multiple bugs/ideas back-to-back. Relax to 10 per hour per user.

### #829 — Error retry wipes user input

`ErrorState.primaryAction` in `FeedbackModal.tsx` is wired to `onReset`,
which clears `category`, `message`, `screenshot`, and the error flags
before returning to the form. The error body copy claims inputs are
preserved — but the code destroys them. Wire a new `returnToForm`
handler that only sets `state='form'` so all inputs survive.

### #830 — "Save and come back" doesn't save

`ErrorState.secondaryAction` is wired to `onClose` → `handleClose` →
`setTimeout(reset, 300)`. Closes the modal and wipes the draft. Add
localStorage-backed draft persistence: save on "Save and come back",
restore on open (with a discard affordance), clear on successful submit.

## IMPLEMENTED

- **#828 fix** — relaxed rate limit from `1/hour` to `10/hour` per user
  in `apps/api/src/routes/feedback.ts`; updated integration test
  `feedback.integration.test.ts` to cover the new limit (10 OK, 11th
  rejected with 429); separate regression test asserts 2nd submission
  in the same hour succeeds.
- **#829 fix** — added `returnToForm` handler in `FeedbackModal.tsx`
  that sets `state='form'` without touching inputs; `ErrorState`
  primary action wired to it instead of `reset`. Component test asserts
  message + category survive across simulated error → retry.
- **#830 fix** — added `saveDraft` + `loadDraft` + `clearDraft` helpers
  in `lib/feedback-draft.ts` with SSR-safe `typeof window` guard,
  72-hour TTL, JSON Zod parse for integrity. On `open` going false→true
  the modal hydrates from a saved draft, shows a "Saved draft restored"
  banner with a "Discard draft" button. On "Save and come back" the
  current form state is persisted then modal closes. On successful
  submit and on explicit "Discard draft" the localStorage entry is
  cleared. Component tests cover all three transitions.
- **Copy** — added `feedback.modal.draftBanner.{message,discardLabel,
discardAriaLabel}` to `apps/web/src/components/consumer/definitions/
copy.ts`. No hardcoded strings introduced.
- **Regression coverage** — `feedback.integration.test.ts` extended,
  `FeedbackModal.test.tsx` extended.

## GAPS

None remaining.

## DEFERRED

None.
