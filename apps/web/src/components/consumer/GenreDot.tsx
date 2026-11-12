import { genreColor } from '@/lib/genre-color';

interface GenreDotProps {
  genre: string;
  /** 7px on a chip; the Vibe popover's rows draw a larger dot. */
  size?: number;
}

/**
 * The dot's glow, as the boards draw every genre chip (`shelf-see-all-m`:
 * `box-shadow: 0 0 6px rgba(<genre>,0.6)`).
 */
export const genreDotGlow = (color: string): string =>
  `0 0 6px color-mix(in oklch, ${color} 60%, transparent)`;

/**
 * The 7px dot that carries a genre chip's color (B+ rule 2), with its 6px
 * glow. Decoration only: the chip's label always names the genre, so color
 * never carries it alone. An unbucketed genre gets the flat `--fg-subtle` dot
 * and no glow: the boards only draw glowing dots in a genre's color.
 */
export const GenreDot = ({ genre, size = 7 }: GenreDotProps) => {
  const color = genreColor(genre);
  return (
    <span
      aria-hidden
      data-testid="genre-dot"
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: color ?? 'var(--fg-subtle)',
        ...(color !== null && { boxShadow: genreDotGlow(color) }),
      }}
    />
  );
};
