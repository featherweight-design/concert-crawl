import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { and, eq, isNull } from 'drizzle-orm'
import { db, events, costTracking } from '@concert-crawl/db'
import { createLogger } from '@concert-crawl/logger'
import { calculateCost } from './cost.js'
import type { TokenUsage } from '../types.js'

const logger = createLogger('genre-tagger')
const MODEL = 'claude-haiku-4-5-20251001'

export const GENRE_TAG_BATCH_SIZE = 50

export interface GenreTagInput {
  id: string
  title: string
  artist: string
}

interface GenreTagResult {
  eventId: string
  genres: string[]
}

const SYSTEM_PROMPT = `You are a music genre classifier. Given concert events, classify each into 1–3 genres.

Use lowercase, common genre names (e.g. rock, indie, hip-hop, electronic, country, jazz, pop, metal, reggae, soul, blues, r&b, folk, classical, funk, latin, punk, alternative, gospel, world). Prefer well-known genre names over invented ones.

Rules:
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
              items: { type: 'string' },
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

const SingleResultSchema = z.object({
  eventId: z.string().uuid(),
  genres: z.array(z.string().min(1)).min(1).max(3),
})

const TagResponseSchema = z.object({
  results: z.array(z.unknown()).catch([]),
})

export function chunkArray<T>(arr: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error(`chunkArray: size must be a positive integer, got ${size}`)
  }
  const chunks: T[][] = []
  for (let idx = 0; idx < arr.length; idx += size) {
    chunks.push(arr.slice(idx, idx + size))
  }
  return chunks
}

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
            eventId: ev.id,
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

  const results: GenreTagResult[] = []
  for (const item of parsed.data.results) {
    const itemParsed = SingleResultSchema.safeParse(item)
    if (itemParsed.success) {
      results.push(itemParsed.data)
    }
  }

  if (eventInputs.length > 0 && results.length === 0) {
    logger.warn(
      { inputCount: eventInputs.length },
      'genre-tagger: LLM returned no usable results for non-empty input',
    )
  }

  return { results, tokenUsage }
}

export async function tagEventsWithGenres(
  venueId: string,
  crawlRunId?: string,
): Promise<void> {
  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      artist: events.artist,
      headliners: events.headliners,
      canonicalHeadliners: events.canonicalHeadliners,
    })
    .from(events)
    .where(and(eq(events.venueId, venueId), isNull(events.genre)))

  // An event with no artist string has nothing to infer a genre from, so it is
  // skipped rather than sent to the model with an empty artist field.
  //
  // An EMPTY canonical_headliners is the derivation ladder reporting that
  // nobody is billed, which is how a bingo night or a film screening looks.
  // `artist` is that event's display string and always populated, so without
  // this the model is handed a title in an "artist" field and duly invents a
  // genre for it. NULL is left alone: it is either a row the ladder has never
  // seen or an adjudicator outage that reached no verdict, and neither is a
  // ruling that nobody is billed. Only the empty array is that.
  //
  // Where the ladder DID name somebody, that bill is what the model gets —
  // `artist` may be an event-shaped title ("Jazz Series presents") sitting
  // alongside a real act, and a title is a worse genre signal than a name.
  // `headliners`, not the canonical form: the model reads display names, and
  // canonicalization strips the diacritics and casing it uses.
  const untagged: GenreTagInput[] = rows
    .filter((row) => {
      if (row.artist === null || row.artist.trim() === '') return false
      const ruledNobodyBilled =
        Array.isArray(row.canonicalHeadliners) &&
        row.canonicalHeadliners.length === 0
      return !ruledNobodyBilled
    })
    .map((row) => ({
      id: row.id,
      title: row.title ?? '',
      artist: row.headliners?.join(', ') ?? row.artist ?? '',
    }))

  if (untagged.length === 0) {
    logger.info({ venueId }, 'No untagged events — skipping genre tagging')
    return
  }

  logger.info({ venueId, count: untagged.length }, 'Tagging events with genres')

  try {
    const batches = chunkArray(untagged, GENRE_TAG_BATCH_SIZE)
    const allResults: GenreTagResult[] = []
    let totalTokenUsage: TokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    }

    for (const batch of batches) {
      const { results, tokenUsage } = await classifyGenres(batch)
      allResults.push(...results)
      totalTokenUsage = {
        inputTokens: totalTokenUsage.inputTokens + tokenUsage.inputTokens,
        outputTokens: totalTokenUsage.outputTokens + tokenUsage.outputTokens,
        cacheReadTokens:
          totalTokenUsage.cacheReadTokens + tokenUsage.cacheReadTokens,
        cacheWriteTokens:
          totalTokenUsage.cacheWriteTokens + tokenUsage.cacheWriteTokens,
      }
    }

    for (const { eventId, genres } of allResults) {
      await db
        .update(events)
        .set({ genre: genres })
        .where(eq(events.id, eventId))
    }

    const costUsd = calculateCost(totalTokenUsage)
    await db.insert(costTracking).values({
      service: 'genre-tagger',
      costUsd: costUsd.toFixed(6),
      tokensUsed: String(
        totalTokenUsage.inputTokens + totalTokenUsage.outputTokens,
      ),
      metadata: JSON.stringify({
        crawlRunId,
        venueId,
        eventsTagged: allResults.length,
        ...totalTokenUsage,
      }),
    })

    logger.info(
      { venueId, eventsTagged: allResults.length, costUsd },
      'Genre tagging complete',
    )
  } catch (err) {
    logger.error(
      { err, venueId },
      'Genre tagging failed — events will retry on next crawl',
    )
  }
}
