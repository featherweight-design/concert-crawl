import Link from 'next/link';
import { AvatarRing } from './AvatarRing';
import { avatarPair } from './definitions/styles';
import { CredChip } from './CredChip';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import type { AvatarColor, DisplayRole, RoleBadge } from '@concert-crawl/types';

const SETTINGS_COPY = CONSUMER_COPY.settings;

interface ProfileHeroProps {
  handle: string | null;
  avatarColor: AvatarColor | null;
  avatarSecondColor: AvatarColor | null;
  displayRole: DisplayRole;
  roleBadge: RoleBadge | null;
  city: string | null;
  joined: string;
  cred: number;
  /**
   * `page` is the mobile hero: a full-bleed banner on the page itself.
   * `card` is the desktop Profile panel: the same banner inside a bordered
   * card, with the cred chip beside the handle instead of under it.
   */
  layout?: 'page' | 'card';
  /** Opens the edit dialog in place. Without it the Edit button links to /me/edit. */
  onEdit?: () => void;
}

const DISPLAY_ROLE_LABEL: Record<DisplayRole, string> = {
  fan: 'fan',
  crew: 'crew',
  artist: 'artist',
  staff: 'staff',
};

// Role chip colours (addendum 5 item 9): the dot, the hairline and the text
// all take the role's colour on a neutral surface.
const ROLE_BADGE_DOT: Record<RoleBadge, string> = {
  admin: 'var(--warning)',
  promoter: 'var(--accent)',
  beta: 'var(--signal)',
};

// The chip's text: the Light-safe text variants (globals.css), which are the
// raw colours on every dark theme.
const ROLE_BADGE_TEXT: Record<RoleBadge, string> = {
  admin: 'var(--price-text-warning)',
  promoter: 'var(--price-text-accent)',
  beta: 'var(--price-text-signal)',
};

const ROLE_BADGE_LABEL: Record<RoleBadge, string> = {
  admin: 'Admin',
  promoter: 'Promoter',
  beta: 'Beta',
};

