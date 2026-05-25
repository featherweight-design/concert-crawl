import { auth } from '@/lib/auth'
import { fetchMe, fetchMySubmissions } from '@/lib/users'
import { SettingsRoute } from '@/components/settings/SettingsRoute'
import { SettingsRouteDesktop } from '@/components/settings/SettingsRouteDesktop'
import { ThemeSync } from '@/components/settings/ThemeSync'

export const metadata = { title: 'Settings — Concert Crawl' }

export default async function MePage() {
  const { getToken, sessionClaims } = await auth()
  const token = await getToken()
  if (!token) return null

  const isAdmin = sessionClaims?.metadata?.role === 'admin'

  const [profile, submissions] = await Promise.all([
    fetchMe(token),
    fetchMySubmissions(token),
  ])

  return (
    <>
      <ThemeSync serverTheme={profile.theme} />
      {/* Mobile (< sm) */}
      <div className="sm:hidden">
        <SettingsRoute
          profile={profile}
          submissions={submissions}
          isAdmin={isAdmin}
        />
      </div>
      {/* Desktop (sm+) */}
      <div className="hidden sm:block">
        <SettingsRouteDesktop profile={profile} submissions={submissions} />
      </div>
    </>
  )
}
