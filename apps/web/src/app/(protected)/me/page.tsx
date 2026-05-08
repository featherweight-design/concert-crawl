import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { fetchMe, fetchMySubmissions } from '@/lib/users'
import { SettingsRoute } from '@/components/settings/SettingsRoute'
import { SettingsRouteDesktop } from '@/components/settings/SettingsRouteDesktop'

export const metadata = { title: 'Settings — Concert Crawl' }

export default async function MePage() {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) redirect('/sign-in')

  const [profile, submissions] = await Promise.all([
    fetchMe(token),
    fetchMySubmissions(token),
  ])

  return (
    <>
      {/* Mobile (< sm) */}
      <div className="sm:hidden">
        <SettingsRoute profile={profile} submissions={submissions} />
      </div>
      {/* Desktop (sm+) */}
      <div className="hidden sm:block">
        <SettingsRouteDesktop profile={profile} submissions={submissions} />
      </div>
    </>
  )
}
