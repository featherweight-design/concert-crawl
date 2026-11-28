import { z } from 'zod';
import { GUIDE_CHIP_ORDER } from '@concert-crawl/types';

/** What the API's guide-drafts route returns (3d-2): sections read off the venue's own pages. */
export const guideDraftsSchema = z.object({
  sources: z.array(
    z.object({
      url: z.string(),
      status: z.enum([
        'read',
        'notFound',
        'disallowed',
        'offSite',
        'unreachable',
        'skipped',
      ]),
    }),
  ),
  sections: z.array(
    z.object({
      chipType: z.enum(GUIDE_CHIP_ORDER),
      state: z.enum(['drafted', 'check', 'blank']),
      body: z.string(),
      sourceUrl: z.string().nullable(),
      note: z.string().nullable(),
    }),
  ),
  costUsd: z.number().nullable(),
});
export type GuideDrafts = z.infer<typeof guideDraftsSchema>;
export type GuideDraftSection = GuideDrafts['sections'][number];
export type GuideDraftSource = GuideDrafts['sources'][number];
