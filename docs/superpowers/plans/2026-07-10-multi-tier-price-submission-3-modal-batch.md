# Multi-Tier Price Submission Implementation Plan — Part 3 of 4 (Modal Batch Wiring)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Swap `SubmitPriceModal`'s submit path from the single POST to the atomic batch endpoint — exported `SubmitPriceResult[]` `onSuccess`, per-panel 422 error mapping, and removal of the now-unreachable 409 race-toast branch.

**Read Parts 1–2 first:** Part 1's **Global Constraints** section applies to every task here. Task 5 consumes the exact batch contract Part 1 Tasks 1–2 produce (`201 {success, data: rows[]}`, `422 {success: false, errors: [{index, tier, error}]}`, `429`) and the panel state (`panels`, `panelErrors`, `bundleState`, `multiTier` copy) built in Part 2 Task 4.

**Spec:** `docs/superpowers/specs/2026-07-10-multi-tier-price-submission-design.md` §3 (errors/success) + §4 (edit mode). Issue #832.

---

## Task 5: SubmitPriceModal — batch submit wiring + per-row errors

**Files:**

- Modify: `apps/web/src/components/consumer/submit-price/SubmitPriceModal.tsx`
- Test: `apps/web/src/components/consumer/submit-price/SubmitPriceModal.test.tsx` (extend + rewrite the 409-dependent tests)

**Interfaces:**

- Consumes: Part 1's batch contract — `POST /v1/events/:eventId/price-submissions/batch`, `201 {success: true, data: rows[]}`, `422 {success: false, errors: [{index, tier, error: 'already_submitted' | <message>}]}`.
- Produces (Task 6 relies on this exact export):

```typescript
export interface SubmitPriceResult {
  isEdit: boolean
  id: string
  priceMin: string
  priceMax: string | null
  tier: string
  vendor: string
  howFound: string
  sourceCategory: SourceCategory | null
}
// onSuccess?: (results: SubmitPriceResult[]) => void
```

**⚠️ Behavior removal (flagged for reviewer):** the single POST's 409 handling — including the `raceToast` state and `CONSUMER_COPY.priceRegion.disputeRace409Toast` rendering inside this modal — is removed. The batch endpoint never returns 409: "already submitted" is now a per-panel 422 (`already_submitted`), and the counter-race 409 only ever occurs on counter submissions, which go through `CounterSubmitSheet`, not this modal. The copy key stays (CounterSubmitSheet's flow still references the scenario). Call this removal out explicitly in the implementation PR body.

- [ ] **Step 1: Rewrite the 409-dependent tests + add batch tests**

In `SubmitPriceModal.test.tsx`:

**(a) Delete** the `describe('SubmitPriceModal — 409 race toast', …)` block (lines 261–302) — the path no longer exists.

**(b) Delete** the test `'transitions to alreadySubmitted on 409 from POST when `submission` payload is included'` (lines 395–430) — batch returns 422 per-row instead; the replacement inline-error behavior is tested in (d) below.

**(c) Rewrite** the two withdraw tests (`'sets existingSubmission from 409 body and Withdraw succeeds → modal closes'` and `'shows error state when Withdraw fails'`) to reach `alreadySubmitted` via the initial GET check instead of a POST 409. For each: replace the first mocked fetch response with `{ok: true, json: async () => ({success: true, data: {alreadySubmitted: true, userSubmission: {id: 'sub-409', priceMin: '55', priceMax: null, tier: 'GA', vendor: 'AXS', howFound: 'saw_listing', sourceCategory: 'standard'}}})}`, drop the POST-409 mock (the second response becomes the DELETE result), and remove the `fillForm()` + `Submit price` click — the test starts at `await waitFor(() => expect(screen.getByText('Already in.')).toBeTruthy())` and proceeds straight to the Withdraw click. All other assertions stay.

**(d) Add** the batch describes:

