# Readiness Review — Venue Imagery (#1114)

**Verdict:** 🔴 **Red — approach doesn't hit the visual bar.** Handoff preserved as design-thinking reference; production of the actual venue imagery pivots to human-illustrator commission (see brief §10 amendment).

**Reviewer:** design-track persona (Hugh's call, delegated audit)
**Reviewed:** 2026-07-20
**Brief:** `docs/superpowers/specs/2026-07-19-1114-bespoke-per-venue-imagery-design-brief.md` (amended 2026-07-20 in the same PR as this verdict)
**Handoff files:** this folder

---

## What was submitted

Claude Design produced a **visual system + samples** handoff:

- **Treatment recipe** — 2-ink riso screenprint duotone (federal blue + fluorescent pink on bone paper). Grounded in Concert Crawl's existing riso language (gig-poster, shareable cards). Documented as 5 executable steps.
- **Overlay language** — 8 mark types (wordmark, blob, flourish, burst, cluster trail, medallion, stub tag, hand arrow) with composition rules ("starved" composition: one hero + ≤2 supporting).
- **5 sample venues** rendered against the recipe + overlays, in 3 themes.
- **Safe-zone template**, **fallback pattern**, **artist collaboration brief** as spec sections.
- All customer-facing strings externalized in `VENUE_IMAGERY_COPY`.

The system-level thinking (riso as the treatment, safe-zone composition, overlay grammar, theme-independence, WCAG-compliant palette) is coherent and follows the brief's structural locks (Q1–Q6).

## Why Red

The samples don't hit Hugh's visual quality bar for Concert Crawl.

Specifically:
1. **Facade bases are simple geometric stand-ins**, not real photo → treated output. Design explicitly flagged this in their gap report ("Production runs the recipe on the artist's real photos — filter values are final; inputs are not."). But the effect is that samples read as placeholder-grade, not shippable-grade — and there's no in-handoff evidence the recipe transforms real photos into imagery that would pass Hugh's bar.
2. **Overlay marks are stand-ins**, not final hand-lettering. Design flagged this too. But the stand-ins themselves read as generic AI-drawn shapes; there's no sample of what a skilled human illustrator would produce within the framework.
3. **Broader concern:** Hugh's read on the direction is that *the illustrations he's looking for can't be done by AI.* The framework Design proposed leans on an artist to fill in per-venue signature, but Hugh sees the AI-drawn stand-ins as directionally off — not just missing the finish. That signals the whole "hybrid template + AI-executed stand-in samples" iteration is the wrong intermediate step for this project's visual quality bar.

## What we're doing about it

Per Path A of the triage discussion:

- **Design brief re-scoped in-place** (see §10 amendment in the brief file). Q3 lock changes from "photo base + illustrated overlay (v1); fully illustrated (v2)" to **"artist-commissioned illustration from photo reference, v1 direct."** The AI-assisted iteration is skipped entirely.
- **v2 follow-up ticket (#1128) is superseded** by the amendment (v1 already covers what v2 was scoped for). #1128 to be closed as-superseded when this PR merges.
- **This handoff folder is preserved** as design-thinking reference — the treatment recipe, safe-zone composition, overlay grammar, and fallback pattern all remain defensible ideas that inform (but don't dictate) the artist commission. `VENUE_IMAGERY_COPY` also stays as a copy anchor for the eng plan.
- **Illustrator commissioning playbook** filed at `docs/runbooks/commissioning-illustrators.md` — Hugh drives the artist engagement offline; the ticket parks in 🚦 Paused until the first illustrator's work is in hand.

## Locks-vs-outcome check (for the record)

| # | Brief lock | Honored in handoff? | Notes |
|---|---|---|---|
| Q1 | Hybrid template + per-venue signature (v1); bespoke v2 | Structurally yes — the recipe is the template, overlays are the signature | Amendment supersedes: v1 pivots to bespoke |
| Q2 | Facade / exterior signature | Yes — sample venue selections match | Preserved |
| Q3 | Photo base + illustrated overlay for v1 | Yes as spec, no as sample execution | Amendment supersedes: skip AI iteration |
| Q4 | Theme-independent — one image per venue | Yes — palette envelope proves this | Preserved |
| Q5 | One source per venue + focal-point coordinate | Yes — safe-zone + `focal_x`/`focal_y` documented | Preserved |
| Q6 | System pattern + venue mark for fallback | Yes — theme-aware `FallbackCard` shipped | Preserved |

**The system-level design decisions largely hold; the execution technique (AI-assisted stand-ins) doesn't.** This is a rare case where the framework is defensible but the delivery mechanism was wrong for the quality bar.

## Sequencing after this PR

- #1114 moves to 🚦 Paused, awaiting illustrator engagement
- #1128 (v2 follow-up) closed as superseded by the brief amendment
- No eng-plan work until an artist produces first sample; then a plan PR wires the illustrator's output into the app (venue-table fields, asset storage, fallback rendering)
- Brief amendment is the source of truth for what v1 delivers when the artist's work lands

---

**Verdict rationale:** Red isn't a criticism of Claude Design's execution — the system-level design is coherent within the constraints the brief set. The Red is on the *approach itself* (AI-assisted execution of illustration art at Concert Crawl's visual bar), which Hugh's read correctly identifies as not the right path for this specific product. The pivot to human-commissioned illustration is the right call, and the brief amendment scopes it cleanly.
