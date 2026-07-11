# Multi-Tier Price Submission Implementation Plan — Part 2 of 4 (Modal UI)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `SubmitPriceModal` into the bundle form's UI — bundle-level source/vendor fields once at the top, repeatable per-tier panels below. Submission stays on the single POST until Part 3 (Task 5) swaps it to the batch endpoint.

**Read Part 1 first:** `2026-07-10-multi-tier-price-submission-1-api.md` — its **Global Constraints** section applies to every task here.

**Spec:** `docs/superpowers/specs/2026-07-10-multi-tier-price-submission-design.md` §3 (UI) + §4 (edit mode). Issue #832.

---

## Task 3: ChipGroup — per-option `disabled`

**Files:**

- Modify: `apps/web/src/components/consumer/ChipGroup.tsx` (100 lines)
- Test: `apps/web/src/components/consumer/ChipGroup.test.tsx` (new)

**Interfaces:**

- Produces: `ChipOption` gains `disabled?: boolean`. A disabled option renders muted + non-interactive while its siblings stay clickable. Task 4 relies on this to grey out tiers already chosen in other panels. The existing group-level `disabled` prop is unchanged.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/consumer/ChipGroup.test.tsx`:

```tsx
// @vitest-environment jsdom

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChipGroup } from './ChipGroup'

const OPTIONS = [
  { value: 'GA', label: 'GA' },
  { value: 'VIP', label: 'VIP', disabled: true },
]

