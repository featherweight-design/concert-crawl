import { z } from 'zod';

/**
 * The one schema for a row ID taken from a route param, query string or body.
 * Every route validates IDs through it, so the Zod 4 upgrade changes the rule
 * in one place: Zod 4's `.uuid()` requires RFC 9562 version and variant bits,
 * which staging's seeded fixture IDs (`5eeded00-0000-0000-0000-…`) do not
 * have, and `z.guid()` keeps Zod 3's looser shape check.
 */
export const idSchema = z.string().uuid();
