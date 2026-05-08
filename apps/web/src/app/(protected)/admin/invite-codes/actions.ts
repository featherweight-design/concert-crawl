'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { apiClient } from '@/lib/api'

export async function mintInviteCode() {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return
  await apiClient.post('/v1/admin/invite-codes', token, {})
  revalidatePath('/admin/invite-codes')
}
