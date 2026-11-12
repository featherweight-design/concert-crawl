// The checkbox drawn at the end of each multi-select row (B+ `bp-f-filt_where_d`,
// `filt_venues_m`): an outlined square at rest, filled in the signal color
// with a dark check once picked. Decoration only: the row carries
// role="checkbox" and aria-checked.

interface CheckboxMarkProps {
  checked: boolean;
  size?: number;
  /** The checked fill. A Vibe row fills in its genre's color (`vibe_pop_d`). */
  color?: string;
}

export const CheckboxMark = ({
  checked,
  size = 18,
  color = 'var(--signal)',
}: CheckboxMarkProps) => {
  return (
    <span
      aria-hidden
      data-testid="checkbox-mark"
      className="inline-flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: 5,
        border: checked
          ? `1.5px solid ${color}`
          : '1.5px solid var(--border-strong)',
        background: checked ? color : 'transparent',
      }}
    >
      {checked && (
        <svg width={size - 6} height={size - 6} viewBox="0 0 12 12" fill="none">
          <path
            d="M2 6.5l2.5 2.5L10 3.5"
            stroke="var(--fg-on-accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
};