```tsx
describe('SubmitPriceModal — batch submit (#832)', () => {
  it('POSTs the bundle to the /batch endpoint and calls onSuccess with the row array', async () => {
    const onSuccess = vi.fn()
    let postUrl = ''
    let postBody: unknown
    let callCount = 0
    global.fetch = vi
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: { alreadySubmitted: false, userSubmission: null },
            }),
          })
        }
        postUrl = url
        if (init?.body) postBody = JSON.parse(init.body as string)
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({
            success: true,
            data: [
              {
                id: 'sub-ga',
                priceMin: '32',
                priceMax: null,
                tier: 'GA',
                vendor: 'VenueBoxOffice',
                howFound: 'bought_myself',
                sourceCategory: 'boxoffice',
              },
              {
                id: 'sub-vip',
                priceMin: '120',
                priceMax: null,
                tier: 'VIP',
                vendor: 'VenueBoxOffice',
                howFound: 'bought_myself',
                sourceCategory: 'boxoffice',
              },
            ],
          }),
        })
      })

    render(<SubmitPriceModal {...defaultProps} onSuccess={onSuccess} />)
    await fillForm() // panel 0: boxoffice + GA + floor 32
    fireEvent.click(screen.getByText('+ Add another tier'))
    // Panel 1: VIP + floor 120
    fireEvent.click(screen.getByText('VIP'))
    const floorInputs = screen.getAllByLabelText(/Face value/i)
    fireEvent.change(floorInputs[1]!, { target: { value: '120' } })

    fireEvent.click(screen.getByText('Submit 2 tiers'))
    await waitFor(() => expect(screen.getByText('Got it.')).toBeTruthy())

    expect(postUrl).toContain('/v1/events/evt-1/price-submissions/batch')
    const body = postBody as Record<string, unknown>
    expect(body['vendor']).toBe('VenueBoxOffice')
    expect(body['howFound']).toBe('bought_myself')
    expect(body['sourceCategory']).toBe('boxoffice')
    expect(body['tiers']).toEqual([
      { tier: 'GA', priceMin: 32 },
      { tier: 'VIP', priceMin: 120 },
    ])
    expect(onSuccess).toHaveBeenCalledTimes(1)
    const results = onSuccess.mock.calls[0]![0] as Array<{
      isEdit: boolean
      tier: string
    }>
    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({ isEdit: false, tier: 'GA' })
    expect(results[1]).toMatchObject({ isEdit: false, tier: 'VIP' })
  })

  it('renders a 422 already_submitted error inline on the right panel, keeping form values intact', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { alreadySubmitted: false, userSubmission: null },
          }),
        })
      }
      return Promise.resolve({
        ok: false,
        status: 422,
        json: async () => ({
          success: false,
          errors: [{ index: 0, tier: 'GA', error: 'already_submitted' }],
        }),
      })
    })

    render(<SubmitPriceModal {...defaultProps} />)
    await fillForm()
    fireEvent.click(screen.getByText('Submit price'))
    await waitFor(() =>
      expect(
        screen.getByText(
          'You already submitted a GA price — edit it from the event page.',
        ),
      ).toBeTruthy(),
    )
    // Atomic rejection never wipes input (spec §3): form still visible with values
    expect(screen.getByText("Where's this price from?")).toBeTruthy()
    const floorInput = screen.getByLabelText(/Face value/i) as HTMLInputElement
    expect(floorInput.value).toBe('32')
    // NOT routed to the alreadySubmitted view
    expect(screen.queryByText('Already in.')).toBeNull()
  })
})

describe('SubmitPriceModal — edit mode PATCH (#832)', () => {
  it('edit mode PATCHes the existing submission and calls onSuccess with a single-element array', async () => {
    const onSuccess = vi.fn()
    let patchMethod = ''
    let patchUrl = ''
    let callCount = 0
    global.fetch = vi
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
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
        }
        patchMethod = init?.method ?? ''
        patchUrl = url
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'sub-1',
              priceMin: '50',
              priceMax: null,
              tier: 'GA',
              vendor: 'AXS',
              howFound: 'saw_listing',
              sourceCategory: 'standard',
            },
          }),
        })
      })

    render(
      <SubmitPriceModal
        {...defaultProps}
        openInEditMode
        onSuccess={onSuccess}
      />,
    )
    await waitFor(() => expect(screen.getByText('Save changes')).toBeTruthy())
    const floorInput = screen.getByLabelText(/Floor/i)
    fireEvent.change(floorInput, { target: { value: '50' } })
    fireEvent.click(screen.getByText('Save changes'))
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))

    expect(patchMethod).toBe('PATCH')
    expect(patchUrl).toContain('/v1/submissions/sub-1')
    const results = onSuccess.mock.calls[0]![0] as Array<{
      isEdit: boolean
      id: string
      priceMin: string
    }>
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      isEdit: true,
      id: 'sub-1',
      priceMin: '50',
    })
  })
})
```

**(e) Update** the pre-existing `describe('SubmitPriceModal — payload shape', …)` test: its POST mock now returns the batch shape (`data` as a one-element array of the same row object) and the body assertions change to `expect(body['tiers']).toEqual([{ tier: 'GA', priceMin: 32 }])` alongside the existing bundle-level `sourceCategory`/`howFound`/`vendor` assertions. The success-state describe needs no change (an `ok` response with an empty `{}` body still lands on the success view, matching the single-POST behavior).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @concert-crawl/web test -- SubmitPriceModal`
Expected: FAIL — batch tests hit the old single POST URL, `onSuccess` receives an object not an array, 422 routes to the generic error view.

- [ ] **Step 3: Implement the batch wiring**

All edits in `SubmitPriceModal.tsx`.

**3a — Response types + guard** (replace nothing; add below `isPriceSubmissionResponse`, line 98 — the PATCH path still uses the old guard):

```typescript
interface BatchRowError {
  index: number
  tier: string | null
  error: string
}

