// @vitest-environment jsdom

import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import { PassportCard } from '../PassportCard'
import { PP_MODES } from '../definitions/modes'
import { PASSPORT_COPY } from '../definitions/copy'
import { THEMES, THEME_NAMES } from '@/theme/themes'
import type { AttendedShow } from '@/lib/passport/stats'

afterEach(cleanup)

const show = (
  index: number,
  over: Partial<AttendedShow> = {},
): AttendedShow => ({
  id: `show-${index}`,
  artist: `Artist ${index}`,
  venue: `Venue ${index}`,
  genre: 'punk',
  date: '2026-03-14',
  priceFinal: 20,
  ...over,
})

const shows = (count: number): AttendedShow[] =>
  Array.from({ length: count }, (_, i) => show(i))

const mount = (
  props: Partial<React.ComponentProps<typeof PassportCard>> = {},
) =>
  render(
    <PassportCard
      mode="share"
      shows={shows(4)}
      tokens={THEMES.electric}
      handle="@huey"
      year={2026}
      {...props}
    />,
  )

describe('<PassportCard /> (#85)', () => {
  it('prints the year alongside the passport eyebrow', () => {
    mount()
    expect(screen.getByText(`${PASSPORT_COPY.eyebrow} · 2026`)).toBeTruthy()
  })

  it('prints the handle it was given', () => {
    mount({ handle: '@huey' })
    expect(screen.getByText('@huey')).toBeTruthy()
  })

  // user_profiles.handle is nullable. The Passport is an account artifact and
  // has no anonymous variant, so it falls back rather than dropping the header.
  it('falls back to @you rather than rendering a nameless passport', () => {
    mount({ handle: null })
    expect(screen.getByText(PASSPORT_COPY.fallbackHandle)).toBeTruthy()
  })

  it('prints the stats derived from the shows, not from props', () => {
    mount({
      shows: [
        show(1, { venue: 'Bluebird', genre: 'punk' }),
        show(2, { venue: 'Bluebird', genre: 'punk' }),
        show(3, { venue: 'Ogden', genre: 'jazz' }),
      ],
    })

    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('punk')).toBeTruthy()
  })

  it('singularises a one-night passport', () => {
    mount({ shows: [show(1)] })
    expect(screen.getByText(PASSPORT_COPY.statNight.toUpperCase())).toBeTruthy()
    expect(screen.getByText(PASSPORT_COPY.statVenue.toUpperCase())).toBeTruthy()
  })

  it('dashes the top genre when nothing is genred', () => {
    mount({ shows: [show(1, { genre: null })] })
    expect(screen.getByText(PASSPORT_COPY.noGenre)).toBeTruthy()
  })

  describe('overflow', () => {
    const capacity = PP_MODES.share.cols * PP_MODES.share.rows

    it('renders every show and no more-tile at exactly capacity', () => {
      mount({ shows: shows(capacity) })

      expect(screen.getByText(`Artist ${capacity - 1}`)).toBeTruthy()
      expect(screen.queryByText(PASSPORT_COPY.moreTile)).toBeNull()
    })

    // The tile occupies a slot, so the wall surfaces capacity - 1 shows. Off by
    // one here either drops a stamp silently or overflows the grid.
    it('spends the final slot on the tile the moment one show overflows', () => {
      mount({ shows: shows(capacity + 1) })

      expect(screen.getByText(PASSPORT_COPY.moreTile)).toBeTruthy()
      expect(screen.getByText('+2')).toBeTruthy()
      expect(screen.queryByText(`Artist ${capacity - 1}`)).toBeNull()
    })

    it('counts everything the wall could not show', () => {
      mount({ shows: shows(capacity + 10) })
      expect(screen.getByText('+11')).toBeTruthy()
    })

    it('applies the compact grid capacity in compact mode', () => {
      const compactCapacity = PP_MODES.compact.cols * PP_MODES.compact.rows
      expect(compactCapacity).toBe(9)

      mount({ mode: 'compact', shows: shows(compactCapacity) })
      expect(screen.queryByText(PASSPORT_COPY.moreTile)).toBeNull()

      cleanup()
      mount({ mode: 'compact', shows: shows(compactCapacity + 1) })
      expect(screen.getByText('+2')).toBeTruthy()
    })
  })

  describe('empty passport', () => {
    it('renders rather than throwing when nothing has been attended', () => {
      expect(() => mount({ shows: [] })).not.toThrow()
    })

    it('falls back to the no-history footer with no date to date it from', () => {
      mount({ shows: [] })
      expect(screen.getByText(PASSPORT_COPY.footerNoHistory)).toBeTruthy()
    })
  })

  it('dates the footer from the earliest night, not the newest', () => {
    mount({
      shows: [show(1, { date: '2026-11-30' }), show(2, { date: '2026-03-14' })],
    })

    expect(screen.getByText(/SINCE MAR 2026/)).toBeTruthy()
  })

  describe('nine-theme matrix', () => {
    it.each(THEME_NAMES)('renders %s in both modes', (name) => {
      for (const mode of ['compact', 'share'] as const) {
        expect(() =>
          mount({ mode, tokens: THEMES[name], shows: shows(20) }),
        ).not.toThrow()
        cleanup()
      }
    })
  })

  // Satori implements neither, and a print card that silently relies on them
  // renders an unreadable bottom panel over a bright stamp.
  describe('print safety', () => {
    it('uses no backdropFilter or maskImage in share mode', () => {
      const { container } = mount({ mode: 'share' })
      const html = container.innerHTML

      expect(html).not.toContain('backdrop-filter')
      expect(html).not.toContain('mask-image')
    })

    it('still uses the real glass treatment on screen', () => {
      const { container } = mount({ mode: 'compact' })
      const html = container.innerHTML

      expect(html).toContain('backdrop-filter')
      expect(html).toContain('mask-image')
    })
  })
})
