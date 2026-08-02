import { z } from 'zod'

// Shared so the public detail route can't reject a slug the admin API was
// willing to create. When the two drifted, a venue with a slug this rule
// allows but the reader's didn't would 404 despite existing and being active.
export const VENUE_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

export const venueSlug = () =>
  z
    .string()
    .min(2)
    .max(60)
    .regex(
      VENUE_SLUG_PATTERN,
      'Slug must be lowercase alphanumeric with hyphens, starting and ending with alphanumeric',
    )
