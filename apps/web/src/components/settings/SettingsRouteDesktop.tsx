'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useClerk, useUser } from '@clerk/nextjs'
import { Avatar } from './Avatar'
import { CredChip } from './CredChip'
import { PlanPanel } from './plan'
import { ThemePickerInline } from './ThemePickerInline'
import { MySubmissionsList } from './MySubmissionsList'
import { DangerZone } from './DangerZone'
import { EditProfileForm } from './EditProfileForm'
import { ConnectionsPanel } from './connections'
import { NotificationsSection } from './notifications/NotificationsSection'
import { NOTIFICATIONS_COPY } from './notifications/definitions/copy'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { SPOTIFY_COPY } from '@/components/consumer/spotify/definitions/copy'
import { CCClusterMark } from '@/components/brand/cc-cluster-mark/CCClusterMark'
import { CCWordmark } from '@/components/brand/cc-wordmark/CCWordmark'
import type {
  UserProfileResponse,
  UserSubmissionItem,
} from '@concert-crawl/types'

const SETTINGS_COPY = CONSUMER_COPY.settings

type NavSection =
  | 'profile'
  | 'plan'
  | 'appearance'
  | 'connections'
  | 'notifications'
  | 'submissions'
  | 'account'
  | 'danger'

const NAV_ITEMS: { key: NavSection; label: string }[] = [
  { key: 'profile', label: SETTINGS_COPY.profileSection },
  { key: 'plan', label: SETTINGS_COPY.planSectionDesktop },
  { key: 'submissions', label: SETTINGS_COPY.submissionsSection },
  { key: 'appearance', label: SETTINGS_COPY.appearanceSection },
  { key: 'notifications', label: NOTIFICATIONS_COPY.heading },
  { key: 'connections', label: SPOTIFY_COPY.connectEntry.sectionTitle },
  { key: 'account', label: SETTINGS_COPY.accountSection },
  { key: 'danger', label: SETTINGS_COPY.dangerSection },
]

const NAV_ICONS: Record<NavSection, React.ReactNode> = {
  profile: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="6" r="2.6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M2.5 13.5c.6-2.3 2.7-3.5 5.5-3.5s4.9 1.2 5.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  plan: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="2"
        y="4"
        width="12"
        height="9"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M2 7h12" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  submissions: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M5 4h8M5 8h8M5 12h8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  ),
  appearance: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="6" r=".9" fill="currentColor" />
      <circle cx="10" cy="6" r=".9" fill="currentColor" />
      <circle cx="11" cy="9" r=".9" fill="currentColor" />
    </svg>
  ),
  connections: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6.8 9.2l2.4-2.4M8.5 4.5l1-1a2.3 2.3 0 013.2 3.2l-1 1M7.5 8.3l-1 1a2.3 2.3 0 003.2 3.2l1-1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  notifications: (
    // Bell glyph — small enough to match the neighboring 16px icons.
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 2v.8M5 6a3 3 0 016 0v3l1.2 2H3.8L5 9V6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 12.5a1.5 1.5 0 003 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  account: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 2L3 4v4.5c0 3.3 2.5 5.4 5 6 2.5-.6 5-2.7 5-6V4L8 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
  danger: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 5h10M6 5V3.5h4V5M5 5l.7 8.5h4.6L11 5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
}

interface SettingsRouteDesktopProps {
  profile: UserProfileResponse
  submissions: UserSubmissionItem[]
  scaRegion: boolean
}