export function ProfileHero({
  handle,
  avatarColor,
  avatarSecondColor,
  displayRole,
  roleBadge,
  city,
  joined,
  cred,
  layout = 'page',
  onEdit,
}: ProfileHeroProps) {
  const isAnon = !handle;
  const isCard = layout === 'card';
  const { first, second } = avatarPair(avatarColor, avatarSecondColor);
  // One colour (second falls back to first) is a solid band, no stripes.
  const isStriped = first !== second;
  const stripes = isStriped
    ? 'repeating-linear-gradient(135deg, transparent 0 7px, color-mix(in oklch, var(--fg) 9%, transparent) 7px 8px), '
    : '';

  // roleBadge takes precedence; show displayRole badge only for crew/artist (not fan/staff)
  const showRoleBadge = roleBadge !== null;
  const showDisplayBadge =
    !showRoleBadge && displayRole !== 'fan' && displayRole !== 'staff';

  // `z-20` puts Edit above the avatar layer below (`z-10`), which rises 36px
  // into this banner: the two must never compete for the same tap.
  const editClass =
    'absolute right-3.5 top-1/2 z-20 -translate-y-1/2 rounded-lg px-3.5 py-2 text-[12.5px] font-bold text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal';
  const editStyle = {
    background: 'color-mix(in oklch, var(--bg) 78%, transparent)',
    // The board draws a hairline round the button (more-s-settings_m).
    border: '1px solid color-mix(in oklch, var(--fg) 16%, transparent)',
    letterSpacing: '-0.005em',
  };

  const credChip = (
    <div className="flex items-center gap-1.5">
      <CredChip cred={cred} size="md" showTooltip />
      {cred === 0 && !isAnon && (
        <span className="text-[11.5px] text-fg-subtle">
          {SETTINGS_COPY.heroCredNudge}
        </span>
      )}
    </div>
  );

  const roleBadges = (
    <>
      {showRoleBadge && roleBadge && (
        <span
          className="inline-flex shrink-0 items-center"
          style={{
            gap: 5,
            padding: '3px 7px',
            borderRadius: 4,
            // The board draws every role chip in its own colour, text and
            // hairline (addendum 5 item 9, role-chips-m): ADMIN amber,
            // PROMOTER accent, BETA signal, the dot matching.
            background: 'var(--surface-2)',
            border: `1px solid color-mix(in oklch, ${ROLE_BADGE_DOT[roleBadge]} 45%, transparent)`,
            color: ROLE_BADGE_TEXT[roleBadge],
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            lineHeight: 1,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 5,
              height: 5,
              borderRadius: 5,
              background: ROLE_BADGE_DOT[roleBadge],
              display: 'block',
              flexShrink: 0,
            }}
          />
          {ROLE_BADGE_LABEL[roleBadge]}
        </span>
      )}
      {showDisplayBadge && (
        <span
          className="inline-flex shrink-0 items-center gap-1"
          style={{
            padding: '2px 6px',
            borderRadius: 4,
            background: `color-mix(in oklch, var(--signal) 14%, transparent)`,
            border: `1px solid var(--signal)`,
            color: 'var(--signal)',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              background: 'var(--signal)',
              display: 'block',
            }}
          />
          {DISPLAY_ROLE_LABEL[displayRole]}
        </span>
      )}
    </>
  );

  const cityLine = (
    <span
      className="text-[11px] font-semibold text-fg-muted"
      style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
    >
      {city ? `${city} · ` : ''}
      {SETTINGS_COPY.heroJoinedLabel} {joined}
    </span>
  );

  return (
    <div
      className={
        isCard
          ? 'overflow-hidden rounded-2xl border border-border bg-surface-1'
          : ''
      }
    >
      {/* Striped banner in the avatar's two colours. Decorative, so the Edit
          button is the only thing in it. */}
      <div
        data-testid="profile-banner"
        data-striped={isStriped}
        className="relative h-[70px]"
        style={{
          backgroundImage: `${stripes}linear-gradient(90deg, color-mix(in oklch, var(--${first}) 42%, var(--bg)), color-mix(in oklch, var(--${second}) 42%, var(--bg)))`,
        }}
      >
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className={`${editClass} cursor-pointer`}
            style={editStyle}
          >
            {SETTINGS_COPY.heroEditButton}
          </button>
        ) : (
          <Link href="/me/edit" className={editClass} style={editStyle}>
            {SETTINGS_COPY.heroEditButton}
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-2 px-5 pb-4">
        {/* `self-start` keeps this layer as wide as the avatar. As a full-width
            flex row it was a transparent `z-10` sheet over the lower half of
            the banner, Edit included, and swallowed taps on the button. */}
        <div
          data-testid="profile-avatar-layer"
          className="relative z-10 -mt-9 self-start"
        >
          <AvatarRing
            handle={handle}
            avatarColor={avatarColor}
            avatarSecondColor={avatarSecondColor}
            size={76}
            cutout={isCard ? 'var(--surface-1)' : 'var(--bg)'}
          />
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5 pt-1">
          <span
            className="min-w-0 truncate text-[28px] leading-[1.1] tracking-[-0.02em] text-fg"
            style={{ fontWeight: 900 }}
          >
            {isAnon ? (
              <span className="text-fg-muted" style={{ fontWeight: 700 }}>
                {SETTINGS_COPY.anonymousLabel}
              </span>
            ) : (
              // The board draws the "@" as heavy and white as the handle.
              <>@{handle}</>
            )}
          </span>
          {roleBadges}
          {isCard && credChip}
        </div>

        {isCard ? (
          cityLine
        ) : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {cityLine}
            {credChip}
          </div>
        )}

        {/* Anonymous inline explainer */}
        {isAnon && (
          <p
            className="text-[12px] leading-relaxed text-fg-subtle"
            style={{ letterSpacing: '-0.005em' }}
          >
            {SETTINGS_COPY.heroAnonLead} <em>{SETTINGS_COPY.anonymousLabel}</em>
            . {SETTINGS_COPY.heroAnonTail}
          </p>
        )}
      </div>
    </div>
  );
}
