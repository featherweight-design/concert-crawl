'use client';

// The "I'm going!" commitment CTA (#70), from
// design_handoff_concert_history/going-cta.jsx:77-182.
//
// The button is shaped like a ticket stub, and once committed it fills with
// the venue's stamp colour and snaps the venue's stamp into the stub hole — so
// the button visually *becomes* the stamp it will be in Concerts. The B+ board
// (`addendum-3/04/event-past-d`) draws it: the venue's ring colour as the
// fill, a dark hole holding the venue's stamp, and dark ink. Two artists at
// one venue get the same stub. The stamp in the hole is the shared round
// VenueStamp, untilted (design/design_handoff_bplus_redesign/README.md rule 4,
// and addendum 4 item 8 (PR #311)), which supersedes the board's rounded
// square.
//
// `past-yes` is a read-only fact; `past-no` is the "I went" pill, a live tap that
// stamps the night (edit-concerts PR3). Taking a stamp back out goes through the
// "Remove it from Concerts" line under the button, never the button itself.

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { VenueStamp } from '@/components/consumer/venue-stamp/VenueStamp';
import { stampColorsFor } from '@/lib/passport/stamp';
import { useThemeName } from '@/theme';
import { GOING_COPY } from './definitions/copy';
import { pillInkFor } from './lib/pill-ink';

export type GoingButtonState =
  | 'default'
  | 'going'
  | 'past-yes'
  | 'past-no'
  // Free or logged-out. Deliberately never disabled: a disabled control cannot
  // sell anything, and this one is the discovery surface for the perk.
  | 'locked'
  | 'error';
export type GoingButtonSize = 'sm' | 'md' | 'lg';

type GoingButtonProps = {
  show: {
    eventId: string;
    artist: string;
    date: string;
    /** Picks the stub's stamp glyph and colours. */
    venueSlug: string;
    /** For a venue with no glyph, whose identity art fills the stamp. */
    venueName: string;
  };
  state?: GoingButtonState;
  size?: GoingButtonSize;
  fullWidth?: boolean;
  pending?: boolean;
  onChange?: (going: boolean) => void;
};

export const GOING_BUTTON_SIZES: Record<
  GoingButtonSize,
  {
    height: number;
    padX: number;
    font: number;
    gap: number;
    hole: number;
    radius: number;
  }
> = {
  sm: { height: 36, padX: 12, font: 12, gap: 6, hole: 28, radius: 8 },
  md: { height: 44, padX: 16, font: 13.5, gap: 8, hole: 32, radius: 9 },
  // `event-past-d`: a 50px stub, a 50px hole holding a 36px stamp, 8px gap.
  lg: { height: 50, padX: 20, font: 15, gap: 8, hole: 36, radius: 10 },
};

/** The perforation's ink on the filled stub, as a share of the label ink. */
const PERFORATION_INK = 35;

const MIN_TAP_TARGET = 44;

// A plain YYYY-MM-DD is anchored at noon UTC before formatting — midnight would
// slip to the previous day in any negative-offset zone and label the night the
// user attended one day early.
const formatDate = (
  date: string,
  options: Intl.DateTimeFormatOptions,
): string =>
  new Intl.DateTimeFormat('en-US', {
    ...options,
    timeZone: 'America/Denver',
  }).format(new Date(`${date}T12:00:00Z`));

/** The button's label date, as drawn: "Sat, Nov 7" (event_stamped_m). */
const formatWentDate = (date: string): string =>
  formatDate(date, { weekday: 'short', month: 'short', day: 'numeric' });

/** The pill's accessible name keeps the year, which the drawn label drops. */
const formatWentDateFull = (date: string): string =>
  formatDate(date, { month: 'short', day: 'numeric', year: 'numeric' });

const LockIcon = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <rect
      x="4.5"
      y="10.5"
      width="15"
      height="10"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M8 10.5V7.5a4 4 0 118 0v3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const AlertIcon = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path
      d="M12 7.5v5.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="12" cy="16.5" r="1.2" fill="currentColor" />
  </svg>
);

