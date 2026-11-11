import type { QrPath } from '@/lib/poster/poster-rule';
import { POSTER_COPY } from '@/lib/poster/definitions/copy';
import { BRAND_COPY } from '@/components/brand/definitions/copy';
import {
  CORE,
  CORE_RADIUS,
  HALO,
  TRAIL,
  trailOpacity,
} from '@/components/brand/cc-mark';

export type PosterLook = 'night' | 'paper';

interface PosterSheetProps {
  /** What the QR encodes: the short link to the invite screen. */
  url: string;
  /** The short link without a scheme, for typing by hand. */
  typedUrl: string;
  code: string;
  qr: QrPath;
  /** Seats the code still lets in. */
  seats: number;
  /** Active venues, for the sub. */
  venueCount: number;
  /** Venue names cut to what fits three lines (`posterVenueLine`). */
  venueNames: readonly string[];
  /** True when the line had to stop short: it then ends "and more". */
  moreVenues: boolean;
  /** Night (Electric panel) or Paper (one black ink). */
  look?: PosterLook;
  /** Nine tear-off tabs along the bottom; the QR shrinks to 3.5 in. */
  tabs?: boolean;
}

/** CSS px per printed inch. */
const PX_PER_INCH = 96;
/** The QR's printed side in CSS px: 4.5 in, or 3.5 in with tabs. */
const QR_PX = { full: 432, tabs: 336 } as const;
/** The mark's side in CSS px: smaller with tabs, so the hero keeps its line. */
const MARK_PX = { full: 360, tabs: 290 } as const;
const TAB_COUNT = 9;
/**
 * Paper draws `HALO` as two stroked rings, outermost first; the outer one
 * steps in a unit so its stroke stays inside the halo's edge.
 */
const PAPER_RINGS = [
  { radius: HALO[0].radius - 1, strokeWidth: 1.2, opacity: 0.55 },
  { radius: HALO[1].radius, strokeWidth: 1.6, opacity: 0.8 },
] as const;

/** The CCMark drawn large: real geometry, filled on Night, one ink on Paper. */
function PosterMark({ size, paper }: { size: number; paper: boolean }) {
  return (
    <svg
      className="ps-mark-svg"
      width={size}
      height={size}
      viewBox="0 0 96 96"
      aria-hidden
      focusable="false"
    >
      {paper
        ? PAPER_RINGS.map((ring) => (
            <circle
              key={ring.radius}
              {...CORE}
              r={ring.radius}
              className="ps-ring"
              fill="none"
              strokeWidth={ring.strokeWidth}
              opacity={ring.opacity}
            />
          ))
        : HALO.map((ring) => (
            <circle
              key={ring.radius}
              {...CORE}
              r={ring.radius}
              className="ps-halo"
              opacity={ring.opacity}
            />
          ))}
      <circle {...CORE} r={CORE_RADIUS} className="ps-core" />
      {TRAIL.map((dot, i) => (
        <circle
          key={dot.cx}
          cx={dot.cx}
          cy={dot.cy}
          r={dot.radius}
          className="ps-trail"
          opacity={trailOpacity(i)}
        />
      ))}
    </svg>
  );
}

/**
 * The printed invite poster: US Letter (816 x 1056 CSS px). Night is the dark
 * Electric panel inside a designed-in 0.3 in paper frame; Paper is one black
 * ink for any printer. Every class it styles lives in `poster.css` beside the
 * page, and nothing here reads the app's theme. No launch date anywhere.
 */
export function PosterSheet({
  url,
  typedUrl,
  code,
  qr,
  seats,
  venueCount,
  venueNames,
  moreVenues,
  look = 'night',
  tabs = false,
}: PosterSheetProps) {
  const qrPx = tabs ? QR_PX.tabs : QR_PX.full;
  const lineItems = moreVenues
    ? [...venueNames, POSTER_COPY.andMore]
    : venueNames;
  return (
    <div
      className={`poster-sheet ${look}${tabs ? ' has-tabs' : ''}`}
      data-testid="poster-sheet"
      data-url={url}
      data-look={look}
      data-tabs={tabs}
    >
      <div className="ps-panel">
        <div className="ps-top">
          <span className="ps-wordmark">
            {BRAND_COPY.wordmark.lead}
            <span className="ps-wordmark-accent">
              {BRAND_COPY.wordmark.accent}
            </span>
          </span>
          <span className="ps-chip">{POSTER_COPY.chip}</span>
        </div>
        <div className="ps-hero">
          <div className="ps-copy">
            <p className="ps-kicker">{POSTER_COPY.kicker}</p>
            <h2 className="ps-head">
              {POSTER_COPY.headlineLead} <em>{POSTER_COPY.headlineEm}</em>
            </h2>
          </div>
          <div className="ps-mark">
            <PosterMark
              size={tabs ? MARK_PX.tabs : MARK_PX.full}
              paper={look === 'paper'}
            />
          </div>
        </div>
        <p className="ps-sub">{POSTER_COPY.sub(venueCount)}</p>
        {lineItems.length > 0 ? (
          <p className="ps-venues" data-testid="poster-venues">
            {lineItems.map((name, i) => (
              <span key={`${i}:${name}`}>
                {i > 0 ? (
                  <>
                    <span className="ps-vsep">·</span>
                    <wbr />
                  </>
                ) : null}
                {name}
              </span>
            ))}
          </p>
        ) : null}

        <div className="ps-qrcard">
          <div className="ps-qr">
            <svg
              className="ps-qr-svg"
              data-testid="poster-qr"
              data-inches={qrPx / PX_PER_INCH}
              width={qrPx}
              height={qrPx}
              role="img"
              aria-label={POSTER_COPY.qrLabel(code)}
              viewBox={`0 0 ${qr.size} ${qr.size}`}
              shapeRendering="crispEdges"
            >
              <rect width={qr.size} height={qr.size} fill="#fff" />
              <path d={qr.path} fill="#000" />
            </svg>
          </div>
          <div className="ps-side">
            <p className="ps-scan">{POSTER_COPY.scan}</p>
            <svg className="ps-arrow" viewBox="0 0 60 24" aria-hidden>
              <path
                d="M58 12H6M14 4L4 12l10 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="ps-seats">
              {POSTER_COPY.seatsLead}
              <b>{POSTER_COPY.seatsCount(seats)}</b>
              {POSTER_COPY.seatsTail}
            </p>
            <div className="ps-typed">
              <small>{POSTER_COPY.typed}</small>
              <b className="ps-url" data-testid="poster-typed-url">
                {typedUrl}
              </b>
              <small>{POSTER_COPY.codeLabel}</small>
              <b className="ps-code" data-testid="poster-code">
                {code}
              </b>
            </div>
          </div>
        </div>
        <p className="ps-fine">{POSTER_COPY.fine}</p>
      </div>
      {tabs ? (
        <div className="ps-tabs" data-testid="poster-tabs">
          {Array.from({ length: TAB_COUNT }, (_, i) => (
            <div className="ps-tab" key={i}>
              <span>{typedUrl}</span>
              <b>{code}</b>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
