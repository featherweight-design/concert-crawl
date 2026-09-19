import type { MetadataRoute } from 'next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import robots from './robots'
import sitemap from './sitemap'

interface RequestHost {
  value: string | null
}

const requestHost = vi.hoisted((): RequestHost => ({ value: null }))

vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(new Headers(hostHeader())),
}))

const hostHeader = (): Record<string, string> =>
  requestHost.value === null ? {} : { host: requestHost.value }

/** The `Host` on the request being served, which is what both files gate on. */
const servedFrom = (host: string | null) => {
  requestHost.value = host
}

beforeEach(() => {
  servedFrom('concertcrawl.app')
})

// The deploy-origin cases below set env vars; left in place they would decide
// the result of whatever test ran next.
afterEach(() => {
  vi.unstubAllEnvs()
})

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
  it('invites crawlers on the canonical host', async () => {
    const result = await robots()

    expect(result.rules).toEqual({
      userAgent: '*',
      allow: '/',
      disallow: ['/api/admin', '/api/revalidate', '/admin'],
    })
    expect(result.sitemap).toBe('https://concertcrawl.app/sitemap.xml')
  })

  /**
   * The regression this file exists for. Gating on the deploy's configured site
   * URL meant prod answered `Disallow: /`, because `NEXT_PUBLIC_SITE_URL` is
   * unset there and `VERCEL_URL` is the per-deployment host, never the domain.
   */
  it('invites crawlers even when the deploy advertises a vercel.app origin', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    vi.stubEnv('VERCEL_URL', 'concert-crawl-abc123.vercel.app')

    expect(await robots()).toMatchObject({
      sitemap: 'https://concertcrawl.app/sitemap.xml',
    })
  })

  // `/api/pwa/icon-*` serves the manifest's icons, so a blanket `/api/` disallow
  // would stop a crawler evaluating the app as installable.
  it('leaves the PWA icon routes crawlable', async () => {
    expect(disallowPaths(await robots())).not.toContain('/api/')
  })

  // A trailing slash matches nothing but the subtree, so `/admin/` would leave
  // the bare entrypoint crawlable.
  it('blocks the bare entrypoints, not just what is under them', async () => {
    const paths = disallowPaths(await robots())

    expect(paths.length).toBeGreaterThan(0)
    expect(paths.every((path) => !path.endsWith('/'))).toBe(true)
  })

  // An indexed staging deploy competes with production for the same queries and
  // serves whatever state that branch happened to be in.
  it.each([
    ['staging', 'staging.concertcrawl.app'],
    ['a Vercel preview', 'concert-crawl-git-abc.vercel.app'],
  ])('blocks crawlers served from %s', async (_label, host) => {
    servedFrom(host)

    expect((await robots()).rules).toEqual({ userAgent: '*', disallow: '/' })
  })

  // Host names are case-insensitive and the header comes back as the client
  // sent it, so an exact comparison would answer a valid request with the
  // blanket disallow.
  // `concertcrawl.app:443` names the same origin as `concertcrawl.app`, so a
  // client that sends the default port explicitly is still asking for prod.
  it.each([
    'CONCERTCRAWL.APP',
    'ConcertCrawl.app',
    ' concertcrawl.app ',
    'concertcrawl.app:443',
  ])('treats %s as the canonical host', async (host) => {
    servedFrom(host)

    expect(await robots()).toMatchObject({
      sitemap: 'https://concertcrawl.app/sitemap.xml',
    })
  })

  it('blocks crawlers when the request carries no host at all', async () => {
    servedFrom(null)

    expect((await robots()).rules).toEqual({ userAgent: '*', disallow: '/' })
  })
})

describe('sitemap.xml', () => {
  // /bot is the whole reason the sitemap exists. The only pages that link to it
  // are the /legal pages, and every one of them is noindex, so an inbound link
  // passes no signal a search engine can follow.
  it('lists /bot so the crawler page is reachable by search', async () => {
    const entries = await sitemap()

    expect(entries.map((entry) => entry.url)).toEqual([
      'https://concertcrawl.app/',
      'https://concertcrawl.app/bot',
    ])
  })

  // The same regression as above: the URLs have to name the domain a searcher
  // can visit, not the deployment host this build happens to be running on.
  it('publishes canonical URLs regardless of the deploy origin', async () => {
    vi.stubEnv('VERCEL_URL', 'concert-crawl-abc123.vercel.app')

    const entries = await sitemap()

    // `every` is vacuously true on an empty array, which is the exact shape the
    // bug produced, so the count is asserted before the prefixes.
    expect(entries).toHaveLength(2)
    expect(
      entries.every((entry) =>
        entry.url.startsWith('https://concertcrawl.app/'),
      ),
    ).toBe(true)
  })

  // A sitemap is a discovery channel of its own, so a staging deploy listing its
  // own URLs can get them indexed despite its robots.txt disallowing crawling.
  it('publishes nothing off the canonical host', async () => {
    servedFrom('staging.concertcrawl.app')

    expect(await sitemap()).toEqual([])
  })

  it('does not list the noindex legal pages', async () => {
    const entries = await sitemap()

    expect(entries.some((entry) => entry.url.includes('/legal'))).toBe(false)
  })
})
