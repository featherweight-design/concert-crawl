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

// Per monetization design handoff — neutral surface, colored dot, fg-muted text
const ROLE_BADGE_DOT: Record<RoleBadge, string> = {
  admin: 'var(--warning)',
  promoter: 'var(--accent)',
  beta: 'var(--signal)',
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

  // roleBadge takes precedence; show displayRole badge only for crew/artist (not fan/staff)
  const showRoleBadge = roleBadge !== null;
  const showDisplayBadge =
    !showRoleBadge && displayRole !== 'fan' && displayRole !== 'staff';

  const editClass =
    'absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg px-3.5 py-2 text-[12.5px] font-bold text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal';
  const editStyle = {
    background: 'color-mix(in oklch, var(--bg) 78%, transparent)',
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
            background: 'var(--surface-2)',
            border: '1px solid var(--border-strong)',
            color: 'var(--fg-muted)',
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
        className="relative h-[70px]"
        style={{
          backgroundImage: `repeating-linear-gradient(135deg, transparent 0 7px, color-mix(in oklch, var(--fg) 9%, transparent) 7px 8px), linear-gradient(90deg, color-mix(in oklch, var(--${first}) 42%, var(--bg)), color-mix(in oklch, var(--${second}) 42%, var(--bg)))`,
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
        <div className="-mt-9">
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
              <>
                <span className="text-fg-muted" style={{ fontWeight: 700 }}>
                  @
                </span>
                {handle}
              </>
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
