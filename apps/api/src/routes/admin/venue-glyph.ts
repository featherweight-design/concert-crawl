import Anthropic from '@anthropic-ai/sdk';
import { zValidator } from '@hono/zod-validator';
import {
  recordLlmCost,
  VENUE_GLYPH_MODEL,
  type TokenUsage,
} from '@concert-crawl/crawler-core';
import { db, venues } from '@concert-crawl/db';
import { validateGlyphSvg, type GlyphSvgFailure } from '@concert-crawl/types';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { getAuthUser } from '../../middleware/auth.js';
import { apiLogger } from '../../lib/logger.js';
import { validationHook } from '../../lib/validator.js';
import type { AdminVariables } from './index.js';

// Admin 3d-1, glyph drafting (plan decision 10). Claude Haiku drafts four
// glyphs on the set's 24 grid from the venue's name and up to three reference
// images. Every draft goes through `validateGlyphSvg`: one that fails is
// hidden and counted by reason, never shown. Nothing is stored: a reference
// image is sent inline and dropped (decision 5), and a chosen draft is saved
// through the venue PATCH, which checks `glyphSvg` again (lib/glyph-style.ts).

export const GLYPH_DRAFT_COUNT = 4;
export const GLYPH_REFERENCE_MAX = 3;
/** Base64 characters per reference, about 750 KB of image. */
export const GLYPH_REFERENCE_MAX_CHARS = 1_000_000;
/** Three full references plus the JSON around them. */
const GLYPH_DRAFT_MAX_BODY_BYTES =
  GLYPH_REFERENCE_MAX * GLYPH_REFERENCE_MAX_CHARS + 16_000;

const venueParamSchema = z.object({ id: z.uuid() });

const draftGlyphsSchema = z
  .object({
    references: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(120),
            mediaType: z.enum([
              'image/jpeg',
              'image/png',
              'image/webp',
              'image/gif',
            ]),
            data: z.base64().max(GLYPH_REFERENCE_MAX_CHARS),
          })
          .strict(),
      )
      .max(GLYPH_REFERENCE_MAX)
      .default([]),
    // "Steer it (optional)" on the Icon step.
    steer: z.string().trim().max(200).optional(),
  })
  .strict();

// Each draft is read on its own, so one malformed draft hides only itself.
const modelReplySchema = z.object({ drafts: z.array(z.unknown()) });
const modelDraftSchema = z.object({
  label: z.string(),
  source: z.string().optional(),
  svg: z.string(),
});

export type GlyphDraftSource =
  { kind: 'reference'; name: string } | { kind: 'name' };

export interface GlyphDraft {
  label: string;
  source: GlyphDraftSource;
  svg: string;
}

export interface GlyphDraftsResult {
  drafts: GlyphDraft[];
  /** The drafts the style check hid, by reason ("Hidden 3 of 4"). */
  hidden: Record<GlyphSvgFailure, number> & { total: number };
  asked: number;
}

const buildPrompt = (
  venueName: string,
  referenceNames: string[],
  steer: string | undefined,
): string => `You draw venue icons for Concert Crawl, a Denver live music calendar. Draw ${GLYPH_DRAFT_COUNT} different icon drafts for the venue ${JSON.stringify(venueName)}.

${
  referenceNames.length > 0
    ? `The images are references, in order: ${referenceNames.map((name) => JSON.stringify(name)).join(', ')}. Trace what is distinctive in them (a sign, a marquee, the room). Draft from the name only where they don't help.`
    : 'There are no reference images. Draft from the venue name.'
}${steer ? `\nThe admin's steer, as a quoted string: ${JSON.stringify(steer)}` : ''}

Every icon must follow the house style exactly:
- <svg viewBox="0 0 24 24"> with only <path>, <circle>, <ellipse>, <line>, <polyline> and <rect> inside (optionally grouped in <g>).
- Strokes only. fill="none" everywhere; never a fill, gradient, text, image, style or transform.
- Every coordinate between 0 and 24. Simple, bold shapes that read at 24 pixels: 2 to 8 elements.
- Attributes in double quotes. No stroke colors; the app strokes them at 1.6.

