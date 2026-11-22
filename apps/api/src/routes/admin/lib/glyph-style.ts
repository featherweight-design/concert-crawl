import {
  GLYPH_SVG_MAX_LENGTH,
  validateGlyphSvg,
  type GlyphSvgFailure,
} from '@concert-crawl/types';
import { z } from 'zod';

// Admin 3d: a venue's own glyph (`venues.glyph_svg`), an upload or a chosen
// draft. The style check in `validateGlyphSvg` is also the sanitizer, so the
// venue PATCH saves the SVG it rebuilds, never the string it was sent.

/** The PATCH refusal for a `glyphSvg` that fails the style check. */
export const GLYPH_STYLE_ERRORS: Record<GlyphSvgFailure, string> = {
  fill: 'This icon uses a fill. The set is stroke only.',
  offGrid: 'This icon runs off the 24-point grid.',
  invalid:
    'This isn’t an icon we can use. Upload a 24 × 24 SVG of strokes only.',
};

/** `glyphSvg` on the venue PATCH: checked, then saved as rebuilt. Null clears it. */
export const glyphSvgField = z
  .string()
  .max(GLYPH_SVG_MAX_LENGTH)
  .transform((val, ctx) => {
    const checked = validateGlyphSvg(val);
    if (checked.ok) return checked.svg;
    ctx.addIssue({
      code: 'custom',
      message: GLYPH_STYLE_ERRORS[checked.reason],
    });
    return z.NEVER;
  })
  .nullable()
  .optional();
