import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ venueId: string }> },
) {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
