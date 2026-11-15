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
    <div className="relative h-[380px] w-full shrink-0 lg:h-[340px]">
      {glyphKey !== null ? (
        // Addendum 5 item 11 ruled the phone size: about 140pt, as
        // `screens/10-venue-art/hero-m-redrocks` draws it (the sign spans about
        // 137pt of a 390 phone), so the glyph's 24-unit grid is 140 and the svg
        // (28 units across) is 163. This replaces the ~218pt grid measured from
        // the older `02-mobile/bp-m-venue_m.jpg`. From lg the desktop board (`bp-venue.jpg` / `hero-venue.jpg`) draws the
        // sign about a quarter larger than the 168 grid it used to get, so the
        // grid is 210 (245 svg) and the halo discs, which are in glyph units,
        // grow with it.
        <VenueNeonArt
          glyphKey={glyphKey}
          glyphSize={163}
          glyphSizeSm={245}
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
