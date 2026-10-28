// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { stubMatchMedia } from '@/test-utils/match-media'
import { CredChip, CRED_TRIGGER_HIT_AREA } from './CredChip'

afterEach(cleanup)

describe('CredChip', () => {
  it('opens the cred tip from a button with a 44px tap band (#1455)', () => {
    stubMatchMedia(false)
    render(<CredChip cred={12} showTooltip />)
    const trigger = screen.getByRole('button', { name: /12 cred/ })
    for (const cls of CRED_TRIGGER_HIT_AREA.split(' ')) {
      expect(trigger.classList.contains(cls)).toBe(true)
    }
    expect(CRED_TRIGGER_HIT_AREA).toContain('before:h-11')
    expect(trigger.hasAttribute('title')).toBe(false)
  })

  it('stays a plain chip without the tip', () => {
    stubMatchMedia(false)
    render(<CredChip cred={12} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
