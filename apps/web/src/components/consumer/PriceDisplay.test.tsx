// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { PriceDisplay } from '@/components/consumer/PriceDisplay'
import { stubMatchMedia } from '@/test-utils/match-media'
import { TIP_CONTENT } from '@/components/ui/cc-tip'

describe('PriceDisplay price provenance tip', () => {
  beforeEach(() => {
    stubMatchMedia(false)
  })

  it('offers the who-set-this-price tip alongside the price label', () => {
    render(
      <PriceDisplay
        priceMin="35.00"
        priceMax={null}
        priceSource="community"
        venueName="Larimer Lounge"
        ticketUrl="https://example.com/tickets"
        eventId="evt_1"
        artist="Test Artist"
        date="2026-09-01T02:00:00.000Z"
      />,
    )

    expect(
      screen.queryByRole('button', {
        name: TIP_CONTENT['who-set-this-price'].label,
      }),
    ).not.toBeNull()
  })
})
