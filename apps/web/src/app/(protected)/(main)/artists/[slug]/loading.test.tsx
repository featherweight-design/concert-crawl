// @vitest-environment jsdom

import React from 'react'
import type { ArtistDetailResponse } from '@concert-crawl/types'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AP_HERO_H } from '@/components/consumer/artist-page/definitions/constants'
import { ArtistPageContent } from '@/components/consumer/artist-page/ArtistPageContent'

import ArtistLoading from './loading'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  usePathname: () => '/artists/nightjar-choir',
}))

vi.mock('next/link', () => ({
  default: ({
    children,
    ...rest
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...rest}>{children}</a>
  ),
}))

afterEach(cleanup)

const LOADED: ArtistDetailResponse = {
  artist: {
    slug: 'nightjar-choir',
    name: 'Nightjar Choir',
    photoUrl: null,
  },
  shows: [],
  past: [],
  history: { firstSeen: null, showCount: 0 },
}

describe('artist route skeleton', () => {
  it('gives the mobile hero the same narrow breakpoint the real plate has', () => {
    const { container } = render(<ArtistLoading />)

    const hero = container.querySelector('.ap-hero-wrap .ap-hero')
    expect(hero).not.toBeNull()
    // Inline height is the wide value; `.ap-hero` steps it to 150px under
    // 360px, so the skeleton and the plate never disagree by 50px.
    expect(hero?.getAttribute('style')).toContain(`height: ${AP_HERO_H.wide}px`)
  })

  // Regression guard: the skeleton omitted the desktop crumb, so the whole grid
  // jumped down 38px when content arrived (name top 98 → 136).
  describe('desktop crumb slot', () => {
    it('reserves a crumb above the grid', () => {
      const { container } = render(<ArtistLoading />)
      const shell = container.querySelector('.ap-shell')

      const first = shell?.firstElementChild
      expect(first?.className).toContain('hidden')
      expect(first?.className).toContain('md:block')
      expect(first?.nextElementSibling?.className).toContain('ap-grid')
    })

    it('places it exactly where the loaded page places its crumb', () => {
      const skeleton = render(<ArtistLoading />).container
      const loaded = render(<ArtistPageContent data={LOADED} />).container

      const shellChildren = (root: Element) =>
        Array.from(root.querySelector('.ap-shell')?.children ?? []).map(
          (child) => child.className,
        )

      // Same number of shell-level blocks, same responsive classes, same order.
      expect(shellChildren(skeleton)).toEqual(shellChildren(loaded))
    })

    it('gives the crumb the same box metrics as the real crumb', () => {
      const skeleton = render(<ArtistLoading />).container
      const loaded = render(<ArtistPageContent data={LOADED} />).container

      const skeletonCrumb = skeleton.querySelector<HTMLElement>(
        '.ap-shell > div > div',
      )
      const loadedCrumb = loaded.querySelector<HTMLElement>('.ap-shell nav')

      expect(skeletonCrumb).not.toBeNull()
      expect(loadedCrumb).not.toBeNull()
      // Height is driven by font-size + margin-bottom; a drift in either is the
      // 38px shift coming back.
      expect(skeletonCrumb?.style.fontSize).toBe(loadedCrumb?.style.fontSize)
      expect(skeletonCrumb?.style.marginBottom).toBe(
        loadedCrumb?.style.marginBottom,
      )
    })
  })

  // PR-E renders no Follow button at either viewport, so the skeleton must not
  // reserve one — a 48px + 20px slot that collapses on load is the same
  // layout-shift lie as the missing crumb, just in the other direction.
  it('reserves no Follow slot while PR-E ships no Follow button', () => {
    const skeleton = render(<ArtistLoading />).container
    const loaded = render(<ArtistPageContent data={LOADED} />).container

    // No control at all inside the shell yet — the only button on the loaded
    // page is the mobile BackChip, which sits over the plate, not in the shell.
    expect(loaded.querySelector('.ap-shell button')).toBeNull()

    const heights = Array.from(
      skeleton.querySelectorAll<HTMLElement>('[style]'),
    ).map((node) => node.style.height)
    expect(heights).not.toContain('48px')
  })
})
