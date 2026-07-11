# Multi-Tier Price Submission Implementation Plan — Part 4 of 4 (Integration + Ship)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapt `EventDetailClient` to the array-shaped `onSuccess` from Part 3, then ship — release note, progress row, follow-up issue, full verification sweep.

**Read Parts 1–3 first:** Part 1's **Global Constraints** section applies to every task here. Task 6 consumes the `SubmitPriceResult` type and `onSuccess?: (results: SubmitPriceResult[]) => void` prop that Part 3 Task 5 exports from `SubmitPriceModal.tsx`.

**Spec:** `docs/superpowers/specs/2026-07-10-multi-tier-price-submission-design.md` §3 (success handling) + §5 (EventDetailClient tests). Issue #832.

---

## Task 6: EventDetailClient — array `onSuccess` + shared `applySubmissionResults`

**Files:**

- Modify: `apps/web/src/components/consumer/EventDetailClient.tsx`
- Test: `apps/web/src/components/consumer/EventDetailClient.test.tsx`

**Interfaces:**

- Consumes: `SubmitPriceResult` exported from `apps/web/src/components/consumer/submit-price/SubmitPriceModal.tsx` (Part 3 Task 5):

  ```ts
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

  and the modal prop `onSuccess?: (results: SubmitPriceResult[]) => void`.
- Produces: nothing consumed by later tasks — this is the last code task.

**Context.** `EventDetailClient.tsx` has two distinct `onSuccess` consumers, both currently typed for a single result object:

1. `handleSubmitSuccess` (lines ~457–484) — used by the seven decision-tree branches that show the `MTAddTierSuccess` follow-up card (`onSuccess={handleSubmitSuccess}` at lines ~584, 612, 669, 795, 950, 1129, 1218). It contains two `as Tier` casts (lines ~469–471) that violate the no-`as`-casts rule — replace them with a type guard while you're in here.
2. Two **identical** inline `onSuccess` closures (lines ~1638–1678 and ~1819–1859) that optimistically mutate `localSubmissions` (edit → map-replace; new → append a `PendingSubItem`). Extract these into one shared `applySubmissionResults` callback.

### Step 1: Write the failing tests

- [ ] **Step 1: Update the test harness to the array signature and add the multi-row test**

In `apps/web/src/components/consumer/EventDetailClient.test.tsx`:

**(a)** Replace the `latestModalOnSuccess` declaration (lines ~28–39) and the `SubmitPriceModal` mock (lines ~47–64) so both use the array shape:

```tsx
// SubmitPriceModal would mount + fetch on render; stub it so we can
// drive onSuccess directly from the test surface when needed.
// Shape mirrors SubmitPriceResult exported from SubmitPriceModal (#832).
interface ModalSuccessRow {
  isEdit: boolean
  id: string
  priceMin: string
  priceMax: string | null
  tier: string
  vendor: string
  howFound: string
  sourceCategory: 'boxoffice' | 'standard' | 'resale' | null
}
let latestModalOnSuccess: ((results: ModalSuccessRow[]) => void) | null = null
```

```tsx
vi.mock('@/components/consumer/submit-price/SubmitPriceModal', () => ({
  SubmitPriceModal: (props: {
    open: boolean
    onSuccess?: (results: ModalSuccessRow[]) => void
  }) => {
    latestModalOnSuccess = props.onSuccess ?? null
    return props.open ? <div data-testid="submit-price-modal-open" /> : null
  },
}))
```

> Note: `vi.mock` factories are hoisted, but `ModalSuccessRow` is a type-only reference (erased at compile time) and `latestModalOnSuccess` is only *assigned* inside the factory at render time, so this hoisting is safe — it matches the existing pattern in this file.

**(b)** Convert the four existing `latestModalOnSuccess?.({...})` invocations (lines ~434, 460, 499, 540 — in the tests `'submit success in sold-out-resale branch...'`, `'submit success in sold-out-contribute branch...'`, `'submit success in resale-headline branch...'`, and `'submit success: after onAddTier("VIP")...'`) to single-element arrays. Example for the first (line ~434); apply the same wrap to all four:

```tsx
    await act(async () => {
      latestModalOnSuccess?.([
        {
          isEdit: false,
          id: 'sub-ga-1',
          priceMin: '40',
          priceMax: null,
          tier: 'GA',
          vendor: 'VenueBoxOffice',
          howFound: 'bought_myself',
          sourceCategory: 'boxoffice',
        },
      ])
    })
