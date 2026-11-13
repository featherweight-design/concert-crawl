// The "<venue> · <date>" line under a followed artist's name.
//
// It exists because the joined string in ONE nowrap+ellipsis span drops the
// DATE first, and the date is the actionable half. The Gate 5 walk caught
// "Red Rocks …" on a 285px desktop cell and "Red Rocks Amphitheatre · …" on a
// 390px mobile row — both of which tell you an artist is playing and refuse to
// say when. Same drop ladder as the event row: the venue ellipsises, the date
// is pinned.
//
// It takes the joined string rather than the parts because `ShelfArtist`
// carries `dateLine` already flattened, and both call sites should truncate
// identically.

import { FOLLOWING_COPY } from './definitions/copy';

const SEPARATOR = FOLLOWING_COPY.cardDateSeparator;

interface FollowDateLineProps {
  /** `venue · date`, or `null` when the artist has no announced date. */
  dateLine: string | null;
  /** Rendered whole, un-split, when there is no date. */
  fallback: string;
  style?: React.CSSProperties;
  /** `columns` puts the venue and the date side by side (the shelf card). */
  layout?: 'inline' | 'columns';
}

export const FollowDateLine = ({
  dateLine,
  fallback,
  style,
  layout = 'inline',
}: FollowDateLineProps) => {
  // Split on the LAST separator: a venue may contain one of its own.
  const cut = dateLine === null ? -1 : dateLine.lastIndexOf(SEPARATOR);

  if (dateLine === null || cut === -1) {
    return (
      <span
        className="overflow-hidden text-ellipsis whitespace-nowrap"
        style={style}
      >
        {dateLine ?? fallback}
      </span>
    );
  }

  // The shelf card sets them as the board draws it: the venue on the left, two
  // lines at most and ellipsised, and the date in a column of its own.
  if (layout === 'columns') {
    return (
      <span
        className="flex min-w-0 items-start justify-between gap-2"
        style={style}
      >
        <span className="line-clamp-2 min-w-0 break-words">
          {dateLine.slice(0, cut)}
        </span>
        <span className="shrink-0 whitespace-nowrap text-right">
          {dateLine.slice(cut + SEPARATOR.length)}
        </span>
      </span>
    );
  }

  return (
    <span className="flex min-w-0 items-baseline" style={style}>
      {/* `min-w-0` is load-bearing, not defensive. A flex item's automatic
          minimum size is its content, so without it the venue refuses to
          shrink and shoves the date out of the box — the exact failure this
          component exists to fix. `overflow-hidden` zeroes that minimum too,
          but then the fix rests on a side effect of a property someone could
          reasonably move to the parent. */}
      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
        {dateLine.slice(0, cut)}
      </span>
      {/* `pre`, not `nowrap`: the date half starts with the separator's own
          space, which a flex item would otherwise collapse ("Theater· Nov 13"). */}
      <span className="shrink-0 whitespace-pre">{dateLine.slice(cut)}</span>
    </span>
  );
};
