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
      <div className="px-4">
        <ThemePickerInline />
      </div>

      <div className="mx-4 h-px bg-border" />

      {/* Submissions */}
      <div className="px-0">
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
        {/* Saved shows — stub */}
        <div className="flex items-center justify-between px-5 py-3 opacity-50">
          <span className="text-[14px] text-fg">
            {SETTINGS_COPY.watchlistRow}
          </span>
          <span className="text-[13px] text-fg-subtle">
            {SETTINGS_COPY.watchlistComingSoon}
          </span>
        </div>
      </div>

      <div className="mx-4 h-px bg-border" />

      {/* Danger zone */}
      <div className="px-0">
        <DangerZone />
      </div>
    </div>
  )
}
