import { z } from 'zod';

/** What the API's glyph-drafts route returns (3d-1): drafts that passed the style check. */
export const glyphDraftsSchema = z.object({
  drafts: z.array(
    z.object({
      label: z.string(),
      source: z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('reference'), name: z.string() }),
        z.object({ kind: z.literal('name') }),
      ]),
      svg: z.string(),
    }),
  ),
  hidden: z.object({
    fill: z.number(),
    offGrid: z.number(),
    invalid: z.number(),
    total: z.number(),
  }),
  asked: z.number(),
});
export type GlyphDrafts = z.infer<typeof glyphDraftsSchema>;
export type GlyphDraftItem = GlyphDrafts['drafts'][number];

/** A reference image as the route takes it: inline base64, never stored. */
export interface GlyphReference {
  name: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  data: string;
}
