'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Bell, Eye, Link2, Ticket, Users, X, Tag } from 'lucide-react';
import { AvatarRing } from './AvatarRing';
import { PanelHeading } from './PanelHeading';
import { ProfileHero } from './ProfileHero';
import { SIGNAL_TO_ACCENT } from './definitions/styles';
import { CredChip } from './CredChip';
import { ThemePickerInline } from './ThemePickerInline';
import { MySubmissionsList } from './MySubmissionsList';
import { SubmissionStats } from './SubmissionStats';
import { DangerZone } from './DangerZone';
import { DataExportRow } from './DataExportRow';
import { AccountManagementRow } from './AccountManagementRow';
import { EditProfileForm } from './EditProfileForm';
import { ConnectionsPanel } from './connections';
import { NotificationsSection } from './notifications/NotificationsSection';
import { NOTIFICATIONS_COPY } from './notifications/definitions/copy';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { SPOTIFY_COPY } from '@/components/consumer/spotify/definitions/copy';
import { UserMenuVersionFooter } from '@/components/consumer/release-notes/UserMenuVersionFooter';
import { CCClusterMark } from '@/components/brand/cc-cluster-mark/CCClusterMark';
import { CCWordmark } from '@/components/brand/cc-wordmark/CCWordmark';
import type {
  UserProfileResponse,
  UserSubmissionItem,
} from '@concert-crawl/types';

const SETTINGS_COPY = CONSUMER_COPY.settings;
const APP_VERSION = process.env['NEXT_PUBLIC_APP_VERSION'] ?? 'dev';

export type NavSection =
  | 'profile'
  | 'appearance'
  | 'connections'
  | 'notifications'
  | 'submissions'
  | 'account'
  | 'danger';

const NAV_ITEMS: { key: NavSection; label: string }[] = [
  { key: 'profile', label: SETTINGS_COPY.profileSection },
  { key: 'submissions', label: SETTINGS_COPY.submissionsSection },
  { key: 'appearance', label: SETTINGS_COPY.appearanceSection },
  { key: 'notifications', label: NOTIFICATIONS_COPY.heading },
  { key: 'connections', label: SPOTIFY_COPY.connectEntry.sectionTitle },
  { key: 'account', label: SETTINGS_COPY.accountSection },
  { key: 'danger', label: SETTINGS_COPY.dangerSection },
];

// Resolved against the sections actually on screen. With spotify-sync off,
// `?section=connections` would otherwise select a section whose panel renders
// nothing, leaving the whole right-hand pane blank.
export const resolveSection = (
  param: string | null,
  spotifyEnabled: boolean,
): NavSection => {
  const match = NAV_ITEMS.find((item) => item.key === param);
  if (!match) return 'profile';
  if (match.key === 'connections' && !spotifyEnabled) return 'profile';
  return match.key;
};

const NAV_ICONS: Record<NavSection, React.ReactNode> = {
  profile: <Users size={16} aria-hidden />,
  submissions: <Tag size={16} aria-hidden />,
  appearance: <Eye size={16} aria-hidden />,
  connections: <Link2 size={16} aria-hidden />,
  notifications: <Bell size={16} aria-hidden />,
  account: <Ticket size={16} aria-hidden />,
  danger: <X size={16} aria-hidden />,
};

interface SettingsRouteDesktopProps {
  profile: UserProfileResponse;
  submissions: UserSubmissionItem[];
  /**
   * The `spotify-sync` release flag, resolved server-side on `/me` and passed
   * to both settings routes so mobile and desktop never disagree and the
   * Connections section does not flash in before the client read lands.
   */
  spotifyEnabled: boolean;
  /**
   * The section to open when the URL carries no `?section=`. The dedicated
   * submitted-prices page uses it to land a desktop visitor on that panel.
   */
  initialSection?: NavSection;
}

