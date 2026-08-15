import { describe, it, expect } from 'vitest'
import { blendOver, parseHex, rgba, toHex } from '../print-color'

describe('parseHex / toHex', () => {
  it('round-trips six-digit hex', () => {
    expect(parseHex('#FF3B95')).toEqual({ rr: 255, gg: 59, bb: 149 })
    expect(toHex({ rr: 255, gg: 59, bb: 149 })).toBe('#ff3b95')
  })

  it('returns null for anything that is not #rrggbb', () => {
    for (const bad of ['', 'red', '#fff', 'rgba(0,0,0,1)', 'oklch(0.6 0 0)'])
      expect(parseHex(bad)).toBeNull()
  })
})

describe('blendOver', () => {
  it('multiplies correctly on light paper', () => {
    // white base leaves the layer untouched under multiply
    expect(blendOver('#FF3B95', '#FFFFFF', 'multiply')).toBe('#ff3b95')
    // black base annihilates it
    expect(blendOver('#FF3B95', '#000000', 'multiply')).toBe('#000000')
    // 50% grey halves every channel
    expect(blendOver('#FFFFFF', '#808080', 'multiply')).toBe('#808080')
  })

  it('screens correctly on dark paper', () => {
    expect(blendOver('#FF5566', '#000000', 'screen')).toBe('#ff5566')
    expect(blendOver('#FF5566', '#FFFFFF', 'screen')).toBe('#ffffff')
  })

  it('falls back to the layer colour for non-hex inputs', () => {
    expect(blendOver('oklch(0.6 0.1 20)', '#000000', 'screen')).toBe(
      'oklch(0.6 0.1 20)',
    )
  })
})

describe('rgba', () => {
  it('emits a satori-parseable rgba string', () => {
    expect(rgba('#FF3B95', 0.5)).toBe('rgba(255,59,149,0.5)')
  })

  it('clamps alpha', () => {
    expect(rgba('#000000', -1)).toBe('rgba(0,0,0,0)')
    expect(rgba('#000000', 4)).toBe('rgba(0,0,0,1)')
  })
})
