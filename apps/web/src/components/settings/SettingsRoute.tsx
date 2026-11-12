import Link from 'next/link';
import { ProfileHero } from './ProfileHero';
import { AccountManagementRow } from './AccountManagementRow';
import { DataExportRow } from './DataExportRow';
import { ThemePickerInline } from './ThemePickerInline';
import { NotificationsSection } from './notifications/NotificationsSection';
import { SubmissionsSummaryCard } from './SubmissionsSummaryCard';
import { DangerZone } from './DangerZone';
import { ConnectionsPanel } from './connections';
import { SPOTIFY_COPY } from '@/components/consumer/spotify/definitions/copy';
import { UserMenuVersionFooter } from '@/components/consumer/release-notes/UserMenuVersionFooter';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import type {
  UserProfileResponse,
  UserSubmissionItem,
} from '@concert-crawl/types';

const APP_VERSION = process.env['NEXT_PUBLIC_APP_VERSION'] ?? 'dev';
const SETTINGS_COPY = CONSUMER_COPY.settings;

interface SettingsRouteProps {
  profile: UserProfileResponse;
  submissions: UserSubmissionItem[];
  isAdmin?: boolean;
  /**
   * The `spotify-sync` release flag, resolved server-side on `/me` and passed
   * to both settings routes so mobile and desktop never disagree and the
   * Connections section does not flash in before the client read lands.
   */
  spotifyEnabled: boolean;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {children}
    </div>
  );
}

export function SettingsRoute({
  profile,
  submissions,
  isAdmin = false,
  spotifyEnabled,
}: SettingsRouteProps) {
  return (
    <>
      {/* Mobile header */}
      <div className="flex items-center justify-between border-b border-border bg-bg-elevated px-4 py-3.5">
        <Link
          href="/events"
          className="text-[13px] font-semibold uppercase tracking-[0.06em] text-fg-muted"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {SETTINGS_COPY.mobileHeaderBack}
        </Link>
        <span className="text-[17px] font-extrabold text-fg">
          {SETTINGS_COPY.mobileHeaderTitle}
        </span>
        <div style={{ width: 52 }} />
      </div>

      <div className="flex flex-col gap-7 pb-24">
        {/* Hero: the banner runs edge to edge, so no side padding here */}
        <ProfileHero
          handle={profile.handle}
          avatarColor={profile.avatarColor}
          avatarSecondColor={profile.avatarSecondColor}
          displayRole={profile.displayRole}
          roleBadge={profile.roleBadge}
          city={profile.city}
          joined={profile.joined}
          cred={profile.cred}
        />

        {/* Submitted prices: a summary here, the full list on its own page */}
        <div className="flex flex-col gap-2 px-4">
          <SectionLabel>{SETTINGS_COPY.submissionsSection}</SectionLabel>
          <SubmissionsSummaryCard
            submissions={submissions}
            totalCount={profile.submissionCount}
            cred={profile.cred}
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
              {SETTINGS_COPY.themeTapHint}
            </span>
          </div>
          <ThemePickerInline />
        </div>

        {/* Notifications (#1063). The id is the deep-link target for the
            alerts row on My shows ▸ Artists — there is one settings route, so
            an anchor is the only way to land a link on this section. */}
        <div id="notifications" className="flex flex-col gap-2 px-4">
          <NotificationsSection />
        </div>

        {/* Connections (#763) — the section holds nothing but the Spotify
            link and its heading copy is Spotify's, so the flag takes the whole
            section rather than leaving an empty one. */}
        {spotifyEnabled && (
          <div className="flex flex-col gap-2 px-4">
            <SectionLabel>
              {SPOTIFY_COPY.connectEntry.sectionTitle}
            </SectionLabel>
            <p className="-mt-1 text-[13px] leading-[1.4] text-fg-muted">
              {SPOTIFY_COPY.connectEntry.sectionSub}
            </p>
            <ConnectionsPanel />
          </div>
        )}

        {/* Account */}
        <div className="flex flex-col gap-2 px-4">
          <SectionLabel>{SETTINGS_COPY.accountSection}</SectionLabel>
          <AccountManagementRow email={profile.email} />
          {/* Last thing in Account, above Danger zone but not in it: taking
              your data out is not the same act as deleting it. */}
          <DataExportRow />
        </div>

        {/* Admin link — only for admins */}
        {isAdmin && (
          <>
            <div className="px-4">
              <SectionLabel>{SETTINGS_COPY.operationsSection}</SectionLabel>
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
                  {SETTINGS_COPY.adminRow}
                </span>
              </Link>
            </div>
          </>
        )}

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
  );
}
