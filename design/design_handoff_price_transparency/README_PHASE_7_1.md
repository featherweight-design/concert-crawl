# Phase 7.1 — Trust (Resale + Community + Verification) · Engineering Handoff

**Branch context.** Concert Crawl, private beta. Builds directly on Phase 7. Same files, same components — Phase 7.1 _adds_ trust chrome on top of the existing `PriceBlockC` and `PriceChip`. Nothing about the Phase 7 contract changes; new fields are additive and optional.

**Canvas:** `design_handoff_phase7_price_transparency/Phase 7.1 Trust Canvas.html`

---

## TL;DR — what to build

Phase 7 assumed every price was a primary listing pulled from the venue. Reality: prices come from three places, and not all of them are equal. Phase 7.1 adds the chrome that tells the user **where the price came from**, **whether anyone has vouched for it**, and **how confident they should be**.

Three new concepts, all additive:

1. **TrustMark** — inline pill next to the headline price. One word, two colors. `RESALE` (warning tint) or `COMMUNITY` (muted neutral). Sets expectations before the user reads the number.
2. **VerifiedStamp** — checkmark + attribution + age. Surfaces when a price has been verified by a user, an admin, or automation. Goes stale at 7 days.
3. **SourceLink (revised)** — demoted to a terse receipt. Just the source/handle, no prefix word. TrustMark already says what kind of source it is.

---

## Guiding principles (carry forward from Phase 7, plus three new ones)

1. **TrustMark sets identity, SourceLink shows the receipt.** Don't conflate them. TrustMark is colorful and visible. SourceLink is the small attribution underneath. They serve different jobs.
2. **Don't fabricate face values.** When we can't pull a face value (presale, fanclub, hidden listing, scrape block), we say so plainly. We never invent one to fill a slot, and we never claim "primary sold out" — that's rarely the actual reason.
3. **Even verifications expire.** A price that was verified 15 days ago is not the same as one verified 2 hours ago. The stamp escalates visually past 7d so the user knows the vouching is dated.

---

## What's new in `price-block.jsx`

| Component                                   | Job                                                                                                                                                        |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TrustMark` (existed in Phase 7, unchanged) | Inline pill. Renders only for `kind === "resale"` or `"community"`. Primary prices get nothing — clean.                                                    |
| `SourceLink` (**revised**)                  | Now drops prefix words. Resale: just `SeatGeek ↗`. Community attributed: just `@hugh`. Community anonymous: italicized `anonymous fan`. Primary unchanged. |
| `VerifiedStamp` (**new**)                   | Checkmark + attribution + relative time. Three compositions based on `verification.by.kind`.                                                               |

Browse-side `PriceChip` already carries the trust tells (small `R` / `C` letters) from Phase 7 — no changes needed.

---

## Data contract — additions

```ts
type Price = {
  …all existing Phase 7 fields…

  // Phase 7.1 additions — all OPTIONAL
  sourceKind?: "primary" | "resale" | "community";  // default: "primary"
  faceKnown?: number;                                // resale only — actual face value when we have it
  submitter?: { handle: string; url: string } | null;  // community only — null = anonymous
  verification?: Verification;                       // any kind can be verified
};

