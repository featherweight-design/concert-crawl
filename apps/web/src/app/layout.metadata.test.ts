import { describe, it, expect, vi } from 'vitest'

// layout.tsx loads Inter via next/font/google, which isn't available in the
// vitest environment; stub it so we can import the module's metadata export.
const stubFont = () => ({ variable: '--font-stub', className: 'font-stub' })
vi.mock('next/font/google', () => ({
  Inter: stubFont,
  JetBrains_Mono: stubFont,
  Caveat: stubFont,
}))

const { metadata } = await import('./layout')

describe('root metadata.icons', () => {
  const icons = metadata.icons

  it('declares an explicit icon list', () => {
    expect(icons).toBeTruthy()
    expect(icons && typeof icons === 'object' && 'icon' in icons).toBeTruthy()
  })

  // Regression guard: declaring metadata.icons overrides Next's app/icon.svg
  // file-convention detection, so the scalable SVG favicon must be listed
  // explicitly or the browser tab icon breaks.
  it('lists the SVG favicon first so the tab icon renders', () => {
    const list =
      icons && typeof icons === 'object' && 'icon' in icons ? icons.icon : null
    expect(Array.isArray(list)).toBeTruthy()
    const first = Array.isArray(list) ? list[0] : null
    expect(first).toMatchObject({ url: '/icon.svg', type: 'image/svg+xml' })
  })

  it('retains the PWA PNG icons for non-SVG platforms', () => {
    const list =
      icons && typeof icons === 'object' && 'icon' in icons ? icons.icon : []
    const urls = Array.isArray(list)
      ? list.map((entry) =>
          entry && typeof entry === 'object' && 'url' in entry
            ? String(entry.url)
            : '',
        )
      : []
    expect(urls).toContain('/api/pwa/icon-192')
    expect(urls).toContain('/api/pwa/icon-512')
  })
})
