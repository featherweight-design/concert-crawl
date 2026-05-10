import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { and, eq, isNull } from 'drizzle-orm'
import { db, events, costTracking } from '@concert-crawl/db'
import { createLogger } from '@concert-crawl/logger'
import { calculateCost } from './cost.js'
import type { TokenUsage } from '../types.js'

const logger = createLogger('genre-tagger')
const MODEL = 'claude-haiku-4-5-20251001'

export type GenreLabel =
  | 'rock'
  | 'indie'
  | 'hip-hop'
  | 'electronic'
  | 'country'
  | 'jazz'
  | 'pop'
  | 'metal'

export interface GenreTagInput {
  id: string
  title: string
  artist: string
}

interface GenreTagResult {
  eventId: string
  genres: GenreLabel[]
}

const SYSTEM_PROMPT = `You are a music genre classifier. Given concert events, classify each into 1–3 genres from this list only: rock, indie, hip-hop, electronic, country, jazz, pop, metal.

Rules:
- Only use genres from the list above — no other values allowed
- Prefer fewer genres over more when uncertain
- Base classification on artist name and event title`

const TAG_GENRES_TOOL: Anthropic.Tool = {
  name: 'tag_genres',
  description: 'Tag each concert event with genre labels',
  input_schema: {
    type: 'object' as const,
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            eventId: { type: 'string', description: 'The event UUID' },
            genres: {
              type: 'array',
              items: {
                type: 'string',
                enum: [
                  'rock',
                  'indie',
                  'hip-hop',
                  'electronic',
                  'country',
                  'jazz',
                  'pop',
                  'metal',
                ],
              },
              description: '1–3 genre labels for this event',
            },
          },
          required: ['eventId', 'genres'],
        },
      },
    },
    required: ['results'],
  },
}

const TagResponseSchema = z.object({
  results: z.array(
    z.object({
      eventId: z.string(),
      genres: z.array(
        z.enum([
          'rock',
          'indie',
          'hip-hop',
          'electronic',
          'country',
          'jazz',
          'pop',
          'metal',
        ]),
      ),
    }),
  ),
})

export async function classifyGenres(eventInputs: GenreTagInput[]): Promise<{
  results: GenreTagResult[]
  tokenUsage: TokenUsage
}> {
  const client = new Anthropic()

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    tools: [TAG_GENRES_TOOL],
    tool_choice: { type: 'tool', name: 'tag_genres' },
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Tag these concert events with genres:\n${JSON.stringify(
          eventInputs.map((ev) => ({
            id: ev.id,
            title: ev.title,
            artist: ev.artist,
          })),
        )}`,
      },
    ],
  })

  const usage = response.usage
  const tokenUsage: TokenUsage = {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
  }

  const toolBlock = response.content.find((bl) => bl.type === 'tool_use')
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    logger.error('genre-tagger: no tool_use block in response')
    return { results: [], tokenUsage }
  }

  const parsed = TagResponseSchema.safeParse(toolBlock.input)
  if (!parsed.success) {
    logger.error(
      { error: parsed.error.message },
      'genre-tagger: invalid tool response schema',
    )
    return { results: [], tokenUsage }
  }

  return { results: parsed.data.results, tokenUsage }
}

export async function tagEventsWithGenres(
  venueId: string,
  crawlRunId?: string,
): Promise<void> {
  const untagged = await db
    .select({ id: events.id, title: events.title, artist: events.artist })
    .from(events)
    .where(and(eq(events.venueId, venueId), isNull(events.genre)))

  if (untagged.length === 0) {
    logger.info({ venueId }, 'No untagged events — skipping genre tagging')
    return
  }

  logger.info({ venueId, count: untagged.length }, 'Tagging events with genres')

  try {
    const { results, tokenUsage } = await classifyGenres(untagged)

    for (const { eventId, genres } of results) {
      await db
        .update(events)
        .set({ genre: genres })
        .where(eq(events.id, eventId))
    }

    const costUsd = calculateCost(tokenUsage)
    await db.insert(costTracking).values({
      service: 'genre-tagger',
      costUsd: costUsd.toFixed(6),
      tokensUsed: String(tokenUsage.inputTokens + tokenUsage.outputTokens),
      metadata: JSON.stringify({
        crawlRunId,
        venueId,
        eventsTagged: results.length,
        ...tokenUsage,
      }),
    })

    logger.info(
      { venueId, eventsTagged: results.length, costUsd },
      'Genre tagging complete',
    )
  } catch (err) {
    logger.error(
      { err, venueId },
      'Genre tagging failed — events will retry on next crawl',
    )
  }
}
