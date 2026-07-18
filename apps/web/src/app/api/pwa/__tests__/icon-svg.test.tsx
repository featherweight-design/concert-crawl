import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PwaIconSvg } from '../icon-svg'

// Satori (next/og) drops the children of a <g> that has no transform, which
// blanks the non-maskable ("any") icon art. Guard that both variants always
// emit a non-empty transform so the art keeps rendering to PNG.
describe('PwaIconSvg', () => {
  it('emits a non-empty group transform for the non-maskable icon', () => {
    const markup = renderToStaticMarkup(<PwaIconSvg size={192} />)
    expect(markup).toContain('transform="translate(0 0)"')
    expect(markup).not.toContain('transform=""')
  })

  it('insets and scales the art inside the safe zone for maskable icons', () => {
    const markup = renderToStaticMarkup(<PwaIconSvg size={192} maskable />)
    // (48 * (1 - 0.8)) / 2 = 4.8, subject to float representation.
    expect(markup).toMatch(/translate\(4\.79\d+ 4\.79\d+\) scale\(0\.8\)/)
  })
})
