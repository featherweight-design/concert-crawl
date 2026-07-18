import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { describe, it, expect } from 'vitest'

const dir = dirname(fileURLToPath(import.meta.url))
const svgContent = readFileSync(resolve(dir, 'icon.svg'), 'utf-8')

describe('icon.svg', () => {
  it('contains dark mode media query', () => {
    expect(svgContent).toContain('prefers-color-scheme: dark')
  })

  it('contains Electric dark surface token', () => {
    expect(svgContent).toContain('#171D3A')
  })

  it('contains Light surface token', () => {
    expect(svgContent).toContain('#E8EDF6')
  })

  it('contains signal element', () => {
    expect(svgContent).toContain('#7AE6FF')
  })

  // Locked ClusterPath mark (logo-workshop-5.jsx): a cyan trail that grows
  // toward the halo, not the earlier uniform near-white dots.
  it('renders the trail in the signal color, not a separate dot color', () => {
    expect(svgContent).not.toContain('.dot')
    expect(svgContent).not.toContain('#E8F3FF')
  })

  it('grows the trail dots toward the halo', () => {
    expect(svgContent).toContain('r="1.5"')
    expect(svgContent).toContain('r="6"')
    expect(svgContent).not.toContain('r="1.6"')
  })
})
