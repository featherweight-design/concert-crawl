import { describe, it, expect } from 'vitest'

import { resolveSection } from './SettingsRouteDesktop'

describe('resolveSection', () => {
  it('honours a valid section param', () => {
    expect(resolveSection('notifications', true)).toBe('notifications')
  })

  it('falls back to profile for an unknown param', () => {
    expect(resolveSection('nonsense', true)).toBe('profile')
    expect(resolveSection(null, true)).toBe('profile')
  })

  it('selects connections only while spotify-sync is on', () => {
    expect(resolveSection('connections', true)).toBe('connections')
    // Otherwise the nav hides the item while the pane still selects it,
    // leaving a deep link or a back-button entry on a blank page.
    expect(resolveSection('connections', false)).toBe('profile')
  })
})
