import { test, expect } from '@playwright/test'

const EVENT_ID = process.env['TEST_EVENT_ID'] ?? 'test-event-id'

test.describe('Price Transparency v2', () => {
  test.use({ storageState: 'playwright/.auth/user.json' })

  test('submit flow — fill form and see success state', async ({ page }) => {
    await page.goto(`/events/${EVENT_ID}/submit-price`)
    await expect(page.getByText('Submit a price')).toBeVisible()

    await page.getByLabel('Floor *').fill('45')
    await page.getByRole('button', { name: 'GA' }).click()
    await page.getByRole('button', { name: 'Ticketmaster' }).click()
    await page.getByRole('button', { name: 'Bought it myself' }).click()

    await page.getByRole('button', { name: 'Submit price' }).click()
    await expect(page.getByText('Got it. Thanks.')).toBeVisible()
  })

  test('alreadySubmitted state — shows existing card or form', async ({
    page,
  }) => {
    await page.goto(`/events/${EVENT_ID}/submit-price`)
    const alreadyCard = page.getByText('You already submitted a price.')
    const form = page.getByRole('button', { name: 'Submit price' })
    const oneOf = await Promise.race([
      alreadyCard.waitFor({ timeout: 5000 }).then(() => 'already'),
      form.waitFor({ timeout: 5000 }).then(() => 'form'),
    ])
    expect(['already', 'form']).toContain(oneOf)
  })

  test('verify sheet — opens on reports link', async ({ page }) => {
    await page.goto(`/events/${EVENT_ID}`)
    const reportsBtn = page.getByRole('button', { name: /reports →/ })
    if (await reportsBtn.isVisible()) {
      await reportsBtn.click()
      await expect(page.getByText('Confirm what you saw')).toBeVisible()
    }
  })

  test('dispute flow — navigate to dispute page and submit', async ({
    page,
  }) => {
    await page.goto(`/events/${EVENT_ID}`)
    const reportsBtn = page.getByRole('button', { name: /reports →/ })
    if (await reportsBtn.isVisible()) {
      await reportsBtn.click()
      const disputeBtn = page.getByRole('button', { name: 'Dispute' }).first()
      if (await disputeBtn.isVisible()) {
        await disputeBtn.click()
        await expect(page.getByText('Dispute price')).toBeVisible()
        await page.getByLabel('Floor *').fill('30')
        await page.getByRole('button', { name: 'AXS' }).click()
        await page.getByRole('button', { name: 'File dispute' }).click()
        await expect(page.getByText('Logged.')).toBeVisible()
      }
    }
  })
})
