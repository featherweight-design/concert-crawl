# Price-Source Consumer UI — PR 4 of 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the consumer-side surfaces for the price-source-discoverability + multi-tier-pricing cycle (#641 + #644). Closes the comprehension gap on sold-out / no-price states (resale ≠ face value) and lets fans collapse multi-tier prices to "from $X" with a per-tier breakdown on detail.

**Architecture:** Net-new presentational components live under `apps/web/src/components/consumer/price-region/` — `FaceValueCard`, `ContributeFaceValueCard` (LOCKED §9 Q1 — sibling for sold-out + no-listing), `ProvenanceCTA`, `MTListChip` (includes LOCKED §9 Q2 `kind='resale'` variant), `MTAddTierSuccess`, `MultiSourceMultiTierCard`, `AltSourceRow`, plus a small shared `TierMark` primitive added to `glyphs.tsx`. They are wired through `apps/web/src/components/consumer/EventDetailClient.tsx` (the `EventDetailPriceBlock` orchestrator, ~280–950) by introducing a new branch that consumes `event.priceByTier` and falls back to the legacy branches when `priceByTier == null`. Browse-card price chip parity moves into `apps/web/src/components/consumer/event-card/EventCard.tsx` so `PriceChip` mirrors `pickTierHeadline`'s selection. Submit-form reorder happens in-place in `apps/web/src/components/consumer/submit-price/SubmitPriceModal.tsx` — source-category leads, `howFound` is removed, the `Floor`/`Ceiling` row stays but the floor label switches based on source-category. Submit-success leverages a per-tier `MTAddTierSuccess` callback that re-opens the modal pre-scoped to a picked tier; remaining-tier filtering is driven by client session state (LOCKED §9 Q4-eng). Passive surfaces from #697 — replace the "Saw a different number?" link with a coral counter-pointer when `counterSubmission !== null` (LOCKED §9 Q3 — see property table Appendix A.4), surface "Admin requested more info" pill when `lastAdminActionKind === 'defer'` — happen at the orchestrator, inside `PendingCardB`, and inside `DisputedPriceCard` respectively.

**Tech Stack:** TypeScript strict · Next.js 15 App Router · React 19 · React Query · CSS variables via inline `style` (matches existing `multi-tier/` and `PendingCardB.tsx` convention — Tailwind utilities only on existing components when nothing else changes) · Vitest + React Testing Library · pnpm workspaces · Conventional commits · `memory:feedback_definitions_pattern` (copy in `definitions/copy.ts`) · `memory:feedback_component_conventions` (arrow function components, descriptive names, no "handle" prefix on internal helpers).

## Global Constraints

- **No `as` casts** at boundaries — use Zod `safeParse` or type guards. Narrow assertions like `as const` / `satisfies` are fine.
- **All visible strings in `definitions/copy.ts`** (per `memory:feedback_definitions_copy_rule`). NO hardcoded JSX strings.
- **ESLint `id-length: min 2`** — no single-char vars except in narrow loop contexts (allowed: `i`, `j`, `k`, `x`, `y`, `z`).
- **Property table is the source of truth** — `docs/superpowers/design-tables/price-source-consumer-ui.md`. Every visual property must match a row. Cite section + line in component comments.
- **State reachability** — every state in §8 of the property table must have a triggering API condition surfaced in the type AND a component branch handling it. The `design-review` skill's Agent 2 second pass verifies this.
- **Locked decisions** from `memory:project_price_source_discoverability` are FINAL — do NOT relitigate (resale = community pipeline; SeatGeek stays primary; vendor "Venue" relabel when boxoffice; box-office exempt from staleness; 1/2 confirmation; tier enum `GA / Reserved / VIP / Pit / Lawn` unchanged; etc.).
- **Mobile/desktop parity** per `memory:feedback_mobile_desktop_parity` — every component is 100% width with `flex-wrap` on header rows; no breakpoint-conditional behavior. The mocks render at iOS-frame width and the production layouts (browse card row + event-detail price region) already support that width unchanged. Test desktop in dev once before merge.
- Worktree: `.worktrees/feat/price-source-consumer-ui` on branch `feat/price-source-consumer-ui`.
- Pre-push quality gate from the worktree root: `pnpm typecheck && pnpm lint && pnpm test && pnpm --filter @concert-crawl/web test`. Per-task runs skip integration tests to avoid DB contention; integration suite runs once at the sweep step.
- **2 SUCCESSFUL Copilot reviews before merge** per `memory:feedback_copilot_review_multi_round` — iterate until only Low/Nit remains. Errored reviews don't count.
- **`design-review` is a hard gate before `gh pr create`** — Agent 2 runs visual + state-reachability dual passes per `memory:feedback_state_reachability_in_design_review`. Agent 1 is split per-file to keep each enumeration narrow per `memory:feedback_design_review_component_scoped`.
- **No `progress.md` row** — consumer UI polish, doesn't deserve a phase-tracker row.
- **Release notes** required per CLAUDE.md "Release notes on user-facing PRs" rule — append a single entry to `apps/web/src/lib/definitions/releases.ts` in the final commit.

---

## File Structure

**Create:**

- `apps/web/src/components/consumer/price-region/index.ts` — barrel re-exports.
- `apps/web/src/components/consumer/price-region/FaceValueCard.tsx` — §1 of the property table.
- `apps/web/src/components/consumer/price-region/FaceValueCard.test.tsx`
- `apps/web/src/components/consumer/price-region/ContributeFaceValueCard.tsx` — Appendix A.1 (LOCKED §9 Q1); sibling of FaceValueCard for the sold-out + no-listing state.
- `apps/web/src/components/consumer/price-region/ContributeFaceValueCard.test.tsx`
- `apps/web/src/components/consumer/price-region/ProvenanceCTA.tsx` — §2.
- `apps/web/src/components/consumer/price-region/ProvenanceCTA.test.tsx`
- `apps/web/src/components/consumer/price-region/MTListChip.tsx` — §4 (browse-card chip parity).
- `apps/web/src/components/consumer/price-region/MTListChip.test.tsx`
- `apps/web/src/components/consumer/price-region/MTAddTierSuccess.tsx` — §5.
- `apps/web/src/components/consumer/price-region/MTAddTierSuccess.test.tsx`
- `apps/web/src/components/consumer/price-region/MultiSourceMultiTierCard.tsx` — §6.
- `apps/web/src/components/consumer/price-region/MultiSourceMultiTierCard.test.tsx`
- `apps/web/src/components/consumer/price-region/AltSourceRow.tsx` — §6 sub-component.
- `apps/web/src/components/consumer/price-region/lib/pick-headline.ts` — pure helper that adapts pre-aggregated `priceByTier` for browse-card chip selection. Walks the API-sorted (price-ASC) blocks and returns the first one with a non-null headline. Does NOT re-implement trust ordering or tie-break — those decisions are owned by `apps/api/src/lib/price-aggregation/pick-tier-headline.ts` and are already applied by the time the consumer sees the data.
- `apps/web/src/components/consumer/price-region/lib/pick-headline.test.ts`
- `apps/web/src/components/consumer/price-region/lib/decision-tree.ts` — pure state-machine helper that takes the relevant `EventDetailResponse` slice and returns a tagged union `{ kind: 'sold-out-resale', … } | { kind: 'sold-out-contribute', … } | { kind: 'no-price-resale', … } | …` for the orchestrator to render. Keeps the giant if-tree in `EventDetailClient.tsx` legible. Discriminant names follow the §9 lock vocabulary (`sold-out-contribute` is the Q1 lock; `no-price-empty` is the Q2-eng lock).
- `apps/web/src/components/consumer/price-region/lib/decision-tree.test.ts`
- `apps/web/src/components/consumer/price-region/definitions/copy.ts` — all copy strings for the new components, keyed under `CONSUMER_COPY.priceRegion.*` (re-exported from `apps/web/src/components/consumer/definitions/copy.ts` so call sites use the canonical import path).

**Modify:**

