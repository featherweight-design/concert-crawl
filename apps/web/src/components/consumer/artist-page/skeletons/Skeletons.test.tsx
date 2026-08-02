// @vitest-environment jsdom

import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ARTIST_COPY } from '../definitions/copy'

import {
  FollowSkeleton,
  HeroSkeleton,
  ShowsSkeleton,
  TextSkeleton,
} from './Skeletons'

afterEach(cleanup)

describe('artist page skeletons', () => {
  it('hides every decorative block from the accessibility tree', () => {
    const { container } = render(
      <div>
        <HeroSkeleton height={200} />
        <TextSkeleton width="72%" />
      </div>,
    )
    const blocks = container.querySelectorAll('[aria-hidden="true"]')
    expect(blocks.length).toBe(2)
    blocks.forEach((block) => {
      expect(block.getAttribute('aria-hidden')).toBe('true')
    })
  })

  it('announces the artist payload once, not once per shimmering box', () => {
    const { container } = render(<ShowsSkeleton rows={4} />)
    const region = container.querySelector('[role="status"]')
    expect(region?.getAttribute('aria-busy')).toBe('true')
    expect(container.querySelectorAll('.sr-only')).toHaveLength(1)
    expect(container.textContent).toContain(ARTIST_COPY.loadingArtist)
  })

  it('renders one placeholder row per requested row', () => {
    const { container } = render(<ShowsSkeleton rows={3} />)
    expect(
      container.querySelectorAll('[role="status"] > [aria-hidden="true"]'),
    ).toHaveLength(3)
  })

  // Design table §12 lists a Follow bar on the skeleton. It has to match the
  // real control's 48px box or the page jumps the moment the payload lands.
  it('reserves the Follow control at its real height, decoratively', () => {
    const { container } = render(<FollowSkeleton />)
    const bar = container.querySelector('[aria-hidden="true"]')
    expect(bar).not.toBeNull()
    expect(bar?.getAttribute('style')).toContain('height: 48px')
    expect(bar?.getAttribute('style')).toContain('border-radius: 10px')
  })
})
