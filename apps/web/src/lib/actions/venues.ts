'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { apiClient, ApiError } from '@/lib/api'
import type {
  PlatformProbeResult,
  Venue,
  VenuePlatform,
} from '@concert-crawl/types'
import { buildUpdateVenueBody } from './build-update-venue-body'

async function getToken(): Promise<string> {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) throw new Error('Not authenticated')
  return token
}

async function getCurrentUserName(): Promise<string | null> {
  const user = await currentUser()
  if (!user) return null
  const parts = [user.firstName, user.lastName].filter(Boolean)
  return parts.length > 0
    ? parts.join(' ')
    : (user.emailAddresses[0]?.emailAddress ?? null)
}

export interface CreateVenueResult {
  success: boolean
  data?: Venue
  error?: string
  field?: string
}

export async function createVenue(
  formData: FormData,
): Promise<CreateVenueResult> {
  const token = await getToken()

  try {
    const addressRaw = formData.get('address')
    const address =
      addressRaw !== null && String(addressRaw).trim()
        ? String(addressRaw).trim()
        : null

    const venue = await apiClient.post<Venue>('/v1/admin/venues', token, {
      name: formData.get('name'),
      slug: formData.get('slug'),
      websiteUrl: formData.get('websiteUrl'),
      city: formData.get('city') || 'Denver',
      active: formData.get('active') !== 'false',
      address,
    })
    revalidatePath('/admin/venues')
    return { success: true, data: venue }
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 409) {
      return { success: false, error: 'Slug already in use', field: 'slug' }
    }
    throw err
  }
}

export async function createVenueAndCrawl(
  formData: FormData,
): Promise<CreateVenueResult> {
  const token = await getToken()

  const result = await createVenue(formData)
  if (!result.success || !result.data) return result

  try {
    await apiClient.post(`/v1/admin/crawl/${result.data.id}`, token, {})
  } catch {
    // Crawl trigger failure is non-fatal — venue was created
  }

  return result
}

export async function updateVenue(
  id: string,
  formData: FormData,
): Promise<{
  success: boolean
  error?: string
  field?: 'slug' | 'apiAccountId'
}> {
  const token = await getToken()

  try {
    await apiClient.patch<Venue>(
      `/v1/admin/venues/${id}`,
      token,
      buildUpdateVenueBody(formData),
    )
    revalidatePath('/admin/venues')
    revalidatePath(`/admin/venues/${id}`)
    return { success: true }
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 409) {
      return { success: false, error: 'Slug already in use', field: 'slug' }
    }
    if (err instanceof ApiError && err.status === 400 && err.zodIssues) {
      const apiAccountIdIssue = err.zodIssues.find(
        (issue) => issue.path[0] === 'apiAccountId',
      )
      if (apiAccountIdIssue) {
        return {
          success: false,
          error: apiAccountIdIssue.message,
          field: 'apiAccountId',
        }
      }
    }
    // Unexpected failure — the branches above convert the expected 409/400
    // cases, so anything reaching here is worth surfacing in server logs.
    console.error('updateVenue: unexpected error', err)
    throw err
  }
}

export async function pauseVenue(id: string): Promise<void> {
  const token = await getToken()
  await apiClient.patch<Venue>(`/v1/admin/venues/${id}`, token, {
    active: false,
  })
  revalidatePath('/admin/venues')
  revalidatePath(`/admin/venues/${id}`)
}

export async function deleteVenue(
  id: string,
): Promise<{ eventsDetached: number }> {
  const token = await getToken()
  const result = await apiClient.delete<{ eventsDetached: number }>(
    `/v1/admin/venues/${id}`,
    token,
  )
  revalidatePath('/admin/venues')
  return result
}

export async function setVenueFeatured(
  id: string,
  featured: boolean,
): Promise<void> {
  const token = await getToken()
  await apiClient.patch<Venue>(`/v1/admin/venues/${id}`, token, { featured })
  revalidatePath('/admin/venues')
  revalidatePath(`/admin/venues/${id}`)
}

export async function activateVenue(id: string): Promise<void> {
  const token = await getToken()
  await apiClient.patch<Venue>(`/v1/admin/venues/${id}`, token, {
    active: true,
  })
  revalidatePath('/admin/venues')
}

export async function verifyVenue(id: string): Promise<void> {
  const [token, verifiedBy] = await Promise.all([
    getToken(),
    getCurrentUserName(),
  ])
  await apiClient.patch<Venue>(`/v1/admin/venues/${id}`, token, {
    verified: true,
    verifiedBy,
  })
  revalidatePath('/admin/venues')
  revalidatePath(`/admin/venues/${id}`)
}

export async function unverifyVenue(id: string): Promise<void> {
  const token = await getToken()
  await apiClient.patch<Venue>(`/v1/admin/venues/${id}`, token, {
    verified: false,
  })
  revalidatePath('/admin/venues')
  revalidatePath(`/admin/venues/${id}`)
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

export interface GenerateAboutResult {
  success: boolean
  data?: {
    capacity: number | null
    venueType: string
    neighborhood: string
    about: string
  }
  error?: string
}

export async function generateVenueAbout(
  id: string,
): Promise<GenerateAboutResult> {
  const token = await getToken()
  try {
    const data = await apiClient.post<{
      capacity: number | null
      venueType: string
      neighborhood: string
      about: string
    }>(`/v1/admin/venues/${id}/generate-about`, token, {})
    return { success: true, data }
  } catch (err: unknown) {
    const message =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Generation failed'
    return { success: false, error: message }
  }
}

export interface ProbeVenuePlatformResult {
  success: boolean
  data?: PlatformProbeResult
  error?: string
}

// Dry-run probe of a proposed platform config (#665). Passes the CURRENT
// form values so admins can validate before saving; nothing is persisted.
export async function probeVenuePlatform(
  id: string,
  proposed: {
    platform: VenuePlatform | null
    platformVenueId: string | null
  },
): Promise<ProbeVenuePlatformResult> {
  const token = await getToken()
  try {
    const data = await apiClient.post<PlatformProbeResult>(
      `/v1/admin/venues/${id}/probe-platform`,
      token,
      proposed,
    )
    return { success: true, data }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Probe request failed'
    return { success: false, error: message }
  }
}

export async function bulkDeactivateVenues(ids: string[]): Promise<void> {
  const token = await getToken()
  await Promise.all(
    ids.map((id) =>
      apiClient.patch<Venue>(`/v1/admin/venues/${id}`, token, {
        active: false,
      }),
    ),
  )
  revalidatePath('/admin/venues')
}
