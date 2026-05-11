'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Avatar } from './Avatar'
import { CredChip } from './CredChip'
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

const NAV_ICONS: Record<NavSection, React.ReactNode> = {
  profile: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M2.5 14c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  plan: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="2"
        y="3"
        width="12"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M5 7h6M5 10h4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  submissions: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 4h10M3 8h10M3 12h6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  appearance: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  account: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
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
  ),
  danger: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6.5 2.5L2 13.5h12L9.5 2.5a1.5 1.5 0 00-3 0z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M8 6.5v3M8 11.5v.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
}

interface SettingsRouteDesktopProps {
  profile: UserProfileResponse
  submissions: UserSubmissionItem[]
}

export function SettingsRouteDesktop({
  profile,
  submissions,
}: SettingsRouteDesktopProps) {
  const [activeSection, setActiveSection] = useState<NavSection>('profile')

  const isAnon = !profile.handle
  const confirmedCount = submissions.filter(
    (sub) => sub.status === 'confirmed',
  ).length

  const profilePanel = (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[22px] font-extrabold text-fg">Profile</h2>
        <p className="text-[13px] text-fg-muted">
          What other fans see when you submit a price.
        </p>
      </div>
      {/* Identity card */}
      <div className="flex items-start gap-3.5 rounded-2xl border border-border bg-surface-1 p-4">
        <Avatar
          handle={profile.handle}
          avatarColor={profile.avatarColor}
          size={56}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[20px] font-black tracking-[-0.02em] text-fg">
            {profile.handle ? (
              <>
                <span className="font-bold text-fg-muted">@</span>
                {profile.handle}
              </>
            ) : (
              'anonymous fan'
            )}
          </span>
          <span
            className="text-[11px] font-semibold text-fg-muted"
            style={{
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
            }}
          >
            {profile.city || '—'} · joined {profile.joined}
          </span>
          <div className="mt-0.5">
            <CredChip cred={profile.cred} size="sm" showTooltip />
          </div>
          {isAnon && (
            <span className="mt-0.5 text-[11px] italic text-fg-subtle">
              Submissions show as <em>anonymous fan</em>. Pick a handle if you
              want credit.
            </span>
          )}
        </div>
        <Link
          href="/me/edit"
          className="shrink-0 rounded-lg border px-3 py-1.5 text-[12.5px] font-bold text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          style={{
            background: 'var(--surface-2)',
            borderColor: 'var(--border-strong)',
          }}
        >
          Edit
        </Link>
      </div>
      {/* Context info card */}
      {!isAnon ? (
        <div className="rounded-xl border border-border bg-surface-1 px-4 py-3.5 text-[13px] leading-relaxed text-fg-muted">
          Other fans see{' '}
          <strong style={{ color: 'var(--signal)' }}>
            @{profile.handle}
          </strong>{' '}
          on every price you&apos;ve submitted, and can tag you on
          confirmations. Drop the handle any time to go anonymous — your
          existing submissions get reattributed.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface-1 px-4 py-4">
          <p className="text-[14px] font-semibold text-fg">
            Submitting as <em>anonymous fan.</em>
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
            That&apos;s fine — most fans stay anonymous. If you want credit on
            your prices (and the option to be tagged when someone confirms one),
            pick a handle.
          </p>
          <Link
            href="/me/edit"
            className="mt-3 inline-flex rounded-xl px-4 py-2.5 text-[13px] font-bold"
            style={{ background: 'var(--signal)', color: 'var(--bg)' }}
          >
            Pick a handle
          </Link>
        </div>
      )}
    </div>
  )

  const submissionsPanel = (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[22px] font-extrabold text-fg">My submissions</h2>
        <p className="text-[13px] text-fg-muted">
          {profile.submissionCount} total
          {confirmedCount > 0 &&
            ` · ${confirmedCount} confirmed by other fans.`}
        </p>
      </div>
      <MySubmissionsList
        submissions={submissions}
        totalCount={profile.submissionCount}
        cap={submissions.length}
      />
    </div>
  )

  return (
    <div className="flex min-h-screen flex-col">
      {/* Topbar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-bg-elevated px-6">
        <span
          className="text-[22px] font-bold tracking-tight text-fg"
          style={{ fontFamily: 'var(--font-caveat, "Caveat", cursive)' }}
        >
          concert<span style={{ color: 'var(--signal)' }}>crawl</span>
          <span style={{ color: 'var(--accent)' }}>.</span>
        </span>
        <Link
          href="/events"
          className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-fg-muted transition-colors hover:text-fg"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          ← Back to browse
        </Link>
      </header>

      {/* Sidebar + Panel */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-60 shrink-0 border-r border-border bg-bg-elevated">
          <div className="sticky top-14 flex flex-col p-3">
            {/* User mini card */}
            <div
              className="mb-3 flex items-center gap-2.5 rounded-xl p-2.5"
              style={{ background: 'var(--surface-1)' }}
            >
              <Avatar
                handle={profile.handle}
                avatarColor={profile.avatarColor}
                size={36}
              />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[13px] font-bold text-fg">
                  {profile.handle
                    ? `@${profile.handle}`
                    : 'anonymous fan'}
                </span>
                <span
                  className="text-[10px] text-fg-muted"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {profile.city || '—'} · joined {profile.joined}
                </span>
                <CredChip cred={profile.cred} size="sm" />
              </div>
            </div>

            {/* Nav items */}
            <div className="flex flex-col gap-0.5">
              {NAV_ITEMS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveSection(key)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                  style={{
                    background:
                      activeSection === key
                        ? 'var(--surface-2)'
                        : 'transparent',
                    color:
                      key === 'danger'
                        ? 'var(--danger)'
                        : activeSection === key
                          ? 'var(--fg)'
                          : 'var(--fg-muted)',
                    fontWeight: activeSection === key ? 700 : 500,
                  }}
                >
                  {NAV_ICONS[key]}
                  {label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Panel */}
        <main className="max-w-xl flex-1 px-8 py-8">
          {activeSection === 'profile' && profilePanel}

          {activeSection === 'plan' && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-[22px] font-extrabold text-fg">Plan</h2>
                <p className="text-[13px] text-fg-muted">
                  What you&apos;re paying us. (Spoiler: nothing.)
                </p>
              </div>
              <PlanCard plan={profile.plan} />
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-[22px] font-extrabold text-fg">
                  Appearance
                </h2>
                <p className="text-[13px] text-fg-muted">
                  Three flavors. Pick the one that hurts your eyes least.
                </p>
              </div>
              <ThemePickerInline />
            </div>
          )}

          {activeSection === 'submissions' && submissionsPanel}

          {activeSection === 'account' && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-[22px] font-extrabold text-fg">Account</h2>
                <p className="text-[13px] text-fg-muted">
                  The actual login bits. Lives in Clerk, not here.
                </p>
              </div>
              <div className="flex flex-col rounded-xl border border-border bg-surface-1">
                {/* Email row */}
                <div className="flex items-center gap-3 px-5 py-3.5">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 15 15"
                    fill="none"
                    aria-hidden
                    className="shrink-0 text-fg-muted"
                  >
                    <rect
                      x="1"
                      y="3"
                      width="13"
                      height="9"
                      rx="1.5"
                      stroke="currentColor"
                      strokeWidth="1.3"
                    />
                    <path
                      d="M1 4.5l6.5 4.5L14 4.5"
                      stroke="currentColor"
                      strokeWidth="1.3"
                    />
                  </svg>
                  <span className="flex-1 text-[14px] font-medium text-fg">
                    {SETTINGS_COPY.emailRow}
                  </span>
                  <span className="text-[13px] text-fg-muted">
                    {profile.email}
                  </span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    aria-hidden
                    className="shrink-0 text-fg-subtle"
                  >
                    <path
                      d="M5.5 3l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="mx-5 h-px bg-border" />
                {/* Password row */}
                <div className="flex items-center gap-3 px-5 py-3.5">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 15 15"
                    fill="none"
                    aria-hidden
                    className="shrink-0 text-fg-muted"
                  >
                    <rect
                      x="3"
                      y="7"
                      width="9"
                      height="6.5"
                      rx="1.5"
                      stroke="currentColor"
                      strokeWidth="1.3"
                    />
                    <path
                      d="M5 7V5.5a2.5 2.5 0 015 0V7"
                      stroke="currentColor"
                      strokeWidth="1.3"
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
                    className="rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-fg-muted transition-colors hover:text-fg"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--surface-2)',
                    }}
                  >
                    Clerk →
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'danger' && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-[22px] font-extrabold text-fg">
                  Danger zone
                </h2>
                <p className="text-[13px] text-fg-muted">The exits.</p>
              </div>
              <DangerZone
                handle={profile.handle}
                submissionCount={profile.submissionCount}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