```

**(c)** Add a new multi-row test directly after the `'submit success: after onAddTier("VIP")...'` test (after line ~565):

```tsx
  it('batch submit success with 2 tiers → success card shows first tier, both tiers excluded from add-pills (#832)', async () => {
    const event = buildBaseEvent({
      priceStatus: 'soldout',
      soldOutReport: null,
      ticketLinks: null,
    })
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    )
    expect(latestModalOnSuccess).not.toBeNull()
    await act(async () => {
      latestModalOnSuccess?.([
        {
          isEdit: false,
          id: 'sub-ga-1',
          priceMin: '45',
          priceMax: null,
          tier: 'GA',
          vendor: 'VenueBoxOffice',
          howFound: 'bought_myself',
          sourceCategory: 'boxoffice',
        },
        {
          isEdit: false,
          id: 'sub-vip-1',
          priceMin: '120',
          priceMax: '150',
          tier: 'VIP',
          vendor: 'VenueBoxOffice',
          howFound: 'bought_myself',
          sourceCategory: 'boxoffice',
        },
      ])
    })
    // MTAddTierSuccess headline reflects the FIRST submitted tier.
    expect(screen.getByText('GA price is in. Thanks.')).toBeDefined()
    // Both submitted tiers are locked out of the add-pill row...
    expect(screen.queryByText(/Add ga/i)).toBeNull()
    expect(screen.queryByText(/Add vip/i)).toBeNull()
    // ...while an unsubmitted tier still offers a pill.
    expect(screen.queryByText(/Add reserved/i)).not.toBeNull()
  })
```

- [ ] **Step 2: Run tests to verify the new one fails**

Run: `pnpm --filter @concert-crawl/web test -- EventDetailClient`

Expected: the new `'batch submit success with 2 tiers...'` test FAILS (the component's `handleSubmitSuccess` still expects a single object, so calling it with an array leaves `result.isEdit` undefined / throws, and no success card renders). The four converted tests also fail for the same reason. Vitest does not typecheck, so the suite runs despite the signature mismatch.

### Step 3: Implement

- [ ] **Step 3: Rewrite the two onSuccess consumers in `EventDetailClient.tsx`**

**(a)** Import the result type. Change line ~41:

```tsx
import {
  SubmitPriceModal,
  type SubmitPriceResult,
} from '@/components/consumer/submit-price/SubmitPriceModal'
```

**(b)** Add a tier type guard directly below the `TIER_ENUM` declaration (line ~54). No `as` cast — the widened `ReadonlyArray<string>` view makes `includes` accept any string:

```tsx
// Widened read-only view of TIER_ENUM so the type guard can probe arbitrary
// strings — `ReadonlyArray<Tier>.includes` rejects plain strings at the type
// level, and an `as` cast is off the table (CLAUDE.md principle 6).
const TIER_NAMES: ReadonlyArray<string> = TIER_ENUM
const isTierValue = (value: string): value is Tier => TIER_NAMES.includes(value)
```

**(c)** Replace `handleSubmitSuccess` (lines ~457–484) with the array version. The success card shows the FIRST new row's tier/price; ALL new rows' tiers enter `submittedThisSession` so `MTAddTierSuccess` excludes every tier the batch covered:

```tsx
  // Shared submit-success handler — used by every new decision-tree branch
  // that owns a SubmitPriceModal. A batch submit (#832) returns one row per
  // tier: the follow-up card shows the first row, and every submitted tier
  // joins the session set so the add-tier pills exclude all of them. Falls
  // back to GA when a tier comes back non-canonical so the picker still
  // shows something useful.
  const handleSubmitSuccess = useCallback((results: SubmitPriceResult[]) => {
    const newRows = results.filter((row) => !row.isEdit)
    const firstRow = newRows[0]
    if (!firstRow) return
    const submittedTiers = newRows.map((row): Tier =>
      isTierValue(row.tier) ? row.tier : 'GA',
    )
    const firstTier: Tier = isTierValue(firstRow.tier) ? firstRow.tier : 'GA'
    const price = Math.round(parseFloat(firstRow.priceMin))
    const sourceCategory: SourceCategory = firstRow.sourceCategory ?? 'standard'
    setSubmittedThisSession((prev) => {
      const next = new Set(prev)
      for (const tier of submittedTiers) {
        next.add(tier)
      }
      return next
    })
    setSubmitSuccessPayload({ tier: firstTier, price, sourceCategory })
    setSubmitPriceOpen(false)
    setPreselectedTier(null)
  }, [])