export function SettingsRouteDesktop({
  profile,
  submissions,
  spotifyEnabled,
  initialSection,
}: SettingsRouteDesktopProps) {
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get('section') ?? initialSection ?? null;
  const [activeSection, setActiveSection] = useState<NavSection>(() =>
    resolveSection(sectionParam, spotifyEnabled),
  );
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    setActiveSection(
      resolveSection(
        searchParams.get('section') ?? initialSection ?? null,
        spotifyEnabled,
      ),
    );
  }, [searchParams, spotifyEnabled, initialSection]);

  // The Connections section holds nothing but the Spotify link, and its own
  // heading copy is Spotify's, so the flag takes the whole section rather than
  // leaving an empty one behind.
  const navItems = NAV_ITEMS.filter(
    (item) => spotifyEnabled || item.key !== 'connections',
  );

  const openEdit = useCallback(() => setEditOpen(true), []);
  const closeEdit = useCallback(() => setEditOpen(false), []);

  useEffect(() => {
    if (!editOpen) return;
    function handleKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') setEditOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [editOpen]);

  const isAnon = !profile.handle;
  const confirmedCount = submissions.filter(
    (sub) => sub.status === 'confirmed',
  ).length;

  const profilePanel = (
    <div className="flex flex-col gap-5">
      <PanelHeading
        title={SETTINGS_COPY.profileSection}
        sub={SETTINGS_COPY.profileSectionSub}
      />
      <ProfileHero
        layout="card"
        handle={profile.handle}
        avatarColor={profile.avatarColor}
        avatarSecondColor={profile.avatarSecondColor}
        displayRole={profile.displayRole}
        roleBadge={profile.roleBadge}
        city={profile.city}
        joined={profile.joined}
        cred={profile.cred}
        onEdit={openEdit}
      />
      {/* Context info card */}
      {!isAnon ? (
        <div className="rounded-xl border border-border bg-surface-1 px-5 py-4 text-[14px] leading-relaxed text-fg-muted">
          {SETTINGS_COPY.handleExplainerLead}{' '}
          <strong style={{ color: 'var(--signal)' }}>@{profile.handle}</strong>{' '}
          {SETTINGS_COPY.handleExplainerTail}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface-1 px-5 py-4">
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
  );

  const submissionsPanel = (
    <div className="flex flex-col gap-5">
      <PanelHeading
        title={SETTINGS_COPY.submissionsSection}
        sub={
          <>
            {SETTINGS_COPY.submissionsTotal(profile.submissionCount)}
            {confirmedCount > 0 &&
              SETTINGS_COPY.submissionsConfirmedSuffixDesktop(confirmedCount)}
          </>
        }
      />
      <SubmissionStats
        submitted={profile.submissionCount}
        confirmed={confirmedCount}
        cred={profile.cred}
      />
      <MySubmissionsList submissions={submissions} />
    </div>
  );

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
        <aside className="w-64 shrink-0 border-r border-border bg-bg-elevated">
          <div className="sticky top-14 flex h-[calc(100vh-3.5rem)] flex-col">
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3.5">
              {/* User mini card */}
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-1 p-3">
                <AvatarRing
                  handle={profile.handle}
                  avatarColor={profile.avatarColor}
                  avatarSecondColor={profile.avatarSecondColor}
                  size={40}
                />
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-[15px] font-extrabold text-fg">
                    {profile.handle
                      ? `@${profile.handle}`
                      : SETTINGS_COPY.anonymousLabel}
                  </span>
                  <span
                    className="truncate text-[10px] text-fg-muted"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {profile.city || SETTINGS_COPY.cityFallback} ·{' '}
                    {SETTINGS_COPY.heroJoinedLabel} {profile.joined}
                  </span>
                  <div>
                    <CredChip cred={profile.cred} size="sm" />
                  </div>
                </div>
              </div>

              {/* Nav items. The active one carries a left edge and a wash
                  fading out to the right; Danger zone keeps its own red. */}
              <nav aria-label={SETTINGS_COPY.desktopNavAriaLabel}>
                <ul className="flex flex-col gap-1">
                  {navItems.map(({ key, label }) => {
                    const active = activeSection === key;
                    const tone =
                      key === 'danger' ? 'var(--danger)' : 'var(--signal)';
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => setActiveSection(key)}
                          aria-current={active ? 'page' : undefined}
                          className="relative flex w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                          style={{
                            background: active
                              ? `linear-gradient(90deg, color-mix(in oklch, ${tone} 16%, var(--surface-1)), transparent)`
                              : 'transparent',
                            color:
                              key === 'danger'
                                ? 'var(--danger)'
                                : active
                                  ? 'var(--fg)'
                                  : 'var(--fg-muted)',
                            fontWeight: active ? 700 : 500,
                          }}
                        >
                          {active && (
                            <span
                              aria-hidden
                              className="absolute inset-y-0 left-0 w-0.5 rounded-full"
                              style={{
                                background:
                                  key === 'danger'
                                    ? 'var(--danger)'
                                    : SIGNAL_TO_ACCENT,
                              }}
                            />
                          )}
                          <span
                            className="flex shrink-0"
                            style={{
                              color: active ? tone : undefined,
                            }}
                          >
                            {NAV_ICONS[key]}
                          </span>
                          {label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>
            <UserMenuVersionFooter
              build={APP_VERSION.split(' · ')[0] ?? APP_VERSION}
            />
          </div>
        </aside>

        {/* Panel */}
        <main className="min-w-0 flex-1 px-8 py-10">
          <div style={{ maxWidth: 660, margin: '0 auto' }}>
            {activeSection === 'profile' && profilePanel}

            {activeSection === 'appearance' && (
              <div className="flex flex-col gap-5">
                <PanelHeading
                  title={SETTINGS_COPY.appearanceSection}
                  sub={SETTINGS_COPY.appearanceSectionSub}
                />
                <ThemePickerInline />
              </div>
            )}

            {activeSection === 'connections' && spotifyEnabled && (
              <div className="flex flex-col gap-5">
                <PanelHeading
                  title={SPOTIFY_COPY.connectEntry.sectionTitle}
                  sub={SPOTIFY_COPY.connectEntry.sectionSub}
                />
                <ConnectionsPanel />
              </div>
            )}

            {activeSection === 'notifications' && (
              <NotificationsSection variant="desktop" />
            )}

            {activeSection === 'submissions' && submissionsPanel}

            {activeSection === 'account' && (
              <div className="flex flex-col gap-5">
                <PanelHeading
                  title={SETTINGS_COPY.accountSection}
                  sub={SETTINGS_COPY.accountSectionSub}
                />
                <div className="flex flex-col gap-3">
                  <AccountManagementRow
                    email={profile.email}
                    variant="desktop"
                  />
                  {/* Last thing in Account, and its own panel away from Danger
                      zone: taking your data out is not deleting it. */}
                  <DataExportRow />
                </div>
              </div>
            )}

            {activeSection === 'danger' && (
              <div className="flex flex-col gap-5">
                <PanelHeading
                  title={SETTINGS_COPY.dangerSection}
                  sub={SETTINGS_COPY.dangerSectionSub}
                />
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
  );
}
