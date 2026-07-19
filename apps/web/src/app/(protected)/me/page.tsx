import { Suspense } from 'react'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { SpotifyReturnFlow } from '@/components/consumer/spotify/SpotifyReturnFlow'
import { fetchMe, fetchMySubmissions } from '@/lib/users'
import { isScaRegion } from '@/lib/sca-region'
import { SettingsRoute } from '@/components/settings/SettingsRoute'
import { SettingsRouteDesktop } from '@/components/settings/SettingsRouteDesktop'
import { ThemeSync } from '@/components/settings/ThemeSync'

export const metadata = { title: 'Settings — Concert Crawl' }

export default async function MePage() {
  const { getToken, sessionClaims } = await auth()
  const token = await getToken()
  if (!token) return null

  const isAdmin = sessionClaims?.metadata?.role === 'admin'

  const [profile, submissions, requestHeaders] = await Promise.all([
    fetchMe(token),
    fetchMySubmissions(token),
    headers(),
  ])
  // Spec §1.7: SCA notice gating, resolved server-side from Vercel's
  // country header. Unknown (local dev, header absent) fails safe to true.
  const scaRegion = isScaRegion(requestHeaders.get('x-vercel-ip-country'))

  return (
    <>
      <ThemeSync serverTheme={profile.theme} />
      {/* Post-Spotify-OAuth return handler — mounted ONCE at page level.
          Both settings routes below stay in the DOM (CSS-hidden), so
          mounting it inside either would double-fire the connect POST. */}
      <Suspense fallback={null}>
        <SpotifyReturnFlow />
      </Suspense>
      {/* Mobile (< sm) */}
      <div className="sm:hidden">
        <SettingsRoute
          profile={profile}
          submissions={submissions}
          scaRegion={scaRegion}
          isAdmin={isAdmin}
        />
      </div>
      {/* Desktop (sm+) */}
      <div className="hidden sm:block">
        <SettingsRouteDesktop
          profile={profile}
          submissions={submissions}
          scaRegion={scaRegion}
        />
      </div>
    </>
  )
}
