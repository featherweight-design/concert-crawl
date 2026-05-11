import { auth } from '@/lib/auth'
import { fetchMe } from '@/lib/users'
import { EditProfileForm } from '@/components/settings/EditProfileForm'

export const metadata = { title: 'Edit profile — Concert Crawl' }

export default async function EditProfilePage() {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const profile = await fetchMe(token)

  return <EditProfileForm profile={profile} />
}
