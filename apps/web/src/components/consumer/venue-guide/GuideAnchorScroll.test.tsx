// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GuideAnchorScroll } from './GuideAnchorScroll'

afterEach(() => {
  cleanup()
  window.location.hash = ''
})

const mountWithAnchor = () => {
  const section = document.createElement('section')
  section.id = 'ft-guide'
  const scrollIntoView = vi.fn()
  section.scrollIntoView = scrollIntoView
  document.body.appendChild(section)
  return scrollIntoView
}

/** The component scrolls inside rAF, so drive the frame by hand. */
const runFrame = async () => {
  await new Promise((resolve) =>
    window.requestAnimationFrame(() => resolve(null)),
  )
}

describe('GuideAnchorScroll', () => {
  it('scrolls the guide into view when the page carries the guide hash', async () => {
    // A client-side navigation from the event chip lands with the hash set but
    // the viewport at the top of the route — without this the guide sits far
    // below the fold on the one journey that exists to reach it.
    const scrollIntoView = mountWithAnchor()
    window.location.hash = '#ft-guide'
    render(<GuideAnchorScroll />)
    await runFrame()
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
  })

  it('leaves the scroll position alone when there is no hash', async () => {
    const scrollIntoView = mountWithAnchor()
    render(<GuideAnchorScroll />)
    await runFrame()
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('leaves the scroll position alone for an unrelated hash', async () => {
    const scrollIntoView = mountWithAnchor()
    window.location.hash = '#upcoming'
    render(<GuideAnchorScroll />)
    await runFrame()
    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})
