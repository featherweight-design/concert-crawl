// The Followed mark (#750 addendum-8 §6): a --signal disc with a dark check.
// --accent is Watching's color and never appears here. Decorative: the row or
// card that carries it states the follow in its accessible name instead.

interface FollowedDiscProps {
  /** Disc diameter in px: 16 on a row, 20 on the hero card, 16 on the event page. */
  size: number;
  /** Ring in the page ground so the disc reads against any artwork. */
  ring?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const FollowedDisc = ({
  size,
  ring = 0,
  className,
  style,
}: FollowedDiscProps) => (
  <span
    aria-hidden="true"
    data-testid="followed-disc"
    className={`inline-flex shrink-0 items-center justify-center rounded-full bg-signal ${className ?? ''}`}
    style={{
      width: size,
      height: size,
      border: ring > 0 ? `${ring}px solid var(--bg)` : undefined,
      boxSizing: 'content-box',
      ...style,
    }}
  >
    <svg
      width={size * 0.6}
      height={size * 0.6}
      viewBox="0 0 12 12"
      fill="none"
      stroke="var(--bg)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 6.5l2.5 2.5 4.5-5.5" />
    </svg>
  </span>
);
