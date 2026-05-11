import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url')
  if (!rawUrl) {
    return NextResponse.json(
      { error: 'Missing required query param: url' },
      { status: 400 },
    )
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(rawUrl)
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
  }

  const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`

  try {
    const response = await fetch(robotsUrl, {
      headers: {
        'User-Agent': 'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)',
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      return NextResponse.json({
        allowed: true,
        checkedAt: new Date().toISOString(),
      })
    }

    const text = await response.text()
    const lines = text.split('\n').map((line) => line.trim())

    let inConcertCrawlBlock = false
    let inWildcardBlock = false
    let concertCrawlDisallowed = false
    let wildcardDisallowed = false

    for (const line of lines) {
      const lower = line.toLowerCase()
      if (lower.startsWith('user-agent:')) {
        const agent = line.slice('user-agent:'.length).trim().toLowerCase()
        inConcertCrawlBlock = agent === 'concertcrawl'
        inWildcardBlock = agent === '*'
      } else if (lower.startsWith('disallow:')) {
        const path = line.slice('disallow:'.length).trim()
        // Empty Disallow means "allow all" per robots.txt spec — only '/' blocks
        if (path === '/') {
          if (inConcertCrawlBlock) concertCrawlDisallowed = true
          if (inWildcardBlock) wildcardDisallowed = true
        }
      }
    }

    return NextResponse.json({
      allowed: !(concertCrawlDisallowed || wildcardDisallowed),
      checkedAt: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({
      allowed: null,
      error: 'Could not fetch robots.txt',
    })
  }
}