type BatchSubmissionResponse =
  | { success: true; data: PriceSubmission[] }
  | { success?: false; error?: string; errors?: BatchRowError[] }

function isBatchRowError(value: unknown): value is BatchRowError {
  return (
    isObject(value) &&
    typeof value['index'] === 'number' &&
    (value['tier'] === null || typeof value['tier'] === 'string') &&
    typeof value['error'] === 'string'
  )
}

function isBatchSubmissionResponse(
  value: unknown,
): value is BatchSubmissionResponse {
  if (!isObject(value)) return false
  if (value['success'] === true) {
    return Array.isArray(value['data']) && value['data'].every(isObject)
  }
  // Non-success arm: every field the handler reads must be well-typed when
  // present. A bare `{}` is still valid — an `ok` response with an empty
  // body lands on the success view, matching the single-POST behavior.
  const errorOk =
    value['error'] === undefined || typeof value['error'] === 'string'
  const errorsOk =
    value['errors'] === undefined ||
    (Array.isArray(value['errors']) && value['errors'].every(isBatchRowError))
  return errorOk && errorsOk
}
```

**3b — Exported result type + prop change** (props interface, lines 139–148):

```typescript
export interface SubmitPriceResult {
  isEdit: boolean
  id: string
  priceMin: string
  priceMax: string | null
  tier: string
  vendor: string
  howFound: string
  sourceCategory: SourceCategory | null
}
```

and in `SubmitPriceModalProps`: `onSuccess?: (results: SubmitPriceResult[]) => void`.

**3c — Remove the raceToast**: delete the `raceToast` state (lines 202–206), its resets in the open-effect and `handleSubmit`, and the raceToast JSX block in the form (lines 675–695). Keep the `CONSUMER_COPY.priceRegion.disputeRace409Toast` key in copy.ts (CounterSubmitSheet's domain).

**3d — Rewrite `handleSubmit`** (replacing the Task 4f interim version wholesale):

```typescript
const handleSubmit = useCallback(async () => {
  // Validate every panel through the shared single-submission validator,
  // injecting the bundle-level fields into each panel's input. Bundle-field
  // errors (sourceCategory, vendor) are hoisted out of the per-panel maps so
  // they render once at the top of the form.
  const nextPanelErrors: Array<Partial<Record<string, string>>> = []
  const nextPanelWarnings: Array<Partial<Record<string, string>>> = []
  const nextBundleErrors: Partial<Record<string, string>> = {}
  let allValid = true
  for (const panel of panels) {
    const validation = validateSubmission({
      floor: panel.floor,
      ceiling: panel.ceiling,
      tier: panel.tier,
      vendor: bundleState.vendor,
      sourceCategory: bundleState.sourceCategory,
    })
    const {
      sourceCategory: sourceError,
      vendor: vendorError,
      ...rowErrors
    } = validation.errors
    if (sourceError) nextBundleErrors['sourceCategory'] = sourceError
    if (vendorError) nextBundleErrors['vendor'] = vendorError
    nextPanelErrors.push(rowErrors)
    nextPanelWarnings.push(validation.warnings)
    if (!validation.valid) allValid = false
  }
  setPanelErrors(nextPanelErrors)
  setPanelWarnings(nextPanelWarnings)
  setBundleErrors(nextBundleErrors)
  if (!allValid) return

  // Runtime enum guards — validateSubmission guarantees non-null but not
  // enum membership (no `as` casts per CLAUDE.md).
  if (
    bundleState.sourceCategory === null ||
    bundleState.vendor === null ||
    !isVendor(bundleState.vendor)
  ) {
    console.error(
      'Submit reached non-null guard with invalid bundle fields',
      bundleState,
    )
    setModalState('error')
    return
  }
  const sourceCategory: SourceCategory = bundleState.sourceCategory

  const tierRows: Array<{ tier: Tier; priceMin: number; priceMax?: number }> =
    []
  for (const panel of panels) {
    if (panel.tier === null || !isTier(panel.tier)) {
      console.error('Submit reached non-null guard with invalid tier', panel)
      setModalState('error')
      return
    }
    tierRows.push({
      tier: panel.tier,
      priceMin: Number(panel.floor),
      ...(panel.ceiling ? { priceMax: Number(panel.ceiling) } : {}),
    })
  }

  setModalState('submitting')
  try {
    const token = await getToken()
    if (!token) {
      setModalState('error')
      return
    }

    const vendor: Vendor =
      sourceCategory === 'boxoffice'
        ? VENDOR_BOXOFFICE_AUTOFILL
        : bundleState.vendor
    const howFound: HowFound = howFoundForSource(sourceCategory)

    // Edit mode → PATCH the existing single submission (spec §4: editing
    // never converts a single into a bundle; the form is locked to one
    // panel in edit mode).
    if (isEditMode && existingSubmission) {
      const firstPanel = tierRows[0]
      if (!firstPanel) {
        setModalState('error')
        return
      }
      const res = await fetch(
        `${API_URL}/v1/submissions/${existingSubmission.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            floor: firstPanel.priceMin,
            ...(firstPanel.priceMax != null
              ? { ceiling: firstPanel.priceMax }
              : {}),
            tier: firstPanel.tier,
            vendor,
            howFound,
          }),
        },
      )
      const patchRaw: unknown = await res.json()
      if (!isPriceSubmissionResponse(patchRaw)) {
        throw new Error('Edit failed (invalid response shape)')
      }
      const patchResponse = patchRaw
      if (!res.ok || !patchResponse.success) {
        throw new Error(
          (!patchResponse.success && patchResponse.error) || 'Edit failed',
        )
      }
      onSuccess?.([
        {
          isEdit: true,
          id: existingSubmission.id,
          priceMin: String(firstPanel.priceMin),
          priceMax:
            firstPanel.priceMax != null ? String(firstPanel.priceMax) : null,
          tier: firstPanel.tier,
          vendor,
          howFound,
          sourceCategory: patchResponse.data.sourceCategory,
        },
      ])
      setModalState('success')
      return
    }

    // Bundle POST — one atomic request, all rows or none (spec §2).
    const res = await fetch(
      `${API_URL}/v1/events/${eventId}/price-submissions/batch`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vendor,
          howFound,
          sourceCategory,
          tiers: tierRows,
        }),
      },
    )
    const rawResponse: unknown = await res.json()
    if (!isBatchSubmissionResponse(rawResponse)) {
      throw new Error('Submission failed (invalid response shape)')
    }
    if (!res.ok) {
      const rowErrors =
        rawResponse.success !== true ? (rawResponse.errors ?? []) : []
      if (res.status === 422 && rowErrors.length > 0) {
        // Per-row 422 → annotate the exact panel and stay on the form with
        // every value intact (spec §3: atomic rejection never wipes input).
        setPanelErrors((prev) => {
          const next = prev.map((panelError) => ({ ...panelError }))
          for (const rowError of rowErrors) {
            const target = next[rowError.index]
            if (!target) continue
            target['tier'] =
              rowError.error === 'already_submitted'
                ? CONSUMER_COPY.submitPriceV2.multiTier.errorAlreadySubmitted.replace(
                    '{tier}',
                    rowError.tier ?? '',
                  )
                : rowError.error
          }
          return next
        })
        setModalState('form')
        return
      }
      throw new Error(
        (rawResponse.success !== true && rawResponse.error) ||
          'Submission failed',
      )
    }
    if (rawResponse.success === true) {
      onSuccess?.(
        rawResponse.data.map((row) => ({
          isEdit: false,
          id: row.id,
          priceMin: row.priceMin,
          priceMax: row.priceMax,
          tier: row.tier,
          vendor: row.vendor,
          howFound: row.howFound,
          sourceCategory: row.sourceCategory,
        })),
      )
    }
    setModalState('success')
  } catch (err) {
    console.error('Price submission failed', err)
    setModalState('error')
  }
}, [
  panels,
  bundleState,
  isEditMode,
  existingSubmission,
  getToken,
  eventId,
  onSuccess,
])
```

Implementation note: `validateSubmission`'s return lives in `apps/web/src/lib/sp-policy.ts` — read it first. If its `errors`/`warnings` are typed narrower than `Partial<Record<string, string>>` (e.g. a fixed-key object), adjust the destructuring in the loop to explicit key reads (`validation.errors['sourceCategory']` etc.) rather than rest-spread, keeping the same hoisting behavior.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @concert-crawl/web test -- SubmitPriceModal`
Expected: PASS — all describes, including the rewritten withdraw tests and updated payload-shape test.

Run: `pnpm --filter @concert-crawl/web typecheck && pnpm --filter @concert-crawl/web lint`
Expected: PASS. (`EventDetailClient.tsx` will now have a type error on its `onSuccess` prop — that is expected mid-plan ONLY if Task 6 is executed in the same PR before pushing. If typecheck fails solely on `EventDetailClient`'s single-object `onSuccess` signature, proceed to Task 6 which fixes it; do not paper over it here.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/consumer/submit-price/SubmitPriceModal.tsx apps/web/src/components/consumer/submit-price/SubmitPriceModal.test.tsx
git commit -m "feat(web): wire SubmitPriceModal to the atomic batch endpoint with per-panel 422 errors"
```

---

**Continue to Part 4:** `2026-07-10-multi-tier-price-submission-4-integration.md`