Respond with only JSON, no markdown:
{"drafts":[{"label":"two or three words","source":"the reference image name it traces, or \\"name\\"","svg":"<svg ...>...</svg>"}]}`;

const recordGlyphCost = async (
  venueId: string,
  usage: Anthropic.Messages.Usage | undefined,
): Promise<void> => {
  try {
    const tokens: TokenUsage = {
      inputTokens: usage?.input_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? 0,
      cacheReadTokens: usage?.cache_read_input_tokens ?? 0,
      cacheWriteTokens: usage?.cache_creation_input_tokens ?? 0,
    };
    await recordLlmCost({
      service: 'venue-glyph',
      usage: tokens,
      model: VENUE_GLYPH_MODEL,
      metadata: { venueId },
    });
  } catch (err) {
    apiLogger.warn(
      { err, venueId },
      'glyph-drafts: could not record the LLM cost',
    );
  }
};

const stripFence = (text: string): string =>
  text
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();

/**
 * Checks the model's first four drafts: the passing ones and the hidden count.
 * The prompt asks for four, so anything past four is ignored.
 */
export const checkDrafts = (
  reply: z.infer<typeof modelReplySchema>,
  referenceNames: string[],
): GlyphDraftsResult => {
  const hidden = { fill: 0, offGrid: 0, invalid: 0, total: 0 };
  const drafts: GlyphDraft[] = [];
  const offered = reply.drafts.slice(0, GLYPH_DRAFT_COUNT);
  for (const item of offered) {
    const parsed = modelDraftSchema.safeParse(item);
    if (!parsed.success) {
      hidden.invalid += 1;
      hidden.total += 1;
      continue;
    }
    const draft = parsed.data;
    const checked = validateGlyphSvg(draft.svg);
    if (!checked.ok) {
      hidden[checked.reason] += 1;
      hidden.total += 1;
      continue;
    }
    const sourceName = draft.source?.trim();
    drafts.push({
      label: draft.label.trim().slice(0, 40) || 'Draft',
      source:
        sourceName !== undefined && referenceNames.includes(sourceName)
          ? { kind: 'reference', name: sourceName }
          : { kind: 'name' },
      svg: checked.svg,
    });
  }
  // A reply short of four counts its missing drafts as hidden, so the line
  // still reads against the four that were asked for.
  const missing = GLYPH_DRAFT_COUNT - offered.length;
  hidden.invalid += missing;
  hidden.total += missing;
  return { drafts, hidden, asked: GLYPH_DRAFT_COUNT };
};

/**
 * Anthropic refused an image: a 400 that names one. Any other 400 (a spent
 * credit balance, a malformed request) is an outage to the admin, not the image.
 */
const isImageRefused = (err: unknown, referenceCount: number): boolean =>
  referenceCount > 0 &&
  err instanceof Error &&
  'status' in err &&
  err.status === 400 &&
  /image/i.test(err.message);

export const venueGlyphAdminRouter = new Hono<AdminVariables>();

// POST /v1/admin/venues/:id/glyph-drafts — four style-checked glyph drafts.
// Persists nothing but its cost row and the audit.
venueGlyphAdminRouter.post(
  '/:id/glyph-drafts',
  bodyLimit({
    maxSize: GLYPH_DRAFT_MAX_BODY_BYTES,
    onError: (ctx) =>
      ctx.json(
        { success: false, error: 'Reference images are too large' },
        413,
      ),
  }),
  zValidator('param', venueParamSchema, validationHook),
  zValidator('json', draftGlyphsSchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const { references, steer } = ctx.req.valid('json');

    const [venue] = await db
      .select({ name: venues.name })
      .from(venues)
      .where(eq(venues.id, id));
    if (!venue) {
      return ctx.json({ success: false, error: 'Venue not found' }, 404);
    }

    // Audited before the call, so a failed attempt is on record too.
    ctx.set('auditAction', 'venue.glyph_draft');
    ctx.set('auditTargetId', id);
    ctx.set('auditActorId', getAuthUser(ctx).userId);
    const attempt = { references: references.length, steered: Boolean(steer) };
    ctx.set('auditMeta', { ...attempt, failed: true });

    const referenceNames = references.map((ref) => ref.name);
    let message: Anthropic.Messages.Message;
    try {
      const anthropic = new Anthropic();
      message = await anthropic.messages.create(
        {
          model: VENUE_GLYPH_MODEL,
          // Four drafts at the size cap fit, so a reply is never cut short.
          max_tokens: 8192,
          messages: [
            {
              role: 'user',
              content: [
                ...references.map(
                  (ref): Anthropic.Messages.ImageBlockParam => ({
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: ref.mediaType,
                      data: ref.data,
                    },
                  }),
                ),
                {
                  type: 'text',
                  text: buildPrompt(venue.name, referenceNames, steer),
                },
              ],
            },
          ],
        },
        { signal: AbortSignal.timeout(60_000) },
      );
    } catch (err) {
      apiLogger.error(
        { err, venueId: id },
        'glyph-drafts: Anthropic call failed',
      );
      // An image that doesn't match its type, or is too big: retrying the
      // same images won't help, so it says so.
      if (isImageRefused(err, references.length)) {
        return ctx.json(
          {
            success: false,
            error: 'A reference image could not be read. Try another image.',
          },
          422,
        );
      }
      return ctx.json(
        { success: false, error: 'Could not draft icons. Try again.' },
        503,
      );
    }

    // Paid whatever the reply holds, so recorded before any parsing bails.
    await recordGlyphCost(id, message.usage);

    const textBlock = message.content.find((block) => block.type === 'text');
    let parsed: unknown = null;
    if (textBlock?.type === 'text') {
      try {
        parsed = JSON.parse(stripFence(textBlock.text));
      } catch {
        parsed = null;
      }
    }
    const reply = modelReplySchema.safeParse(parsed);
    // An unreadable reply is four hidden drafts, not an error: the admin sees
    // "Hidden 4 of 4" and can draft again or upload.
    const result = checkDrafts(
      reply.success ? reply.data : { drafts: [] },
      referenceNames,
    );

    ctx.set('auditMeta', {
      ...attempt,
      passed: result.drafts.length,
      hidden: result.hidden,
    });

    return ctx.json({ success: true, data: result });
  },
);
