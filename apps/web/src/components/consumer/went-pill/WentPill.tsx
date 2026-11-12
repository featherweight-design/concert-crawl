'use client';

// The "I went" / "Went" pill (edit-concerts artist_past_m, add_*). One tap stamps
// a past night into Concerts, and a tap on "Went" takes it back out with an
// Undo toast, the same no-confirm shape "Not going anymore" has on the Concerts
// list. Signed out, the outline pill is shown and a tap goes to sign-in
// (addendum 3, item 25).

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { VenueStamp } from '@/components/consumer/venue-stamp/VenueStamp';
import { GOING_COPY } from '@/components/consumer/going/definitions/copy';
import {
  showAttendanceError,
  showRemovedToast,
  showStampedToast,
} from '@/components/consumer/going/lib/attendance-toasts';
import { useAttendingToggle } from '@/lib/queries/use-attending-toggle';
import { stampColorsFor } from '@/lib/passport/stamp';

interface WentPillProps {
  eventId: string;
  artist: string;
  venueSlug: string;
  venueName: string;
  /** "Oct 14, 2026", for the pill's accessible name. */
  dateLabel: string;
  /** The caller's own attendance; null when signed out. */
  attending: boolean | null;
  /**
   * What the stamped toast offers: a way on to the Passport, or an Undo (the
   * Add sheet, where the reader stays put).
   */
  afterStamp?: 'passport' | 'undo';
  /** Fires once a stamp or an un-stamp has settled on the server. */
  onChanged?: () => void;
}

const PILL_HEIGHT = 44;
const STAMP_SIZE = 28;

export const WentPill = ({
  eventId,
  artist,
  venueSlug,
  venueName,
  dateLabel,
  attending,
  afterStamp = 'passport',
  onChanged,
}: WentPillProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const toggle = useAttendingToggle();
  // The tapped value answers at once; the server's answer re-syncs it.
  const [went, setWent] = useState(attending === true);
  useEffect(() => setWent(attending === true), [attending]);

  // The pill is filled in its VENUE's colour, as the stamp beside it is inked
  // (artist_past_m: orange for Red Rocks), so two venues are two colours.
  const accent = stampColorsFor(venueSlug).ring;

  const unstamp = async () => {
    setWent(false);
    try {
      const result = await toggle.mutateAsync({ eventId, going: false });
      onChanged?.();
      const restore = result.restore ?? null;
      showRemovedToast({
        artist,
        onUndo: restore ? () => void undoRemove(restore) : null,
      });
    } catch {
      setWent(true);
      showAttendanceError('save');
    }
  };

  const undoRemove = async (restore: {
    attendingAt: string;
    token: string;
  }) => {
    setWent(true);
    try {
      await toggle.mutateAsync({ eventId, going: true, restore });
      onChanged?.();
    } catch {
      setWent(false);
      showAttendanceError('undo');
    }
  };

  const stamp = async () => {
    setWent(true);
    try {
      await toggle.mutateAsync({ eventId, going: true });
      onChanged?.();
      showStampedToast({
        artist,
        ...(afterStamp === 'undo'
          ? { onUndo: () => void unstamp() }
          : { onOpenPassport: () => router.push('/passport') }),
      });
    } catch {
      setWent(false);
      showAttendanceError('save');
    }
  };

  const onTap = () => {
    if (attending === null) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(pathname)}`);
      return;
    }
    void (went ? unstamp() : stamp());
  };

  return (
    <button
      type="button"
      data-testid="went-pill"
      onClick={onTap}
      disabled={toggle.isPending}
      aria-pressed={went}
      aria-label={
        went ? undefined : GOING_COPY.past.ariaWent(artist, dateLabel)
      }
      className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-4 text-[15px] font-bold disabled:cursor-default"
      style={{
        minHeight: PILL_HEIGHT,
        background: went ? accent : 'transparent',
        borderColor: went ? accent : 'var(--border-strong)',
        color: went ? 'var(--fg-on-accent)' : 'var(--fg)',
        fontFamily: 'var(--font-ui)',
        letterSpacing: '-0.01em',
      }}
    >
      {went ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M20 6L9 17l-5-5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <VenueStamp
          venueSlug={venueSlug}
          venueName={venueName}
          variant="dashed"
          size={STAMP_SIZE}
        />
      )}
      {went ? GOING_COPY.past.wentPill : GOING_COPY.button.pastNo}
    </button>
  );
};
