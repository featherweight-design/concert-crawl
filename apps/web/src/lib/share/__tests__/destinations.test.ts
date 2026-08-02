import { describe, expect, it, vi } from 'vitest'
import {
  canSystemShare,
  copyLink,
  posterFileName,
  posterImageUrl,
  publicEventUrl,
  systemShare,
  type ShareCapabilities,
} from '@/lib/share/destinations'
import type { PosterEvent } from '@/lib/share/poster-event'

const EVENT_ID = '11111111-2222-4333-8444-555555555555'

const poster: PosterEvent = {
  id: EVENT_ID,
  artist: 'Snakebite Revival',
  venue: 'Bluebird Theater',
  city: 'Denver',
  dateShort: 'FRI, MAR 14',
  showTime: '8:00 PM',
  state: 'going',
  dropLabel: null,
}

const pngResponse = (): Response =>
  new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), { status: 200 })

describe('posterImageUrl', () => {
  it('omits the query entirely when nothing is set', () => {
    expect(posterImageUrl({ eventId: EVENT_ID, ratio: 'story' })).toBe(
      `/share/${EVENT_ID}/story`,
    )
  })

  it('carries the theme and handle when supplied', () => {
    expect(
      posterImageUrl({
        eventId: EVENT_ID,
        ratio: 'link',
        theme: 'jade',
        by: '@hugh',
      }),
    ).toBe(`/share/${EVENT_ID}/link?theme=jade&by=%40hugh`)
  })

  it('treats a null or empty handle as anonymous', () => {
    expect(
      posterImageUrl({ eventId: EVENT_ID, ratio: 'square', by: null }),
    ).not.toContain('by=')
    expect(
      posterImageUrl({ eventId: EVENT_ID, ratio: 'square', by: '' }),
    ).not.toContain('by=')
  })
})

describe('publicEventUrl', () => {
  it('points at the public mirror, not the protected page', () => {
    expect(publicEventUrl(EVENT_ID, 'https://concertcrawl.app')).toBe(
      `https://concertcrawl.app/e/${EVENT_ID}`,
    )
  })
})

describe('posterFileName', () => {
  it('slugs the artist and venue', () => {
    expect(posterFileName(poster)).toBe(
      'snakebite-revival-bluebird-theater.png',
    )
  })

  it('falls back when the name slugs to nothing', () => {
    expect(posterFileName({ ...poster, artist: '???', venue: '!!!' })).toBe(
      'concert-crawl.png',
    )
  })
})

describe('canSystemShare', () => {
  it('is false where navigator.share does not exist', () => {
    expect(canSystemShare({})).toBe(false)
    expect(canSystemShare({ share: async () => undefined })).toBe(true)
  })
})

describe('systemShare', () => {
  const args = {
    title: 'Snakebite Revival at Bluebird Theater',
    url: `https://concertcrawl.app/e/${EVENT_ID}`,
    imageUrl: `/share/${EVENT_ID}/story`,
    fileName: 'poster.png',
  }

  it('reports unsupported where there is no share API', async () => {
    expect(await systemShare({}, args)).toBe('unsupported')
  })

  it('shares the PNG when the platform accepts files', async () => {
    const share = vi.fn(async (_data: ShareData): Promise<void> => undefined)
    const caps: ShareCapabilities = { share, canShare: () => true }
    const fetchImpl = vi.fn(async () => pngResponse())
    expect(await systemShare(caps, { ...args, fetchImpl })).toBe('shared')
    const payload = share.mock.calls[0]?.[0]
    expect(payload?.files).toHaveLength(1)
  })

  it('falls back to a URL-only share when files are refused', async () => {
    const share = vi.fn(async (_data: ShareData): Promise<void> => undefined)
    const caps: ShareCapabilities = { share, canShare: () => false }
    const fetchImpl = vi.fn(async () => pngResponse())
    expect(await systemShare(caps, { ...args, fetchImpl })).toBe('shared')
    const payload = share.mock.calls[0]?.[0]
    expect(payload?.files).toBeUndefined()
    expect(payload?.url).toBe(args.url)
  })

  it('still shares the link when the poster fetch fails', async () => {
    const share = vi.fn(async (_data: ShareData): Promise<void> => undefined)
    const caps: ShareCapabilities = { share, canShare: () => true }
    const fetchImpl = vi.fn(async () => {
      throw new Error('offline')
    })
    expect(await systemShare(caps, { ...args, fetchImpl })).toBe('shared')
    expect(share.mock.calls[0]?.[0]?.files).toBeUndefined()
  })

  it('distinguishes a dismissed sheet from a failure', async () => {
    const abort = Object.assign(new Error('cancelled'), { name: 'AbortError' })
    const cancelled = await systemShare(
      {
        share: async () => {
          throw abort
        },
      },
      args,
    )
    expect(cancelled).toBe('cancelled')

    const failed = await systemShare(
      {
        share: async () => {
          throw new Error('boom')
        },
      },
      args,
    )
    expect(failed).toBe('failed')
  })
})

describe('copyLink', () => {
  it('reports unsupported where there is no clipboard', async () => {
    expect(await copyLink({}, 'https://example.com')).toBe('unsupported')
  })

  it('writes the url', async () => {
    const writeText = vi.fn(async () => undefined)
    expect(await copyLink({ clipboard: { writeText } }, 'https://x.test')).toBe(
      'shared',
    )
    expect(writeText).toHaveBeenCalledWith('https://x.test')
  })

  it('reports failure when the write is rejected', async () => {
    const writeText = vi.fn(async () => {
      throw new Error('denied')
    })
    expect(await copyLink({ clipboard: { writeText } }, 'https://x.test')).toBe(
      'failed',
    )
  })
})