describe('ChipGroup — per-option disabled', () => {
  it('disables only the flagged option and swallows its clicks', () => {
    const onChange = vi.fn()
    render(
      <ChipGroup
        label="Tier"
        options={OPTIONS}
        value={null}
        onChange={onChange}
      />,
    )
    const gaButton = screen.getByText('GA').closest('button')
    const vipButton = screen.getByText('VIP').closest('button')
    expect(gaButton?.disabled).toBe(false)
    expect(vipButton?.disabled).toBe(true)
    fireEvent.click(vipButton!)
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(gaButton!)
    expect(onChange).toHaveBeenCalledWith('GA')
  })

  it('group-level disabled still disables every option', () => {
    const onChange = vi.fn()
    render(
      <ChipGroup
        label="Tier"
        options={[{ value: 'GA', label: 'GA' }]}
        value={null}
        onChange={onChange}
        disabled
      />,
    )
    const gaButton = screen.getByText('GA').closest('button')
    expect(gaButton?.disabled).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @concert-crawl/web test -- ChipGroup`
Expected: FAIL — `vipButton?.disabled` is `false` (per-option flag not implemented; also a TS error that `disabled` is not a `ChipOption` property).

- [ ] **Step 3: Implement**

In `ChipGroup.tsx`, extend `ChipOption` (lines 3–6):

```typescript
interface ChipOption {
  value: string
  label: string
  // Disable a single chip while its siblings stay interactive. Used by the
  // multi-tier submit form to grey out tiers already chosen in another panel.
  disabled?: boolean
}
```

Then in the options map (lines 59–82), compute a combined flag and use it for both the `disabled` attribute and the muted className branch:

```tsx
{options.map((opt) => {
  const isActive = value === opt.value
  const isDisabled = disabled || opt.disabled
  return (
    <button
      key={opt.value}
      type="button"
      aria-pressed={isActive}
      disabled={isDisabled}
      onClick={() => onChange(opt.value)}
      className={[
        'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
        isDisabled
          ? 'border-border text-fg-muted cursor-not-allowed opacity-60'
          : isActive
            ? 'border-signal text-signal bg-signal/10'
            : error
              ? 'border-warning text-fg hover:border-fg-muted'
              : 'border-border-strong text-fg hover:border-fg-muted',
      ].join(' ')}
    >
      {opt.label}
    </button>
  )
})}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @concert-crawl/web test -- ChipGroup`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/consumer/ChipGroup.tsx apps/web/src/components/consumer/ChipGroup.test.tsx
git commit -m "feat(web): per-option disabled flag on ChipGroup for multi-tier panels"
```

---

## Task 4: SubmitPriceModal — panel state, copy, multi-tier UI

**Files:**

- Modify: `apps/web/src/components/consumer/definitions/copy.ts` (add `multiTier` block inside `submitPriceV2`, which ends at line 1144)
- Modify: `apps/web/src/components/consumer/submit-price/SubmitPriceModal.tsx` (1239 lines)
- Test: `apps/web/src/components/consumer/submit-price/SubmitPriceModal.test.tsx` (extend)

**Interfaces:**

- Consumes: Task 3's per-option `disabled` on `ChipOption`.
- Produces: internal state shape used by Task 5's submit wiring —
  `TierPanelState { tier: string | null; floor: string; ceiling: string }`,
  `panels: TierPanelState[]`, `bundleState: { sourceCategory: SourceCategory | null; vendor: string | null }`,
  `panelErrors` / `panelWarnings: Array<Partial<Record<string, string>>>`, `bundleErrors: Partial<Record<string, string>>`,
  helpers `addPanel()`, `removePanel(panelIndex)`, `updatePanel(panelIndex, patch)`, `tierOptionsForPanel(panelIndex)`.
- Scope note: in this task `handleSubmit` is only *adapted* to read `panels[0]` + `bundleState` (still the single POST). Multi-panel submission is Task 5 — an intermediate build where a 2-panel form submits only panel 0 is expected and not tested here.
- Scope note: the batch API accepts an optional `note`, but today's form has no note input and this refactor does not add one (parity with the shipped form). Adding a note field is a separate design decision — do not build it.

- [ ] **Step 1: Add the copy keys**

In `apps/web/src/components/consumer/definitions/copy.ts`, inside the `submitPriceV2` object, immediately after `vendorAutoFilledNote` (line 1143):

```typescript
    // Multi-tier bundle form (#832). {tier} and {count} are replaced at the
    // call site with .replace() — no i18n framework in play.
    multiTier: {
      addTierButton: '+ Add another tier',
      panelFallbackHeading: 'Another tier',
      // {tier} = the panel's tier name, or panelFallbackHeading when unset.
      removeTierAriaLabel: 'Remove {tier}',
      submitButtonMulti: 'Submit {count} tiers',
      submitButtonEdit: 'Save changes',
      errorAlreadySubmitted:
        'You already submitted a {tier} price — edit it from the event page.',
    },
```

- [ ] **Step 2: Write the failing tests**

Append to `SubmitPriceModal.test.tsx` (reuses the file's existing `defaultProps` and mock setup; the default `global.fetch` mock at the top returns "no existing submission"):

```tsx
describe('SubmitPriceModal — multi-tier panels (#832)', () => {
  it('starts with one panel and no remove control', async () => {
    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())
    expect(screen.getAllByText('Tier')).toHaveLength(1)
    expect(screen.queryByLabelText(/^Remove /)).toBeNull()
    expect(screen.getByText('+ Add another tier')).toBeTruthy()
  })

  it('"+ Add another tier" appends a panel and updates the submit label', async () => {
    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())
    fireEvent.click(screen.getByText('+ Add another tier'))
    expect(screen.getAllByText('Tier')).toHaveLength(2)
    expect(screen.getByText('Submit 2 tiers')).toBeTruthy()
    expect(screen.queryByText('Submit price')).toBeNull()
    // Both panels now show a remove control
    expect(screen.getAllByLabelText(/^Remove /)).toHaveLength(2)
  })

  it('a tier chosen in one panel is disabled in the other panel', async () => {
    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())
    fireEvent.click(screen.getByText('GA')) // select GA in panel 0
    fireEvent.click(screen.getByText('+ Add another tier'))
    const gaChips = screen
      .getAllByText('GA')
      .map((node) => node.closest('button'))
    expect(gaChips).toHaveLength(2)
    expect(gaChips[0]?.disabled).toBe(false) // own selection stays active
    expect(gaChips[1]?.disabled).toBe(true) // other panel's GA greyed out
  })

  it('removing a panel re-enables its tier elsewhere and restores the single-panel label', async () => {
    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())
    fireEvent.click(screen.getByText('GA'))
    fireEvent.click(screen.getByText('+ Add another tier'))
    // Panel 0 is the GA panel → its remove control is labeled "Remove GA"
    fireEvent.click(screen.getByLabelText('Remove GA'))
    expect(screen.getAllByText('Tier')).toHaveLength(1)
    expect(screen.getByText('Submit price')).toBeTruthy()
    const gaButton = screen.getByText('GA').closest('button')
    expect(gaButton?.disabled).toBe(false)
    expect(screen.queryByLabelText(/^Remove /)).toBeNull()
  })

  it('hides the add-tier button once all 5 tiers have panels', async () => {
    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())
    for (let clickCount = 0; clickCount < 4; clickCount++) {
      fireEvent.click(screen.getByText('+ Add another tier'))
    }
    expect(screen.getAllByText('Tier')).toHaveLength(5)
    expect(screen.queryByText('+ Add another tier')).toBeNull()
  })

  it('bundle fields (source, vendor) render once, above the tier panels', async () => {
    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())
    fireEvent.click(screen.getByText('+ Add another tier'))
    expect(screen.getAllByText("Where's this price from?")).toHaveLength(1)
    expect(screen.getAllByText('Vendor')).toHaveLength(1)
    // Vendor (bundle-level) must precede the first Tier group in DOM order
    const vendorLabel = screen.getByText('Vendor')
    const firstTierLabel = screen.getAllByText('Tier')[0]!
    const orderPosition = vendorLabel.compareDocumentPosition(firstTierLabel)
    expect(orderPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('SubmitPriceModal — edit mode constraints (#832)', () => {
  it('edit mode locks the tier, hides add-tier, and labels the button "Save changes"', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          alreadySubmitted: true,
          userSubmission: {
            id: 'sub-1',
            priceMin: '45',
            priceMax: null,
            tier: 'GA',
            vendor: 'AXS',
            howFound: 'saw_listing',
            sourceCategory: 'standard',
          },
        },
      }),
    })
    render(<SubmitPriceModal {...defaultProps} openInEditMode />)
    await waitFor(() => expect(screen.getByText('Save changes')).toBeTruthy())
    expect(screen.queryByText('+ Add another tier')).toBeNull()
    expect(screen.queryByLabelText(/^Remove /)).toBeNull()
    const gaButton = screen.getByText('GA').closest('button')
    const vipButton = screen.getByText('VIP').closest('button')
    expect(gaButton?.disabled).toBe(true)
    expect(vipButton?.disabled).toBe(true)
    // Prefilled floor from the existing submission
    const floorInput = screen.getByLabelText(/Floor/i)
    expect((floorInput as HTMLInputElement).value).toBe('45')
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm --filter @concert-crawl/web test -- SubmitPriceModal`
Expected: FAIL — no add-tier button, single `Tier` group only, no `Save changes` label.

- [ ] **Step 4: Refactor the modal state + JSX**

All edits in `SubmitPriceModal.tsx`. This step replaces the single `formState: SubmissionInput` with panel + bundle state and reorders the form. Keep every helper, guard, sub-view, and atom that isn't named below exactly as-is.

**4a — Panel types + helper** (below `SOURCE_CATEGORY_OPTIONS`, line 175):

```typescript
// One repeatable tier panel of the bundle form (#832). Bundle-level fields
// (sourceCategory, vendor) live in BundleFieldsState — asked once, shared by
// every row on submit.
interface TierPanelState {
  tier: string | null
  floor: string
  ceiling: string
}

interface BundleFieldsState {
  sourceCategory: SourceCategory | null
  vendor: string | null
}

const emptyPanel = (tier: Tier | null = null): TierPanelState => ({
  tier,
  floor: '',
  ceiling: '',
})
```

**4b — State replacement** (lines 195–212). Replace `formState`, `fieldErrors`, `fieldWarnings` with:

```typescript
const [bundleState, setBundleState] = useState<BundleFieldsState>({
  sourceCategory: null,
  vendor: null,
})
const [panels, setPanels] = useState<TierPanelState[]>([
  emptyPanel(preselectedTier),
])
const [bundleErrors, setBundleErrors] = useState<
  Partial<Record<string, string>>
>({})
const [panelErrors, setPanelErrors] = useState<
  Array<Partial<Record<string, string>>>
>([{}])
const [panelWarnings, setPanelWarnings] = useState<
  Array<Partial<Record<string, string>>>
>([{}])
```

Keep `raceToast` untouched in this task (it is removed in Task 5 with its handler branch).

**4c — Open-effect reset** (lines 219–243): replace `setFieldErrors({})`, `setFieldWarnings({})` and the `setFormState({...})` reset with:

```typescript
setBundleErrors({})
setPanelErrors([{}])
setPanelWarnings([{}])
setBundleState({ sourceCategory: null, vendor: null })
setPanels([emptyPanel(preselectedTier)])
```

(The existing comment about the modal staying mounted across opens still applies — keep it.)

**4d — Edit-mode prefill** (both places that call `setFormState` with an existing submission: the open-effect at lines 271–279 and `AlreadySubmittedState`'s `onEdit` at lines 575–585). Replace each with:

```typescript
setBundleState({
  vendor: body.data.userSubmission.vendor,
  sourceCategory: fallbackSourceCategory(body.data.userSubmission),
})
setPanels([
  {
    tier: body.data.userSubmission.tier,
    floor: body.data.userSubmission.priceMin,
    ceiling: body.data.userSubmission.priceMax ?? '',
  },
])
```

(In the `onEdit` callback the source object is `existingSubmission` instead of `body.data.userSubmission`; also replace its `setFieldErrors({})` / `setFieldWarnings({})` with `setBundleErrors({})` / `setPanelErrors([{}])` / `setPanelWarnings([{}])`.)

**4e — Panel handlers** (inside the component, after the open-effect):

```typescript
const addPanel = () => {
  setPanels((prev) => [...prev, emptyPanel()])
  setPanelErrors((prev) => [...prev, {}])
  setPanelWarnings((prev) => [...prev, {}])
}

const removePanel = (panelIndex: number) => {
  setPanels((prev) => prev.filter((_row, idx) => idx !== panelIndex))
  setPanelErrors((prev) => prev.filter((_row, idx) => idx !== panelIndex))
  setPanelWarnings((prev) => prev.filter((_row, idx) => idx !== panelIndex))
}

const updatePanel = (panelIndex: number, patch: Partial<TierPanelState>) => {
  setPanels((prev) =>
    prev.map((panel, idx) =>
      idx === panelIndex ? { ...panel, ...patch } : panel,
    ),
  )
}

// Tiers already selected in OTHER panels are disabled — the same tier can
// never appear twice in a bundle (mirrors the API's uniqueness refine).
const tierOptionsForPanel = (panelIndex: number) =>
  TIER_OPTIONS.map((option) => ({
    ...option,
    disabled: panels.some(
      (panel, idx) => idx !== panelIndex && panel.tier === option.value,
    ),
  }))
```

**4f — Interim `handleSubmit` adaptation.** Do NOT change the endpoints in this task. Mechanically rebind the existing handler to the new state so the file compiles and existing behavior tests stay green:

- `validateSubmission(formState)` → `validateSubmission({ floor: firstPanel.floor, ceiling: firstPanel.ceiling, tier: firstPanel.tier, vendor: bundleState.vendor, sourceCategory: bundleState.sourceCategory })` where `const firstPanel = panels[0] ?? emptyPanel()` is declared at the top of the handler.
- `setFieldErrors(validation.errors)` → split: sourceCategory/vendor keys into `setBundleErrors`, the rest into `setPanelErrors([rowErrors])`; `setFieldWarnings(validation.warnings)` → `setPanelWarnings([validation.warnings])`.
- Every other `formState.floor|ceiling|tier` read → `firstPanel.…`; every `formState.vendor|sourceCategory` read → `bundleState.…`.
- Update the `useCallback` dependency array: `formState` → `panels, bundleState`.

**4g — Submit label** (footer, lines 525–529):

```tsx
const submitLabel = isEditMode
  ? CONSUMER_COPY.submitPriceV2.multiTier.submitButtonEdit
  : panels.length > 1
    ? CONSUMER_COPY.submitPriceV2.multiTier.submitButtonMulti.replace(
        '{count}',
        String(panels.length),
      )
    : CONSUMER_COPY.submitPrice.form.submitButton

const footer = showForm ? (
  <SubmitButton loading={modalState === 'submitting'} onClick={handleSubmit}>
    {submitLabel}
  </SubmitButton>
) : undefined
```

**4h — Form JSX reorder** (the `showForm` block, lines 596–842). New order: context header → anti-abuse banner → raceToast → **source ChipGroup** (unchanged except state rebinding) → **vendor ChipGroup + auto-filled note** (moved up from the bottom) → **tier panels** → **add-tier button** → footerNote.

Source ChipGroup rebinding: `value={bundleState.sourceCategory}`, `error={bundleErrors['sourceCategory']}`, and its `onChange` `setFormState((prev) => …)` becomes `setBundleState((prev) => …)` with the identical boxoffice auto-fill/clear logic (the `prev.vendor` reads are unchanged). Vendor ChipGroup rebinding: `value={bundleState.vendor}`, `onChange={(val) => setBundleState((prev) => ({ ...prev, vendor: val }))}`, `error={bundleErrors['vendor']}` — keep its `req`, `disabled={bundleState.sourceCategory === 'boxoffice'}`, and the auto-filled note condition (both `formState` reads → `bundleState`).

The panels section replaces the old floor/ceiling row + tier ChipGroup + boxoffice hint:

```tsx
{panels.map((panel, panelIndex) => (
  <div
    key={panelIndex}
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      ...(panelIndex > 0
        ? { borderTop: '1px solid var(--border)', paddingTop: 18 }
        : {}),
    }}
  >
    {panels.length > 1 && !isEditMode && (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--fg-subtle)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          {panel.tier ??
            CONSUMER_COPY.submitPriceV2.multiTier.panelFallbackHeading}
        </span>
        <button
          type="button"
          aria-label={CONSUMER_COPY.submitPriceV2.multiTier.removeTierAriaLabel.replace(
            '{tier}',
            panel.tier ??
              CONSUMER_COPY.submitPriceV2.multiTier.panelFallbackHeading,
          )}
          onClick={() => removePanel(panelIndex)}
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: 24,
            height: 24,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--fg-muted)',
            border: '1px solid var(--border)',
          }}
        >
          <CloseIcon />
        </button>
      </div>
    )}

    <ChipGroup
      label={CONSUMER_COPY.submitPriceV2.tierLabel}
      options={tierOptionsForPanel(panelIndex)}
      value={panel.tier}
      onChange={(val) => updatePanel(panelIndex, { tier: val })}
      error={panelErrors[panelIndex]?.['tier']}
      // Edit mode never converts a single into a bundle — tier is locked
      // (spec §4). The PATCH endpoint identifies the row; changing tier is
      // still possible via the API but the bundle form disallows it.
      disabled={isEditMode}
    />

    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <SPNumberField
          id={`sp-floor-${panelIndex}`}
          label={
            bundleState.sourceCategory === 'boxoffice'
              ? CONSUMER_COPY.submitPriceV2.floorLabelBoxoffice
              : bundleState.sourceCategory === 'resale'
                ? CONSUMER_COPY.submitPriceV2.floorLabelResale
                : CONSUMER_COPY.submitPriceV2.floorLabelStandard
          }
          value={panel.floor}
          onChange={(val) => updatePanel(panelIndex, { floor: val })}
          placeholder={CONSUMER_COPY.submitPriceV2.floorPlaceholder}
          required
          error={panelErrors[panelIndex]?.['floor']}
          warning={panelWarnings[panelIndex]?.['floor']}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <SPNumberField
          id={`sp-ceiling-${panelIndex}`}
          label={CONSUMER_COPY.submitPriceV2.ceilingLabel}
          value={panel.ceiling}
          onChange={(val) => updatePanel(panelIndex, { ceiling: val })}
          placeholder={CONSUMER_COPY.submitPriceV2.ceilingPlaceholder}
          error={panelErrors[panelIndex]?.['ceiling']}
        />
      </div>
    </div>
    {bundleState.sourceCategory === 'boxoffice' && (
      <p
        style={{
          margin: '-12px 0 0 0',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--fg-subtle)',
          letterSpacing: '0.04em',
        }}
      >
        {CONSUMER_COPY.submitPriceV2.floorHintBoxoffice}
      </p>
    )}
  </div>
))}

{!isEditMode && panels.length < TIER_OPTIONS.length && (
  <button
    type="button"
    onClick={addPanel}
    style={{
      all: 'unset',
      cursor: 'pointer',
      alignSelf: 'flex-start',
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      fontWeight: 700,
      color: 'var(--signal)',
      letterSpacing: '-0.005em',
      padding: '4px 0',
    }}
  >
    {CONSUMER_COPY.submitPriceV2.multiTier.addTierButton}
  </button>
)}
```

Existing tests that key off `getByText('Floor')`, `getByLabelText(/Face value/i)` etc. keep passing: with one panel there is exactly one floor field, and `SPNumberField` associates its label via the passed `id` regardless of the value.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @concert-crawl/web test -- SubmitPriceModal`
Expected: PASS — the new multi-tier + edit-mode describes AND all pre-existing describes (form view, success, payload shape, 409 race toast, error state, alreadySubmitted). If a pre-existing test breaks, the state rebinding in 4f/4h missed a `formState` read — fix the rebinding, do not edit the old test.

Also: `pnpm --filter @concert-crawl/web typecheck`
Expected: PASS (no lingering `formState` references).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/consumer/definitions/copy.ts apps/web/src/components/consumer/submit-price/SubmitPriceModal.tsx apps/web/src/components/consumer/submit-price/SubmitPriceModal.test.tsx
git commit -m "feat(web): multi-tier panel UI in SubmitPriceModal for #832"
```

---

**Continue to Part 3:** `2026-07-10-multi-tier-price-submission-3-modal-batch.md`
