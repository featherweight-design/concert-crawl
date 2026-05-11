import { auth } from '@/lib/auth'
import Link from 'next/link'
import { fetchMe } from '@/lib/users'
import {
  EditProfileForm,
  EDIT_PROFILE_FORM_ID,
} from '@/components/settings/EditProfileForm'

export const metadata = { title: 'Edit profile — Concert Crawl' }

export default async function EditProfilePage() {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const profile = await fetchMe(token)

  return (
    <div className="mx-auto max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <Link
          href="/me"
          className="text-[14px] font-medium text-fg-muted hover:text-fg"
        >
          ← Cancel
        </Link>
        <span className="text-[15px] font-bold text-fg">Edit profile</span>
        <button
          type="submit"
          form={EDIT_PROFILE_FORM_ID}
          className="text-[14px] font-semibold"
          style={{ color: 'var(--signal)' }}
        >
          Save
        </button>
      </div>

      <EditProfileForm profile={profile} />
    </div>
  )
}
