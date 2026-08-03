# Gate 5 — Journey lifecycle: #72 Shareable Cards

Run 2026-08-03, after PR-2 (#1356) merged and the share journey became reachable
end to end. Walked on staging (`concert-crawl-web-staging`) as the seeded audit
user, plus the local dev server for the forced-failure passes.

Journey under test: **open a show → share it → the recipient lands on the public
mirror.**

## Pass 1 — Forward

| Step                                     | Observed                                                                                                                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/events/7324584c-…` → "Share this show" | Sheet opens, focus lands on the first control, Escape and backdrop both dismiss.                                                                                                                 |
| Poster preview renders                   | ✅ renders, but **slowly** — see the latency measurement below.                                                                                                                                  |
| Shape picker Story / Square / Wide       | Each repoints the preview and the "Save image" href to the matching `/share/:id/:ratio`.                                                                                                         |
| Copy link                                | Writes `https://…/e/:id`; "Link copied" announced politely.                                                                                                                                      |
| Save image                               | Downloads `snakebite-revival-bluebird-theater.png`.                                                                                                                                              |
| System share                             | Hidden in the capture environment — `canSystemShare` feature-detects `navigator.share`, which headless Chromium on macOS does not implement. Not a bug; noted so the screenshots aren't misread. |
| Paste the link, signed in                | `/e/:id` redirects to `/events/:id` (PR-0 Task 2).                                                                                                                                               |

**Latency, measured against staging with an authenticated request:**

| Ratio  | Status        | Bytes  | Time    |
| ------ | ------------- | ------ | ------- |
| story  | 200 image/png | 581848 | 6804 ms |
| square | 200 image/png | 345894 | 3332 ms |
| link   | 200 image/png | 202230 | 2657 ms |

This is the headline finding. The preview had **no loading state and no error
state**, so 2.7–6.8 s of blank box is what a user actually sees, and a failed
render showed a broken-image glyph and nothing else. Fixed in this PR.

## Pass 2 — Reverse

Every commit the journey makes was undone: sheet closed mid-flow, shape switched
back, sheet reopened.

**Honest finding: there is almost nothing to reverse.** The journey writes no
server state and no client persistence. Confirmed by reading `ShareSheet.tsx` —
no `localStorage`, no `sessionStorage`, no dismissal key, no mutation. The only
resettable state is the transient status line, and it is already cleared on
close (so a stale "Link copied" cannot reappear on reopen). Recorded as a true
negative rather than padded with manufactured findings.

## Pass 3 — Repeat

do → undo → redo, twice through:

- Open → share → close → reopen: **this is where the walk was wrong.** The first
  draft of this document asserted the sheet returns to `story` with a clean
  status line. It did not. `ShareButton` renders `ShareSheet` unconditionally
  and only toggles `open`, so the component never unmounts and every piece of
  its state outlives a close. Only `status` was being reset; `ratio` and the
  settled-preview record were not. A user who picked Square, closed, and
  reopened got Square, and a preview that had failed showed its failure message
  before the retry it was describing had started. Now all three reset together.
  Recorded plainly because the claim was made from reading the close handler
  rather than from actually reopening the sheet — which is the exact failure
  mode this pass exists to catch.
- Switch shape → share → switch back → share again: each render is re-fetched
  under its own URL.
- **Keyed-state audit** (the #70 `eventId`-vs-`userEventId` class): there are no
  keys. No "seen" markers, one-time banners, tours or flags exist in this
  journey, so there is nothing that can outlive the thing it describes.
- The one repeat-sensitive defect found: a settled poster stayed visible while
  the _next_ shape was still drawing, so the previous shape's image briefly read
  as the new selection. Fixed by tracking which URL settled rather than a
  tri-state flag.

## Pass 4 — Resume

- Reload with the sheet open: the sheet is component state, so it closes. The
  page underneath restores correctly and the journey is re-enterable in one tap.
  Acceptable — a share sheet is not a multi-step flow with progress to lose.
- Second session / second device: nothing to sync; the poster URL is
  content-addressed and reproduces byte-for-byte from any session.
- Link pasted into a fresh session: covered in Pass 1 (signed-in redirect). The
  **signed-out** shape of `/e/:id` is not yet verified — it needs
  `NEXT_PUBLIC_PUBLIC_BROWSE=true`, and pre-launch an anonymous visitor is
  bounced to the invite gate. Tracked as a follow-up issue and owed before the
  epic closes.

## Cross-cutting defect found by the cold-eyes pass

The persistent feedback edge tab (`FeedbackEdgeTab`, `zIndex: 80`) drew over the
open sheet at 320 px and clipped the last shape button. Root cause was
`BottomSheet`'s container at `z-50` — **below** the tab. Fixed at the class
level: the sheet now sits at `z-[90]`, the same band as `ModalShell`'s scrim
(90) and beneath its panel (100). This was never share-specific; the tab drew
over all three `BottomSheet` consumers — `ShareSheet`, `PostWatchSheet` and
`IosHowToSheet`.

Swept the same three for the reopen bug above: `PostWatchSheet` and
`IosHowToSheet` hold no state at all, so `ShareSheet` was the only instance.

## Not fixed here

- `BottomSheet` has no visible close control (backdrop + Escape only). Real, but
  it is shared infrastructure used well beyond this epic, so it is an issue
  rather than a mid-epic change.
- The signed-out `/e/:id` shape, per Pass 4.
