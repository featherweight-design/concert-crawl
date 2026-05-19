# Submit Price Modal — Design Spec

**Date:** 2026-05-19
**Issues:** #398, #399, #403 + new ModalShell extraction
**Status:** Approved

---

## Background

The submit-price flow currently lives at a dedicated page (`/events/[id]/submit-price`). The feedback form is a modal (mobile bottom sheet + desktop centered card). These issues bring submit-price in line: convert to a modal, align error state with the feedback form pattern, and replace the shield emoji with a proper icon. Because both modals share the same shell structure, we extract a `ModalShell` primitive first.

---

## Architecture

Two trigger sites exist on the event detail page:

1. `SubmitPriceCardCta` — rendered from the RSC event detail page
2. A `<Link>` inside `PriceDisplay` — already a client component

Both become self-contained `'use client'` components that hold `isOpen` state and render `SubmitPriceModal` inline. This is the standard Next.js pattern for modals triggered from RSC trees.

---

## Components

### `ModalShell` (new)

**Location:** `apps/web/src/components/consumer/modal-shell/ModalShell.tsx`

Shared primitive extracted from `FeedbackModal`. Handles all chrome that is identical between modals:

- Scrim with `backdropFilter: blur(4px)` and click-to-close
- Esc key listener
- `isMobile` detection via `matchMedia`
- Mobile: fixed bottom sheet, `borderTopLeftRadius/RightRadius: 22`, drag handle
- Desktop: fixed centered card, `width: 520`, `borderRadius: 16`

**Props:**
```ts
interface ModalShellProps {
  open: boolean
  onClose: () => void
  ariaLabel: string
  header: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  sheetHeight?: 'tall' | 'short' // 85% (form) vs 62% (success/error). Default: 'tall'
}
```

`FeedbackModal` is refactored to use `ModalShell` — no behavior change, identical output.

---

### `SubmitPriceModal` (new)

**Location:** `apps/web/src/components/consumer/submit-price/SubmitPriceModal.tsx`

**Props:**
```ts
interface SubmitPriceModalProps {
  open: boolean
  onClose: () => void
  eventId: string
  artist: string
  venueName: string
  date: string // ISO string
}
```

**State machine:** `'form' | 'submitting' | 'success' | 'error' | 'alreadySubmitted'`

**On open:** a `useEffect` fires when `open` transitions to `true`, sending GET `/v1/events/${eventId}/price-submissions` to check for an existing submission. If found, starts in `alreadySubmitted`; otherwise starts in `form`. A 409 from POST also transitions to `alreadySubmitted`.

**Header:** CCMark + status rail
| State | Eyebrow | Code |
|---|---|---|
| form / submitting | Community prices · open | OPEN |
| success | Got it · submitted | SENT |
| error | Hmm · stalled | ERR |
| alreadySubmitted | Already submitted | DONE |

**Views:**

- **Form view** — fields from `SubmitForm.tsx` (floor, ceiling, tier, vendor, howFound) + anti-abuse banner with `ShieldCheck` icon. Footer: "Submit price" button.
- **SuccessState** — "Got it." heading, "Your price is pending — two more fans confirming it moves it out of pending." body. Buttons: "Back to show" (closes + navigates) + "Submit another" (resets to form).
- **ErrorState** — `StatusRail` ("Hmm · didn't save" / "ERR · 503") + "Didn't go through." heading + "Couldn't reach the server — your inputs are still here. Try again or come back later." body. Buttons: "Try again" (resets to form, **inputs preserved**) + "Close".
- **AlreadySubmitted view** — shows existing price + tier + vendor. "Edit" resets to form. "Withdraw" fires DELETE then re-fetches.

**Sheet height:** `'tall'` for form/submitting, `'short'` for success/error/alreadySubmitted.

---

### `SubmitPriceCardCta` (modified)

Converts from a `<Link href="...">` to a `'use client'` button. Holds `isOpen` state. Renders `SubmitPriceModal` inline.

Additional props needed (passed from event detail page):
- `artist: string`
- `venueName: string`
- `date: string`

---

### `PriceDisplay` (modified)

The `<Link href={/events/${eventId}/submit-price}>` CTA button (line ~911) becomes a `<button>` that sets local `isSubmitOpen` state. Renders `SubmitPriceModal` inline. `PriceDisplay` already has `eventId`; the event `artist`, `venueName`, and `date` are passed down from the event detail page (already available there).

---

## Shield Icon (#399)

In the anti-abuse banner inside the form view:

```tsx
// Before
<span className="text-base">🛡</span>

// After
<ShieldCheck size={14} className="shrink-0 text-fg-muted mt-0.5" />
```

`ShieldCheck` imported from `lucide-react` (already a dependency).

---

## Error State Alignment (#398)

The current inline `<p className="text-xs text-danger">{errorMsg}</p>` is removed. Submission errors transition the modal to a full `ErrorState` view, consistent with `FeedbackModal`. Inputs are preserved in state so "Try again" restores the form exactly as the user left it.

---

## Deletions

- `apps/web/src/app/(protected)/events/[id]/submit-price/` — entire directory removed
- `apps/web/src/components/consumer/SubmitForm.tsx` — logic folded into `SubmitPriceModal`
- `apps/web/src/components/consumer/PriceSubmissionForm.tsx` — older, superseded component; deleted

---

## Testing

- **`ModalShell`** — renders children, calls `onClose` on Esc and scrim click, applies correct sheet height.
- **`SubmitPriceModal`** — state transitions: `form → submitting → success`, `form → submitting → error`, `form → submitting → alreadySubmitted` (409), initial `alreadySubmitted` from lazy fetch. All API calls mocked.
- **`FeedbackModal` regression** — render test confirms refactor produces identical output.
- No new E2E tests needed; existing Playwright suite covers event detail page flow.
