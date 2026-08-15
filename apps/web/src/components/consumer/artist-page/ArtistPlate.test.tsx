// @vitest-environment jsdom

import React from 'react'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ArtistPlate } from './ArtistPlate'

afterEach(cleanup)

describe('ArtistPlate', () => {
  it('renders the press photo when there is one', () => {
    const { container } = render(
      <ArtistPlate
        name="Nightjar Choir"
        photo="https://i.example.com/a.jpg"
        height={200}
      />,
    )
    expect(container.querySelector('img')).not.toBeNull()
    expect(container.querySelector('svg')).toBeNull()
  })

  it('falls back to identity art when the photo fails at render time', () => {
    // A signed press-photo URL can expire between the server render and the
    // browser's image request, so a null check at fetch time is not enough.
    const { container } = render(
      <ArtistPlate
        name="Nightjar Choir"
        photo="https://i.example.com/expired.jpg"
        height={200}
      />,
    )
    const root = container.firstElementChild
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    if (!img) return
    fireEvent.error(img)

    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
    if (!(root instanceof HTMLElement))
      throw new Error('expected an element root')
    expect(root.style.height).toBe('200px')
  })

  it('goes straight to identity art when there is no photo', () => {
    const { container } = render(
      <ArtistPlate name="Wax Harbour" photo={null} height={150} />,
    )
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('retries when a new photo prop arrives', () => {
    const { container, rerender } = render(
      <ArtistPlate
        name="Nightjar Choir"
        photo="https://i.example.com/one.jpg"
        height={200}
      />,
    )
    const img = container.querySelector('img')
    if (!img) throw new Error('expected an image')
    fireEvent.error(img)
    expect(container.querySelector('img')).toBeNull()

    rerender(
      <ArtistPlate
        name="Nightjar Choir"
        photo="https://i.example.com/two.jpg"
        height={200}
      />,
    )
    expect(container.querySelector('img')).not.toBeNull()
  })

  it('holds the container height regardless of which layer renders', () => {
    const withPhoto = render(
      <ArtistPlate name="A" photo="https://i.example.com/a.jpg" height={320} />,
    )
    const root = withPhoto.container.firstElementChild
    if (!(root instanceof HTMLElement))
      throw new Error('expected an element root')
    expect(root.style.height).toBe('320px')
  })

  // #1525 decision 3 retired the chip internal to IdentityArt: it existed
  // because a wide scraped image could not say whose it was. Venue surfaces
  // still draw their own overlay; no artist surface does.
  it('draws no monogram over the generated art', () => {
    const { container } = render(
      <ArtistPlate name="Nightjar Choir" photo={null} height={200} />,
    )
    expect(container.querySelector('[data-identity-monogram]')).toBeNull()
  })
})
