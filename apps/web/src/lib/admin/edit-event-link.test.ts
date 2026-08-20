import { describe, expect, it } from 'vitest'
import { editEventHref, reviewHrefFromParam } from './edit-event-link'
import { REVIEW_TAB_KEYS } from './review-tabs'

describe('editEventHref', () => {
  it('omits ?from when no originating tab is given', () => {
    expect(editEventHref('abc')).toBe('/admin/events/abc/edit')
  })

  it('round-trips every canonical tab back to its own Review tab', () => {
    // The editor's breadcrumb rebuilds `/admin/review?tab=<from>` off this
    // param (#1083). A new tab key that isn't in the whitelist silently
    // degrades to the default tab, so assert the whole set — including the
    // `submissions` key added by the split.
    for (const key of REVIEW_TAB_KEYS) {
      expect(editEventHref('abc', key)).toBe(
        `/admin/events/abc/edit?from=${key}`,
      )
      expect(reviewHrefFromParam(key)).toBe(`/admin/review?tab=${key}`)
    }
  })
})

describe('reviewHrefFromParam', () => {
  it('falls back to plain Review for unknown, null, or absent values', () => {
    expect(reviewHrefFromParam('nonsense')).toBe('/admin/review')
    expect(reviewHrefFromParam(null)).toBe('/admin/review')
    expect(reviewHrefFromParam(undefined)).toBe('/admin/review')
  })
})
