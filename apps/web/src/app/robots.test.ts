import type { MetadataRoute } from 'next'
import { afterEach, describe, expect, it } from 'vitest'

import robots from './robots'
import sitemap from './sitemap'

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

/**
 * Next types `disallow` as `string | string[] | undefined`. Spreading it
 * unnormalised would iterate the characters of a lone string and pass every
 * assertion below for the wrong reason.
 */
const disallowPaths = (result: MetadataRoute.Robots): string[] => {
  const { rules } = result
  if (Array.isArray(rules)) return rules.flatMap((rule) => disallowOf(rule))
  return disallowOf(rules)
}

const disallowOf = (rule: {
  disallow?: string | string[] | undefined
}): string[] => {
  const { disallow } = rule
  if (disallow === undefined) return []
  return Array.isArray(disallow) ? disallow : [disallow]
}

describe('robots.txt', () => {
  it('invites crawlers on the canonical origin', () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: 'https://concertcrawl.app' })

    const result = robots()

    expect(result.rules).toEqual({
      userAgent: '*',
      allow: '/',
      disallow: ['/api/admin', '/api/revalidate', '/admin'],
    })
    expect(result.sitemap).toBe('https://concertcrawl.app/sitemap.xml')
  })

  // `/api/pwa/icon-*` serves the manifest's icons, so a blanket `/api/` disallow
  // would stop a crawler evaluating the app as installable.
  it('leaves the PWA icon routes crawlable', () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: 'https://concertcrawl.app' })

    expect(disallowPaths(robots())).not.toContain('/api/')
  })

  // A trailing slash matches nothing but the subtree, so `/admin/` would leave
  // the bare entrypoint crawlable.
  it('blocks the bare entrypoints, not just what is under them', () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: 'https://concertcrawl.app' })

    const paths = disallowPaths(robots())

    expect(paths.length).toBeGreaterThan(0)
    expect(paths.every((path) => !path.endsWith('/'))).toBe(true)
  })

  // An indexed staging deploy competes with production for the same queries and
  // serves whatever state that branch happened to be in.
  it.each([
    ['staging', 'https://staging.concertcrawl.app'],
    ['a Vercel preview', 'https://concert-crawl-git-abc.vercel.app'],
  ])('blocks crawlers on %s', (_label, origin) => {
    setEnv({ NEXT_PUBLIC_SITE_URL: origin })

    expect(robots().rules).toEqual({ userAgent: '*', disallow: '/' })
  })

  it('blocks crawlers when no origin is configured at all', () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: undefined, VERCEL_URL: undefined })

    expect(robots().rules).toEqual({ userAgent: '*', disallow: '/' })
  })
})

describe('sitemap.xml', () => {
  // /bot is the whole reason the sitemap exists. The only pages that link to it
  // are the /legal pages, and every one of them is noindex, so an inbound link
  // passes no signal a search engine can follow.
  it('lists /bot so the crawler page is reachable by search', () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: 'https://concertcrawl.app' })

    expect(sitemap().map((entry) => entry.url)).toEqual([
      'https://concertcrawl.app/',
      'https://concertcrawl.app/bot',
    ])
  })

  // A sitemap is a discovery channel of its own, so a staging deploy listing its
  // own URLs can get them indexed despite its robots.txt disallowing crawling.
  it('publishes nothing off the canonical origin', () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: 'https://staging.concertcrawl.app' })

    expect(sitemap()).toEqual([])
  })

  it('does not list the noindex legal pages', () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: 'https://concertcrawl.app' })

    const urls = sitemap().map((entry) => entry.url)

    expect(urls.some((url) => url.includes('/legal'))).toBe(false)
  })
})
