import { genreColor } from '@/lib/genre-color';

interface GenreDotProps {
  genre: string;
}

/**
 * The 7px dot that carries a genre chip's color (B+ rule 2). Decoration only:
 * the chip's label always names the genre, so color never carries it alone.
 */
export const GenreDot = ({ genre }: GenreDotProps) => (
  <span
    aria-hidden
    data-testid="genre-dot"
    className="inline-block shrink-0 rounded-full"
    style={{
      width: 7,
      height: 7,
      background: genreColor(genre) ?? 'var(--fg-subtle)',
    }}
  />
);
