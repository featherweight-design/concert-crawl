import { describe, expect, it } from 'vitest'

import { buildUpdateVenueBody } from './build-update-venue-body'

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

  it('leaves the browser-gate fields out when their keys are missing', () => {
    const body = buildUpdateVenueBody(formDataFrom({ crawlWaitUntil: 'load' }))
    expect(body.crawlWaitUntil).toBe('load')
    for (const key of [
      'crawlMode',
      'crawlWaitForSelector',
      'platform',
      'platformVenueId',
      'apiProvider',
      'apiAccountId',
    ]) {
      expect(body[key]).toBeUndefined()
    }
  })

  it('leaves active out when its key is missing', () => {
    expect(buildUpdateVenueBody(formDataFrom({})).active).toBeUndefined()
    expect(buildUpdateVenueBody(formDataFrom({ active: 'false' })).active).toBe(
      false,
    )
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
