'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { apiClient, ApiError } from '@/lib/api'
import type { Venue } from '@concert-crawl/types'

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
): Promise<{ success: boolean; error?: string; field?: string }> {
  const token = await getToken()

  try {
    const crawlDelayRaw = formData.get('crawlDelayMs')
    const crawlDelayNum = crawlDelayRaw
      ? Number(String(crawlDelayRaw))
      : undefined
    const crawlDelayMs =
      crawlDelayNum !== undefined &&
      Number.isFinite(crawlDelayNum) &&
      Number.isInteger(crawlDelayNum)
        ? crawlDelayNum
        : undefined

    const crawlWaitUntilRaw = String(formData.get('crawlWaitUntil') ?? '')
    const VALID_WAIT_UNTIL = [
      'networkidle',
      'load',
      'domcontentloaded',
    ] as const
    const crawlWaitUntil = (VALID_WAIT_UNTIL as readonly string[]).includes(
      crawlWaitUntilRaw,
    )
      ? (crawlWaitUntilRaw as (typeof VALID_WAIT_UNTIL)[number])
      : undefined

    const crawlWaitForSelectorRaw = formData.get('crawlWaitForSelector')
    const crawlWaitForSelector =
      crawlWaitForSelectorRaw === null ||
      String(crawlWaitForSelectorRaw).trim() === ''
        ? null
        : String(crawlWaitForSelectorRaw).trim()

    const ticketVendorRaw = formData.get('ticketVendor')
    const ticketVendor =
      ticketVendorRaw === null || String(ticketVendorRaw).trim() === ''
        ? null
        : String(ticketVendorRaw).trim()

    const crawlModeRaw = formData.get('crawlMode')
    const crawlMode =
      crawlModeRaw === 'http' || crawlModeRaw === 'browser'
        ? (crawlModeRaw as 'http' | 'browser')
        : crawlModeRaw === ''
          ? null
          : undefined

    const addressRaw = formData.get('address')
    const address =
      addressRaw !== null && String(addressRaw).trim()
        ? String(addressRaw).trim()
        : null

    const capacityRaw = formData.get('capacity')
    const capacityTrimmed =
      capacityRaw !== null ? String(capacityRaw).trim() : ''
    let capacity: number | null | undefined
    if (capacityTrimmed === '') {
      capacity = null
    } else {
      const num = Number(capacityTrimmed)
      capacity =
        Number.isFinite(num) && Number.isInteger(num) && num > 0
          ? num
          : undefined
    }

    const venueTypeRaw = formData.get('venueType')
    const venueType =
      venueTypeRaw !== null && String(venueTypeRaw).trim()
        ? String(venueTypeRaw).trim()
        : null

    const aboutRaw = formData.get('about')
    const about =
      aboutRaw !== null && String(aboutRaw).trim()
        ? String(aboutRaw).trim()
        : null

    const neighborhoodRaw = formData.get('neighborhood')
    const neighborhood =
      neighborhoodRaw !== null && String(neighborhoodRaw).trim()
        ? String(neighborhoodRaw).trim()
        : null

    const featuredRaw = formData.get('featured')
    const featured = featuredRaw !== null ? featuredRaw === 'true' : undefined

    await apiClient.patch<Venue>(`/v1/admin/venues/${id}`, token, {
      name: formData.get('name'),
      slug: formData.get('slug'),
      websiteUrl: formData.get('websiteUrl'),
      city: formData.get('city') || 'Denver',
      active: formData.get('active') === 'true',
      crawlWaitUntil,
      crawlDelayMs,
      crawlWaitForSelector,
      ticketVendor,
      crawlMode,
      address,
      capacity,
      venueType,
      about,
      neighborhood,
      featured,
    })
    revalidatePath('/admin/venues')
    revalidatePath(`/admin/venues/${id}`)
    return { success: true }
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'status' in err &&
      (err as { status: number }).status === 409
    ) {
      return { success: false, error: 'Slug already in use', field: 'slug' }
    }
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
