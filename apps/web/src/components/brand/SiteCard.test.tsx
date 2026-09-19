import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import { describe, expect, it } from 'vitest'

import { SiteCard } from './SiteCard'
import { LANDING_COPY } from '@/app/_components/definitions/copy'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { SC_RATIOS } from '@/components/consumer/share/definitions/ratios'
import { loadShareFonts } from '@/lib/share/fonts'

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47])
const PUBLIC_DIR = path.resolve(__dirname, '../../../public')

// The real bundled faces, for the same reason PosterCard's test uses them:
// without them satori fetches a fallback and the assertion becomes a coin flip
// on the runner's egress.
const fontsPromise = loadShareFonts(async (assetPath) => {
  const buffer = await readFile(path.join(PUBLIC_DIR, assetPath))
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  )
})

describe('SiteCard', () => {
  // satori supports a subset of CSS and fails by drawing nothing rather than
  // by throwing, so "it rendered at all, at the locked size" is the assertion
  // that catches an unsupported property before it reaches somebody's feed.
  it('renders to a PNG at the locked link ratio', async () => {
    const response = new ImageResponse(
      <SiteCard width={SC_RATIOS.link.width} height={SC_RATIOS.link.height} />,
      { ...SC_RATIOS.link, fonts: await fontsPromise },
    )
    const png = Buffer.from(await response.arrayBuffer())

    expect(png.subarray(0, 4)).toStrictEqual(PNG_MAGIC)
    expect(png.byteLength).toBeGreaterThan(1024)
  })

  // The alt text is the only description a screen reader gets for this card,
  // and it is a hand-written literal rather than assembled at render. That
  // makes drift silent: change the subheading and this fails until alt follows.
  it('keeps the alt text in parity with what the card draws', () => {
    // The wordmark is drawn closed up ("ConcertCrawl") and spoken open
    // ("Concert Crawl"), so the comparison ignores spacing rather than
    // hardcoding either spelling: changing the drawn wordmark must fail here.
    const spoken = (value: string) => value.replaceAll(' ', '').toLowerCase()

    expect(LANDING_COPY.og.imageAlt).toContain(LANDING_COPY.hero.subheading)
    expect(spoken(LANDING_COPY.og.imageAlt)).toContain(
      spoken(CONSUMER_COPY.share.wordmark),
    )
  })
})
