import { describe, it, expect, vi, afterEach } from 'vitest'
import { jitter } from './jitter.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('jitter', () => {
  it('never returns less than the configured delay', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(jitter(3000)).toBe(3000)
  })

  it('adds at most 999ms', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    expect(jitter(3000)).toBe(3999)
  })

  it('keeps a zero delay at zero', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    expect(jitter(0)).toBe(0)
  })
})
