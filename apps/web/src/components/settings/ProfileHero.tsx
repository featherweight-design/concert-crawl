import Link from 'next/link'
import { Avatar } from './Avatar'
import { SETTINGS_COPY } from './definitions/copy'
import type { AvatarColor, DisplayRole } from '@concert-crawl/types'

interface ProfileHeroProps {
  handle: string | null
  avatarColor: AvatarColor | null
  displayRole: DisplayRole
  city: string | null
  joined: string
}

const ROLE_LABEL: Record<DisplayRole, string> = {
  fan: 'fan',
  crew: 'crew',
  artist: 'artist',
  staff: 'staff',
}

export function ProfileHero({
  handle,
  avatarColor,
  displayRole,
  city,
  joined,
}: ProfileHeroProps) {
  return (
    <Link
      href="/me/edit"
      className="flex flex-col items-center gap-3 py-6 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
    >
      <Avatar handle={handle} avatarColor={avatarColor} size={72} />

      <div className="flex flex-col items-center gap-1">
        {handle ? (
          <span className="text-[20px] font-bold tracking-[-0.02em] text-fg">
            @{handle}
          </span>
        ) : (
          <span className="text-[16px] font-medium text-fg-muted">
            {SETTINGS_COPY.anonymousLabel}
          </span>
        )}

        <div className="flex items-center gap-2">
          <span
            className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-fg-muted"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {ROLE_LABEL[displayRole]}
          </span>
          {city && <span className="text-[13px] text-fg-subtle">{city}</span>}
        </div>

        <span className="text-[12px] text-fg-subtle">Since {joined}</span>
      </div>
    </Link>
  )
}
