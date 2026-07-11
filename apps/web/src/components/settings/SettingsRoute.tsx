import Link from 'next/link'
import { ProfileHero } from './ProfileHero'
import { AccountManagementRow } from './AccountManagementRow'
import { PlanPanel } from './plan'
import { ThemePickerInline } from './ThemePickerInline'
import { MySubmissionsList } from './MySubmissionsList'
import { DangerZone } from './DangerZone'
import { UserMenuVersionFooter } from '@/components/consumer/release-notes/UserMenuVersionFooter'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import type {
  UserProfileResponse,
  UserSubmissionItem,
} from '@concert-crawl/types'

const APP_VERSION = process.env['NEXT_PUBLIC_APP_VERSION'] ?? 'dev'
const SETTINGS_COPY = CONSUMER_COPY.settings

interface SettingsRouteProps {
  profile: UserProfileResponse
  submissions: UserSubmissionItem[]
  scaRegion: boolean
  isAdmin?: boolean
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

export function SettingsRoute({
  profile,
  submissions,
  scaRegion,
  isAdmin = false,
}: SettingsRouteProps) {
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

      <div className="flex flex-col gap-6 pb-24">
        {/* Hero — no section label */}
        <div className="px-5 pt-2">
          <ProfileHero
            handle={profile.handle}
            avatarColor={profile.avatarColor}
            displayRole={profile.displayRole}
            roleBadge={profile.roleBadge}
            city={profile.city}
            joined={profile.joined}
            cred={profile.cred}
          />
        </div>

        <div className="mx-4 h-px bg-border" />

        {/* Plan */}
        <div className="px-4">
          <SectionLabel>{SETTINGS_COPY.planSection}</SectionLabel>
          <PlanPanel
            planState={profile.planState}
            scaRegion={scaRegion}
            variant="mobile"
          />
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

        {/* Admin link — only for admins */}
        {isAdmin && (
          <>
            <div className="mx-4 h-px bg-border" />
            <div className="px-4">
              <SectionLabel>Operations</SectionLabel>
              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-[10px] border border-border bg-surface-1 px-4 py-3 transition-colors"
              >
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] bg-surface-2 text-signal">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M8 1.5l5.5 2v4.2c0 3.4-2.4 6.4-5.5 7.3-3.1-0.9-5.5-3.9-5.5-7.3V3.5L8 1.5z"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span
                  className="text-[13.5px] font-semibold text-fg"
                  style={{
                    fontFamily: 'var(--font-ui)',
                    letterSpacing: '-0.005em',
                  }}
                >
                  Admin
                </span>
              </Link>
            </div>
          </>
        )}

        <div className="mx-4 h-px bg-border" />

        {/* Danger zone */}
        <div className="flex flex-col gap-2 px-4">
          <SectionLabel>{SETTINGS_COPY.dangerSection}</SectionLabel>
          <DangerZone
            handle={profile.handle}
            submissionCount={profile.submissionCount}
          />
        </div>

        {/* Changelog / version footer */}
        <UserMenuVersionFooter
          build={APP_VERSION.split(' · ')[0] ?? APP_VERSION}
        />
      </div>
    </>
  )
}
