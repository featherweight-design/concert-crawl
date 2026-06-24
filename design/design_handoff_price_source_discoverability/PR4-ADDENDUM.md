# PR 4 — Addendum: three open consumer-UI states

Concert Crawl · price-source discoverability · 2026-06-24
Visual version (with mocks): **`PR4 Addendum - 3 open states.html`**

No changes to the shipped handoff. Each answer is a net-new variant of an existing shape — same gold/coral/azure tier vocabulary, same tokens, no new typefaces or tier colors, no shipped asset touched.

---

## Q1 — sold out · no resale · no primary · no box office

**Verdict: Path A (render it), but it stops being a FaceValueCard — it degrades to a contribution prompt.**

Go with eng's default. Be honest about what's left, though: with no resale row to anchor against, the *resale ≠ face value* lesson genuinely collapses. What survives is the contribution half — and that half is still worth showing, because the alternative is the dead-end the whole project exists to kill.

Concretely, the card degrades from "teach the distinction" to "make the gap legible and fill it":
- **Drop** the resale row, the comparison headline, and the outbound `ProvenanceCTA` (there's no link to point at).
- **Keep** one ghost box-office row (the signature "concretize the missing number" move) + the `--signal` CTA.
- **Reword**, deadpan + short: *"No price to show — yet. Sold out, nothing listed. Know the box-office number? Add it."*

Visually it's the same card minus one row, so the family read holds. Status reporter stays underneath, unchanged. (Mock in the HTML — degraded card, standalone + in context.)

---

## Q2 — browse card · cheapest tier is resale-only

**Verdict: Path A, sharpened — a coral resale chip that ALWAYS carries an explicit "resale" tag. Never bare, never hidden.**

`MT_ListChip kind='resale'` → coral dot + `from $X` + a small mono **resale** tag. The tag is non-negotiable: color alone is too quiet to decode at scan speed, and a bare "$85" is exactly the laundering-as-face-value we're fighting. The tag is what makes it honest.

- Rejected **B (hide)**: when a show is resale-only, resale *is* the cost to get in — that number is precisely what the scanning fan needs to decide whether to tap. Hiding starves the decision and reads as broken/missing data.
- Rejected **C ("no face value yet")**: withholds the one actionable number we actually have, for the same reason.

The detail page already shows the resale number framed as resale (coral caption + FaceValueCard); the browse chip is just the smallest honest version of that same treatment. Tap-through lands on detail, where the full distinction gets taught. (Mock: the three chip variants + a browse list.)

---

## Q3 — counter (dispute) pending · dispute affordance suppressed

**Verdict: Path B, kept weightless — replace the suppressed link in the same footer slot with a quiet pointer to the live counter.**

Go one notch past eng's default. In the slot the "Saw a different number?" link already owned, swap in the text **"Someone's contesting this — see the counter"** followed by a separate 11×11 arrow SVG (the arrow is presentational chrome, not part of the copy string — same pattern as other navigation links in this handoff). Color: mono, strict coral `oklch(0.65 0.20 25)` — *not* muted; the pointer is a coral signal, deliberately distinct from the original `--fg-subtle` dispute link. Net-new chrome = zero; it's a copy swap.

Why not silent (A): it leaves two problems — the fan who reaches for the dispute link out of muscle memory finds nothing (reads as broken), and the relationship between the original price and the adjacent counter stays invisible (adjacency alone doesn't say "these two are arguing about the same number"). The pointer fixes both: it explains *why* the dispute form is unavailable (someone already filed one — the locked "don't let them submit a doomed contest" rule), and it routes more eyes onto the pending counter, which is what drives the 1/2 resolution faster.

`Confirm price` stays put — only the escape-hatch link swaps. Copy owned here is one self-contained line. (Mock: footer before/after + the full parent→counter relationship.)

---

### Recap (build against this)

| Q | Direction |
|---|---|
| **Q1** | Render the card, degraded — single ghost box-office row + CTA, no resale row, no outbound CTA, reworded headline. Status reporter unchanged. |
| **Q2** | Coral `MT_ListChip kind='resale'`, "from $X" + an always-present "resale" tag. Never bare, never hidden. Tap → detail teaches the rest. |
| **Q3** | Replace the suppressed dispute link, in the same footer slot, with a quiet pointer to the live counter. `Confirm price` stays. One line of copy. |
