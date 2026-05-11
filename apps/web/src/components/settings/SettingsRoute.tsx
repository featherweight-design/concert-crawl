import Link from 'next/link'
import { ProfileHero } from './ProfileHero'
import { PlanCard } from './PlanCard'
import { ThemePickerInline } from './ThemePickerInline'
import { MySubmissionsList } from './MySubmissionsList'
import { DangerZone } from './DangerZone'
import { SETTINGS_COPY } from './definitions/copy'
import type {
  UserProfileResponse,
  UserSubmissionItem,
} from '@concert-crawl/types'

interface SettingsRouteProps {
  profile: UserProfileResponse
  submissions: UserSubmissionItem[]
}

export function SettingsRoute({ profile, submissions }: SettingsRouteProps) {
  return (
    <>
      {/* Mobile header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <Link
          href="/events"
          className="text-[13px] font-semibold uppercase tracking-[0.06em] text-fg-muted"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          ← Done
        </Link>
        <span className="text-[16px] font-extrabold text-fg">Settings</span>
        <div style={{ width: 52 }} />
      </div>

      <div className="flex flex-col gap-6 pb-24">
        {/* Hero */}
        <div className="px-1">
          <ProfileHero
            handle={profile.handle}
            avatarColor={profile.avatarColor}
            displayRole={profile.displayRole}
            city={profile.city}
            joined={profile.joined}
            cred={profile.cred}
          />
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-border" />

        {/* Plan */}
        <div className="px-4">
          <PlanCard plan={profile.plan} />
        </div>

        {/* Appearance */}
        <div className="flex flex-col gap-2 px-4">
          <div className="flex items-center justify-between">
            <span
              className="text-[12px] font-bold uppercase tracking-[0.08em] text-fg-muted"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Appearance
            </span>
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-subtle"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              tap to switch
            </span>
          </div>
          <ThemePickerInline />
        </div>

        <div className="mx-4 h-px bg-border" />

        {/* Submissions */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-4">
            <span
              className="text-[12px] font-bold uppercase tracking-[0.08em] text-fg-muted"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              My submissions
            </span>
            {profile.submissionCount > 0 && (
              <span
                className="text-[10px] text-fg-subtle"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {profile.submissionCount} total
              </span>
            )}
          </div>
          <MySubmissionsList
            submissions={submissions}
            totalCount={profile.submissionCount}
          />
        </div>

        <div className="mx-4 h-px bg-border" />

        {/* Account rows */}
        <div className="flex flex-col gap-1 px-0">
          <span className="px-5 text-[13px] font-semibold text-fg">
            {SETTINGS_COPY.accountSection}
          </span>
          {/* Email — link-out to Clerk */}
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-[14px] text-fg">{SETTINGS_COPY.emailRow}</span>
            <span className="text-[13px] text-fg-muted">{profile.email}</span>
          </div>
          {/* Password — link-out to Clerk */}
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-[14px] text-fg">
              {SETTINGS_COPY.passwordRow}
            </span>
            <a
              href="https://accounts.clerk.dev/user"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-fg-muted underline-offset-2 hover:underline"
            >
              {SETTINGS_COPY.clerkLinkLabel}
            </a>
          </div>
        </div>

        <div className="mx-4 h-px bg-border" />

        {/* Danger zone */}
        <div className="px-0">
          <DangerZone
            handle={profile.handle}
            submissionCount={profile.submissionCount}
          />
        </div>
      </div>
    </>
  )
}
