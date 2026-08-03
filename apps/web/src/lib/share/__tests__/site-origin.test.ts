import { afterEach, describe, expect, it } from 'vitest'
import { absoluteUrl, siteOrigin } from '../site-origin'

// Read through `process.env` rather than vi.stubEnv so the "absent" case is a
// genuinely missing key — the resolver treats undefined and '' alike, and both
// have to fall through.
const ORIGINAL = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL }
})

const setEnv = (vars: Record<string, string | undefined>) => {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

describe('siteOrigin', () => {
  it('prefers the explicitly configured site URL', () => {
    setEnv({
      NEXT_PUBLIC_SITE_URL: 'https://concertcrawl.app',
      VERCEL_URL: 'preview-abc.vercel.app',
    })

    expect(siteOrigin()).toBe('https://concertcrawl.app')
  })

  it('trims a trailing slash so paths never double up', () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: 'https://concertcrawl.app/' })

    expect(absoluteUrl('/e/abc')).toBe('https://concertcrawl.app/e/abc')
  })

  // The var Vercel actually sets is unprefixed: it resolves server-side only,
  // in generateMetadata. Reading a NEXT_PUBLIC_ twin would find nothing on a
  // standard deploy and quietly ship localhost URLs to every crawler.
  it('falls back to the deployment host Vercel sets', () => {
    setEnv({
      NEXT_PUBLIC_SITE_URL: undefined,
      VERCEL_URL: 'concert-crawl-git-main.vercel.app',
    })

    expect(siteOrigin()).toBe('https://concert-crawl-git-main.vercel.app')
  })

  it('treats an empty configured value as unset', () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: '', VERCEL_URL: 'preview-abc.vercel.app' })

    expect(siteOrigin()).toBe('https://preview-abc.vercel.app')
  })

  it('falls through to the dev server when nothing is configured', () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: undefined, VERCEL_URL: undefined })

    expect(siteOrigin()).toBe('http://localhost:3000')
  })
})

describe('absoluteUrl', () => {
  it('joins a path that carries no leading slash', () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: 'https://concertcrawl.app' })

    expect(absoluteUrl('share/abc/link')).toBe(
      'https://concertcrawl.app/share/abc/link',
    )
  })
})
