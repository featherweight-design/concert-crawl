import Link from 'next/link'
import { Avatar } from './Avatar'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import type { AvatarColor } from '@concert-crawl/types'

const SETTINGS_COPY = CONSUMER_COPY.settings

interface ProfileEntryAvatarProps {
  handle: string | null
  avatarColor: AvatarColor | null
  loading?: boolean
}

export function ProfileEntryAvatar({
  handle,
  avatarColor,
  loading = false,
}: ProfileEntryAvatarProps) {
  return (
    <Link
      href="/me"
      aria-label={
        handle
          ? SETTINGS_COPY.profileEntryAriaLabel(handle)
          : SETTINGS_COPY.profileEntryAriaLabelAnon
      }
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
    >
      <Avatar
        handle={handle}
        avatarColor={avatarColor}
        size={36}
        loading={loading}
      />
    </Link>
  )
}
