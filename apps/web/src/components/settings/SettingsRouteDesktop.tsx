'use client'

import { useState } from 'react'
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

type NavSection =
  | 'profile'
  | 'plan'
  | 'appearance'
  | 'submissions'
  | 'account'
  | 'danger'

const NAV_ITEMS: { key: NavSection; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'plan', label: 'Plan' },
  { key: 'appearance', label: 'Appearance' },
  { key: 'submissions', label: 'My submissions' },
  { key: 'account', label: 'Account' },
  { key: 'danger', label: 'Danger zone' },
]

interface SettingsRouteDesktopProps {
  profile: UserProfileResponse
  submissions: UserSubmissionItem[]
}

export function SettingsRouteDesktop({
  profile,
  submissions,
}: SettingsRouteDesktopProps) {
  const [activeSection, setActiveSection] = useState<NavSection>('profile')

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-border bg-bg-elevated">
        <div className="sticky top-16 flex flex-col gap-1 p-4">
          {NAV_ITEMS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveSection(key)}
              className="cursor-pointer rounded-xl px-4 py-2.5 text-left text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
              style={{
                background:
                  activeSection === key ? 'var(--surface-2)' : 'transparent',
                color: activeSection === key ? 'var(--fg)' : 'var(--fg-muted)',
                fontWeight: activeSection === key ? 700 : 500,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </aside>

      {/* Panel */}
      <main className="max-w-xl flex-1 px-8 py-8">
        {activeSection === 'profile' && (
          <div className="flex flex-col gap-6">
            <ProfileHero
              handle={profile.handle}
              avatarColor={profile.avatarColor}
              displayRole={profile.displayRole}
              city={profile.city}
              joined={profile.joined}
            />
            {!profile.handle && (
              <div
                className="rounded-xl p-4 text-[13px] leading-relaxed text-fg-muted"
                style={{ background: 'var(--surface-1)' }}
              >
                {SETTINGS_COPY.anonymousExplainer}
              </div>
            )}
          </div>
        )}

        {activeSection === 'plan' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[18px] font-bold text-fg">Plan</h2>
            <PlanCard plan={profile.plan} />
          </div>
        )}

        {activeSection === 'appearance' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[18px] font-bold text-fg">Appearance</h2>
            <ThemePickerInline />
          </div>
        )}

        {activeSection === 'submissions' && (
          <div className="flex flex-col gap-2">
            <h2 className="text-[18px] font-bold text-fg">My submissions</h2>
            <MySubmissionsList
              submissions={submissions}
              totalCount={profile.submissionCount}
              cap={submissions.length}
            />
          </div>
        )}

        {activeSection === 'account' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[18px] font-bold text-fg">Account</h2>
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-1">
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-[14px] font-medium text-fg">
                  {SETTINGS_COPY.emailRow}
                </span>
                <span className="text-[13px] text-fg-muted">
                  {profile.email}
                </span>
              </div>
              <div className="mx-5 h-px bg-border" />
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-[14px] font-medium text-fg">
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
              <div className="mx-5 h-px bg-border" />
              <div className="flex items-center justify-between px-5 py-3.5 opacity-50">
                <span className="text-[14px] font-medium text-fg">
                  {SETTINGS_COPY.watchlistRow}
                </span>
                <span className="text-[13px] text-fg-subtle">
                  {SETTINGS_COPY.watchlistComingSoon}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'danger' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[18px] font-bold text-fg">Danger zone</h2>
            <DangerZone />
          </div>
        )}
      </main>
    </div>
  )
}
