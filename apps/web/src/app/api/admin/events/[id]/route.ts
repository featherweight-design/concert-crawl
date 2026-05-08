import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body: unknown = await req.json()

  const upstream = await fetch(`${API_URL}/v1/admin/events/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const result: unknown = await upstream.json()
  return NextResponse.json(result, { status: upstream.status })
}
