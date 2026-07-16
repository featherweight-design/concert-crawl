import { describe, expect, it, vi } from 'vitest'

// The action module carries a top-level 'use server' directive and imports
// Clerk + next/cache. Stub them so importing the pure helper doesn't pull in
// the Next.js server runtime.
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { buildUpdateVenueBody } from './venues'

function formDataFrom(entries: Record<string, string>): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value)
  }
  return formData
}

describe('buildUpdateVenueBody — API integration fields', () => {
  it('collapses empty apiProvider to null and forces apiAccountId null', () => {
    const body = buildUpdateVenueBody(
      formDataFrom({ apiProvider: '', apiAccountId: '1105' }),
    )
    expect(body.apiProvider).toBeNull()
    expect(body.apiAccountId).toBeNull()
  })

  it('treats a missing apiProvider key as None', () => {
    const body = buildUpdateVenueBody(formDataFrom({}))
    expect(body.apiProvider).toBeNull()
    expect(body.apiAccountId).toBeNull()
  })

  it('trims the account ID when a provider is selected', () => {
    const body = buildUpdateVenueBody(
      formDataFrom({ apiProvider: 'venuepilot', apiAccountId: '  1105  ' }),
    )
    expect(body.apiProvider).toBe('venuepilot')
    expect(body.apiAccountId).toBe('1105')
  })

  it('nulls the account ID when provider is set but the field is empty', () => {
    const body = buildUpdateVenueBody(
      formDataFrom({ apiProvider: 'venuepilot', apiAccountId: '' }),
    )
    expect(body.apiProvider).toBe('venuepilot')
    expect(body.apiAccountId).toBeNull()
  })

  it('nulls the account ID when provider is set but the field is whitespace', () => {
    const body = buildUpdateVenueBody(
      formDataFrom({ apiProvider: 'venuepilot', apiAccountId: '   ' }),
    )
    expect(body.apiProvider).toBe('venuepilot')
    expect(body.apiAccountId).toBeNull()
  })
})
