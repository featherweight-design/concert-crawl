import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { REDEEM_GRADIENT } from './_components/invite-landing/definitions/styles';

// Addendum 4 §3: one derived stop for gradients that FILL a CTA under dark
// label text. The themes are applied as inline custom properties on <html>, so
// the token must be derived from --accent, never a fixed colour, or a theme
// with another accent (Light, Cedar, ...) would end its CTA on the wrong pink.
describe('--cta-end', () => {
  const css = readFileSync(join(import.meta.dirname, 'globals.css'), 'utf8');

  it('is derived from the theme accent and signal', () => {
    expect(css).toContain(
      '--cta-end: color-mix(in srgb, var(--accent) 75%, var(--signal));',
    );
  });

  it('is what the invite Redeem fill ends on, not a fixed hex', () => {
    expect(REDEEM_GRADIENT).toBe(
      'linear-gradient(135deg, var(--signal), var(--cta-end))',
    );
  });
});
