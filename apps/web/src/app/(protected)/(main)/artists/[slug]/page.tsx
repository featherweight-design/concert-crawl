// Artist page (#1115, PR-E).
//
// ⚠️ #794 — this route lives under `(protected)` on purpose, and making it
// genuinely public is NOT a one-line middleware edit. `(protected)/layout.tsx`
// renders five signed-in-only gates (FeedbackEdgeTabGate, FeatureDropPillGate,
// OnboardingThemeFlush, LifecycleNudgesGate, FirstWatchNudgeGate), so opening
// the vertical means MOVING this directory out of `(protected)` *and* carrying
// the matcher entry. `/artists(.*)` is in `isPublicOnceLaunched` — gated on
// isPublicBrowseEnabled(), exactly like `/venues(.*)` — never in
// `isAlwaysPublic`, which is what made a private-beta app publicly browsable.
//
// Data fetching is token-optional from day one so the flip changes the
// directory, not this file's logic.
import type { ArtistDetailResponse } from '@concert-crawl/types'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import React from 'react'

import { ArtistPageContent } from '@/components/consumer/artist-page/ArtistPageContent'
import { auth } from '@/lib/auth'
import { ApiError, apiClient, publicApiClient } from '@/lib/api'
import { isScaRegion } from '@/lib/sca-region'

const fetchArtist = async (
  slug: string,
  token: string | null,
): Promise<ArtistDetailResponse | null> => {
  try {
    const path = `/v1/artists/${slug}`
    if (token) return await apiClient.get<ArtistDetailResponse>(path, token)
    return await publicApiClient.get<ArtistDetailResponse>(path)
  } catch (err) {
    // ONLY a genuine 404 means "no such artist". Swallowing everything here —
    // as the venue sibling does — tells a visitor the artist doesn't exist
    // when the truth is that the server broke. Anything else re-throws so
    // (protected)/error.tsx catches it and offers the retry.
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

const ArtistPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>
}) => {
  const { slug } = await params
  const { getToken } = await auth()
  const token = await getToken()

  const data = await fetchArtist(slug, token)
  if (!data) notFound()

  const requestHeaders = await headers()
  const scaRegion = isScaRegion(requestHeaders.get('x-vercel-ip-country'))

  return <ArtistPageContent data={data} scaRegion={scaRegion} />
}

export default ArtistPage
