'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { apiClient } from '@/lib/api'
import type { Venue } from '@concert-crawl/types'

async function getToken(): Promise<string> {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) throw new Error('Not authenticated')
  return token
}

export async function createVenue(formData: FormData): Promise<void> {
  const token = await getToken()

  await apiClient.post<Venue>('/v1/admin/venues', token, {
    name: formData.get('name'),
    slug: formData.get('slug'),
    websiteUrl: formData.get('websiteUrl'),
    city: formData.get('city') || 'Denver',
    crawlNotes: formData.get('crawlNotes') || undefined,
    contactEmail: formData.get('contactEmail') || undefined,
  })

  revalidatePath('/admin/venues')
  redirect('/admin/venues')
}

export async function updateVenue(
  id: string,
  formData: FormData,
): Promise<void> {
  const token = await getToken()

  await apiClient.patch<Venue>(`/v1/admin/venues/${id}`, token, {
    name: formData.get('name'),
    slug: formData.get('slug'),
    websiteUrl: formData.get('websiteUrl'),
    city: formData.get('city') || 'Denver',
    active: formData.get('active') === 'true',
    crawlNotes: formData.get('crawlNotes') || undefined,
    contactEmail: formData.get('contactEmail') || undefined,
  })

  revalidatePath('/admin/venues')
  redirect('/admin/venues')
}

export async function deactivateVenue(id: string): Promise<void> {
  const token = await getToken()
  await apiClient.delete(`/v1/admin/venues/${id}`, token)
  revalidatePath('/admin/venues')
}

export async function activateVenue(id: string): Promise<void> {
  const token = await getToken()
  await apiClient.patch<Venue>(`/v1/admin/venues/${id}`, token, {
    active: true,
  })
  revalidatePath('/admin/venues')
}

export async function verifyVenue(id: string): Promise<void> {
  const token = await getToken()
  await apiClient.patch<Venue>(`/v1/admin/venues/${id}`, token, {
    verified: true,
  })
  revalidatePath('/admin/venues')
  revalidatePath(`/admin/venues/${id}`)
  redirect(`/admin/venues/${id}`)
}

export async function unverifyVenue(id: string): Promise<void> {
  const token = await getToken()
  await apiClient.patch<Venue>(`/v1/admin/venues/${id}`, token, {
    verified: false,
  })
  revalidatePath('/admin/venues')
  revalidatePath(`/admin/venues/${id}`)
  redirect(`/admin/venues/${id}`)
}

export async function bulkVerifyVenues(ids: string[]): Promise<void> {
  const token = await getToken()
  await Promise.all(
    ids.map((id) =>
      apiClient.patch<Venue>(`/v1/admin/venues/${id}`, token, {
        verified: true,
      }),
    ),
  )
  revalidatePath('/admin/venues')
}

export async function bulkUnverifyVenues(ids: string[]): Promise<void> {
  const token = await getToken()
  await Promise.all(
    ids.map((id) =>
      apiClient.patch<Venue>(`/v1/admin/venues/${id}`, token, {
        verified: false,
      }),
    ),
  )
  revalidatePath('/admin/venues')
}

export async function bulkActivateVenues(ids: string[]): Promise<void> {
  const token = await getToken()
  await Promise.all(
    ids.map((id) =>
      apiClient.patch<Venue>(`/v1/admin/venues/${id}`, token, { active: true }),
    ),
  )
  revalidatePath('/admin/venues')
}

export async function bulkDeactivateVenues(ids: string[]): Promise<void> {
  const token = await getToken()
  await Promise.all(
    ids.map((id) => apiClient.delete(`/v1/admin/venues/${id}`, token)),
  )
  revalidatePath('/admin/venues')
}
