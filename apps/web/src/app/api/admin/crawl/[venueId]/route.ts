import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { isRole } from '@concert-crawl/types'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ venueId: string }> },
) {
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

  const { venueId } = await params

  const upstream = await fetch(`${API_URL}/v1/admin/crawl/${venueId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  const body = await upstream.json()
  return NextResponse.json(body, { status: upstream.status })
}
