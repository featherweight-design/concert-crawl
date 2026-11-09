import { z } from 'zod';

/**
 * The one schema for a row ID taken from a route param, query string or body.
 * Every API route validates IDs through it, so the Zod 4 upgrade changes the
 * rule in one place. On Zod 3 this is `z.string().uuid()`, a plain 8-4-4-4-12
 * hex shape check. Zod 4's `.uuid()` also requires RFC 9562 version and variant
 * bits, which staging's seeded fixture IDs (`5eeded00-0000-0000-0000-…`) do not
 * have, so the Zod 4 upgrade switches this to `z.guid()`, which keeps the shape
 * check.
 */
export const idSchema = z.guid();
