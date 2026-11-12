import { BackChip } from '@/components/consumer/back-chip/BackChip';
import { IdentityArt } from '@/components/consumer/identity-art/IdentityArt';
import { VenueNeonArt, venueGlyphKey } from '@/components/consumer/venue-glyph';

interface VenueHeroProps {
  slug: string;
  name: string;
}

/** The venue page hero, with its floating back chip. */
export function VenueHero({ slug, name }: VenueHeroProps) {
  const glyphKey = venueGlyphKey(slug);
  // The venue's glyph in neon (B+ rule 5), 380px on a phone. A venue with no
  // glyph keeps its identity art.
  return (
    <div className="relative h-[380px] w-full shrink-0 sm:h-[400px]">
      {glyphKey !== null ? (
        // Measured from `10-venue-art/hero-m-redrocks.jpg`: on a 390 phone the
        // glyph's 24-unit grid is ~140pt wide inside a ~185pt halo, so the svg
        // (28 units across) is 163. The audit's 267/295 is the container, not
        // the glyph, where the two disagree the specific hero board wins. No
        // desktop hero board measures differently, so from sm the grid stays at
        // the 168 it has always drawn (196 svg).
        <VenueNeonArt
          glyphKey={glyphKey}
          glyphSize={163}
          glyphSizeSm={196}
          align="endFromSm"
        />
      ) : (
        <>
          <div data-testid="venue-hero-identity" className="absolute inset-0">
            <IdentityArt
              kind="venue"
              name={name}
              scale="hero"
              style={{ position: 'absolute', inset: 0 }}
            />
          </div>
          {/* Image tint */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'var(--image-tint)' }}
            aria-hidden
          />
        </>
      )}
      {/* Bottom scrim: hands the art over to the theme's ground, so the
            title below reads on every theme, Light included. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
        style={{ background: 'linear-gradient(transparent, var(--bg))' }}
        aria-hidden
      />
      {/* Light theme only (design addendum 2 #178 item 16, \`venue-light-*\`):
          the backdrop goes pale under a wash of the ground, and the neon
          glyph keeps its own colours. */}
      <div
        data-testid="venue-hero-light-wash"
        className="pointer-events-none absolute inset-0 hidden [[data-theme=light]_&]:block"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--bg) 10%, transparent), color-mix(in srgb, var(--bg) 45%, transparent) 50%, var(--bg))',
        }}
        aria-hidden
      />
      {/* Floating back button */}
      <BackChip top={56} fallbackHref="/events" />
    </div>
  );
}
