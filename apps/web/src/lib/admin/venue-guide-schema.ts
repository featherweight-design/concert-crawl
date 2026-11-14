import { z } from 'zod';
import { GUIDE_CHIP_ORDER, type VenueGuide } from '@concert-crawl/types';

/** The guide the API returns from its PUT, publish and unpublish routes. */
export const venueGuideSchema = z.object({
  chips: z.array(
    z.object({
      chipType: z.enum(GUIDE_CHIP_ORDER),
      body: z.string(),
      isPlaceholder: z.boolean(),
    }),
  ),
  insiderTip: z.string().nullable(),
  publishedAt: z.string().nullable(),
}) satisfies z.ZodType<VenueGuide>;
