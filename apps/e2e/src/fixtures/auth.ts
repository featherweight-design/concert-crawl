import { chromium, type FullConfig } from '@playwright/test'
import fs from 'fs'
import path from 'path'

export default async function globalSetup(config: FullConfig): Promise<void> {
  const email = process.env['E2E_TEST_USER_EMAIL']
  const password = process.env['E2E_TEST_USER_PASSWORD']

  const authDir = path.resolve('.auth')
  const authFile = path.join(authDir, 'user.json')
  fs.mkdirSync(authDir, { recursive: true })

  if (!email || !password) {
    console.warn(
      '[e2e] E2E_TEST_USER_EMAIL or E2E_TEST_USER_PASSWORD not set — skipping auth setup.',
    )
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }))
    return
  }

  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:3000'
  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    await page.goto(`${baseURL}/sign-in`)
    await page.waitForLoadState('networkidle')

    await page.getByLabel(/email/i).fill(email)
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForLoadState('networkidle')

    await page.getByLabel(/password/i).fill(password)
    await page.getByRole('button', { name: /continue|sign in/i }).click()

    await page.waitForURL((url) => !url.pathname.includes('sign-in'), {
      timeout: 15_000,
    })

    await page.context().storageState({ path: authFile })
    console.log('[e2e] Auth state saved to', authFile)
  } finally {
    await browser.close()
  }
}
