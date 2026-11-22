import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { GenreDot } from '@/components/consumer/GenreDot';
import { genreLabel, isEveryVibePicked } from './filter-defs';

const copy = CONSUMER_COPY.filterBar;

/** Up to this many picks the legend names every one (addendum 11). */
const NAME_ALL_UP_TO = 4;
/** Past it, the legend names this many, then "+N more". */
const NAMES_SHOWN = 3;

/**
 * Each chosen Vibe's dot and name beside the count (`04-genre-and-vibe`), so
 * the filtered list teaches itself: the dot here is the dot on each row. The
 * sentence is for a screen reader and always names every pick; the dots are
 * decorative. The visible names cap so 16 never run to five lines at 320px:
 * up to four show whole, five to fifteen show three and "+N more", and all 16
 * show none (the chip already says "All vibes").
 */
export const VibeLegend = ({ genres }: { genres: readonly string[] }) => {
  const everyVibe = isEveryVibePicked(genres);
  const capped = genres.length > NAME_ALL_UP_TO;
  const shown = everyVibe ? [] : capped ? genres.slice(0, NAMES_SHOWN) : genres;
  const more = capped && !everyVibe ? genres.length - NAMES_SHOWN : 0;
  return (
    <span
      data-testid="vibe-legend"
      className="flex min-w-0 flex-wrap items-center gap-x-3.5 gap-y-1"
    >
      <span className="sr-only">
        {copy.vibeLegend(genres.map((genre) => genreLabel(genre)))}
      </span>
      {shown.map((genre) => (
        <span
          key={genre}
          aria-hidden="true"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-fg-muted"
        >
          <GenreDot genre={genre} size={8} />
          {genreLabel(genre)}
        </span>
      ))}
      {more > 0 && (
        <span
          aria-hidden="true"
          data-testid="vibe-legend-more"
          className="text-[11px] text-fg-subtle"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {copy.vibeLegendMore(more)}
        </span>
      )}
    </span>
  );
};