export function SettingsRouteDesktop({
  profile,
  submissions,
  scaRegion,
}: SettingsRouteDesktopProps) {
  const { openUserProfile } = useClerk()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const sectionParam = searchParams.get('section')
  const initialSection: NavSection =
    sectionParam !== null && NAV_ITEMS.some((item) => item.key === sectionParam)
      ? (sectionParam as NavSection)
      : 'profile'
  const [activeSection, setActiveSection] = useState<NavSection>(initialSection)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    const param = searchParams.get('section')
    const isValid =
      param !== null && NAV_ITEMS.some((item) => item.key === param)
    setActiveSection(isValid ? (param as NavSection) : 'profile')
  }, [searchParams])

  const openEdit = useCallback(() => setEditOpen(true), [])
  const closeEdit = useCallback(() => setEditOpen(false), [])

  useEffect(() => {
    if (!editOpen) return
    function handleKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') setEditOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [editOpen])

  const isAnon = !profile.handle
  const confirmedCount = submissions.filter(
    (sub) => sub.status === 'confirmed',
  ).length

  const profilePanel = (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[22px] font-extrabold text-fg">
          {SETTINGS_COPY.profileSection}
        </h2>
        <p className="text-[13px] text-fg-muted">
          {SETTINGS_COPY.profileSectionSub}
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
          <span className="min-w-0 break-words text-[20px] font-black tracking-[-0.02em] text-fg">
            {profile.handle ? (
              <>
                <span className="font-bold text-fg-muted">@</span>
                {profile.handle}
              </>
            ) : (
              SETTINGS_COPY.anonymousLabel
            )}
          </span>
          <span
            className="text-[11px] font-semibold text-fg-muted"
            style={{
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
            }}
          >
            {profile.city || SETTINGS_COPY.cityFallback} ·{' '}
            {SETTINGS_COPY.heroJoinedLabel} {profile.joined}
          </span>
          <div className="mt-0.5">
            <CredChip cred={profile.cred} size="sm" showTooltip />
          </div>
          {isAnon && (
            <span className="mt-0.5 text-[11px] italic text-fg-subtle">
              {SETTINGS_COPY.heroAnonLead}{' '}
              <em>{SETTINGS_COPY.anonymousLabel}</em>.{' '}
              {SETTINGS_COPY.heroAnonTail}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={openEdit}
          className="shrink-0 cursor-pointer rounded-lg border px-3 py-1.5 text-[12.5px] font-bold text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          style={{
            background: 'var(--surface-2)',
            borderColor: 'var(--border-strong)',
          }}
        >
          {SETTINGS_COPY.heroEditButton}
        </button>
      </div>
      {/* Context info card */}
      {!isAnon ? (
        <div className="rounded-xl border border-border bg-surface-1 px-4 py-3.5 text-[13px] leading-relaxed text-fg-muted">
          {SETTINGS_COPY.handleExplainerLead}{' '}
          <strong style={{ color: 'var(--signal)' }}>@{profile.handle}</strong>{' '}
          {SETTINGS_COPY.handleExplainerTail}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface-1 px-4 py-4">
          <p className="text-[14px] font-semibold text-fg">
            {SETTINGS_COPY.anonymousCardLead}{' '}
            <em>{SETTINGS_COPY.anonymousCardLabel}</em>
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
            {SETTINGS_COPY.anonymousCardBody}
          </p>
          <button
            type="button"
            onClick={openEdit}
            className="mt-3 inline-flex cursor-pointer rounded-xl px-4 py-2.5 text-[13px] font-bold"
            style={{
              background: 'var(--signal)',
              color: 'var(--bg)',
              border: 'none',
            }}
          >
            {SETTINGS_COPY.pickHandleCta}
          </button>
        </div>
      )}
    </div>
  )

  const submissionsPanel = (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[22px] font-extrabold text-fg">
          {SETTINGS_COPY.submissionsSection}
        </h2>
        <p className="text-[13px] text-fg-muted">
          {SETTINGS_COPY.submissionsTotal(profile.submissionCount)}
          {confirmedCount > 0 &&
            SETTINGS_COPY.submissionsConfirmedSuffixDesktop(confirmedCount)}
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
        <div className="flex items-center gap-2">
          <CCClusterMark size={24} color="var(--signal)" />
          <CCWordmark size={18} />
        </div>
        <Link
          href="/events"
          className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-fg-muted transition-colors hover:text-fg"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {SETTINGS_COPY.desktopBackToBrowse}
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
                    : SETTINGS_COPY.anonymousLabel}
                </span>
                <span
                  className="text-[10px] text-fg-muted"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {profile.city || SETTINGS_COPY.cityFallback} ·{' '}
                  {SETTINGS_COPY.heroJoinedLabel} {profile.joined}
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
        <main className="flex-1 px-8 py-8">
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            {activeSection === 'profile' && profilePanel}

            {activeSection === 'plan' && (
              <div className="flex flex-col gap-5">
                <div>
                  <h2 className="text-[22px] font-extrabold text-fg">
                    {SETTINGS_COPY.planSectionDesktop}
                  </h2>
                  <p className="text-[13px] text-fg-muted">
                    {SETTINGS_COPY.planSectionSubDesktop}
                  </p>
                </div>
                <PlanPanel
                  planState={profile.planState}
                  scaRegion={scaRegion}
                  variant="desktop"
                />
              </div>
            )}

            {activeSection === 'appearance' && (
              <div className="flex flex-col gap-5">
                <div>
                  <h2 className="text-[22px] font-extrabold text-fg">
                    {SETTINGS_COPY.appearanceSection}
                  </h2>
                  <p className="text-[13px] text-fg-muted">
                    {SETTINGS_COPY.appearanceSectionSub}
                  </p>
                </div>
                <ThemePickerInline />
              </div>
            )}

            {activeSection === 'connections' && (
              <div className="flex flex-col gap-5">
                <div>
                  <h2 className="text-[22px] font-extrabold text-fg">
                    {SPOTIFY_COPY.connectEntry.sectionTitle}
                  </h2>
                  <p className="text-[13px] text-fg-muted">
                    {SPOTIFY_COPY.connectEntry.sectionSub}
                  </p>
                </div>
                <ConnectionsPanel />
              </div>
            )}

            {activeSection === 'notifications' && (
              <NotificationsSection variant="desktop" scaRegion={scaRegion} />
            )}

            {activeSection === 'submissions' && submissionsPanel}

            {activeSection === 'account' && (
              <div className="flex flex-col gap-5">
                <div>
                  <h2 className="text-[22px] font-extrabold text-fg">
                    {SETTINGS_COPY.accountSection}
                  </h2>
                  <p className="text-[13px] text-fg-muted">
                    {SETTINGS_COPY.accountSectionSub}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
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

                    {/* Connected account rows */}
                    {user?.externalAccounts?.map((account) => (
                      <div key={account.provider}>
                        <div className="mx-5 h-px bg-border" />
                        <div className="flex items-center gap-3 px-5 py-3.5">
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 16 16"
                            fill="none"
                            aria-hidden
                            className="shrink-0 text-fg-muted"
                          >
                            <circle
                              cx="4"
                              cy="8"
                              r="2.5"
                              stroke="currentColor"
                              strokeWidth="1.3"
                            />
                            <circle
                              cx="12"
                              cy="4"
                              r="2.5"
                              stroke="currentColor"
                              strokeWidth="1.3"
                            />
                            <circle
                              cx="12"
                              cy="12"
                              r="2.5"
                              stroke="currentColor"
                              strokeWidth="1.3"
                            />
                            <path
                              d="M6.5 7l3-2M6.5 9l3 2"
                              stroke="currentColor"
                              strokeWidth="1.3"
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="flex-1 text-[14px] font-medium text-fg">
                            {SETTINGS_COPY.connectedAccountRow}
                          </span>
                          <span className="text-[13px] text-fg-muted">
                            {account.provider
                              .replace(/^oauth_/, '')
                              .replace(/_/g, ' ')
                              .replace(/\b\w/g, (char) => char.toUpperCase())}
                          </span>
                        </div>
                      </div>
                    ))}

                    {user?.passwordEnabled && (
                      <>
                        <div className="mx-5 h-px bg-border" />
                        {/* Password row — only shown for email/password accounts */}
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
                          <button
                            type="button"
                            onClick={() => openUserProfile()}
                            className="cursor-pointer rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-fg-muted transition-colors hover:text-fg"
                            style={{
                              fontFamily: 'var(--font-mono)',
                              background: 'var(--surface-2)',
                            }}
                          >
                            {SETTINGS_COPY.clerkLinkLabel}
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Clerk attribution */}
                  <p
                    className="text-fg-subtle"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {SETTINGS_COPY.clerkAttribution}{' '}
                    <a
                      href="https://clerk.com/legal/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-signal hover:underline"
                    >
                      {SETTINGS_COPY.clerkPrivacyLink}
                    </a>
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'danger' && (
              <div className="flex flex-col gap-5">
                <div>
                  <h2 className="text-[22px] font-extrabold text-fg">
                    {SETTINGS_COPY.dangerSection}
                  </h2>
                  <p className="text-[13px] text-fg-muted">
                    {SETTINGS_COPY.dangerSectionSub}
                  </p>
                </div>
                <DangerZone
                  handle={profile.handle}
                  submissionCount={profile.submissionCount}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Edit profile modal — appears over settings page */}
      {editOpen && (
        <>
          {/* Scrim with blur */}
          <div
            className="fixed inset-0 z-50"
            style={{
              background: 'var(--scrim, rgba(0,0,0,0.55))',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
            onClick={closeEdit}
          />
          {/* Dialog */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={SETTINGS_COPY.editProfileDialogAriaLabel}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl"
            style={{
              background: 'var(--bg-elevated, var(--bg))',
              border: '1px solid var(--border-strong, var(--border))',
              boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
            }}
            onClick={(ev) => ev.stopPropagation()}
          >
            <EditProfileForm profile={profile} onClose={closeEdit} />
          </div>
        </>
      )}
    </div>
  )
}
