import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PwaIconSvg, PWA_ICON_PALETTE } from '../icon-svg'

describe('PwaIconSvg', () => {
  // Satori (next/og) drops the children of a <g> that has no transform, which
  // blanks the non-maskable ("any") icon art. Guard that both variants always
  // emit a non-empty transform so the art keeps rendering to PNG.
  it('emits a non-empty group transform for the non-maskable icon', () => {
    const markup = renderToStaticMarkup(<PwaIconSvg size={192} />)
    expect(markup).toContain('transform="translate(0 0)"')
    expect(markup).not.toContain('transform=""')
  })

  it('insets and scales the art inside the safe zone for maskable icons', () => {
    const markup = renderToStaticMarkup(<PwaIconSvg size={192} maskable />)
    // (96 * (1 - 0.8)) / 2 = 9.6, subject to float representation.
    expect(markup).toMatch(/translate\(9\.59\d+ 9\.59\d+\) scale\(0\.8\)/)
  })

  // The mark is the locked ClusterPath (logo-workshop-5.jsx): a cyan trail that
  // grows toward the halo — not the earlier uniform, near-white dots.
  it('renders the trail in the signal cyan, not a separate near-white dot color', () => {
    const markup = renderToStaticMarkup(<PwaIconSvg size={192} />)
    expect(markup).toContain(PWA_ICON_PALETTE.signal)
    expect(markup).not.toContain('#E8F3FF')
  })

  it('grows the trail dots toward the halo', () => {
    const markup = renderToStaticMarkup(<PwaIconSvg size={192} />)
    // Smallest tail dot and the large dot that overlaps the r=7 core.
    expect(markup).toContain('r="1.5"')
    expect(markup).toContain('r="6"')
    expect(markup).not.toContain('r="1.6"')
  })

  // Opacity is a fixed 2-decimal string so the PNG output stays deterministic:
  // no long floats (0.4399999999) and no dropped trailing zeros (0.80 -> 0.8).
  it('emits stable 2-decimal trail opacities', () => {
    const markup = renderToStaticMarkup(<PwaIconSvg size={192} />)
    expect(markup).toContain('opacity="0.44"')
    expect(markup).toContain('opacity="0.80"')
    expect(markup).not.toMatch(/opacity="0\.\d{4,}"/)
  })
})
