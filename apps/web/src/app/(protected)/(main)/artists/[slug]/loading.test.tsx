// @vitest-environment jsdom

import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { AP_HERO_H } from '@/components/consumer/artist-page/definitions/constants'

import ArtistLoading from './loading'

afterEach(cleanup)

describe('artist route skeleton', () => {
  it('gives the mobile hero the same narrow breakpoint the real plate has', () => {
    const { container } = render(<ArtistLoading />)

    const hero = container.querySelector('.ap-hero-wrap .ap-hero')
    expect(hero).not.toBeNull()
    // Inline height is the wide value; `.ap-hero` steps it to 150px under
    // 360px, so the skeleton and the plate never disagree by 50px.
    expect(hero?.getAttribute('style')).toContain(`height: ${AP_HERO_H.wide}px`)
  })
})
