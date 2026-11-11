import { cn } from '@/lib/utils';
import { GenreDot } from './GenreDot';

interface GenreChipsProps {
  genres: string[] | null;
  className?: string;
  maxChips?: number;
}

/**
 * Neutral genre chips (B+ rule 2): a surface fill, a muted label and a
 * hairline, with the genre's color only in the dot. A filled, colored chip
 * always means a status or a price, never a genre.
 */
export function GenreChips({ genres, className, maxChips }: GenreChipsProps) {
  if (!genres || genres.length === 0) return null;

  const chips =
    maxChips != null ? genres.slice(0, Math.max(1, maxChips)) : genres;

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {chips.map((tag) => (
        <span
          key={tag}
          data-testid="genre-chip"
          className="inline-flex items-center rounded-[5px] border border-border bg-surface-2 text-fg-muted"
          style={{
            gap: 5,
            padding: '2px 7px 2px 6px',
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            lineHeight: 1.5,
          }}
        >
          <GenreDot genre={tag} />
          <span>{tag}</span>
        </span>
      ))}
    </div>
  );
}
