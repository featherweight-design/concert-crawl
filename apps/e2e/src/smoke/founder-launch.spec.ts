import { test, expect } from '@playwright/test'
import { apiGet } from '../helpers/api.js'

// Post-launch confirmation smoke for the founder window (execution plan PR 6.3).
//
// This is READ-ONLY: it never claims a seat or spends money. The real
// first-claim validation (a live-mode Stripe subscription against a founder
// seat) is a deliberate, manual step Hugh runs once at launch — see
// docs/runbooks/monetization-launch.md. This spec only confirms the launch
// flip took: the public founder-window API reports `open` with seats, and the
// tier picker offers the founder tier in the live UI.
//
// It SELF-SKIPS unless FOUNDER_LAUNCH_SMOKE=1 so it stays inert in the routine
// 6-hourly prod smoke cron, where the window is still `pre-launch` and an
// `open`-state assertion would (correctly) fail.

const launchSmokeEnabled = process.env['FOUNDER_LAUNCH_SMOKE'] === '1'

interface FounderWindowView {
  state: 'pre-launch' | 'open' | 'closed'
  seatsTotal: number
  seatsRemaining?: number
  closesAt: string | null
}

test.describe('smoke: founder launch (post-launch, read-only)', () => {
  test.skip(
    !launchSmokeEnabled,
    'Set FOUNDER_LAUNCH_SMOKE=1 to run — post-launch confirmation only.',
  )

  test('public founder-window API reports open with seats remaining', async ({
    request,
  }) => {
    const { status, body } = await apiGet<{
      success: boolean
      data: FounderWindowView
    }>(request, '/v1/billing/founder-window')

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.state).toBe('open')
    // seatsRemaining is only present once the window is open (omitted
    // pre-launch per the API contract), and must still have inventory —
    // an open window with zero seats would read as `closed`.
    expect(typeof body.data.seatsRemaining).toBe('number')
    expect(body.data.seatsRemaining ?? 0).toBeGreaterThan(0)
    expect(body.data.closesAt).not.toBeNull()
  })

  test('tier picker offers the founder tier in the live UI', async ({
    page,
  }) => {
    // /me?plan=open auto-opens the tier picker (usePlanOpenParam). Uses the
    // suite-wide signed-in smoke session.
    await page.goto('/me?plan=open')

    // The picker renders the founder tile as a desktop card or a mobile row
    // depending on viewport; accept either so the check is viewport-agnostic.
    const founderCard = page.locator('[data-testid="tier-card-founder"]')
    const founderRow = page.locator('[data-testid="tier-row-founder"]')
    await expect(founderCard.or(founderRow).first()).toBeVisible({
      timeout: 10_000,
    })

    // The scarcity rail only renders while the window is open (its data is
    // null pre-launch), so its presence confirms the open state through the
    // UI the way a real user sees it.
    await expect(
      page.locator('[data-testid="scarcity-rail"]').first(),
    ).toBeVisible({ timeout: 10_000 })
  })
})
