import Link from 'next/link'
import { ProfileHero } from './ProfileHero'
import { AccountManagementRow } from './AccountManagementRow'
import { PlanCard } from './PlanCard'
import { ThemePickerInline } from './ThemePickerInline'
import { MySubmissionsList } from './MySubmissionsList'
import { DangerZone } from './DangerZone'
import { WatchingTeaser } from './WatchingTeaser'
import { SETTINGS_COPY } from './definitions/copy'
import type {
  UserProfileResponse,
  UserSubmissionItem,
} from '@concert-crawl/types'

interface SettingsRouteProps {
  profile: UserProfileResponse
  submissions: UserSubmissionItem[]
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {children}
    </div>
  )
}

export function SettingsRoute({ profile, submissions }: SettingsRouteProps) {
  const confirmedCount = submissions.filter(
    (sub) => sub.status === 'confirmed',
  ).length

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

      <div className="flex flex-col gap-6 pb-36">
        {/* Hero — no section label */}
        <div className="px-5 pt-2">
          <ProfileHero
            handle={profile.handle}
            avatarColor={profile.avatarColor}
            displayRole={profile.displayRole}
            city={profile.city}
            joined={profile.joined}
            cred={profile.cred}
          />
        </div>

        <div className="mx-4 h-px bg-border" />

        {/* Plan */}
        <div className="px-4">
          <SectionLabel>{SETTINGS_COPY.planSection}</SectionLabel>
          <PlanCard plan={profile.plan} />
        </div>

        {/* Appearance */}
        <div className="flex flex-col gap-2 px-4">
          <div className="flex items-center justify-between">
            <SectionLabel>{SETTINGS_COPY.appearanceSection}</SectionLabel>
            <span
              className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-subtle"
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
            <SectionLabel>{SETTINGS_COPY.submissionsSection}</SectionLabel>
            {profile.submissionCount > 0 && (
              <span
                className="mb-2 text-[10px] text-fg-subtle"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {profile.submissionCount} total
                {confirmedCount > 0 && ` · ${confirmedCount} confirmed`}
              </span>
            )}
          </div>
          <div className="px-4">
            <MySubmissionsList
              submissions={submissions}
              totalCount={profile.submissionCount}
            />
          </div>
        </div>

        <div className="mx-4 h-px bg-border" />

        {/* Account */}
        <div className="flex flex-col gap-2 px-4">
          <SectionLabel>{SETTINGS_COPY.accountSection}</SectionLabel>
          <AccountManagementRow email={profile.email} />
        </div>

        {/* Lists */}
        <div className="px-4">
          <SectionLabel>{SETTINGS_COPY.listsSection}</SectionLabel>
          <WatchingTeaser />
        </div>

        <div className="mx-4 h-px bg-border" />

        {/* Danger zone */}
        <div className="flex flex-col gap-2 px-4">
          <SectionLabel>{SETTINGS_COPY.dangerSection}</SectionLabel>
          <DangerZone
            handle={profile.handle}
            submissionCount={profile.submissionCount}
          />
        </div>

        {/* Version footer */}
        <div
          className="pb-4 pt-2 text-center text-[9px] font-semibold uppercase tracking-[0.10em] text-fg-subtle"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          concertcrawl · beta · Denver
        </div>
      </div>
    </>
  )
}
