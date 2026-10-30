import { afterEach, describe, expect, it } from 'vitest'

import { isPageSettled } from './page-ready'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('isPageSettled', () => {
  it('is true for a page with content and no placeholder', () => {
    document.body.innerHTML = '<main><h1>Venues</h1></main>'

    expect(isPageSettled()).toBe(true)
  })

  it('is false while an admin loading skeleton is mounted', () => {
    document.body.innerHTML = '<div class="admin-skeleton"></div>'

    expect(isPageSettled()).toBe(false)
  })

  it('is false while a consumer placeholder carries skeletonPulse inline', () => {
    document.body.innerHTML =
      '<div style="animation: skeletonPulse 1.4s ease-in-out infinite"></div>'

    expect(isPageSettled()).toBe(false)
  })

  it.each(['ccShimmer', 'wShimmer'])(
    'is false while a %s placeholder is mounted',
    (keyframes) => {
      document.body.innerHTML = `<div style="animation: ${keyframes} 1.3s ease-in-out infinite"></div>`

      expect(isPageSettled()).toBe(false)
    },
  )

  it('is false while a section is aria-busy', () => {
    document.body.innerHTML = '<div aria-busy="true"></div>'

    expect(isPageSettled()).toBe(false)
  })

  it('ignores a loading marker in a branch hidden with CSS', () => {
    document.body.innerHTML =
      '<div style="display: none"><div aria-busy="true"></div></div>'

    expect(isPageSettled()).toBe(true)
  })

  it('counts a hidden sweep overlay whose skeleton is displayed', () => {
    document.body.innerHTML =
      '<div><div class="dl-sweep" style="display: none"></div></div>'

    expect(isPageSettled()).toBe(false)
  })

  it('is false while a button is still server HTML', () => {
    document.body.innerHTML = '<button>Share this show</button>'

    expect(isPageSettled()).toBe(false)
  })

  it('is false while an event row is still server HTML', () => {
    document.body.innerHTML =
      '<div data-testid="event-row"><a href="/events/1">Show</a></div>'

    expect(isPageSettled()).toBe(false)
  })

  it('is true once every button is hydrated', () => {
    document.body.innerHTML = '<button>Share this show</button>'
    const button = document.querySelector('button')
    if (button === null) throw new Error('fixture button missing')
    Object.assign(button, { __reactProps$k3x9q2: { onClick: () => {} } })

    expect(isPageSettled()).toBe(true)
  })

  it('is false while an eager image has not finished', () => {
    document.body.innerHTML = '<img src="https://example.test/poster.png" />'

    expect(isPageSettled()).toBe(false)
  })

  it('is false while a discovery sweep overlay is mounted', () => {
    document.body.innerHTML = '<div class="dl-sweep"></div>'

    expect(isPageSettled()).toBe(false)
  })

  it('is false while a lazy image in the viewport has not finished', () => {
    document.body.innerHTML =
      '<img loading="lazy" src="https://example.test/hero.png" />'
    const img = document.querySelector('img')
    if (img === null) throw new Error('fixture image missing')
    img.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 100,
      right: 100,
      width: 100,
      height: 100,
      toJSON: () => ({}),
    })

    expect(isPageSettled()).toBe(false)
  })

  it('is false while web fonts are still loading', () => {
    document.body.innerHTML = '<main><h1>Venues</h1></main>'
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { status: 'loading' },
    })

    try {
      expect(isPageSettled()).toBe(false)
    } finally {
      Reflect.deleteProperty(document, 'fonts')
    }
  })

  it('ignores a lazy image a full-page screenshot never scrolls to', () => {
    document.body.innerHTML =
      '<img loading="lazy" src="https://example.test/below-fold.png" />'

    expect(isPageSettled()).toBe(true)
  })
})
