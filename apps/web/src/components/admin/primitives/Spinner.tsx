/**
 * The admin's drawn spinner (`09/load-more`, `09/crawl-all-starting-m`): a
 * faint ring with a quarter arc, in the current colour. It turns only when
 * motion is allowed.
 */
export const Spinner = ({
  size,
  tone = 'currentColor',
}: {
  size: number;
  /** The stroke; the venue header's Crawling now turns it signal. */
  tone?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={tone}
    strokeWidth={2.4}
    strokeLinecap="round"
    aria-hidden
    className="motion-safe:animate-spin"
    style={{ flex: 'none' }}
  >
    <circle cx={12} cy={12} r={9} opacity={0.25} />
    <path d="M21 12a9 9 0 00-9-9" />
  </svg>
);
