import Link from 'next/link'
import { Avatar } from './Avatar'
import { CredChip } from './CredChip'
import { SETTINGS_COPY } from './definitions/copy'
import type { AvatarColor, DisplayRole } from '@concert-crawl/types'

interface ProfileHeroProps {
  handle: string | null
  avatarColor: AvatarColor | null
  displayRole: DisplayRole
  city: string | null
  joined: string
  cred: number
  dense?: boolean
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
  cred,
  dense = false,
}: ProfileHeroProps) {
  const isAnon = !handle
  const avatarSize = dense ? 56 : 68

  return (
    <div className="flex items-center gap-3.5">
      {/* Avatar */}
      <Avatar handle={handle} avatarColor={avatarColor} size={avatarSize} />

      {/* Text content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* Handle / anonymous label */}
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="truncate leading-[1.15] tracking-[-0.02em] text-fg"
            style={{ fontSize: dense ? 18 : 22, fontWeight: 900 }}
          >
            {isAnon ? (
              <span className="text-fg-muted" style={{ fontWeight: 700 }}>
                {SETTINGS_COPY.anonymousLabel}
              </span>
            ) : (
              <>
                <span className="text-fg-muted" style={{ fontWeight: 700 }}>
                  @
                </span>
                {handle}
              </>
            )}
          </span>
          {displayRole !== 'fan' && (
            <span
              className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-fg-muted"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {ROLE_LABEL[displayRole]}
            </span>
          )}
        </div>

        {/* City + joined */}
        <span
          className="text-[11px] font-semibold text-fg-muted"
          style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
        >
          {city || '—'} · joined {joined}
        </span>

        {/* Cred chip + zero-state nudge */}
        <div className="mt-1 flex items-center gap-1.5">
          <CredChip cred={cred} size={dense ? 'sm' : 'md'} showTooltip />
          {cred === 0 && !isAnon && (
            <span className="text-[11.5px] text-fg-subtle">
              Submit a price to start earning.
            </span>
          )}
        </div>

        {/* Anonymous inline explainer */}
        {isAnon && (
          <p
            className="mt-0.5 text-[12px] leading-relaxed text-fg-subtle"
            style={{ letterSpacing: '-0.005em' }}
          >
            Submissions show as <em>anonymous fan</em>. Pick a handle if you
            want credit.
          </p>
        )}
      </div>

      {/* Edit button */}
      {!dense && (
        <Link
          href="/me/edit"
          className="shrink-0 rounded-lg border px-3 py-1.5 text-[12.5px] font-bold text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          style={{
            background: 'var(--surface-2)',
            borderColor: 'var(--border-strong)',
            letterSpacing: '-0.005em',
          }}
        >
          Edit
        </Link>
      )}
    </div>
  )
}
