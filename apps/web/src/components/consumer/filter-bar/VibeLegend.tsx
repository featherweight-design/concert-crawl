import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { GenreDot } from '@/components/consumer/GenreDot';
import { genreLabel } from './filter-defs';

const copy = CONSUMER_COPY.filterBar;

/**
 * Each chosen Vibe's dot and name beside the count (`04-genre-and-vibe`), so
 * the filtered list teaches itself: the dot here is the dot on each row. The
 * sentence is for a screen reader; the dots are decorative.
 */
export const VibeLegend = ({ genres }: { genres: readonly string[] }) => (
  <span
    data-testid="vibe-legend"
    className="flex min-w-0 flex-wrap items-center gap-x-3.5 gap-y-1"
  >
    <span className="sr-only">
      {copy.vibeLegend(genres.map((genre) => genreLabel(genre)))}
    </span>
    {genres.map((genre) => (
      <span
        key={genre}
        aria-hidden="true"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-fg-muted"
      >
        <GenreDot genre={genre} size={8} />
        {genreLabel(genre)}
      </span>
    ))}
  </span>
);