const CheckIcon = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
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
);

export const GoingButton = ({
  show,
  state = 'default',
  size = 'lg',
  fullWidth = false,
  pending = false,
  onChange,
}: GoingButtonProps) => {
  const sizes = GOING_BUTTON_SIZES[size];
  // The venue's ring colour, never the artist's: the stub is the stamp the
  // night becomes, and a stamp is its venue's (B+ rule 4).
  const accent = stampColorsFor(show.venueSlug).ring;
  // The board draws dark ink on the fill. On Light the pale venue colours
  // fall under AA with `--bg`, so the ink is picked by contrast (#220).
  const ink = pillInkFor(accent, useThemeName());

  const isOn = state === 'going' || state === 'past-yes';
  // A stamped night reads as a fact; the way back out is the "Remove it" line
  // under the button. An unstamped past night is a live "I went" tap.
  const disabled = state === 'past-yes' || pending;

  const [announcement, setAnnouncement] = useState('');
  const previousState = useRef(state);

  // Only a real transition announces — mounting into `going` (a page load for a
  // show you already committed to) is not a state change the user just made.
  useEffect(() => {
    const was = previousState.current;
    previousState.current = state;
    if (was === state) return;
    if (state === 'going') setAnnouncement(GOING_COPY.button.stateChangeGoing);
    else if (was === 'going' && state === 'default') {
      setAnnouncement(GOING_COPY.button.stateChangeReleased);
    }
  }, [state]);

  // `locked` and `error` drop the ticket-stub interior and render as one
  // centred control. The stub is the shape of a night you committed to; neither
  // of these is that, and both keep the outer geometry so the row never jumps.
  if (state === 'locked' || state === 'error') {
    const isLocked = state === 'locked';
    const tone = isLocked ? 'var(--accent)' : 'var(--danger)';
    return (
      <button
        type="button"
        className="going-cta"
        // Never disabled: locked is the pitch, and error is the retry.
        aria-label={isLocked ? GOING_COPY.locked.aria : undefined}
        onClick={() => onChange?.(!isOn)}
        style={{
          all: 'unset',
          boxSizing: 'border-box',
          cursor: 'pointer',
          display: fullWidth ? 'flex' : 'inline-flex',
          width: fullWidth ? '100%' : 'auto',
          maxWidth: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          gap: sizes.gap,
          height: sizes.height,
          borderRadius: sizes.radius,
          padding: `0 ${sizes.padX}px`,
          border: `1.5px solid color-mix(in oklch, ${tone} 58%, transparent)`,
          background: `color-mix(in oklch, ${tone} 9%, transparent)`,
          color: tone,
          fontFamily: 'var(--font-ui)',
          fontWeight: 700,
          fontSize: sizes.font,
          letterSpacing: '-0.01em',
        }}
      >
        {isLocked ? (
          <LockIcon size={Math.round(sizes.font * 1.05)} />
        ) : (
          <AlertIcon size={Math.round(sizes.font * 1.05)} />
        )}
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {isLocked ? GOING_COPY.button.default : GOING_COPY.error.retry}
        </span>
      </button>
    );
  }

  const label =
    state === 'default'
      ? GOING_COPY.button.default
      : state === 'going'
        ? GOING_COPY.button.going
        : state === 'past-yes'
          ? GOING_COPY.button.pastYes(formatWentDate(show.date))
          : GOING_COPY.button.pastNo;

  const buttonStyle: CSSProperties = {
    all: 'unset',
    boxSizing: 'border-box',
    position: 'relative',
    cursor: disabled ? 'default' : 'pointer',
    display: fullWidth ? 'flex' : 'inline-flex',
    alignItems: 'stretch',
    width: fullWidth ? '100%' : 'auto',
    maxWidth: '100%',
    height: sizes.height,
    borderRadius: sizes.radius,
    // The venue colour only ever appears once the night is committed, and
    // then it is the whole fill (`event-past-d`). A verb never sits on --danger.
    background: isOn ? accent : 'var(--surface-1)',
    border: `1.5px solid ${isOn ? accent : 'var(--border-strong)'}`,
    // Both committed states sit on the venue fill, so both take the
    // contrast-picked ink: `--fg-on-accent` is white, under AA on Light.
    color: isOn ? ink.text : 'var(--fg)',
    fontFamily: 'var(--font-ui)',
    // The filled "You went" stub is 800 on the board; every other state is 700.
    fontWeight: state === 'past-yes' ? 800 : 700,
    fontSize: sizes.font,
    letterSpacing: '-0.01em',
    // `pending` blocks a second tap but is deliberately invisible: the caller
    // commits optimistically, so dimming here would undo the point of it.
    opacity: 1,
    transition:
      'background 160ms, border-color 160ms, color 160ms, opacity 150ms',
  };

  const tapPad = Math.max(0, (MIN_TAP_TARGET - sizes.height) / 2);

  return (
    <>
      <button
        type="button"
        className="going-cta"
        disabled={disabled}
        // `past-yes` is a read-only fact, so it carries no pressed state. The
        // unstamped pill is a toggle that reads as off (addendum 3, item 56).
        aria-pressed={
          state === 'past-yes'
            ? undefined
            : state === 'past-no'
              ? false
              : state === 'going'
        }
        aria-label={
          state === 'going'
            ? GOING_COPY.button.ariaGoing
            : state === 'default'
              ? GOING_COPY.button.ariaNotGoing
              : state === 'past-no'
                ? GOING_COPY.past.ariaWent(
                    show.artist,
                    formatWentDateFull(show.date),
                  )
                : undefined
        }
        onClick={() => {
          if (disabled) return;
          onChange?.(!isOn);
        }}
        style={buttonStyle}
      >
        {/* Extends the hit area to 44px without shrinking the drawn control.
            An overflowing child still routes its clicks to the button. */}
        {tapPad > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: -tapPad,
              bottom: -tapPad,
            }}
          />
        )}

        <span
          data-going-cta-hole=""
          style={{
            width: sizes.height,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            // Filled, the hole is the page's dark ground (`event-past-d`),
            // rounded to the stub's inner corner since the stub doesn't clip.
            background: isOn ? 'var(--bg)' : undefined,
            borderRadius: isOn
              ? `${sizes.radius - 1.5}px 0 0 ${sizes.radius - 1.5}px`
              : undefined,
            borderRight: `1.5px dashed ${
              isOn
                ? `color-mix(in oklch, ${ink.text} ${PERFORATION_INK}%, transparent)`
                : 'var(--border-strong)'
            }`,
          }}
        >
          {isOn ? (
            // The shared round VenueStamp, straight: only the Passport
            // booklet tilts (design/design_handoff_bplus_redesign/README.md
            // rule 4, and addendum 4 item 8 (PR #311)).
            <VenueStamp
              venueSlug={show.venueSlug}
              venueName={show.venueName}
              size={sizes.hole}
            />
          ) : state === 'past-no' ? (
            // The dashed ghost of the venue's stamp, until the night is
            // stamped (event_unmarked_m).
            <VenueStamp
              venueSlug={show.venueSlug}
              venueName={show.venueName}
              variant="dashed"
              size={sizes.hole}
            />
          ) : (
            <svg
              width={sizes.hole - 8}
              height={sizes.hole - 8}
              viewBox="0 0 24 24"
              fill="none"
              style={{ color: 'var(--fg-subtle)' }}
              aria-hidden="true"
              focusable="false"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="2 3"
                fill="none"
              />
            </svg>
          )}
        </span>

        <span
          style={{
            padding: `0 ${sizes.padX}px`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: sizes.gap,
            minWidth: 0,
            flex: fullWidth ? 1 : '0 0 auto',
            justifyContent: fullWidth ? 'center' : 'flex-start',
          }}
        >
          {(state === 'going' || state === 'past-yes') && (
            <CheckIcon size={Math.round(sizes.font * 0.95)} />
          )}
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </span>
        </span>
      </button>

      <span
        role="status"
        aria-live="polite"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
        }}
      >
        {announcement}
      </span>
    </>
  );
};
