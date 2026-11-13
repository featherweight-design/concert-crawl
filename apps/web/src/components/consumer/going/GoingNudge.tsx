'use client';

// The "Still going?" nudge banner (#70), from
// design_handoff_concert_history/going-cta.jsx:236-306.
//
// Appears beneath a Watching row while the night is still ahead. Tone is
// helpful, not nagging — one line, accent-tinted, no exclamation.
//
// B+ (README "My shows", rule 4): from sm up the dashed stamp the night will
// become leads the prompt, and the heading "Going to this show?" is followed by
// the day count (addendum 2 item 5). "Yes, going" is filled with that stamp's
// venue colour. The caller owns the window check and the per-device memory; this component only draws
// and reports whether the night was committed to or the nudge dismissed.

import type { CSSProperties } from 'react';
import type { WatchingShow } from '@concert-crawl/types';
import { GOING_COPY } from './definitions/copy';
import { VenueStamp, stampColorsFor } from '@/components/consumer/venue-stamp';
import { daysUntilLabel } from '@/lib/going/nudge-window';
import { useThemeName } from '@/theme';
import { pillInkFor } from './lib/pill-ink';

type GoingNudgeProps = {
  show: Pick<WatchingShow, 'artist' | 'date' | 'venueSlug' | 'venueName'>;
  onYes: () => void;
  onDismiss: () => void;
};

const MIN_TAP_TARGET = 44;

/**
 * The stamp motif inside "Yes, going" (`bp-watching`): a dashed ring around a
 * check, in the label's colour, on the pale disc behind it.
 */
const StampCheckIcon = () => (
  <svg
    data-testid="going-nudge-yes-icon"
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <circle
      cx={12}
      cy={12}
      r={10}
      stroke="currentColor"
      strokeWidth={2}
      strokeDasharray="3 2.5"
    />
    <path
      d="M16.5 8.5L10.5 15l-3-3"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const XIcon = () => (
  <svg
    width={11}
    height={11}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M18 6L6 18M6 6l12 12"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

const RESET: CSSProperties = {
  all: 'unset',
  boxSizing: 'border-box',
  cursor: 'pointer',
  flexShrink: 0,
  fontFamily: 'var(--font-ui)',
};

export const GoingNudge = ({ show, onYes, onDismiss }: GoingNudgeProps) => {
  // Rule 4: "Yes, going" is filled with the venue's stamp colour, the ring
  // colour the stamp takes once the night is attended. Pure hex, as the stamp
  // boards draw it. The same colour is the panel's left bar; the panel itself
  // is neutral.
  const accent = stampColorsFor(show.venueSlug).ring;
  // The boards draw `--bg` ink on that fill, all on dark themes. On Light the
  // pale venue colours fall to about 1.2:1 with `--bg`, so the ink is picked
  // by contrast: `--bg` where it reaches AA, else `--fg` (`pillInkFor`).
  const ink = pillInkFor(accent, useThemeName());

  return (
    <div
      // The banner appears passively when a show crosses into the window, so a
      // screen reader would otherwise never learn it exists.
      role="status"
      aria-live="polite"
      data-testid="going-nudge"
      // A darker inset panel with no outline: only a 3px bar in the show's
      // stamp colour on its left edge (`bp-watching`, `bp-m-watching_m`).
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px 10px 14px',
        background: 'color-mix(in oklch, var(--bg) 55%, var(--surface-1))',
        borderStyle: 'solid',
        borderTopWidth: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderLeftWidth: 3,
        borderLeftColor: accent,
        borderRadius: 10,
        color: 'var(--fg)',
      }}
    >
      <span className="hidden sm:inline-flex" data-testid="going-nudge-stamp">
        <VenueStamp
          venueSlug={show.venueSlug}
          venueName={show.venueName}
          variant="dashed"
          size={32}
        />
      </span>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {/* Addendum 2 item 5: the heading "Going to this show?" plus the day
            count, as live. */}
        <span
          data-testid="going-nudge-line"
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12.5,
            fontWeight: 700,
            letterSpacing: '-0.005em',
          }}
        >
          {GOING_COPY.nudge.heading}{' '}
          <span
            data-testid="going-nudge-days"
            style={{ color: 'var(--fg-muted)', fontWeight: 500 }}
          >
            {daysUntilLabel(show)}
          </span>
        </span>
        {/* Sans on a phone, as `bp-m-watching_m` sets it; mono from `sm`. */}
        <span
          data-testid="going-nudge-support"
          className="max-sm:[font-family:var(--font-ui)] sm:[font-family:var(--font-mono)] max-sm:text-[11.5px] sm:text-[10.5px]"
          style={{
            color: 'var(--fg-subtle)',
            letterSpacing: '0.02em',
          }}
        >
          {GOING_COPY.nudge.support}
        </span>
      </div>

      <button
        type="button"
        className="going-nudge-action"
        onClick={onYes}
        style={{
          ...RESET,
          padding: '7px 12px 7px 7px',
          borderRadius: 999,
          background: accent,
          color: ink.text,
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '-0.005em',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          whiteSpace: 'nowrap',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            borderRadius: '50%',
            // The pale disc the boards draw the stamp motif on: the token the
            // ink did not take, so the check always contrasts with it.
            background: `color-mix(in oklch, ${ink.disc} 85%, transparent)`,
          }}
        >
          <StampCheckIcon />
        </span>
        {GOING_COPY.nudge.yes}
      </button>

      {/* No "Not me" twin — the dismiss X already covers "not answering this",
          and two ways to say no on one banner is one too many. */}
      <button
        type="button"
        className="going-nudge-action"
        onClick={onDismiss}
        aria-label={GOING_COPY.nudge.dismiss}
        style={{
          ...RESET,
          position: 'relative',
          width: 22,
          height: 22,
          borderRadius: 5,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--fg-subtle)',
        }}
      >
        {/* Extends the hit area to 44px without growing the drawn glyph. */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: MIN_TAP_TARGET,
            height: MIN_TAP_TARGET,
          }}
        />
        <XIcon />
      </button>
    </div>
  );
};
