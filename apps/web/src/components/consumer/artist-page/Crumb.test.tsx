// @vitest-environment jsdom

import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Crumb } from './Crumb'
import { ARTIST_COPY } from './definitions/copy'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string
    children: React.ReactNode
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

afterEach(cleanup)

describe('Crumb', () => {
  it('labels the landmark as a breadcrumb, not as its first link', () => {
    const { container } = render(<Crumb name="Nightjar Choir" />)

    const nav = container.querySelector('nav')
    expect(nav?.getAttribute('aria-label')).toBe(ARTIST_COPY.crumbAria)
    expect(nav?.getAttribute('aria-label')).not.toBe(ARTIST_COPY.crumbRoot)
  })

  it('links back to browse and names the current artist', () => {
    const { container, getByText } = render(<Crumb name="Nightjar Choir" />)

    expect(container.querySelector('a')?.getAttribute('href')).toBe('/events')
    expect(getByText(ARTIST_COPY.crumbRoot)).toBeTruthy()
    expect(getByText('Nightjar Choir')).toBeTruthy()
  })
})
