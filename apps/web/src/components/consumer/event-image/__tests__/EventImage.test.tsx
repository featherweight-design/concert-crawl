// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'

import { EventImage } from '../EventImage'

afterEach(cleanup)

// The fallback is an inline SVG that also carries role="img", so these assert
// on the <img> element itself rather than the role.
const photo = (root: HTMLElement) => root.querySelector('img')

describe('<EventImage />', () => {
  it('falls back to identity art when the photo fails', () => {
    const { container } = render(
      <EventImage src="https://example.test/a.jpg" alt="Show A" />,
    )
    const img = photo(container)
    expect(img).not.toBeNull()
    fireEvent.error(img!)
    expect(photo(container)).toBeNull()
  })

  // React reuses an instance when a list re-renders the same position with a
  // different event, so a failure must not outlive the URL that caused it.
  it('retries when the photo url changes', () => {
    const { container, rerender } = render(
      <EventImage src="https://example.test/a.jpg" alt="Show A" />,
    )
    fireEvent.error(photo(container)!)
    expect(photo(container)).toBeNull()

    rerender(<EventImage src="https://example.test/b.jpg" alt="Show B" />)

    expect(photo(container)?.getAttribute('src')).toBe(
      'https://example.test/b.jpg',
    )
  })
})
