import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { isRole } from '@concert-crawl/types'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

export async function GET(req: Request) {
  const { getToken, sessionClaims } = await auth()
  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const role = isRole(sessionClaims?.metadata?.role)
    ? sessionClaims.metadata.role
    : null
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const upstreamUrl = new URL(`${API_URL}/v1/admin/crawl/runs`)
  const venueId = searchParams.get('venueId')
  const limit = searchParams.get('limit')
  if (venueId) upstreamUrl.searchParams.set('venueId', venueId)
  if (limit) upstreamUrl.searchParams.set('limit', limit)

  const upstream = await fetch(upstreamUrl.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })

  const contentType = upstream.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json(
      { error: `Upstream error ${upstream.status}` },
      { status: upstream.status },
    )
  }

  const body = await upstream.json()
  return NextResponse.json(body, { status: upstream.status })
}