type Verification = {
  by:
    | { kind: "user";  handle: string; url: string }   // peer review — credit given
    | { kind: "admin"; label: string }                  // staff check — e.g. "Concert Crawl staff"
    | { kind: "auto";  label: string };                 // automation — e.g. "checked at venue"
  at: string;  // ISO timestamp of when verification happened
};
```

**All four fields default to undefined.** A primary-listing price with no verification carries none of them and renders exactly like Phase 7 did. The new chrome only activates when there's something to say.

### Verification rendering rules

| `by.kind` | Composition                     | Example                                 |
| --------- | ------------------------------- | --------------------------------------- |
| `user`    | `Verified by {handle} · {when}` | Verified by @amelia · 20h ago           |
| `auto`    | `Verified · {label} · {when}`   | Verified · checked at venue · 2h ago    |
| `admin`   | `Verified · {label} · {when}`   | Verified · Concert Crawl staff · 4h ago |

Note: "by" only attaches to a person. Methods and orgs use `·` so we never write "Verified by checked at venue."

---

## States added to canvas

All on `Phase 7.1 Trust Canvas.html`, each paired with a "Why this works" annotation.

### Resale

| State                 | Demo event                              | Notes                                                                                                                                    |
| --------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Face value known      | Bladee — face $45, resale $120          | `markupVsFace()` returns `+$75`, tinted `--warning`.                                                                                     |
| Face value obstructed | Flo Milli — `faceKnown` omitted         | Copy: _"Face value not published — couldn't pull one from the primary listing."_ No fabricated face, no markup pill, no over-face delta. |
| Verified at venue     | Bladee + `verification.by.kind: "auto"` | `VerifiedStamp` renders in `--success`.                                                                                                  |

### Community

| State                          | Demo event                                                  | Notes                                                                                                                   |
| ------------------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Anonymous · stale · unverified | Mannequin Pussy — 13d old, no submitter, no verification    | `SourceLink` is italicized `anonymous fan`. Sentence keeps the _"not yet verified"_ caveat.                             |
| Attributed · verified by user  | Caroline Polachek — submitted by @hugh, verified by @amelia | `SourceLink` shows `@hugh` (linked). `VerifiedStamp` shows `Verified by @amelia`. Sentence drops the unverified caveat. |
| Verification gone stale        | Caroline + verification.at 15d ago                          | Stamp shifts to `--warning`, copy escalates: _"Verified by @amelia · 15d ago — could be stale."_                        |

---

## Visual / token rules — additions

| Token         | New usage in 7.1                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| `--success`   | `VerifiedStamp` checkmark + label (fresh)                                                             |
| `--warning`   | `TrustMark` resale tint · `VerifiedStamp` (stale, >7d)                                                |
| `--fg-muted`  | `TrustMark` community tint · `VerifiedStamp` separator dots                                           |
| `--fg-subtle` | `SourceLink` (all kinds, demoted from Phase 7's per-kind coloring) · italicized `anonymous fan` label |

**Staleness thresholds:**

- Observation (`StaleStamp`): **24h** — short, prices drift fast.
- Verification (`VerifiedStamp`): **7d** — verification is a stronger statement, but not eternal.

---

## Acceptance checklist

- [ ] Resale events render `<TrustMark kind="resale" />` next to the headline price; SourceLink renders just `{source} ↗` with no "Resale via" prefix
- [ ] Community events render `<TrustMark kind="community" />`; SourceLink renders just the submitter handle (or italicized `anonymous fan`)
- [ ] Resale events with `faceKnown` show face value + markup in `--warning`; events without it show the obstruction copy and no markup
- [ ] Resale events without `faceKnown` **never** invent or guess a face value
- [ ] `VerifiedStamp` renders only when `price.verification` is present
- [ ] User-kind verifications link the handle to the user's profile
- [ ] Auto/admin verifications use `·` separators (no "by")
- [ ] Verifications past 7d shift to `--warning` and append `— could be stale`
- [ ] When verified, the community sentence drops its "not yet verified" caveat
- [ ] Browse `PriceChip` shows the `R` / `C` trust tells (already in Phase 7, no changes)
- [ ] All three themes (Electric / Jade / Light) render correctly

---

## Out of scope

- **Cross-marketplace resale aggregation.** One resale source at a time. Admin picks the canonical.
- **"Verify this price" CTA in the consumer UI.** Verification gets initiated by users elsewhere (admin tool, profile page, or future submitter flow). Phase 7.1 is read-only display.
- **Reputation / trust scores for submitters.** Out of scope. Just credit, no scoring.
- **Multi-verification stacking.** If a price has been verified twice, show the most recent verification only. Don't render a chain.
- **Disputing a price.** Out of scope for 7.1.

---

## Open questions for product

1. **Verification UX entry point.** Where does a user _go_ to verify a submitted price? Admin tool only? In-app tap? Pairs with the future submitter flow.
2. **Verification expiry policy.** 7d is a designer pick. Should it scale with show date — verifications closer to the show staying fresh longer?
3. **Anonymous community submissions.** Do we accept them at all, or require a handle? Current design supports both gracefully.
4. **Auto-verification source labels.** "checked at venue" is the placeholder. What does the actual automation produce — venue name, scrape source, "matched primary listing"?

---

## Files touched in 7.1

```
design_handoff_phase7_price_transparency/
├── Phase 7.1 Trust Canvas.html       ← reviewer canvas (NEW)
├── phase71-canvas.jsx                ← canvas composition (NEW, don't ship)
├── price-block.jsx                   ← +VerifiedStamp · revised SourceLink · revised obstruction copy
├── price-data.jsx                    ← +bladee, floMilli, caroline, mannequin · +verification on caroline
└── README_PHASE_7_1.md               ← this file (NEW)
```

Phase 7 files are unchanged in shape — only `price-block.jsx` and `price-data.jsx` got additive edits. The Phase 7 canvas (`Price Transparency Canvas.html`) still works as-is; nothing was broken to add 7.1.
