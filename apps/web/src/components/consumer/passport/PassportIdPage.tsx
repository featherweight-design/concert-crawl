import type { AvatarColor } from '@concert-crawl/types';
import { CCWordmark } from '@/components/brand/cc-wordmark';
import { PASSPORT_COPY } from '@/components/consumer/passport/definitions/copy';
import { Avatar } from '@/components/settings/Avatar';
import { passportCodeLine } from '@/lib/passport/booklet';
import { passportHandle, sinceLabel } from '@/lib/passport/stamp';
import type { PassportStats } from '@/lib/passport/stats';

export interface PassportIdentity {
  handle: string | null;
  city: string | null;
  avatarColor: AvatarColor | null;
  year: number;
}

interface PassportIdPageProps {
  identity: PassportIdentity;
  stats: PassportStats;
}

const MONO_LABEL =
  'font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle';

function Stat({
  value,
  label,
  mark = false,
}: {
  value: string;
  label: string;
  mark?: boolean;
}) {
  return (
    <span className="flex min-w-0 flex-col gap-1.5">
      <span
        className="truncate text-[34px] font-black leading-none tracking-[-0.04em] text-fg"
        style={
          mark
            ? {
                background:
                  'linear-gradient(135deg, var(--signal), var(--accent))',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }
            : undefined
        }
      >
        {value}
      </span>
      <span className={MONO_LABEL}>{label}</span>
    </span>
  );
}

/** The booklet's identity page: who, since when, and the year in three numbers. */
export function PassportIdPage({ identity, stats }: PassportIdPageProps) {
  const since = sinceLabel(stats.first?.date);
  const placeLine = [
    identity.city,
    since === null ? null : `${PASSPORT_COPY.footerSincePrefix} ${since}`,
  ]
    .filter((part): part is string => part !== null && part !== '')
    .join(' · ');

  return (
    <div
      data-booklet-leaf="id"
      className="flex h-full flex-col gap-5 p-6 sm:p-7"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-signal">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-[var(--signal)]"
          />
          {`${PASSPORT_COPY.eyebrow} · ${identity.year}`}
        </span>
        <CCWordmark size={13} />
      </div>

      <div className="flex min-w-0 items-center gap-4">
        <Avatar
          handle={identity.handle}
          avatarColor={identity.avatarColor}
          size={60}
        />
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-[28px] font-black leading-none tracking-[-0.03em] text-fg">
            {passportHandle(identity.handle)}
          </span>
          {placeLine !== '' && (
            <span className={`truncate ${MONO_LABEL}`}>{placeLine}</span>
          )}
        </span>
      </div>

      <div className="grid grid-cols-[auto_auto_minmax(0,1fr)] gap-6">
        <Stat
          value={String(stats.nights)}
          label={
            stats.nights === 1
              ? PASSPORT_COPY.statNight
              : PASSPORT_COPY.statNights
          }
          mark
        />
        <Stat
          value={String(stats.venues)}
          label={
            stats.venues === 1
              ? PASSPORT_COPY.statVenue
              : PASSPORT_COPY.statVenues
          }
        />
        <Stat
          value={stats.topGenre?.name ?? PASSPORT_COPY.noGenre}
          label={PASSPORT_COPY.statTopGenre}
        />
      </div>

      <p
        aria-hidden="true"
        className="mt-auto truncate border-t border-border pt-4 font-mono text-[10px] tracking-[0.18em] text-fg-subtle"
      >
        {passportCodeLine({
          handle: identity.handle,
          city: identity.city,
          year: identity.year,
          nights: stats.nights,
          venues: stats.venues,
        })}
      </p>
    </div>
  );
}
