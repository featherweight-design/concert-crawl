import { describe, it, expect } from 'vitest'
import {
  chooseLevel,
  requiredWidth,
  shortenDate,
  type WhenWhereWidths,
} from './when-where'

// Roughly the shipping geometry at 11px mono: "Sat, Aug 15" / "Aug 15" /
// "8:00 PM", with a separator glyph plus its two flex gaps.
const WIDTHS: WhenWhereWidths = {
  fullDate: 62,
  shortDate: 41,
  time: 48,
  separator: 14,
}

const ALL = { showsDate: true, showsTime: true, showsVenue: true }

describe('chooseLevel', () => {
  it('stays at level 0 when the fixed units fit with room for the venue', () => {
    expect(chooseLevel(WIDTHS, 300, ALL)).toBe(0)
  })

  it('drops the weekday before it drops the venue', () => {
    // 62 + 14 + 48 + 14 = 138 needed at level 0; level 1 needs 117.
    expect(chooseLevel(WIDTHS, 130, ALL)).toBe(1)
  })

  it('drops the venue and its separator as one unit', () => {
    // Level 1 needs 117, level 2 needs 103.
    expect(chooseLevel(WIDTHS, 110, ALL)).toBe(2)
  })

  it('clears the level-2 floor against the narrow Watching column', () => {
    // The measured case that moved price min-width from 62 to 56: the level-2
    // floor is 103px, and the column it has to fit was 100px.
    expect(requiredWidth(2, WIDTHS, ALL)).toBe(103)
    expect(chooseLevel(WIDTHS, 100, ALL)).toBe(3)
    expect(chooseLevel(WIDTHS, 106, ALL)).toBe(2)
  })

  it('drops the time last, leaving the date standing', () => {
    expect(chooseLevel(WIDTHS, 50, ALL)).toBe(3)
    expect(requiredWidth(3, WIDTHS, ALL)).toBe(WIDTHS.shortDate)
  })

  it('never escalates past the date, even at an impossible width', () => {
    expect(chooseLevel(WIDTHS, 1, ALL)).toBe(3)
  })

  it('reports level 0 before the box has been laid out', () => {
    expect(chooseLevel(WIDTHS, 0, ALL)).toBe(0)
  })

  it('charges nothing for units the surface already carries', () => {
    // Venue page: the venue is the page, so the row never renders it and
    // levels 1 and 2 cost the same.
    const venueSurface = { ...ALL, showsVenue: false }
    expect(requiredWidth(1, WIDTHS, venueSurface)).toBe(
      requiredWidth(2, WIDTHS, venueSurface),
    )
    // Browse: date group headers carry the date, so line 3 starts at the time.
    const browse = { ...ALL, showsDate: false }
    expect(requiredWidth(0, WIDTHS, browse)).toBe(
      WIDTHS.time + WIDTHS.separator,
    )
  })
})

describe('shortenDate', () => {
  it('drops the weekday as a whole token', () => {
    expect(shortenDate('Sat, Aug 15')).toBe('Aug 15')
    expect(shortenDate('Saturday, Aug 15')).toBe('Aug 15')
  })

  it('leaves a date with no weekday alone', () => {
    expect(shortenDate('Aug 15')).toBe('Aug 15')
    expect(shortenDate('Tonight')).toBe('Tonight')
  })
})
