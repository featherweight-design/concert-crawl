// My shows ▸ Artists (native following, PR 6).
//
// The route is `/following`, deliberately NOT `/artists`: middleware lists
// `/artists(.*)` under isPublicOnceLaunched, so an artists index there would go
// public at launch, and the nav's prefix matcher would light "My shows" on
// every public artist page.

import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { seedFollowedArtists } from '@/lib/following'
import { isScaRegion } from '@/lib/sca-region'
import { MyShowsArtistsContent } from '@/components/consumer/following/my-shows'

export const metadata = { title: 'Artists — Concert Crawl' }

export default async function FollowingPage() {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  // `undefined` means the read failed, which the surface renders as an error.
  // It is NOT collapsed to an empty list — see MyShowsArtistsContent.
  const artists = await seedFollowedArtists(token)

  const requestHeaders = await headers()
  const scaRegion = isScaRegion(requestHeaders.get('x-vercel-ip-country'))

  return <MyShowsArtistsContent artists={artists} scaRegion={scaRegion} />
}
