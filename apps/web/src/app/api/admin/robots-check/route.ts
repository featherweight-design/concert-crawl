import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { checkRobots } from '@concert-crawl/crawler-core/robots'
import { CRAWLER_USER_AGENT } from '@concert-crawl/types'

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

  // The same evaluation the crawler runs, so the Add Venue chip can never
  // disagree with what the nightly pass will actually do.
  const verdict = await checkRobots(parsedUrl.href, CRAWLER_USER_AGENT)
  if (verdict.status === 'unreachable') {
    return NextResponse.json({
      allowed: null,
      error: 'Could not fetch robots.txt',
    })
  }
  return NextResponse.json({
    allowed: verdict.status === 'allowed',
    checkedAt: new Date().toISOString(),
  })
}
