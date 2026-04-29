// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { applyTheme } from './apply-theme'

describe('applyTheme (server environment)', () => {
  it('does not throw when document is undefined', () => {
    expect(() => applyTheme('electric')).not.toThrow()
  })
})
