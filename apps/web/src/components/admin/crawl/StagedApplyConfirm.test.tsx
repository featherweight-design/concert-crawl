// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react'

const triggerVenueCrawl = vi.fn()
vi.mock('@/components/admin/crawl-trigger-button/lib/crawl', () => ({
  triggerVenueCrawl: (...args: unknown[]) => triggerVenueCrawl(...args),
}))

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'tok' }),
}))

import { StagedApplyConfirm } from './StagedApplyConfirm'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('StagedApplyConfirm: manual entry', () => {
  it('never queues a re-crawl, which would clear the block', async () => {
    const onApply = vi.fn()
    render(
      <StagedApplyConfirm
        stagedId="opt-manual"
        venueId="venue-1"
        venueName="The Venue"
        onCancel={vi.fn()}
        onApply={onApply}
      />,
    )

    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByText(ADMIN_COPY.crawl.stagedApply.footerApply))

    await waitFor(() => expect(onApply).toHaveBeenCalled())
    expect(triggerVenueCrawl).not.toHaveBeenCalled()
  })

  it('does not offer manual entry for a failure that records no block', () => {
    expect(ADMIN_COPY.crawl.diagnostics.diagOptions.unknown).toHaveLength(0)
  })
})
