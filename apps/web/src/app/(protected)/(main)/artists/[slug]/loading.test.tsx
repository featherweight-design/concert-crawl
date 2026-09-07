// @vitest-environment jsdom

import React from 'react'
import type { ArtistDetailResponse } from '@concert-crawl/types'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ArtistPageContent } from '@/components/consumer/artist-page/ArtistPageContent'
import { NF_FOLLOW_SIZES } from '@/components/consumer/artist-page/definitions/constants'

import ArtistLoading from './loading'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  usePathname: () => '/artists/nightjar-choir',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => null, isSignedIn: false }),
}))

vi.mock('@/theme', () => ({
  useTheme: () => ({ theme: 'electric', setTheme: () => undefined }),
}))

vi.mock('@/components/consumer/tier-picker/TierPickerSheet', () => ({
  TierPickerSheet: () => null,
}))

vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: undefined }),
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
    spotifyArtistId: null,
    photoUrl: null,
  },
  shows: [],
  past: [],
  history: { count: 0, venues: [] },
  following: null,
}

describe('artist route skeleton', () => {
  it('stands the mobile band up at the height the real band uses', () => {
    const skeleton = render(<ArtistLoading />).container
    const loaded = render(<ArtistPageContent data={LOADED} />).container

    const band = skeleton.querySelector('.ap-band-skeleton')
    expect(band).not.toBeNull()

    // The panel column is what sets the band's height, so the two must agree
    // on it exactly — 128px of art either way.
    expect(band?.querySelector('.w-32')).not.toBeNull()
    expect(
      band?.querySelector<HTMLElement>('.w-32 [style]')?.style.height,
    ).toBe('128px')
    expect(
      loaded.querySelector('[data-testid="hero-band"] .w-32'),
    ).not.toBeNull()
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
  // reserve one — a slot that collapses on load is the same layout-shift lie as
  // the missing crumb, just in the other direction. The height comes from the
  // size table rather than a literal, so a future size pass moves both together.
  it('reserves the Follow slot at the height the loaded page uses', () => {
    // PR-E deliberately reserved nothing here, because PR-E rendered no Follow
    // button and a reserved slot would have been a 68px layout-shift lie. PR-F
    // ships the button, so the lie is now the other way round: leaving the box
    // out makes the page jump the moment the payload lands.
    const skeleton = render(<ArtistLoading />).container
    const loaded = render(<ArtistPageContent data={LOADED} />).container

    // The loaded page puts a Follow control inside the shell at every viewport.
    expect(loaded.querySelector('.ap-shell button[aria-label]')).not.toBeNull()

    const heights = Array.from(
      skeleton.querySelectorAll<HTMLElement>('[style]'),
    ).map((node) => node.style.height)
    expect(heights).toContain(`${NF_FOLLOW_SIZES.primary.height}px`)
  })
})