- `apps/web/src/components/consumer/definitions/copy.ts` — extend `CONSUMER_COPY` with the `priceRegion`, `submitPriceV2`, and `mtAddTierSuccess` sub-trees. Add admin-defer engagement pill copy (`adminDeferPillLabel`) inside the existing `multiTier` block.
- `apps/web/src/components/consumer/glyphs.tsx` — add `TierMark` primitive (price-region §primitives, lines 42-63 of the property table). `Eyebrow` already exists; do NOT add a second copy.
- `apps/web/src/components/consumer/EventDetailClient.tsx` — `EventDetailPriceBlock` (lines 280–950): insert a new branch at the top of the decision tree that consumes `event.priceByTier` when non-null. Wire the Q3-locked counter-pointer (state #17) per Task 12. Surface the admin-defer pill via the `DisputedPriceCard` prop additions in the next bullet. Add the `sold-out-contribute` branch (LOCKED §9 Q1) that renders `<SoldOutPriceCard variant='no-listing' />` + `<ContributeFaceValueCard />`.
- `apps/web/src/components/consumer/DisputedPriceCard.tsx` — extend props with optional `lastAdminActionKind?: 'defer' | null` and `lastAdminActionAt?: string | null`. When `lastAdminActionKind === 'defer'`, render a quiet "Admin requested more info" pill near the counter card header (per state #18). Add an `id={`counter-${counterSubmission.id}`}` attribute on the card root so the Q3 counter-pointer (Task 12) can deep-link / scroll to it.
- `apps/web/src/components/consumer/SoldOutPriceCard.tsx` — add additive prop (recommended: `variant: 'has-listing' | 'no-listing'`, default `'has-listing'`) per Appendix A.2 / §9 Q1 lock. The `'no-listing'` variant shows `"—"` (em-dash) in place of the strikethrough price and the caption `"No tickets listed anywhere we can see — not even resale."`. Default behavior is unchanged.
- `apps/web/src/components/consumer/SoldOutPriceCard.test.tsx` — add cases for the new `'no-listing'` variant.
- `apps/web/src/components/consumer/PendingCardB.tsx` — add additive prop `counterPointer?: { href: string } | null` per Appendix A.4 / §9 Q3 lock. When non-null, replace the existing `"Saw a different number?"` footer link with the coral counter-pointer link (mono 10px, coral, 5×5 coral dot, 11×11 arrow SVG); `Confirm price` button stays unchanged.
- `apps/web/src/components/consumer/PendingCardB.test.tsx` — add cases for the new `counterPointer` prop.
- `apps/web/src/components/consumer/event-card/EventCard.tsx` — replace the inline `PriceChip` (lines 43-119) with `<MTListChip>` rendered with `pickBrowseHeadline(event)`. `pickBrowseHeadline` adapts the API's pre-aggregated `priceByTier` (already run through `pickTierHeadline` per tier, already sorted price-ASC) into a single `{ price, kind }` for the chip. Keep the existing "tba" / `null` fallback path.
- `apps/web/src/components/consumer/submit-price/SubmitPriceModal.tsx` — reorder form (lines 535–602): (1) source-category chip group leads (new), (2) floor/ceiling row second with dynamic floor label per source, (3) tier group third, (4) vendor group fourth (auto-fill "Venue" + lock-but-required when source=boxoffice). Remove the `howFound` chip group + dependent payload field. Update payload type + POST/PATCH bodies to send `sourceCategory` instead of `howFound`. Add the 409 race-case toast handler per `memory:project_pr4_dispute_affordance_hiding`.
- `apps/web/src/components/consumer/submit-price/SubmitPriceModal.test.tsx` — update tests to expect the new field order, the new `sourceCategory` payload, and absence of `howFound`. Add tests for the source→floor label switch and the 409 race-case toast.
- `apps/api/src/routes/submissions.ts` — accept `sourceCategory` as optional in the POST body schema (it's already derived server-side from `howFound`; with `howFound` removed at the consumer layer, the server keeps a fallback to derive from `vendor` + the explicit `sourceCategory` when provided). _NOTE: this is a small contract follow-on. If PR 3 already accepts `sourceCategory`, this is a no-op — read first._
- `packages/types/src/index.ts` — make `howFound` optional on the submission-input payload type (if currently required). The `SubmitPriceModal` is the sole producer of that payload; making it optional doesn't break the API which keeps `how_found` for the migration buffer.
- `apps/web/src/lib/definitions/releases.ts` — add the release-notes entry. See Task 13.

**Not modified:**

- Shipped `MultiTierLiveCard`, `MixedTierCard`, `TierAlternateRow`, `TwoPendingStack`, `PendingTrustPill`, `StarGlyph`, `CheckGlyph`, `Eyebrow`. Per `memory:project_price_source_discoverability` — reused verbatim. `MultiTierLiveCard` already supports `kind='boxoffice'`. A small `reports?` prop wiring at the call site appends the "· N reports" caption — but only if the shipped component already accepts it. **Verify before extending.** If shipped component does NOT accept `reports`, file a 1-line follow-up issue rather than expanding scope. (`PendingCardB`, `DisputedPriceCard`, and `SoldOutPriceCard` are MODIFIED in this PR — see Modify section above for the §9 lock-driven additive props.)
- The `apps/api/src/lib/price-aggregation/` helpers — the browse-side parity is done by mirroring the rules in `pick-headline.ts`, NOT by importing from `apps/api`. The `apps/web` package must not import from `apps/api`.
- Database schema, migrations, crawler.

---

## Task Right-Sizing Rationale

Fourteen tasks. Each ends with an independently testable deliverable + commit:

1. Copy file extension + `TierMark` primitive (foundations) — includes Q1/Q2/Q3 copy keys (`contributeFaceValue.*`, `soldOutNoListingCaption`, `mtListChip.resaleTag`, `dispute.counterPointerLabel`)
2. `ProvenanceCTA` (smallest leaf component, used by FaceValueCard composition)
3. `FaceValueCard` + `ContributeFaceValueCard` (centerpiece + Q1-locked sibling)
4. `AltSourceRow`
5. `MultiSourceMultiTierCard` (composes shipped + `AltSourceRow`)
6. `MTListChip` + `pick-headline.ts` parity helper (includes Q2-locked `kind='resale'` variant with always-present `"resale"` tag)
7. `MTAddTierSuccess`
8. `decision-tree.ts` orchestrator helper (discriminants include Q1-locked `sold-out-contribute`)
9. Wire `EventDetailClient` to consume `priceByTier` via decision-tree + add Q1-locked `SoldOutPriceCard variant='no-listing'` prop + Q4-eng-locked session-state tier tracking
10. Browse-card wiring (replace inline `PriceChip` with `MTListChip`)
11. Submit form reorder + `sourceCategory` payload + 409 race toast
12. Passive surfaces — Q3-locked counter pointer (replaces dispute link) + admin-defer pill
13. Release-notes entry + final sweep (typecheck/lint/test/integration)
14. `design-review` skill + open PR + Copilot iteration to Low/Nit

---

### Task 1: Copy file + `TierMark` primitive

**Files:**

- Modify: `apps/web/src/components/consumer/definitions/copy.ts`
- Modify: `apps/web/src/components/consumer/glyphs.tsx`
- Create: `apps/web/src/components/consumer/glyphs.test.tsx` (or extend if it exists — check first)

**Interfaces produced:**

```ts
// glyphs.tsx
export interface TierMarkProps {
  kind: 'boxoffice' | 'resale' | 'community'
  glyph?: boolean
  children: React.ReactNode
}
export const TierMark: (props: TierMarkProps) => JSX.Element
```

**Copy additions** (`apps/web/src/components/consumer/definitions/copy.ts` — extend the `CONSUMER_COPY` const literal):

```ts
priceRegion: {
  faceValue: {
    eyebrow: 'Face value ≠ resale',
    headlineDefault: "That's resale — not face value.",
    headlineNoPrice: 'All we can see is resale.',
    // Single subline — property table state #12 (no-price) only overrides the
    // headline; subline copy is shared between the sold-out-with-resale (#10)
    // and no-price-with-resale (#12) variants.
    subline: 'Only resale tickets left. Know the box-office price? Add it.',
    ladderResaleLabel: 'Resale',
    ladderResaleSub: (vendor: string) => `${vendor} · marked up over face`,
    ladderResaleRightFallback: 'available, above face value',
    ladderBoxofficeLabel: 'Box office',
    ladderBoxofficeSub: 'the printed price · no fees',
    ladderBoxofficeRight: 'not reported',
    ctaLabelDefault: 'Add the box-office price',
    ctaLabelNoPrice: "Add a price you've seen",
    caption: 'Goes live once one more fan confirms',
  },
  // LOCKED §9 Q1 — ContributeFaceValueCard copy (Appendix A.1).
  // Differs from faceValue.* — eyebrow drops the "≠ resale" framing, body
  // pitches contribution directly. New component, new copy block.
  contributeFaceValue: {
    eyebrow: 'Face value',
    headline: 'No price to show — yet.',
    subline: 'Sold out, nothing listed. Know the box-office number? Add it.',
    ladderBoxofficeLabel: 'Box office',
    ladderBoxofficeSub: 'the printed price · no fees',
    ladderBoxofficeRight: 'not reported',
    ctaLabel: 'Add the box-office price',
    caption: 'Goes live once one more fan confirms',
  },
  // LOCKED §9 Q1 — SoldOutPriceCard variant='no-listing' caption (Appendix A.2).
  soldOutNoListingCaption: 'No tickets listed anywhere we can see — not even resale.',
  provenance: {
    getTickets: 'Get Tickets',
    seeResale: 'See resale tickets',
    captionBoxoffice: (vendor: string) => `${vendor} · face value, no fees`,
    captionPrimary: (vendor: string) => `Official vendor · ${vendor} · face + fees`,
    captionResale: (vendor: string) => `${vendor} resale · usually above face value`,
    ariaLabelBoxoffice: (vendor: string) => `Get tickets at the box office via ${vendor} — face value, no fees`,
    ariaLabelPrimary: (vendor: string) => `Get tickets via ${vendor} — official vendor, face value plus fees`,
    ariaLabelResale: (vendor: string) => `Buy resale on ${vendor} — usually above face value`,
  },
  mtListChip: {
    fromPrefix: 'from',
    // LOCKED §9 Q2 — MT_ListChip kind='resale' trailing tag (Appendix A.3).
    // NON-NEGOTIABLE that this always renders on the resale variant.
    resaleTag: 'resale',
  },
  // LOCKED §9 Q3 — DisputedPriceCard / PendingCardB footer pointer (Appendix A.4).
  dispute: {
    counterPointerLabel: "Someone's contesting this — see the counter",
  },
  multiSource: {
    eyebrow: 'Tickets',
    fromLabel: 'from',
    metaTemplate: (vendor: string) => `seen on ${vendor} · face value · no fees`,
    orPayConvenience: 'Or pay for convenience',
    otherTiers: 'Other tiers',
  },
  altSourceRow: {
    pricePrefix: '$',
  },
  addTierSuccess: {
    headline: (tier: string) => `${tier} price is in. Thanks.`,
    bodyTemplate: (price: string, source: string) => `$${price} ${source} · `,
    pendingFragment: 'sits pending · 1/2 until one more fan confirms.',
    addAnotherEyebrow: 'This show has more than one tier?',
    addPillTemplate: (tier: string) => `+ Add ${tier.toLowerCase()}`,
    helperLine: 'Each tier is its own quick submission — only add the ones you actually saw.',
    doneButton: 'Done',
  },
  disputeRace409Toast: 'Another challenge was just filed — refresh to see it.',
  adminDeferPillLabel: 'Admin requested more info',
},
submitPriceV2: {
  // Replaces the howFound-bearing form. Field order: source → number → tier → vendor.
  sourceLabel: "Where's this price from? *",
  sourceHelper: 'Box office is face value — the most useful number for other fans.',
  sourceOptionBoxoffice: 'Box office',
  sourceOptionStandard: 'Standard ticket',
  sourceOptionResale: 'Resale',
  floorLabelBoxoffice: 'Face value',
  floorLabelStandard: 'Floor',
  floorLabelResale: 'Resale price',
  floorHintBoxoffice: 'the printed price',
  floorPlaceholder: '32',
  ceilingLabel: 'Ceiling',
  ceilingPlaceholder: 'optional',
  tierLabel: 'Tier',
  vendorLabel: 'Vendor *',
  vendorOptionVenue: 'Venue',
  vendorOptionAXS: 'AXS',
  vendorOptionTicketmaster: 'Ticketmaster',
  vendorOptionSeatGeek: 'SeatGeek',
  vendorOptionDICE: 'DICE',
  vendorOptionEventbrite: 'Eventbrite',
  vendorAutoFilledNote: 'Auto-filled because source is box office',
},
```

**TierMark implementation** (`apps/web/src/components/consumer/glyphs.tsx`, append below `PendingTrustPill`):

```tsx
// Property table §primitives lines 42-63
const TIER_COLOR = {
  boxoffice: 'oklch(0.66 0.14 78)',
  resale: 'oklch(0.65 0.20 25)',
  community: 'oklch(0.62 0.12 240)',
} as const

export interface TierMarkProps {
  kind: 'boxoffice' | 'resale' | 'community'
  glyph?: boolean
  children: React.ReactNode
}

export const TierMark = ({ kind, glyph = false, children }: TierMarkProps) => {
  const color = TIER_COLOR[kind]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '2px 7px',
        borderRadius: '4px',
        background: `color-mix(in oklab, ${color} 14%, transparent)`,
        border: `1px solid color-mix(in oklab, ${color} 50%, transparent)`,
        color,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '9px',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {kind === 'boxoffice' && glyph && <StarGlyph size={9} color={color} />}
      {children}
    </span>
  )
}
```

**TDD steps:**

- [ ] **Step 1**: Add copy keys. Run `pnpm --filter @concert-crawl/web typecheck` — expect failures only in files that reference these keys (none yet).
- [ ] **Step 2**: Write `glyphs.test.tsx` cases for `TierMark`:
  - renders children
  - applies gold star for `kind='boxoffice'` + `glyph=true`
  - omits glyph when `glyph=false`
  - applies resale coral color
  - applies community azure color
- [ ] **Step 3**: Run failing tests. Implement `TierMark` per the snippet above. Re-run tests; expect green.
- [ ] **Step 4**: Commit: `feat(consumer): add price-region copy keys + TierMark primitive`.

---

### Task 2: `ProvenanceCTA`

**Files:**

- Create: `apps/web/src/components/consumer/price-region/ProvenanceCTA.tsx`
- Create: `apps/web/src/components/consumer/price-region/ProvenanceCTA.test.tsx`
- Create: `apps/web/src/components/consumer/price-region/index.ts` (export barrel)

**Property table reference:** §2 (lines 218–281).

**Interfaces produced:**

```ts
export type ProvenanceCTAKind = 'boxoffice' | 'primary' | 'resale'

export interface ProvenanceCTAProps {
  kind: ProvenanceCTAKind
  vendor: string
  href: string
  outline?: boolean
}
```

**Implementation skeleton:**

```tsx
'use client'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY.priceRegion.provenance
const TIER_COLOR_RESALE = 'oklch(0.65 0.20 25)'
const TIER_COLOR_BOXOFFICE = 'oklch(0.66 0.14 78)'

export type ProvenanceCTAKind = 'boxoffice' | 'primary' | 'resale'

export interface ProvenanceCTAProps {
  kind: ProvenanceCTAKind
  vendor: string
  href: string
  outline?: boolean
}

export const ProvenanceCTA = ({
  kind,
  vendor,
  href,
  outline = false,
}: ProvenanceCTAProps) => {
  const isResale = kind === 'resale'
  const label = isResale ? copy.seeResale : copy.getTickets
  const caption =
    kind === 'boxoffice'
      ? copy.captionBoxoffice(vendor)
      : kind === 'primary'
        ? copy.captionPrimary(vendor)
        : copy.captionResale(vendor)
  const ariaLabel =
    kind === 'boxoffice'
      ? copy.ariaLabelBoxoffice(vendor)
      : kind === 'primary'
        ? copy.ariaLabelPrimary(vendor)
        : copy.ariaLabelResale(vendor)
  const dotColor =
    kind === 'boxoffice'
      ? TIER_COLOR_BOXOFFICE
      : kind === 'resale'
        ? TIER_COLOR_RESALE
        : 'var(--fg-subtle)'
  const captionColor = isResale
    ? `color-mix(in oklab, ${TIER_COLOR_RESALE} 92%, var(--fg-muted))`
    : 'var(--fg-muted)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 48,
          width: '100%',
          borderRadius: 10,
          boxSizing: 'border-box',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          fontFamily: 'Inter, system-ui',
          fontWeight: 800,
          fontSize: 15,
          letterSpacing: '-0.01em',
          background: outline ? 'transparent' : 'var(--signal)',
          border: outline ? '1px solid var(--border-strong)' : 'none',
          color: outline ? 'var(--fg)' : 'var(--fg-on-accent)',
        }}
      >
        {label} ↗
      </a>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          justifyContent: 'center',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            background: dotColor,
            display: 'inline-block',
          }}
        />
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: captionColor,
            letterSpacing: '0.03em',
          }}
        >
          {caption}
        </span>
      </div>
    </div>
  )
}
```

**TDD steps:**

- [ ] **Step 1**: Write `ProvenanceCTA.test.tsx` covering states 14, 15, 16 from property table §8:
  - boxoffice variant: renders "Get Tickets ↗", filled signal background, gold dot + caption "Venue · face value, no fees" (vendor="Venue")
  - primary variant: renders "Get Tickets ↗", signal background, subtle dot + caption "Official vendor · Ticketmaster · face + fees"
  - resale variant + `outline=true`: renders "See resale tickets ↗", transparent background with border, coral dot + caption "Ticketmaster resale · usually above face value"
  - resale anchor has `aria-label="Buy resale on Ticketmaster — usually above face value"`
  - anchor opens in new tab with `rel="noopener noreferrer"`
- [ ] **Step 2**: Run failing tests. Implement `ProvenanceCTA.tsx` per snippet. Re-run tests; expect green.
- [ ] **Step 3**: Add to barrel `apps/web/src/components/consumer/price-region/index.ts`:
  ```ts
  export { ProvenanceCTA } from './ProvenanceCTA'
  export type { ProvenanceCTAKind, ProvenanceCTAProps } from './ProvenanceCTA'
  ```
- [ ] **Step 4**: `pnpm --filter @concert-crawl/web typecheck && pnpm --filter @concert-crawl/web test ProvenanceCTA`.
- [ ] **Step 5**: Commit: `feat(consumer): add ProvenanceCTA — honest outbound ticket button`.

---

### Task 3: `FaceValueCard` + `ContributeFaceValueCard`

**Files:**

- Create: `apps/web/src/components/consumer/price-region/FaceValueCard.tsx`
- Create: `apps/web/src/components/consumer/price-region/FaceValueCard.test.tsx`
- Create: `apps/web/src/components/consumer/price-region/ContributeFaceValueCard.tsx` — Q1 locked spec; sibling component for state #11 (sold-out + no resale + no primary + no boxoffice). See property table Appendix A.1.
- Create: `apps/web/src/components/consumer/price-region/ContributeFaceValueCard.test.tsx`
- Modify: `apps/web/src/components/consumer/price-region/index.ts`

**Property table reference:** §1 (lines 52–214) for `FaceValueCard`; Appendix A.1 for `ContributeFaceValueCard`.

**Locked decision callout (§9 Q1):** `ContributeFaceValueCard` is a NEW, SEPARATE component — NOT a variant of `FaceValueCard`. Per the addendum: *"it is NOT a FaceValueCard anymore — what survives is the contribution half."* Do not model it as `FaceValueCard variant='sold-out-degraded'`. The `sold-out-degraded` variant is removed from `FaceValueCardProps` below; the props now only carry `'default' | 'no-price'`.

**Interfaces produced:**

```ts
export interface FaceValueCardProps {
  variant: 'default' | 'no-price'
  resaleVendor: string
  resaleRange?: string // e.g. "$110–180"
  onAddPrice: () => void
}

// ContributeFaceValueCard — NEW component per §9 Q1 lock + Appendix A.1.
// Renders one ghost box-office row, no resale row, no outbound CTA.
export interface ContributeFaceValueCardProps {
  onAddPrice: () => void
}
```

**Implementation (key snippets):**

The two-row ladder with `ghost` flag drives the box-office row. Use a local `LadderRow` helper inside the file (per property table lines 75–172):

```tsx
'use client'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { StarGlyph, Eyebrow } from '@/components/consumer/glyphs'

const copy = CONSUMER_COPY.priceRegion.faceValue
const TIER_COLOR_RESALE = 'oklch(0.65 0.20 25)'
const TIER_COLOR_BOXOFFICE = 'oklch(0.66 0.14 78)'

interface LadderRowProps {
  kind: 'resale' | 'boxoffice'
  label: string
  sub: string
  right: string
  ghost: boolean
}

const LadderRow = ({ kind, label, sub, right, ghost }: LadderRowProps) => {
  const color = kind === 'boxoffice' ? TIER_COLOR_BOXOFFICE : TIER_COLOR_RESALE
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '12px 14px',
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          flexShrink: 0,
          borderRadius: 5,
          background: `color-mix(in oklab, ${color} ${ghost ? 10 : 18}%, transparent)`,
          border: ghost
            ? `1px dashed color-mix(in oklab, ${color} 55%, transparent)`
            : `1px solid color-mix(in oklab, ${color} 45%, transparent)`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {kind === 'boxoffice' ? (
          <StarGlyph size={9} color={color} />
        ) : (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: color,
              display: 'inline-block',
            }}
          />
        )}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'Inter, system-ui',
            fontWeight: 700,
            fontSize: 13.5,
            color: ghost ? 'var(--fg-muted)' : 'var(--fg)',
            letterSpacing: '-0.005em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: 'Inter, system-ui',
            fontSize: 11.5,
            fontWeight: 500,
            color: 'var(--fg-subtle)',
            letterSpacing: '-0.005em',
          }}
        >
          {sub}
        </div>
      </div>
      <div
        style={
          ghost
            ? {
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                fontSize: 9.5,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: `color-mix(in oklab, ${color} 90%, var(--fg-subtle))`,
                textAlign: 'right',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }
            : {
                fontFamily: 'Inter, system-ui',
                fontWeight: 800,
                fontSize: 16,
                letterSpacing: '-0.015em',
                color: 'var(--fg)',
                textAlign: 'right',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }
        }
      >
        {right}
      </div>
    </div>
  )
}

export interface FaceValueCardProps {
  variant: 'default' | 'no-price'
  resaleVendor: string
  resaleRange?: string
  onAddPrice: () => void
}

export const FaceValueCard = ({
  variant,
  resaleVendor,
  resaleRange,
  onAddPrice,
}: FaceValueCardProps) => {
  const headline =
    variant === 'no-price' ? copy.headlineNoPrice : copy.headlineDefault
  const ctaLabel =
    variant === 'no-price' ? copy.ctaLabelNoPrice : copy.ctaLabelDefault
  const resaleRight = resaleRange ?? copy.ladderResaleRightFallback

  return (
    <div
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
      }}
    >
      <div style={{ padding: '14px 14px 10px' }}>
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <div
          style={{
            marginTop: 7,
            fontFamily: 'Inter, system-ui',
            fontWeight: 800,
            fontSize: 16.5,
            color: 'var(--fg)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            textWrap: 'balance',
          }}
        >
          {headline}
        </div>
        <div
          style={{
            marginTop: 5,
            fontFamily: 'Inter, system-ui',
            fontSize: 12.5,
            fontWeight: 500,
            color: 'var(--fg-muted)',
            letterSpacing: '-0.005em',
            lineHeight: 1.5,
          }}
        >
          {copy.subline}
        </div>
      </div>

      <div
        style={{
          margin: '2px 0',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <LadderRow
          kind="resale"
          label={copy.ladderResaleLabel}
          sub={copy.ladderResaleSub(resaleVendor)}
          right={resaleRight}
          ghost={false}
        />
        <div style={{ height: 1, background: 'var(--border)', margin: '0 14px' }} />
        <LadderRow
          kind="boxoffice"
          label={copy.ladderBoxofficeLabel}
          sub={copy.ladderBoxofficeSub}
          right={copy.ladderBoxofficeRight}
          ghost
        />
      </div>

      <div style={{ padding: '12px 14px 14px' }}>
        <button
          type="button"
          onClick={onAddPrice}
          style={{
            all: 'unset',
            cursor: 'pointer',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            height: 46,
            borderRadius: 10,
            background: 'var(--signal)',
            color: 'var(--fg-on-accent)',
            fontFamily: 'Inter, system-ui',
            fontWeight: 800,
            fontSize: 14.5,
            letterSpacing: '-0.01em',
            boxShadow: '0 12px 28px -14px var(--signal)',
          }}
        >
          {ctaLabel}
          <svg
            width={13}
            height={13}
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
          >
            <path
              d="M3 8h9M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div
          style={{
            marginTop: 9,
            textAlign: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: 'var(--fg-subtle)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {copy.caption}
        </div>
      </div>
    </div>
  )
}
```

**TDD steps:**

- [ ] **Step 1**: Write `FaceValueCard.test.tsx` covering states 3, 10, 12 from property table §8:
  - default variant: renders eyebrow "Face value ≠ resale", headline "That's resale — not face value.", resale row with `vendor="Ticketmaster"` + range `"$110–180"`, ghost box-office row reading "not reported", CTA "Add the box-office price"
  - no-price variant: headline switches to "All we can see is resale.", CTA to "Add a price you've seen"
  - clicking CTA fires `onAddPrice`
- [ ] **Step 2**: Run failing tests, implement `FaceValueCard.tsx` per snippet, re-run green.
- [ ] **Step 3**: Write `ContributeFaceValueCard.test.tsx` covering state #11 (Q1 lock) per Appendix A.1:
  - renders eyebrow `"Face value"` (NOT `"Face value ≠ resale"` — comparison framing is dropped)
  - headline `"No price to show — yet."`
  - subline `"Sold out, nothing listed. Know the box-office number? Add it."`
  - renders exactly ONE ghost box-office row (gold star, label "Box office", sub "the printed price · no fees", right "not reported"); NO resale row
  - CTA label `"Add the box-office price"`, signal background, fires `onAddPrice` on click
  - caption `"Goes live once one more fan confirms"`
  - does NOT render a `ProvenanceCTA` (no outbound link slot — verify by querying for any anchor in the rendered subtree)
- [ ] **Step 4**: Implement `ContributeFaceValueCard.tsx` per Appendix A.1; re-run tests green.
- [ ] **Step 5**: Add both to barrel `index.ts`.
- [ ] **Step 6**: `pnpm --filter @concert-crawl/web test FaceValueCard ContributeFaceValueCard`.
- [ ] **Step 7**: Commit: `feat(consumer): add FaceValueCard + ContributeFaceValueCard — resale ladder + Q1 contribution-only variant`.

---

### Task 4: `AltSourceRow`

**Files:**

- Create: `apps/web/src/components/consumer/price-region/AltSourceRow.tsx`
- Create: `apps/web/src/components/consumer/price-region/AltSourceRow.test.tsx`
- Modify: `apps/web/src/components/consumer/price-region/index.ts`

**Property table reference:** §6 lines 595–608.

**Interfaces produced:**

```ts
export interface AltSourceRowProps {
  source: string
  kind: 'boxoffice' | 'resale' | 'community'
  price: number
}
```

**Implementation:**

```tsx
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const TIER_COLOR = {
  boxoffice: 'oklch(0.66 0.14 78)',
  resale: 'oklch(0.65 0.20 25)',
  community: 'oklch(0.62 0.12 240)',
} as const

const KIND_LABEL = {
  boxoffice: 'box office',
  resale: 'resale',
  community: 'community',
} as const

export interface AltSourceRowProps {
  source: string
  kind: 'boxoffice' | 'resale' | 'community'
  price: number
}

export const AltSourceRow = ({ source, kind, price }: AltSourceRowProps) => {
  const color = TIER_COLOR[kind]
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        padding: '8px 0',
        borderTop: '1px dashed var(--border)',
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: 2.5,
          background: color,
          alignSelf: 'center',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: 'Inter, system-ui',
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--fg-muted)',
        }}
      >
        {source}
      </span>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8.5,
          color,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {KIND_LABEL[kind]}
      </span>
      <span style={{ flex: 1 }} />
      <span
        style={{
          fontFamily: 'Inter, system-ui',
          fontSize: 12.5,
          fontWeight: 600,
          color: 'var(--fg-muted)',
        }}
      >
        {CONSUMER_COPY.priceRegion.altSourceRow.pricePrefix}{price}
      </span>
    </div>
  )
}
```

**TDD steps:**

- [ ] **Step 1**: Write `AltSourceRow.test.tsx`:
  - resale variant: coral dot, source label, "RESALE" pill, "$35" price
  - boxoffice variant: gold dot, "BOX OFFICE" pill
  - community variant: azure dot, "COMMUNITY" pill
- [ ] **Step 2**: Implement; re-run green.
- [ ] **Step 3**: Barrel export.
- [ ] **Step 4**: Commit: `feat(consumer): add AltSourceRow — cross-source secondary price row`.

---

### Task 5: `MultiSourceMultiTierCard`

**Files:**

- Create: `apps/web/src/components/consumer/price-region/MultiSourceMultiTierCard.tsx`
- Create: `apps/web/src/components/consumer/price-region/MultiSourceMultiTierCard.test.tsx`
- Modify: `apps/web/src/components/consumer/price-region/index.ts`

**Property table reference:** §6 lines 550–608.

**Interfaces produced:**

```ts
import type { TierAlternateRowProps } from '@/components/consumer/multi-tier/TierAlternateRow'

export interface MultiSourceMultiTierCardProps {
  headlineTier: string
  headlinePrice: number
  headlineVendor: string
  crossSource: {
    source: string
    kind: 'boxoffice' | 'resale' | 'community'
    price: number
  }
  otherTiers: ReadonlyArray<TierAlternateRowProps>
}
```

**Implementation skeleton** (cite §6 lines 125–159):

```tsx
'use client'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { Eyebrow, PendingTrustPill } from '@/components/consumer/glyphs'
import { TierAlternateRow } from '@/components/consumer/multi-tier/TierAlternateRow'
import { AltSourceRow } from './AltSourceRow'

const copy = CONSUMER_COPY.priceRegion.multiSource

export interface MultiSourceMultiTierCardProps {
  headlineTier: string
  headlinePrice: number
  headlineVendor: string
  crossSource: {
    source: string
    kind: 'boxoffice' | 'resale' | 'community'
    price: number
  }
  otherTiers: ReadonlyArray<React.ComponentProps<typeof TierAlternateRow>>
}

export const MultiSourceMultiTierCard = ({
  headlineTier,
  headlinePrice,
  headlineVendor,
  crossSource,
  otherTiers,
}: MultiSourceMultiTierCardProps) => (
  <div
    style={{
      borderRadius: 12,
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
      padding: '14px 14px 12px',
    }}
  >
    <Eyebrow>{copy.eyebrow}</Eyebrow>
    <div
      style={{
        marginTop: 6,
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          fontFamily: 'Inter, system-ui',
          fontWeight: 600,
          fontSize: 13,
          color: 'var(--fg-muted)',
        }}
      >
        {copy.fromLabel}
      </span>
      <span
        style={{
          fontFamily: 'Inter, system-ui',
          fontWeight: 800,
          fontSize: 28,
          color: 'var(--fg)',
          letterSpacing: '-0.025em',
          lineHeight: 1.05,
        }}
      >
        ${headlinePrice}
      </span>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 700,
          fontSize: 11,
          color: 'var(--fg-muted)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {headlineTier}
      </span>
      <PendingTrustPill kind="boxoffice" />
    </div>
    <div
      style={{
        marginTop: 6,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        color: 'var(--fg-muted)',
        letterSpacing: '0.04em',
      }}
    >
      {copy.metaTemplate(headlineVendor)}
    </div>

    <div style={{ marginTop: 12 }}>
      <div style={{ marginBottom: 2 }}>
        <Eyebrow>{copy.orPayConvenience}</Eyebrow>
      </div>
      <AltSourceRow
        source={crossSource.source}
        kind={crossSource.kind}
        price={crossSource.price}
      />
    </div>

    {otherTiers.length > 0 && (
      <div style={{ marginTop: 12 }}>
        <Eyebrow>{copy.otherTiers}</Eyebrow>
        {otherTiers.map((row, idx) => (
          <TierAlternateRow key={`${row.tier}-${idx}`} {...row} />
        ))}
      </div>
    )}
  </div>
)
```

**TDD steps:**

- [ ] **Step 1**: Write tests for state #5 (live multi-tier mixed sources):
  - headline "from $20 GA" with gold "Box office" trust pill + meta "seen on Venue · face value · no fees"
  - "Or pay for convenience" eyebrow + AltSourceRow with Ticketmaster + resale + $35
  - "Other tiers" eyebrow + one VIP boxoffice alternate row
  - omits "Other tiers" section when `otherTiers=[]`
- [ ] **Step 2**: Implement; re-run green.
- [ ] **Step 3**: Barrel export.
- [ ] **Step 4**: Commit: `feat(consumer): add MultiSourceMultiTierCard — entry tier with cross-source resale fold`.

---

### Task 6: `MTListChip` + `pick-headline.ts` parity helper

**Files:**

- Create: `apps/web/src/components/consumer/price-region/lib/pick-headline.ts`
- Create: `apps/web/src/components/consumer/price-region/lib/pick-headline.test.ts`
- Create: `apps/web/src/components/consumer/price-region/MTListChip.tsx`
- Create: `apps/web/src/components/consumer/price-region/MTListChip.test.tsx`
- Modify: `apps/web/src/components/consumer/price-region/index.ts`

**Property table reference:** §4 (lines 376–420) + §8 browse #1–7.

**Interfaces produced:**

```ts
// pick-headline.ts — consumer-side adapter over the API-side aggregation.
//
// IMPORTANT: this helper does NOT re-implement trust ordering or tie-break.
// Those decisions are owned by the API's pick-tier-headline.ts; by the time
// the consumer sees `priceByTier`, each block already has a single pre-picked
// `headline` (or null) and the blocks are sorted by entry price ascending.
//
// This helper's job is to (a) translate the API's `sourceCategory` enum into
// the chip's `kind` vocabulary, and (b) pick the FIRST block with a non-null
// headline — which is the cheapest tier with any price data, per API sort
// order. If the API guarantees change, this helper must change with them.
//
// Cross-reference: apps/api/src/lib/price-aggregation/pick-tier-headline.ts.

import type { TierPriceBlock } from '@concert-crawl/types'

export type BrowseHeadlineKind = 'boxoffice' | 'community' | 'resale' | null

export interface BrowseHeadline {
  price: number
  kind: BrowseHeadlineKind
}

export function pickBrowseHeadline(
  priceByTier: ReadonlyArray<TierPriceBlock> | null | undefined,
): BrowseHeadline | null

// MTListChip.tsx
export interface MTListChipProps {
  price: number
  kind: BrowseHeadlineKind
  from?: boolean
}
```

**`pick-headline.ts` implementation:**

The consumer helper consumes pre-aggregated data — `priceByTier` is already sorted by entry price ASC by `aggregateByTier`, and within each block the API's `pick-tier-headline.ts` has already collapsed candidates into a single headline (or null) using trust → price → observedAt ordering. The helper here just (a) walks tiers in price-ASC order to find the first one with a non-null headline, and (b) maps `sourceCategory` to the chip's `kind` vocabulary.

```ts
import type { TierPriceBlock, SourceCategory } from '@concert-crawl/types'

export type BrowseHeadlineKind = 'boxoffice' | 'community' | 'resale' | null

export interface BrowseHeadline {
  price: number
  kind: BrowseHeadlineKind
}

function kindFromCategory(category: SourceCategory | null): BrowseHeadlineKind {
  if (category === 'boxoffice') return 'boxoffice'
  if (category === 'resale') return 'resale'
  if (category === 'standard') return 'community'
  return null
}

function adaptBlock(block: TierPriceBlock): BrowseHeadline | null {
  if (block.headline === null) return null
  return {
    price: parseFloat(block.headline.priceMin),
    kind: kindFromCategory(block.headline.sourceCategory),
  }
}

// Pick the cheapest tier with any price data.
// Relies on aggregateByTier sorting priceByTier[] by entry price ASC, so the
// first block with a non-null headline IS the cheapest with a price. If every
// tier is pending-only (all headlines null), return null (no chip data).
export function pickBrowseHeadline(
  priceByTier: ReadonlyArray<TierPriceBlock> | null | undefined,
): BrowseHeadline | null {
  if (priceByTier == null || priceByTier.length === 0) return null
  for (const block of priceByTier) {
    const headline = adaptBlock(block)
    if (headline !== null) return headline
  }
  return null
}
```

(If the API's sort guarantee for `priceByTier` ever changes, this helper must change too — the cheapest-tier pick assumes API-side ASC ordering.)

**`MTListChip.tsx` implementation (property table §4, lines 376–420; `kind='resale'` per Appendix A.3 / §9 Q1 lock):**

Note: `kind='resale'` is materially different from `kind='boxoffice'` / `kind='community'` — it has coral-tinted background + border, a 7px gap (vs. 6px on other variants), and an ALWAYS-PRESENT mono `"resale"` tag appended after the price. The tag is NON-NEGOTIABLE per the design addendum and must never be conditionally hidden. Add copy key `mtListChip.resaleTag` (value `'resale'`) to `CONSUMER_COPY` as part of this task.

```tsx
import { StarGlyph } from '@/components/consumer/glyphs'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const GOLD = 'oklch(0.66 0.14 78)'
const AZURE = 'oklch(0.62 0.12 240)'
const RESALE = 'oklch(0.65 0.20 25)'

export type MTListChipKind = 'boxoffice' | 'community' | 'resale' | null

export interface MTListChipProps {
  price: number
  kind: MTListChipKind
  from?: boolean
}

const colorFor = (kind: MTListChipKind): string => {
  if (kind === 'boxoffice') return GOLD
  if (kind === 'community') return 'var(--fg)'
  if (kind === 'resale') return RESALE
  return 'var(--fg-muted)'
}

export const MTListChip = ({ price, kind, from = true }: MTListChipProps) => {
  const color = colorFor(kind)
  const text = from
    ? `${CONSUMER_COPY.priceRegion.mtListChip.fromPrefix} $${price}`
    : `$${price}`

  // kind='resale' — Appendix A.3 locked spec: coral chrome + always-present resale tag.
  if (kind === 'resale') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7, // NOTE: 7px not 6px — addendum-specified to fit trailing tag
          padding: '5px 10px',
          borderRadius: 8,
          background: `color-mix(in oklab, ${RESALE} 8%, var(--surface-1))`,
          border: `1px solid color-mix(in oklab, ${RESALE} 34%, var(--border))`,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: RESALE,
            flexShrink: 0,
            display: 'inline-block',
          }}
        />
        <span
          style={{
            fontFamily: 'Inter, system-ui',
            fontWeight: 800,
            fontSize: 14,
            color: RESALE,
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
          }}
        >
          {text}
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8.5,
            fontWeight: 700,
            color: RESALE,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            opacity: 0.95,
          }}
        >
          {CONSUMER_COPY.priceRegion.mtListChip.resaleTag}
        </span>
      </span>
    )
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 10px',
        borderRadius: 8,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
      }}
    >
      {kind === 'boxoffice' && <StarGlyph size={10} color={GOLD} />}
      <span
        style={{
          fontFamily: 'Inter, system-ui',
          fontWeight: 800,
          fontSize: 14,
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
          color,
        }}
      >
        {text}
      </span>
    </span>
  )
}
```

**TDD steps:**

- [ ] **Step 1**: Write `pick-headline.test.ts`:
  - empty array → null
  - single boxoffice tier → `{ price: 25, kind: 'boxoffice' }`
  - single standard tier → `kind: 'community'`
  - single resale tier → `kind: 'resale'`
  - multi-tier sorted (cheapest first) → returns first block (PR 3 already sorts)
  - pending-only tier (headline null) → continues to next; returns null when all pending
- [ ] **Step 2**: Implement; re-run green.
- [ ] **Step 3**: Write `MTListChip.test.tsx` covering browse states #1–#5 from §8 (kind='resale' is LOCKED per §9 Q2 / Appendix A.3 — NOT optional, NOT hidden):
  - kind='boxoffice' + from=true → "from $25" gold + star glyph, generic surface-1 background, 6px gap
  - kind='community' + from=true → "from $25" default fg, generic surface-1 background, 6px gap
  - kind='resale' + from=true → "from $85" in coral, coral dot prefix, **always-present mono "resale" tag** rendered AFTER the price (assert the literal text "resale" is in the DOM regardless of other props), coral-tinted background, coral-tinted border, **7px gap** (not 6px)
  - kind='resale' + from=false → "$85" in coral with "resale" tag still present (verify the tag does not depend on the `from` prop)
  - kind=null (no source) → fg-muted, no glyph, generic chrome
  - from=false (non-resale kinds) → no "from" prefix
- [ ] **Step 4**: Implement; re-run green. Add `mtListChip.resaleTag: 'resale'` to `CONSUMER_COPY.priceRegion` in `definitions/copy.ts`.
- [ ] **Step 5**: Barrel exports.
- [ ] **Step 6**: Commit: `feat(consumer): add MTListChip + pickBrowseHeadline parity helper (includes Q2 locked resale variant)`.

---

### Task 7: `MTAddTierSuccess`

**Files:**

- Create: `apps/web/src/components/consumer/price-region/MTAddTierSuccess.tsx`
- Create: `apps/web/src/components/consumer/price-region/MTAddTierSuccess.test.tsx`
- Modify: `apps/web/src/components/consumer/price-region/index.ts`

**Property table reference:** §5 (lines 423–546).

**Interfaces produced:**

```ts
import type { Tier, SourceCategory } from '@concert-crawl/types'

export interface MTAddTierSuccessProps {
  submittedTier: Tier
  submittedPrice: number
  submittedSourceCategory: SourceCategory
  remainingTiers: ReadonlyArray<Tier>
  onAddTier: (tier: Tier) => void
  onDone: () => void
}
```

**Implementation (key snippets per §5):**

```tsx
'use client'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { CheckGlyph, Eyebrow } from '@/components/consumer/glyphs'
import type { Tier, SourceCategory } from '@concert-crawl/types'

const copy = CONSUMER_COPY.priceRegion.addTierSuccess
const AZURE = 'oklch(0.62 0.12 240)'

const SOURCE_LABEL = {
  boxoffice: 'box office',
  standard: 'standard',
  resale: 'resale',
} as const

export interface MTAddTierSuccessProps {
  submittedTier: Tier
  submittedPrice: number
  submittedSourceCategory: SourceCategory
  remainingTiers: ReadonlyArray<Tier>
  onAddTier: (tier: Tier) => void
  onDone: () => void
}

export const MTAddTierSuccess = ({
  submittedTier,
  submittedPrice,
  submittedSourceCategory,
  remainingTiers,
  onAddTier,
  onDone,
}: MTAddTierSuccessProps) => (
  <div
    style={{
      width: '100%',
      boxSizing: 'border-box',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-strong)',
      borderRadius: 14,
      padding: 18,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}
  >
    <div
      style={{
        padding: '16px 14px',
        borderRadius: 12,
        background: 'color-mix(in oklab, var(--success) 6%, var(--surface-1))',
        border: '1px solid var(--success)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            background: 'var(--success)',
            color: 'var(--fg-on-accent)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CheckGlyph size={12} color="var(--fg-on-accent)" />
        </span>
        <span
          style={{
            fontFamily: 'Inter, system-ui',
            fontWeight: 800,
            fontSize: 15,
            color: 'var(--fg)',
          }}
        >
          {copy.headline(submittedTier)}
        </span>
      </div>
      <div
        style={{
          fontFamily: 'Inter, system-ui',
          fontSize: 13,
          lineHeight: 1.5,
          color: 'var(--fg-muted)',
        }}
      >
        {copy.bodyTemplate(
          String(submittedPrice),
          SOURCE_LABEL[submittedSourceCategory] ?? 'community',
        )}
        <strong style={{ color: AZURE }}>{copy.pendingFragment}</strong>
      </div>
    </div>

    {remainingTiers.length > 0 && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Eyebrow>{copy.addAnotherEyebrow}</Eyebrow>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {remainingTiers.map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => onAddTier(tier)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                boxSizing: 'border-box',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '10px 14px',
                borderRadius: 999,
                border: '1px dashed var(--border-strong)',
                background: 'var(--surface-1)',
                color: 'var(--fg)',
                fontFamily: 'Inter, system-ui',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <span style={{ fontWeight: 800, color: 'var(--signal)' }}>+</span>
              {copy.addPillTemplate(tier).replace(/^\+ /, '')}
            </button>
          ))}
        </div>
        <div
          style={{
            fontFamily: 'Inter, system-ui',
            fontSize: 12,
            color: 'var(--fg-muted)',
            lineHeight: 1.5,
          }}
        >
          {copy.helperLine}
        </div>
      </div>
    )}

    <button
      type="button"
      onClick={onDone}
      style={{
        all: 'unset',
        cursor: 'pointer',
        textAlign: 'center',
        height: 44,
        borderRadius: 10,
        border: '1px solid var(--border-strong)',
        color: 'var(--fg)',
        fontFamily: 'Inter, system-ui',
        fontWeight: 700,
        fontSize: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {copy.doneButton}
    </button>
  </div>
)
```

**Locked decision callout (§9 Q4-eng):** `remainingTiers` is driven by client-side session state — "tiers I just submitted in this session" — NOT by re-fetching `priceByTier` after success. Re-fetch causes flicker; the rare two-device race is recoverable on next page load. This component just renders the `remainingTiers` array it's handed; the orchestrator (Task 9) is responsible for filtering against session state.

**TDD steps:**

- [ ] **Step 1**: Write `MTAddTierSuccess.test.tsx`:
  - state #1 first tier submitted: success eyebrow + check glyph + headline "GA price is in. Thanks." + body "$25 box office · sits pending · 1/2 until one more fan confirms." (pending fragment in azure)
  - state #2 remaining tiers: renders `+ Add reserved`, `+ Add vip` pills when `remainingTiers=['Reserved','VIP']`
  - state #3 clicking pill fires `onAddTier(tier)` with the picked tier
  - state #4 (LOCKED per §9 Q4-eng): empty `remainingTiers` → collapses to Done only (no add-another section)
  - clicking Done fires `onDone`
- [ ] **Step 2**: Implement; re-run green.
- [ ] **Step 3**: Barrel export.
- [ ] **Step 4**: Commit: `feat(consumer): add MTAddTierSuccess — sequential add-another-tier success state`.

---

### Task 8: `decision-tree.ts` orchestrator helper

**Files:**

- Create: `apps/web/src/components/consumer/price-region/lib/decision-tree.ts`
- Create: `apps/web/src/components/consumer/price-region/lib/decision-tree.test.ts`

**Why this exists:** `EventDetailClient.tsx`'s `EventDetailPriceBlock` already has ~600 lines of if-tree logic. Adding the 19 price-region states inline would push it past 1500. Extract pure decision logic to a helper that returns a tagged union; the orchestrator just renders.

**Interfaces produced:**

```ts
import type { EventDetailResponse, TierPriceBlock, TicketLink, Tier } from '@concert-crawl/types'

export type PriceRegionDecision =
  | { kind: 'noop' } // server-rendered PriceDisplay handles it
  | { kind: 'sold-out-resale'; resaleLink: TicketLink; faceValueResaleVendor: string; faceValueResaleRange?: string }
  | { kind: 'sold-out-contribute' } // LOCKED §9 Q1 — render ContributeFaceValueCard + SoldOutPriceCard variant='no-listing'
  | { kind: 'no-price-resale'; resaleLink: TicketLink; faceValueResaleVendor: string }
  | { kind: 'no-price-empty' } // LOCKED §9 Q2-eng — fall through to legacy NoPriceCard, no FaceValueCard
  | { kind: 'multi-source-mixed'; entryBlock: TierPriceBlock; crossSourceAlt: TierAlternate; otherTiers: TierPriceBlock[] }
  | { kind: 'multi-tier-shipped'; priceByTier: TierPriceBlock[] } // routes to MultiTierLiveCard / MixedTierCard / TwoPendingStack
  | { kind: 'legacy' } // priceByTier null → existing flat-field code path

export interface PriceRegionInput {
  event: Pick<
    EventDetailResponse,
    'priceByTier' | 'priceStatus' | 'status' | 'ticketLinks' | 'priceVendor'
  >
}

export function decidePriceRegion(input: PriceRegionInput): PriceRegionDecision
```

**Discriminant rename:** the `'sold-out-degraded'` discriminant from the original plan is renamed to `'sold-out-contribute'` to match the Q1-locked `ContributeFaceValueCard` component. The semantics are unchanged but the new name surfaces the contribution-only nature of the state (vs. a degraded comparison card).

**Decision logic (mirrors property table §8 states 1–13):**

```ts
export function decidePriceRegion({ event }: PriceRegionInput): PriceRegionDecision {
  const blocks = event.priceByTier ?? null

  // Sold-out priority — even when priceByTier exists, sold-out trumps.
  if (event.priceStatus === 'soldout' || event.status === 'soldout') {
    const resaleLink = event.ticketLinks?.find((link) => link.kind === 'resale') ?? null
    if (resaleLink === null) {
      // LOCKED §9 Q1 — render ContributeFaceValueCard (single ghost box-office
      // row + signal CTA, no resale row, no outbound ProvenanceCTA) alongside
      // SoldOutPriceCard variant='no-listing'. See property table Appendix A.1
      // + A.2.
      return { kind: 'sold-out-contribute' }
    }
    return {
      kind: 'sold-out-resale',
      resaleLink,
      faceValueResaleVendor: resaleLink.vendor ?? 'Resale',
    }
  }

  // No priceByTier → defer to legacy flat-field logic in EventDetailClient.
  if (blocks === null || blocks.length === 0) {
    const resaleLink = event.ticketLinks?.find((link) => link.kind === 'resale') ?? null
    if (resaleLink !== null) {
      return {
        kind: 'no-price-resale',
        resaleLink,
        faceValueResaleVendor: resaleLink.vendor ?? 'Resale',
      }
    }
    // LOCKED §9 Q2-eng — no resale link AND no priceByTier. Fall through to
    // the existing community-handoff card (NoPriceCard). NO FaceValueCard —
    // pedagogy collapses without a resale anchor.
    return { kind: 'no-price-empty' }
  }

  // Multi-source mixed: the cheapest tier has BOTH a corroborated headline
  // AND a resale alternate in the same tier.
  const entryBlock = blocks[0]
  if (entryBlock?.headline) {
    const crossSourceAlt =
      entryBlock.alternates.find((alt) => alt.sourceCategory === 'resale') ?? null
    if (crossSourceAlt !== null && entryBlock.headline.sourceCategory === 'boxoffice') {
      return {
        kind: 'multi-source-mixed',
        entryBlock,
        crossSourceAlt,
        otherTiers: blocks.slice(1),
      }
    }
  }

  // Default — let MultiTierLiveCard / MixedTierCard / TwoPendingStack handle it.
  return { kind: 'multi-tier-shipped', priceByTier: blocks }
}
```

**TDD steps:**

- [ ] **Step 1**: Write `decision-tree.test.ts` covering state #s 3, 5, 10, 11, 12, 13 from property table §8 (all §9 unknowns are now LOCKED):
  - sold-out + resale link → `sold-out-resale` with vendor
  - sold-out + no resale link → `sold-out-contribute` (LOCKED §9 Q1)
  - no priceByTier + resale link → `no-price-resale`
  - no priceByTier + no links → `no-price-empty` (LOCKED §9 Q2-eng)
  - priceByTier with entry tier mixed sources → `multi-source-mixed`
  - priceByTier with entry tier single source → `multi-tier-shipped`
  - null priceByTier + no soldout → `no-price-empty` (legacy fallback)
- [ ] **Step 2**: Implement; re-run green.
- [ ] **Step 3**: Commit: `feat(consumer): add price-region decision-tree helper`.

---

### Task 9: Wire `EventDetailClient` to consume `priceByTier`

**Files:**

- Modify: `apps/web/src/components/consumer/EventDetailClient.tsx`

**Where:**

`EventDetailPriceBlock` function starts at ~line 280. Insert a new branch **after** the "0. Promoted sold-out" branch (~line 372) and **before** the "1. Pending sold-out report" branch (~line 500). The new branch calls `decidePriceRegion(event)` and:

- For `sold-out-resale`: replaces the disabled `SoldOutCta` (already replaced server-side by `PriceDisplay` flow but we hijack here when `priceByTier` is present) with a stack: `[SoldOutPriceCard (strikethrough header)] + FaceValueCard + ProvenanceCTA kind='resale' outline + ReportFooter`. The existing `SoldOutPriceCard` block at lines 384–497 stays as the upper card; the new wiring appends `FaceValueCard` + `ProvenanceCTA` below it (replacing nothing — pure addition).
- For `sold-out-contribute` (LOCKED §9 Q1 — see property table Appendix A.1 + A.2): render `[SoldOutPriceCard variant='no-listing' (em-dash price + "No tickets listed anywhere we can see — not even resale.")] + ContributeFaceValueCard + ReportFooter`. **No `FaceValueCard`** (it's a different component now), **no `ProvenanceCTA`** (no link to point at). `SoldOutPriceCard` needs a new additive prop — see "Task 9 sub-step" below.
- For `no-price-resale`: keep existing `PriceDisplay` no-price path BUT additionally render `FaceValueCard variant='no-price'` + `ProvenanceCTA kind='resale' outline` underneath. (`PriceDisplay` handles the community-handoff "Submit a price" card; we layer source legibility on top.)
- For `no-price-empty` (LOCKED §9 Q2-eng): fall through to existing legacy logic — `return { kind: 'noop' }` semantically. No `FaceValueCard`, no `ContributeFaceValueCard` — existing community-handoff card carries the state.
- For `multi-source-mixed`: render `<MultiSourceMultiTierCard>` from the `entryBlock` + `crossSourceAlt`; map other-tier `TierPriceBlock` rows to `TierAlternateRow` props.
- For `multi-tier-shipped`: delegate to shipped `MultiTierLiveCard` / `MixedTierCard` / `TwoPendingStack` with `event.priceByTier` mapped to their expected prop shapes. **Note:** the shipped components currently accept the LEGACY flat-field shape — see existing wiring at lines 605–646. The new path maps `priceByTier[0]` → headline, `.alternates` → `alternates`, etc. Keep both call sites side-by-side initially (priceByTier branch above the legacy alternates branch); only flip the legacy code to a `priceByTier == null` guard once the migration is verified green.

**Outbound `ProvenanceCTA` integration:** the existing primary CTA at lines 243–260 of `EventDetailClient` (the live "Get tickets" button) stays for the live-price state, but in PR 4 it should be **replaced by a `ProvenanceCTA`** keyed off `event.ticketLinks[0].kind` so the captions match the source. This is wired alongside the new branch.

**Add the `pendingCountTotal` and `remainingTiers` derivation for the post-submit success state:** after a successful submission via `SubmitPriceModal`, the orchestrator should render `MTAddTierSuccess` for the just-submitted tier. The modal already exposes `onSuccess({ tier, sourceCategory, … })`; capture that in local state and render the success card until the user clicks Done or picks another tier. See Task 11 for the modal-side change.

**TDD steps:**

- [ ] **Step 1**: Read the existing `EventDetailClient.tsx` decision tree lines 280–950 carefully. Map each existing branch to one of the property-table §8 states. Anything unaccounted for is "legacy" and stays put.
- [ ] **Step 2**: Add an additive prop to `SoldOutPriceCard` for the Q1-locked no-listing variant. Per the addendum (property table Appendix A.2), the shipped card needs to support rendering `"—"` (em-dash) instead of a strikethrough price + the caption `"No tickets listed anywhere we can see — not even resale."`. Eng's call on the prop shape — recommended: `variant: 'has-listing' | 'no-listing'` (default `'has-listing'`) OR `showStrikethrough: boolean` (default `true`). Update `SoldOutPriceCard.tsx` + tests for the new variant.
- [ ] **Step 3**: Add the new branches above the existing "0. Promoted sold-out" branch:
  ```tsx
  const decision = decidePriceRegion(event)
  if (decision.kind === 'sold-out-resale') { … }
  if (decision.kind === 'sold-out-contribute') { … }   // LOCKED §9 Q1
  if (decision.kind === 'no-price-resale') { … }
  if (decision.kind === 'multi-source-mixed') { … }
  if (decision.kind === 'multi-tier-shipped') { … }
  // fall through to legacy branches
  ```
- [ ] **Step 4**: For each new branch, render the appropriate component(s). Wire `onAddPrice` handlers to `setSubmitPriceOpen(true)`. For `sold-out-contribute` specifically: render `<SoldOutPriceCard variant='no-listing' />` (or equivalent) ABOVE `<ContributeFaceValueCard onAddPrice={…} />`; do NOT render a `FaceValueCard` and do NOT render a `ProvenanceCTA`.
- [ ] **Step 5**: Add the post-submit success branch — when `submitSuccessPayload !== null`, render `MTAddTierSuccess` and route picked tier to re-open the modal with that tier pre-selected. Per §9 Q4-eng lock: track `submittedThisSession: Set<Tier>` in local React state (NOT a re-fetch of `priceByTier`); derive `remainingTiers` as `TIER_ENUM.filter(t => !submittedThisSession.has(t))`. Reset the set when the modal closes.
- [ ] **Step 6**: Write integration test (`EventDetailClient.test.tsx`, extend if exists, otherwise create alongside):
  - mocked `event` with sold-out + resale ticketLink → renders `FaceValueCard` + `ProvenanceCTA` resale
  - mocked `event` with sold-out + NO ticketLinks → renders `SoldOutPriceCard variant='no-listing'` + `ContributeFaceValueCard`; assert NO `FaceValueCard` and NO `ProvenanceCTA` in the rendered tree (Q1 lock verification)
  - mocked event with `priceByTier` multi-source → renders `MultiSourceMultiTierCard`
  - mocked event with `priceByTier` single-tier boxoffice → renders shipped `MultiTierLiveCard` with `kind='boxoffice'`
  - submit-success state: after `MTAddTierSuccess` fires `onAddTier('VIP')`, verify the session-tracking set updates and the VIP pill is removed on next render (Q4-eng lock verification — no re-fetch)
- [ ] **Step 7**: `pnpm --filter @concert-crawl/web typecheck && pnpm --filter @concert-crawl/web test EventDetailClient`.
- [ ] **Step 8**: Commit: `feat(consumer): wire price-region decision tree into event detail page`.

---

### Task 10: Browse-card chip parity (`EventCard` → `MTListChip`)

**Files:**

- Modify: `apps/web/src/components/consumer/event-card/EventCard.tsx`
- Modify: `apps/web/src/components/consumer/event-card/EventCard.test.tsx` (if it exists; create if not)

**Where:**

Lines 43–119 of `EventCard.tsx` define the local `PriceChip` component and lines 130–135 derive `priceChipText` + `sourceKind`. Replace this with a call to `pickBrowseHeadline(event.priceByTier ?? null)` and render `<MTListChip>` directly.

**Note:** `EventCard` consumes `EventWithVenue`, which does NOT carry `priceByTier`. The browse list endpoint surfaces only flat fields (`ticketPriceMin`, `priceSource`, `priceVendor`). For the parity selection to work, we need `priceByTier` on the list response too.

**⚠️ Hard dependency check:** confirm `EventsListParams` / list endpoint response in `apps/api/src/routes/events.ts` whether `priceByTier` is already on the list — PR 3's plan focused on `/events/:id`. **If not, this task ALSO requires** a small additive change to the list endpoint to populate `priceByTier` per row. This adds ~30 LOC.

If the list endpoint does not yet surface `priceByTier`, the fallback is to keep the existing `priceSource` + `priceVendor` derivation. The browse-card chip then uses an inferred kind from `priceSource` (community/boxoffice/resale) which is what the current `PriceChip` already does. In that case, the migration is **swap the inline `PriceChip` for `MTListChip`** with the same kind-resolution logic, but rendered via the new component's styling per §4 of the table.

**Implementation (fallback path — `priceByTier` NOT on list endpoint):**

```tsx
import { MTListChip, type MTListChipKind } from '@/components/consumer/price-region'

// REPLACES lines 25–37 (resolveKind):
const resolveListChipKind = (
  priceSource: EventWithVenue['priceSource'],
  priceVendor: string | null | undefined,
): MTListChipKind => {
  if (!priceSource) return null
  if (priceSource === 'seatgeek') return 'resale'
  if (priceSource === 'community') {
    if (priceVendor === 'VenueBoxOffice') return 'boxoffice'
    if (priceVendor === 'SeatGeek') return 'resale'
    return 'community'
  }
  return null // primary → no special chip
}

// REPLACES the inline <PriceChip /> render in the JSX (lines 222–223):
const priceNum =
  event.ticketPriceMin != null ? Math.round(parseFloat(event.ticketPriceMin)) : null
const listChipKind = resolveListChipKind(event.priceSource, event.priceVendor)

return (
  // ...
  priceNum !== null ? (
    <MTListChip price={priceNum} kind={listChipKind} from={false /* keep parity with today's single-price chip */} />
  ) : (
    // ...existing "tba" fallback
  )
)
```

**TDD steps:**

- [ ] **Step 1**: Check `apps/api/src/routes/events.ts` for whether the list endpoint surfaces `priceByTier`. **Report findings in commit message.**
- [ ] **Step 2**: If `priceByTier` is NOT on list responses, file follow-up GH issue (per `memory:feedback_open_followup_issues`): "Surface `priceByTier` on `/v1/events` list endpoint for browse-card selection parity". Continue with the fallback path described above.
- [ ] **Step 3**: Write tests for `EventCard`:
  - event with `priceSource='community'` + `priceVendor='VenueBoxOffice'` → renders `MTListChip kind='boxoffice'` with star glyph
  - event with `priceSource='community'` + `priceVendor='Ticketmaster'` → `kind='community'`
  - event with `priceSource='seatgeek'` → `kind='resale'`
  - event with `priceSource='primary'` + Ticketmaster → `kind=null` (no special chip)
  - cancelled/postponed → no chip rendered
  - null `ticketPriceMin` → "tba" fallback
- [ ] **Step 4**: Replace inline `PriceChip` with `MTListChip`. Remove the now-unused `resolveKind`, GOLD, RESALE, COMMUNITY constants from `EventCard.tsx`.
- [ ] **Step 5**: `pnpm --filter @concert-crawl/web test EventCard`.
- [ ] **Step 6**: Commit: `feat(consumer): use MTListChip on browse cards for source-selection parity`.

---

### Task 11: Submit form reorder + `sourceCategory` payload + 409 race toast

**Files:**

- Modify: `apps/web/src/components/consumer/submit-price/SubmitPriceModal.tsx`
- Modify: `apps/web/src/components/consumer/submit-price/SubmitPriceModal.test.tsx`
- Possibly modify: `apps/api/src/routes/submissions.ts` — read first; if `sourceCategory` already optional in POST body, this is a no-op.
- Possibly modify: `packages/types/src/index.ts` — make `howFound` optional on the `PriceSubmission` payload type if not already.

**Property table reference:** §3 (lines 283–372) + submit-form states #1–#6 + state #5 race toast.

**Implementation:**

1. **Form field order** — rewrite the JSX at lines 535–602 so the chip order is:
   - **Source-category** group (NEW) — `[Box office, Standard ticket, Resale]`. None selected by default.
   - **Floor + Ceiling** row — unchanged structure, but floor label is dynamic:
     - `source === 'boxoffice'` → `"Face value"` + hint `"the printed price"`
     - `source === 'standard'` → `"Floor"` (current)
     - `source === 'resale'` → `"Resale price"`
   - **Tier** group — unchanged.
   - **Vendor** group — unchanged but auto-fill to `'Venue'` when source-category is boxoffice; show the `vendorAutoFilledNote` helper line in that case.
2. **Remove `howFound`** — delete the entire chip group at lines 581–589 and `HOW_FOUND_OPTIONS` at line 111–115. Remove `howFound` from `formState`, `validateSubmission`, and all POST/PATCH bodies. Add `sourceCategory: formState.sourceCategory` to the request bodies instead.
3. **Vendor list** — add `Venue` as a vendor option (replacing the `VenueBoxOffice` value used today — the API still accepts `VenueBoxOffice` per the locked decision "drop VenueBoxOffice"; this PR keeps that admin/contract change for later but UPDATES the consumer-side display label to "Venue" per round-3 locked decision #2).
   - Actually re-read `memory:project_price_source_discoverability`: "Drop `VenueBoxOffice` vendor enum value (source-category replaces it; when source=boxoffice, vendor auto-implies the venue)". This is locked but happens in the Contract PR, NOT here. For PR 4: the consumer UI sends `vendor='VenueBoxOffice'` when source=boxoffice — but displays it as `"Venue"` to the user (relabel only).
4. **409 race-case toast** — in the POST/PATCH handler when the response is `409`, surface the `disputeRace409Toast` copy via existing toast mechanism (check what `submit-price/` uses today; if no toast lib, add a transient error message in the modal). Source: `memory:project_pr4_dispute_affordance_hiding` defensive 409.
5. **Edit-mode safety** — the existing edit-mode payload still sends `howFound`. After removing the field, edit-mode reuses the existing `submission.howFound` value (derived from a 1:1 mapping, e.g. boxoffice→bought_myself, resale→saw_listing, standard→saw_listing) OR re-issues the request without `howFound` if the API accepts that. Read `apps/api/src/routes/submissions.ts` PATCH handler to confirm.

**TDD steps:**

- [ ] **Step 1**: Read `apps/api/src/routes/submissions.ts` for the current POST/PATCH body schemas. Document what the API accepts in the commit message.
- [ ] **Step 2**: Update `SubmitPriceModal.test.tsx`:
  - field order: source FIRST in the DOM order
  - clicking source 'boxoffice' changes floor label to "Face value" with hint "the printed price"
  - clicking source 'resale' changes floor label to "Resale price"
  - vendor field is required AND auto-fills to "Venue" with `vendorAutoFilledNote` visible when source=boxoffice
  - submit POSTs `{ floor, ceiling, tier, vendor: 'VenueBoxOffice', sourceCategory: 'boxoffice' }` — no `howFound` field
  - 409 response → race toast surfaces
  - 201 success calls `onSuccess` with `{ tier, sourceCategory, id, priceMin, priceMax }`
- [ ] **Step 3**: Implement form rewrite. Remove `howFound` chip group + state + payload field. Add `sourceCategory` chip group + state + payload field. Add dynamic floor label + hint. Add 409 toast handler.
- [ ] **Step 4**: Run tests; expect green.
- [ ] **Step 5**: Run typecheck across packages — if `howFound` is required on the API submission-input type and we drop it from the request payload, typecheck will fail. Fix by making `howFound` optional in `packages/types/src/index.ts` OR sending a sentinel value (`'saw_listing'`) when omitting from UI.
- [ ] **Step 6**: Commit: `feat(consumer): provenance-first submit form + sourceCategory payload + 409 race toast`.

---

### Task 12: Passive surfaces — dispute-affordance hiding + admin-defer pill

**Files:**

- Modify: `apps/web/src/components/consumer/EventDetailClient.tsx`
- Modify: `apps/web/src/components/consumer/DisputedPriceCard.tsx`
- Modify: `apps/web/src/components/consumer/DisputedPriceCard.test.tsx` (or create)

**Property table reference:** states #17 + #18; Appendix A.4 (Q3 lock — pointer copy + styling); `memory:project_pr4_dispute_affordance_hiding`; `memory:reference_consumer_notifications_gap` (passive surfacing is acceptable until #737 ships).

**State #17 — REPLACE the dispute affordance with a counter pointer (LOCKED §9 Q3 — see Appendix A.4):**

The dispute-entry affordance lives in three places:

1. `PendingCardB`'s footer "Saw a different number?" button (lines 336–351 of `PendingCardB.tsx`).
2. `CommunityPriceChip`'s "Saw the same? Confirm" button (line 71–78 of `CommunityPriceChip.tsx`).
3. The submit-price card CTA when a counter is pending (`SubmitPriceCardCta`).

Per the Q3 lock, the `PendingCardB` footer link is REPLACED (not silently hidden) with a coral pointer link in the same footer slot. The orchestrator (`EventDetailClient`) is the gate. When `event.counterSubmission !== null` (legacy field) OR `event.priceByTier[i].counterSubmission !== null` (per-tier), it passes a `counterPointerHref` (or equivalent — see below) to the affected card.

**Approach:** add a `counterPointer?: { href: string } | null` prop to `PendingCardB` (and any other card that surfaces the "Saw a different number?" link). When non-null, the `view === 'other'` footer renders the coral pointer link from Appendix A.4 INSTEAD OF the "Saw a different number?" button. `Confirm price` button stays unchanged. When null, the existing dispute link renders as today.

Pointer styling (LOCKED — copy verbatim from Appendix A.4):

| Property | Value |
|----------|-------|
| display | `inline-flex` |
| align-items | `center` |
| gap | `6px` |
| text-decoration | `none` |
| font-family | `'JetBrains Mono', monospace` |
| font-size | `10px` |
| color | `oklch(0.65 0.20 25)` (coral — NOT muted, NOT `var(--fg-subtle)`) |
| letter-spacing | `0.04em` |
| text-transform | `uppercase` |
| font-weight | `700` |

Coral dot prefix: 5×5, border-radius 50%, background `oklch(0.65 0.20 25)`.

Label text: `"Someone's contesting this — see the counter"` (add to `CONSUMER_COPY.priceRegion.dispute.counterPointerLabel`).

Arrow SVG: width=11, height=11, viewBox=`0 0 12 12`, path d=`M2.5 6h7M6 2.5l3.5 3.5L6 9.5`, stroke=`currentColor`, stroke-width=1.8, stroke-linecap=round, stroke-linejoin=round.

`href` semantics: points at the counter card on the same page. Implementation can be a fragment anchor (`#counter-<id>`) OR an in-page `scrollIntoView` handler — eng's call. Recommendation: fragment anchor with the counter card rendering an `id={`counter-${tierOrSubmissionId}`}` attribute; this works without any client-side JS and gives free deep-link behavior.

At the orchestrator, compute the pointer per tier:

```tsx
const counterPointerFor = (tier: string): { href: string } | null => {
  const block = event.priceByTier?.find((blk) => blk.tier === tier)
  if (block?.counterSubmission == null) return null
  return { href: `#counter-${block.counterSubmission.id}` }
}
```

And pass `counterPointer={counterPointerFor(sub.tier)}` to each `<PendingCardB>` render. For the legacy `event.counterSubmission !== null` case (single-tier), the existing `DisputedPriceCard` branch already renders the counter card; the swap just wires the pointer to its anchor.

**State #18 — admin defer pill:**

`event.counterSubmission.lastAdminActionKind === 'defer'` triggers a quiet pill on the counter card. Add a `lastAdminActionKind?: 'defer' | null` prop to `DisputedPriceCard`. When `'defer'`, render a small pill near the card header:

```tsx
{lastAdminActionKind === 'defer' && (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: 999,
      background: 'color-mix(in oklab, var(--warning) 10%, transparent)',
      color: 'var(--warning)',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 9,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      fontWeight: 700,
    }}
  >
    {CONSUMER_COPY.priceRegion.adminDeferPillLabel}
  </span>
)}
```

**TDD steps:**

- [ ] **Step 1**: Add `dispute.counterPointerLabel: "Someone's contesting this — see the counter"` to `CONSUMER_COPY.priceRegion` in `definitions/copy.ts`. Add a small inline `CounterPointerLink` component (either as a private helper inside `PendingCardB.tsx` or as a shared file under `price-region/` — eng's call; recommend shared if `DisputedPriceCard` also needs it).
- [ ] **Step 2**: Update `PendingCardB.tsx` props with `counterPointer?: { href: string } | null`. In the `view === 'other'` branch footer, render the coral `CounterPointerLink` INSTEAD OF the "Saw a different number?" button when `counterPointer != null`. The `Confirm price` button stays unchanged in both cases. Use the styling from Appendix A.4 verbatim (mono 10px, coral, 5×5 coral dot, 11×11 arrow SVG, 6px gap).
- [ ] **Step 3**: Update `PendingCardB.test.tsx`:
  - when `counterPointer={{ href: '#counter-abc' }}`, the dispute link "Saw a different number?" is NOT in the DOM
  - the coral pointer link IS in the DOM with text "Someone's contesting this — see the counter", `href="#counter-abc"`, color `oklch(0.65 0.20 25)`, mono font, uppercase
  - the `Confirm price` button is still present in both cases
  - when `counterPointer={null}` (or omitted), the original "Saw a different number?" button renders as today
- [ ] **Step 4**: Update `EventDetailClient` orchestrator to compute `counterPointerFor(sub.tier)` per tier and pass to each `<PendingCardB>` render. When `DisputedPriceCard` renders the counter, ensure it carries the matching `id={`counter-${counterSubmission.id}`}` anchor target.
- [ ] **Step 5**: Update `DisputedPriceCard.tsx` props with `lastAdminActionKind?: 'defer' | null`. Render the admin-defer pill near the header when truthy. Add the `id` anchor on the counter card root for the Q3 pointer to land on.
- [ ] **Step 6**: Update `DisputedPriceCard.test.tsx` — pill appears when `lastAdminActionKind='defer'`; absent when null. `id` attribute is present and matches `counter-${counterSubmission.id}`.
- [ ] **Step 7**: Wire `lastAdminActionKind` through from `event.counterSubmission` (already on the type per `packages/types/src/index.ts:474`) and from `event.priceByTier[].counterSubmission`.
- [ ] **Step 8**: Commit: `feat(consumer): passive surfaces — counter pointer (Q3 lock) + admin defer pill`.

---

### Task 13: Release-notes entry + final sweep

**Files:**

- Modify: `apps/web/src/lib/definitions/releases.ts`

**Release entry** (single, concise; per CLAUDE.md "Release notes on user-facing PRs"):

```ts
{
  date: '2026-06-24',
  title: 'Resale is not face value (and we made that obvious)',
  body: "Sold-out shows now explain when only resale is left and ask you for the box-office price. The price card also breaks out tiers (GA, Reserved, VIP) one row each — fewer guesses, more truth. We dropped 'How'd you find out?' from the submission form in favor of asking the more direct question: 'Where's this price from?'",
  tag: 'feature',
}
```

(Match the actual `releases.ts` shape; this is illustrative.)

**Sweep:**

- [ ] **Step 1**: `pnpm typecheck` from worktree root — expect green.
- [ ] **Step 2**: `pnpm lint` — fix any new violations.
- [ ] **Step 3**: `pnpm test` — full unit + RTL test suite.
- [ ] **Step 4**: `pnpm --filter @concert-crawl/web test` again to confirm web-specific suite is clean.
- [ ] **Step 5**: `pnpm --filter @concert-crawl/api test:integration` (one-time, since orchestrator wiring may interact with submissions endpoint changes if Task 11 modified `apps/api/src/routes/submissions.ts`).
- [ ] **Step 6**: Manual smoke in `pnpm dev`: open an event with multi-tier priceByTier; open sold-out event; trigger submit modal; verify field order; verify success → MTAddTierSuccess.
- [ ] **Step 7**: Commit: `chore(consumer): release-notes entry + final test sweep`.

---

### Task 14: `design-review` + open PR + Copilot iteration

**Files:** (none modified beyond PR description)

**Workflow:**

- [ ] **Step 1**: Run the `design-review` skill against `design/design_handoff_price_source_discoverability/`. Per `memory:feedback_design_review_component_scoped` + `memory:feedback_state_reachability_in_design_review`:
  - Agent 1 (enumeration): split per-component — one parallel pass for each of FaceValueCard, ProvenanceCTA, MultiSourceMultiTierCard, MTListChip, MTAddTierSuccess, AltSourceRow, the EventCard chip, the SubmitPriceModal form. Concatenate outputs.
  - Agent 2 (verification): TWO passes:
    - Pass A — visual property verification (compare each property to property table)
    - Pass B — state reachability (verify every state in property table §8 has a triggering condition in the type AND a branch in the implementation)
- [ ] **Step 2**: Resolve every Crit/High/Medium issue surfaced by design-review BEFORE opening the PR. Low/Nit can wait for Copilot pass.
- [ ] **Step 3**: Push branch and open PR. Title: `feat(consumer): price-source discoverability + multi-tier consumer UI (PR 4 of 4)`. Body must use `.github/pull_request_template.md`. Reference closes #641, closes #644. Link `docs/superpowers/design-tables/price-source-consumer-ui.md`. No "Generated with Claude Code" footer per `memory:feedback_pr_no_claude_footer`.
- [ ] **Step 4**: Request Copilot review via the verified REST POST pattern (`memory:feedback_copilot_auto_review`). Verify `response.requested_reviewers[].login` is non-empty.
- [ ] **Step 5**: Address ALL valid Copilot review comments per `memory:feedback_address_all_valid_review_comments`. Iterate multi-round per `memory:feedback_copilot_review_multi_round`; merge only after 2 SUCCESSFUL non-errored reviews where the only remaining feedback is Low/Nit.
- [ ] **Step 6**: Merge when CI is green and Copilot is satisfied. Update `memory:project_price_source_discoverability` to mark PR 4 ✅ merged.

---

## §9. Locked decisions — design addendum 2026-06-24

Three open consumer-UI questions resolved by design's targeted addendum (PR4-ADDENDUM.md). All addendum files committed to `design/design_handoff_price_source_discoverability/` (PR4-ADDENDUM.md + pr4-addendum-mocks.jsx + the HTML preview). Property table Appendix A enumerates every CSS value. No `⚠️` flags remain on these states — defaults are LOCKED.

**Q1 (state #11 — sold-out, no resale, no primary, no boxoffice):** Render a NEW component `ContributeFaceValueCard` — sibling of `FaceValueCard` (NOT a variant; the comparison lesson collapses without a resale anchor). Single ghost box-office row + signal CTA. No outbound `ProvenanceCTA`. New copy per Appendix A.1.

Additionally, `SoldOutPriceCard` gains a `variant='no-listing'` prop (or equivalent — eng's call; could also be `showStrikethrough: boolean`) that shows `"—"` instead of strikethrough price + caption `"No tickets listed anywhere we can see — not even resale."` per Appendix A.2.

→ **Task 3** (`FaceValueCard`) adds `ContributeFaceValueCard.tsx` as a sibling output file.
→ **Task 8** (`decision-tree.ts`) returns `{ kind: 'sold-out-contribute' }` (renamed from the original plan's `'sold-out-degraded'`) to route this state to `ContributeFaceValueCard`.
→ **Task 9** (`EventDetailClient` wiring) renders `ContributeFaceValueCard` (NOT `FaceValueCard variant='sold-out-degraded'` as the original plan had it) on the `sold-out-contribute` branch.
→ **Task 9** also wires `SoldOutPriceCard` with the new `variant='no-listing'` (or equivalent) prop for this state.

**Q2 (browse state #3 — cheapest tier is resale-only):** New variant `MT_ListChip kind='resale'` — coral dot + `"from $X"` in coral + always-present mono `"resale"` tag. NON-NEGOTIABLE that the tag is always present (color alone is too quiet at scan speed). Background and border are coral-tinted; gap is 7px (not the 6px used by other variants).

→ **Task 6** (`MTListChip`) extends the existing component to support `kind='resale'` per Appendix A.3. TDD test cases must explicitly include: coral background and border, always-present `"resale"` mono tag (no prop toggle hides it), 7px gap (vs. 6px on other variants).

**Q3 (state #17 — dispute affordance suppression):** Replace the `"Saw a different number?"` footer link with a coral pointer `"Someone's contesting this — see the counter →"` in the SAME footer slot. `Confirm price` button stays unchanged. The pointer scrolls/navigates to the counter card on the same page (implementation: fragment anchor or `scrollIntoView` — eng's call). Color is coral (`oklch(0.65 0.20 25)`), NOT muted.

→ **Task 12** (passive surfaces) handles the footer swap. The dispute-entry "Saw a different number?" link is replaced (not just hidden) per Appendix A.4. Pointer styling: mono 10px, coral, 5×5 coral dot prefix, 11×11 arrow SVG.

### Eng-owned defaults — locked here for the record

These were not design questions but eng decisions that needed an explicit lock:

**Q2-eng (no-price + no ticket links, state #13):** Fall through to the legacy community-handoff card (existing `NoPriceCard` / `PriceDisplay` no-price path); NO `FaceValueCard`. Pedagogy collapses without a resale anchor — same logic as Q1.

→ **Task 8** decision-tree returns `no-price-empty` for this case; the orchestrator falls through to existing legacy logic (no new component).

**Q4-eng (submit-success add-another-tier picker drive, success states #2/#4):** Client-side session state of "tiers I just submitted in this session." Re-fetching `priceByTier` after each tier-success creates flicker; the rare race (two devices submitting simultaneously) is recoverable on next load.

→ **Task 7** (`MT_AddTierSuccess`) uses local React state to track submitted tiers. `remainingTiers` prop is derived at the orchestrator (Task 9) as `TIER_ENUM.filter(t => !submittedThisSession.has(t))`. No re-fetch on success.

(Number 6 from the original §9 list — engagement pill — was already not an unknown; it's a passive surface from #697 that PR 4 lights up automatically via `lastAdminActionKind === 'defer'`. Task 12 covers it.)

---

## Estimated Commit Count

14 commits — one per task. Multi-round Copilot fixes add ~2–6 follow-up commits in Task 14.

## Plan Self-Review

- Every §1–§6 property table section maps to a task: §1 → Task 3, §2 → Task 2, §3 → Task 11, §4 → Task 6, §5 → Task 7, §6 → Tasks 4 + 5. Appendix A.1 (`ContributeFaceValueCard`) → Task 3; A.2 (`SoldOutPriceCard variant='no-listing'`) → Task 9 step 2; A.3 (`MT_ListChip kind='resale'`) → Task 6; A.4 (counter pointer) → Task 12.
- Every §8 state has a branch: states 1–9 + 19 → shipped components reused via Task 9 (multi-tier-shipped branch); state 5 → Task 5 (multi-source-mixed); state 10 → Task 9 (sold-out-resale); state 11 → Task 3 + Task 9 (sold-out-contribute — LOCKED §9 Q1); state 12 → Task 9 (no-price-resale); state 13 → Task 9 (no-price-empty — LOCKED §9 Q2-eng, falls through to legacy); states 14/15/16 → Task 2 + Task 9 ProvenanceCTA wiring; state 17 → Task 12 (counter pointer — LOCKED §9 Q3); state 18 → Task 12.
- Every submit-form state #1–#7 → Task 11.
- Every submit-success state #1–#6 → Task 7 (component) + Task 9 (orchestration — LOCKED §9 Q4-eng uses client session state).
- Every browse state #1–#7 → Task 10. Browse #3 (resale-only chip) is LOCKED §9 Q2 — Task 6 ships `MT_ListChip kind='resale'` per Appendix A.3.
- Every locked decision is honored: no `VenueBoxOffice` vendor display (Task 11 step 3 keeps it as the value but relabels to "Venue"); SeatGeek stays in vendor enum (Task 11 step 3 — included in `VENDOR_OPTIONS`); tier enum unchanged (Task 7 uses `Tier` from types unchanged); 1/2 confirmation copy in MTAddTierSuccess (Task 7); box-office exempt from staleness — implicit, not a UI concern in PR 4. All §9 addendum locks (Q1/Q2/Q3/Q2-eng/Q4-eng) honored — see §9 section above.
