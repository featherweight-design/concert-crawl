import { FollowedDisc } from './FollowedDisc';
import { FOLLOWED_COPY } from './definitions/copy';

const lineText = (names: readonly string[]): string => {
  const [first, second] = names;
  if (first === undefined) return '';
  if (second === undefined) return FOLLOWED_COPY.line.one(first);
  if (names.length === 2) return FOLLOWED_COPY.line.two(first, second);
  return FOLLOWED_COPY.line.many(names.length);
};

interface FollowedLineProps {
  /** Acts on the bill the viewer follows, as printed. Renders nothing when empty. */
  names: readonly string[];
}

/**
 * The event page's Followed line, one line under the date (addendum-8 §6):
 * a 16px disc and YOU FOLLOW {NAME} in 10.5px mono --signal. One line at
 * every width, names ellipsized.
 */
export const FollowedLine = ({ names }: FollowedLineProps) => {
  if (names.length === 0) return null;
  return (
    <div
      data-testid="event-followed-line"
      className="mt-2 flex min-w-0 max-w-full items-center justify-center gap-2 text-signal lg:justify-start"
    >
      <FollowedDisc size={16} />
      <span
        className="min-w-0 truncate uppercase"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10.5px',
          fontWeight: 700,
          letterSpacing: '0.08em',
        }}
      >
        {lineText(names)}
      </span>
    </div>
  );
};