```

The seven `onSuccess={handleSubmitSuccess}` call sites (lines ~584, 612, 669, 795, 950, 1129, 1218) need no edits — the prop and handler types now match again.

**(d)** Add a shared `applySubmissionResults` callback directly after `handleWithdrawReport` (after line ~450), replicating the existing per-row edit/append logic in a loop:

```tsx
  // Optimistic localSubmissions updater shared by the two decision-tree
  // branches that render pending-submission cards. A batch submit (#832)
  // yields one row per tier — edits map-replace in place, new rows append
  // as optimistic PendingSubItems.
  const applySubmissionResults = useCallback(
    (results: SubmitPriceResult[]) => {
      for (const result of results) {
        if (result.isEdit) {
          setLocalSubmissions((prev) =>
            prev.map((sub) =>
              sub.id === result.id
                ? {
                    ...sub,
                    priceMin: result.priceMin,
                    priceMax: result.priceMax,
                    tier: result.tier,
                    vendor: result.vendor,
                    howFound: result.howFound,
                  }
                : sub,
            ),
          )
        } else {
          setLocalSubmissions((prev) => [
            ...prev,
            {
              id: result.id,
              priceMin: result.priceMin,
              priceMax: result.priceMax,
              tier: result.tier,
              vendor: result.vendor,
              howFound: result.howFound,
              sourceCategory: result.sourceCategory,
              note: null,
              submitterHandle: null,
              submittedAt: new Date().toISOString(),
              confirmsCount: 0,
              // Use the shared helper so the local-submission optimistic row
              // picks up the UTC-midnight-correct imminent-policy denominator
              // (#835 Copilot R5).
              confirmsNeeded: corroborationConfirmsRequired(event.date),
              isSubmitter: true,
            },
          ])
        }
      }
    },
    [event.date],
  )
```

**(e)** Replace BOTH identical inline `onSuccess` closures (lines ~1638–1678 and ~1819–1859) with the shared callback:

```tsx
          onSuccess={applySubmissionResults}
```

Delete the full 41-line closure at each site — the `onWithdrawSuccess` props immediately below stay untouched.

> ⚠️ If `applySubmissionResults` lives inside a component/branch scope that the second `SubmitPriceModal` (line ~1808) cannot see, check where each modal renders before assuming shared scope. Both inline sites are inside the same `EventDetailPriceBlock` component as `handleWithdrawReport`, so a single callback after line ~450 is in scope for both — verify with a typecheck rather than assumption.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @concert-crawl/web test -- EventDetailClient`
Expected: PASS — all previously-green tests plus the new multi-row test.

Then run the full web typecheck to confirm the modal prop and both consumers line up (this also clears the deliberate type error left at the end of Part 3 Task 5):

Run: `pnpm --filter @concert-crawl/web typecheck`
Expected: PASS with zero errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/consumer/EventDetailClient.tsx apps/web/src/components/consumer/EventDetailClient.test.tsx
git commit -m "feat(web): EventDetailClient consumes batch submit results array for #832"
```

---

## Task 7: Ship — release note, progress row, follow-up issue, verification sweep

**Files:**

- Modify: `apps/web/src/lib/definitions/releases.ts`
- Modify: `docs/superpowers/progress.md`

**Interfaces:**

- Consumes: nothing from code — this is release/process work.
- Produces: the shipped branch, ready for `gh pr create`.

- [ ] **Step 1: Add the release note**

In `apps/web/src/lib/definitions/releases.ts`, insert a new `Release` object at the TOP of the `RELEASES` array (newest first — currently `v0.6.1-beta` / Jun 26, 2026 sits at index 0). Set `date` to the day the implementation PR opens:

```ts
  {
    version: 'v0.7.0-beta',
    date: 'Jul 10, 2026',
    headline: 'Standing at the box office? Submit every tier you can see.',
    items: [
      {
        kind: 'added',
        text: 'Multi-tier price submission — hit "Add another tier" in the submit form to send GA, VIP, and friends in one go. Each tier still gets its own trust mark and its own fan confirmations.',
      },
    ],
  },
