'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { apiClient, ApiError } from '@/lib/api'
import type {
  PlatformProbeResult,
  Venue,
  VenueGuide,
  VenueGuideChip,
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
      console.warn('updateVenue: slug conflict', { id })
      return { success: false, error: 'Slug already in use', field: 'slug' }
    }
    if (err instanceof ApiError && err.status === 400 && err.zodIssues) {
      const apiAccountIdIssue = err.zodIssues.find(
        (issue) => issue.path[0] === 'apiAccountId',
      )
      if (apiAccountIdIssue) {
        console.warn('updateVenue: apiAccountId validation failed', {
          id,
          message: apiAccountIdIssue.message,
        })
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

// --- #764 first-timer guide -------------------------------------------------
//
// Three actions mirroring the three admin endpoints. Saving a draft never
// touches publication; publishing re-derives the accessibility gate server-side
// and can fail with a 400 the block renders inline, so the gate result is
// returned rather than thrown.

export interface VenueGuideActionResult {
  success: boolean
  data?: VenueGuide
  error?: string
  field?: 'accessibility'
}

export interface SaveVenueGuidePayload {
  insiderTip: string | null
  chips: VenueGuideChip[]
}

export async function saveVenueGuide(
  venueId: string,
  payload: SaveVenueGuidePayload,
): Promise<VenueGuideActionResult> {
  try {
    // Inside the try: getToken() throws on an expired or missing session, and
    // an unhandled throw from a Server Action replaces the whole admin page
    // with Next's error screen — losing the draft the admin was typing.
    const token = await getToken()
    const data = await apiClient.put<VenueGuide>(
      `/v1/admin/venues/${venueId}/guide`,
      token,
      payload,
    )
    revalidatePath(`/admin/venues/${venueId}`)
    return { success: true, data }
  } catch (err: unknown) {
    console.error('saveVenueGuide: failed', { venueId, err })
    // Non-Error throws carry no usable message; the component falls back to
    // GUIDE_COPY.status.saveError so the string stays in copy.ts.
    return {
      success: false,
      ...(err instanceof Error ? { error: err.message } : {}),
    }
  }
}

export async function publishVenueGuide(
  venueId: string,
): Promise<VenueGuideActionResult> {
  try {
    // Inside the try — see saveVenueGuide.
    const token = await getToken()
    const data = await apiClient.post<VenueGuide>(
      `/v1/admin/venues/${venueId}/guide/publish`,
      token,
      {},
    )
    revalidatePath(`/admin/venues/${venueId}`)
    return { success: true, data }
  } catch (err: unknown) {
    // A 400 here is the accessibility publish gate, not a malformed request —
    // the body carries no Zod issues because nothing was validated.
    if (err instanceof ApiError && err.status === 400 && !err.zodIssues) {
      console.warn('publishVenueGuide: blocked by accessibility gate', {
        venueId,
      })
      return { success: false, error: err.message, field: 'accessibility' }
    }
    console.error('publishVenueGuide: unexpected error', { venueId, err })
    // Non-Error throws carry no usable message; the component falls back to
    // GUIDE_COPY.status.saveError so the string stays in copy.ts.
    return {
      success: false,
      ...(err instanceof Error ? { error: err.message } : {}),
    }
  }
}

export async function unpublishVenueGuide(
  venueId: string,
): Promise<VenueGuideActionResult> {
  try {
    // Inside the try — see saveVenueGuide.
    const token = await getToken()
    const data = await apiClient.post<VenueGuide>(
      `/v1/admin/venues/${venueId}/guide/unpublish`,
      token,
      {},
    )
    revalidatePath(`/admin/venues/${venueId}`)
    return { success: true, data }
  } catch (err: unknown) {
    console.error('unpublishVenueGuide: failed', { venueId, err })
    // Non-Error throws carry no usable message; the component falls back to
    // GUIDE_COPY.status.saveError so the string stays in copy.ts.
    return {
      success: false,
      ...(err instanceof Error ? { error: err.message } : {}),
    }
  }
}
