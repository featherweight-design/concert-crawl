// @vitest-environment jsdom

import { render, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { FollowDateLine } from './FollowDateLine'
import { FOLLOWING_COPY } from './definitions/copy'

const SEP = FOLLOWING_COPY.cardDateSeparator

describe('FollowDateLine', () => {
  afterEach(cleanup)

  // The whole point of the component. A single ellipsised span drops the tail,
  // and the tail is the date — the only part of this line a user can act on.
  it('lets the venue shrink and pins the date', () => {
    const { container } = render(
      <FollowDateLine
        dateLine={`Red Rocks Amphitheatre${SEP}Aug 10`}
        fallback="No dates announced"
      />,
    )

    const [venue, date] = Array.from(container.querySelectorAll('span > span'))
    expect(venue?.textContent).toBe('Red Rocks Amphitheatre')
    expect(venue?.className).toContain('text-ellipsis')
    expect(date?.textContent).toBe(`${SEP}Aug 10`)
    expect(date?.className).toContain('shrink-0')
    expect(date?.className).not.toContain('text-ellipsis')
  })

  // A venue with its own separator must not steal the split.
  it('splits on the last separator, not the first', () => {
    const { container } = render(
      <FollowDateLine
        dateLine={`Ogden${SEP}Denver${SEP}Sep 5`}
        fallback="No dates announced"
      />,
    )

    const [venue, date] = Array.from(container.querySelectorAll('span > span'))
    expect(venue?.textContent).toBe(`Ogden${SEP}Denver`)
    expect(date?.textContent).toBe(`${SEP}Sep 5`)
  })

  it('renders the fallback whole when there is no date', () => {
    const { container } = render(
      <FollowDateLine dateLine={null} fallback="No dates announced" />,
    )

    expect(container.textContent).toBe('No dates announced')
    expect(container.querySelectorAll('span > span')).toHaveLength(0)
  })
})
