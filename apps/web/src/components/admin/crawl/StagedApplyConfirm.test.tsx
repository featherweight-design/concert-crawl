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

const pauseVenue = vi.fn()
vi.mock('@/lib/actions/venues', () => ({
  pauseVenue: (...args: unknown[]) => pauseVenue(...args),
}))

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

const renderConfirm = (onApply = vi.fn()) => {
  render(
    <StagedApplyConfirm
      stagedId="opt-manual"
      venueId="venue-1"
      venueName="The Venue"
      onCancel={vi.fn()}
      onApply={onApply}
    />,
  )
  return onApply
}

describe('StagedApplyConfirm: manual entry', () => {
  it('pauses the venue and never queues a re-crawl', async () => {
    pauseVenue.mockResolvedValue(undefined)
    const onApply = renderConfirm()

    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByText(ADMIN_COPY.crawl.stagedApply.footerApply))

    await waitFor(() => expect(onApply).toHaveBeenCalled())
    expect(pauseVenue).toHaveBeenCalledWith('venue-1')
    expect(triggerVenueCrawl).not.toHaveBeenCalled()
  })

  it('stays open with an error when the pause fails', async () => {
    pauseVenue.mockRejectedValue(new Error('boom'))
    const onApply = renderConfirm()

    fireEvent.click(screen.getByText(ADMIN_COPY.crawl.stagedApply.footerApply))

    expect(
      await screen.findByText(ADMIN_COPY.crawl.stagedApply.pauseFailed),
    ).toBeInTheDocument()
    expect(onApply).not.toHaveBeenCalled()
  })
})
