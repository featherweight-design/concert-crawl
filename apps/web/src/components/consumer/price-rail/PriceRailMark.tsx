/**
 * The rail's mark on the B+ price sheets (more-p-submit_m, bp-s-confirm_price_m,
 * bp-s-confirm_self_m): a 22px tile holding a pencil stroke that runs from blue
 * to pink, with a pink dot at its tip. The confirm and submit sheets share it.
 */
export function PriceRailMark() {
  return (
    <span
      aria-hidden="true"
      data-testid="price-rail-mark"
      className="flex shrink-0 items-center justify-center"
      style={{
        width: 22,
        height: 22,
        borderRadius: 7,
        background: 'var(--surface-2)',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <defs>
          <linearGradient
            id="price-rail-stroke"
            gradientUnits="userSpaceOnUse"
            x1="3"
            y1="13"
            x2="12"
            y2="4"
          >
            <stop stopColor="var(--signal)" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <path
          d="M3.5 12.5 11 5"
          stroke="url(#price-rail-stroke)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx="12.4" cy="3.8" r="1.8" fill="var(--accent)" />
      </svg>
    </span>
  );
}
