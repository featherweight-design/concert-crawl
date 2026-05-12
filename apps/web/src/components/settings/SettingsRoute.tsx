import Link from 'next/link'
import { ProfileHero } from './ProfileHero'
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
          <div className="overflow-hidden rounded-xl border border-border bg-surface-1">
            {/* Email row */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <svg
                width="15"
                height="15"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
                className="shrink-0 text-fg-muted"
              >
                <rect
                  x="2.5"
                  y="3.5"
                  width="11"
                  height="9"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M3 5l5 4 5-4"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="flex-1 text-[14px] font-medium text-fg">
                {SETTINGS_COPY.emailRow}
              </span>
              <span className="truncate text-[13px] text-fg-muted">
                {profile.email}
              </span>
            </div>
            <div className="mx-4 h-px bg-border" />
            {/* Password row */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <svg
                width="15"
                height="15"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
                className="shrink-0 text-fg-muted"
              >
                <rect
                  x="3"
                  y="7"
                  width="10"
                  height="7"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M5.5 7V5.5a2.5 2.5 0 015 0V7"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              <span className="flex-1 text-[14px] font-medium text-fg">
                {SETTINGS_COPY.passwordRow}
              </span>
              <a
                href="https://accounts.clerk.dev/user"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.06em] text-fg-subtle transition-colors hover:text-fg-muted"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Clerk
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M5 11l6-6M6 5h5v5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </div>
          </div>
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
