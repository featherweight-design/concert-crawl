'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { apiClient } from '@/lib/api'
import type { Role } from '@concert-crawl/types'

async function getToken(): Promise<string> {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) throw new Error('Not authenticated')
  return token
}

export async function updateUserRole(
  userId: string,
  role: Role,
): Promise<{ success: boolean; error?: string }> {
  const token = await getToken()
  try {
    await apiClient.patch(`/v1/admin/users/${userId}/role`, token, { role })
    revalidatePath('/admin/users')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}