```

> If a `v0.7.0-beta` (or newer) entry already exists at implementation time because another feature shipped first, append the `items` entry to that release instead of creating a duplicate version — check the top of the array before writing.

There is no spotlight asset for this feature in `design/design_handoff_spotlight_heroes/`, so no `spotlight` block.

- [ ] **Step 2: Add the progress.md row**

In `docs/superpowers/progress.md`, find the Beta-phase PR table (rows look like `| Beta | feat(...) ... | ✅ Complete (PR #NNN merged YYYY-MM-DD) |`) and append:

```markdown
| Beta        | feat(web+api): multi-tier price submission — atomic batch endpoint + bundle form with repeatable tier panels (#832)                                                                                                        | ✅ Complete (PR #TBD merged 2026-07-10)        |
```

Replace `#TBD` with the real PR number once `gh pr create` returns it (open the PR, then amend this row in a follow-up commit on the same branch — or fill it in immediately if the PR is opened before the final push). Use the actual open date, not necessarily 2026-07-10.

- [ ] **Step 3: Open the follow-up issue for add-tier vs. rate limit**

Pre-existing interaction this PR does not fix: after a successful batch, `MTAddTierSuccess` still offers "+ Add \<tier\>" pills, but the batch consumed the user's 24h rate-limit window (Part 1 Task 2), so the follow-up submit will 429. This exists today for single submissions too; the batch flow makes it easier to notice because most users will have no tiers left to add. Out of scope here — track it:

```bash
gh issue create \
  --title "MTAddTierSuccess add-tier pills collide with the 24h submission rate limit" \
  --label "type: polish,source: internal,phase: beta,priority: normal" \
  --body "$(cat <<'EOF'
After any successful price submission, MTAddTierSuccess offers "+ Add <tier>" pills for the tiers not yet submitted this session. But the submission just consumed the per-user 24h rate-limit window, so tapping a pill and submitting again returns 429 ("Rate limit: 1 submission per 24h").

Pre-existing for single submissions; #832's batch flow (one atomic request covering multiple tiers, one rate-limit hit) reduces how often users WANT a follow-up submit, but the pills still promise a flow that the API will reject.

Options to explore (design call):
- Hide the add-tier pills when the rate-limit window is active
- Replace the pill row with "Come back tomorrow to add more tiers" copy
- Exempt same-event same-session follow-ups from the rate limit (API change)

Related: docs/superpowers/specs/2026-07-10-multi-tier-price-submission-design.md §2 (rate limiting).
EOF
)"
```

- [ ] **Step 4: Full verification sweep**

Run each from the worktree root; all must pass before pushing (never push speculatively):

```bash
pnpm --filter @concert-crawl/web test
pnpm --filter @concert-crawl/api test
pnpm typecheck
pnpm lint
```

Expected: web tests green (including the new `ChipGroup.test.tsx`, extended `SubmitPriceModal.test.tsx`, extended `EventDetailClient.test.tsx`); api tests green for `price-submissions-batch.integration.test.ts` (if unrelated api integration tests fail, verify they also fail on `main` before treating them as pre-existing — Part 1 Task 2 Step 4 caveat); typecheck + lint clean across the workspace.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/definitions/releases.ts docs/superpowers/progress.md
git commit -m "docs: release note + progress row for #832 multi-tier price submission"
```

Then follow the repo PR flow: rebase on `origin/main`, push, and open the PR with the template, including `Closes #832`, a note that the PR intentionally **removes the modal's 409 race-toast branch** (see Part 3 Task 5 — the branch is unreachable once the modal stops sending single POSTs; counters keep their own 409 handling in `CounterSubmitSheet`), and a note that the **optional bundle note field is API-only** (the shipped form has no note input; the batch endpoint accepts `note` for future use — parity with the current form was a deliberate scope call).

---

## Post-merge manual smoke (staging)

Per spec §5 "Not covered" — after merge, on staging:

1. Submit a 2-tier bundle (GA + VIP, box-office source) on one event → both rows appear immediately, each shows pending/1-of-N confirms independently.
2. Submit a single-tier price on another event → identical to the old trickle flow.
3. Attempt a second batch on the first event with the same tier → inline "already submitted" error on the offending panel, form values intact.

No new E2E — the flow is covered by API integration + component tests, and the E2E suite already exercises modal open/submit plumbing.

---

**Plan complete.** Parts 1–4 cover spec §1–§5; implementation follows the pipeline: plan PR → Copilot review loop (min 2 successful reviews, no Crit/High/Medium) → implementation PR.
