/**
 * The LLM half of the co-headliner backfill (#1203), split out from the script
 * so its tests exercise the Anthropic response shape without importing the
 * script module — which opens a DB connection at import time.
 *
 * Depends only on the Anthropic SDK and the pure helpers.
 */

import Anthropic from '@anthropic-ai/sdk'
import type {
  BatchHeadliners,
  EventForHeadlinerCheck,
} from './2026-08-03-co-headliner-backfill-helpers.js'

export const MODEL = 'claude-haiku-4-5-20251001'

const HEADLINER_TOOL_NAME = 'identify_headliners'

export const HEADLINER_RULES = `A HEADLINER is an act with top billing on the show. Return the ordered list of headliners for each event.

Rules:
- A band whose registered name contains "&", "+", or "and" is ONE act. NEVER split it.
  "Iron & Wine" is one headliner. "Hall & Oates" is one headliner.
  "Florence + the Machine" is one headliner. "Earth, Wind & Fire" is one headliner.
- Return more than one headliner ONLY when the bill genuinely presents two or more
  acts as co-equal top billing — an "A & B" co-headline tour, a split bill, or a
  dual-room night. When in doubt, return a single headliner.
- Opening and supporting acts must NOT appear in the headliner list. The supporting
  acts already recorded for the event are given to you so you can exclude them —
  unless one of them is in fact a co-equal headliner that was mis-filed.
- Use the exact spelling as it appears in the event's artist or supporting acts.
- Return one entry for EVERY event id given. Omitting an event is an error.`

export async function identifyHeadlinersBatch(
  client: Anthropic,
  batch: EventForHeadlinerCheck[],
): Promise<BatchHeadliners[]> {
  const tool: Anthropic.Tool = {
    name: HEADLINER_TOOL_NAME,
    description: 'Return the ordered list of headliners for each event',
    input_schema: {
      type: 'object' as const,
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              eventId: { type: 'string' },
              headliners: { type: 'array', items: { type: 'string' } },
            },
            required: ['eventId', 'headliners'],
          },
        },
      },
      required: ['results'],
    },
  }

  const eventList = batch
    .map(
      (evt) =>
        `- id: ${evt.id}\n  title: ${evt.title}\n  artist: ${evt.artist}\n  supporting acts: ${
          evt.supportingArtists && evt.supportingArtists.length > 0
            ? evt.supportingArtists.join(' | ')
            : '(none)'
        }\n  date: ${evt.date}\n  venue: ${evt.venueName}`,
    )
    .join('\n\n')

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    tools: [tool],
    tool_choice: { type: 'tool', name: HEADLINER_TOOL_NAME },
    messages: [
      {
        role: 'user',
        content: `Identify the headliners for each event below.

${HEADLINER_RULES}

Events:
${eventList}`,
      },
    ],
  })

  // Find a tool_use block AND verify it's our identify_headliners tool.
  // Forcing tool_choice constrains the response today, but a name check is
  // cheap insurance against a future schema where additional tools could be
  // invoked (or a Haiku regression that ignores tool_choice).
  const toolUseBlock = response.content.find(
    (blk) => blk.type === 'tool_use' && blk.name === HEADLINER_TOOL_NAME,
  )
  if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
    throw new Error(
      `LLM did not return a ${HEADLINER_TOOL_NAME} tool_use block`,
    )
  }
  const inputRaw = toolUseBlock.input
  if (typeof inputRaw !== 'object' || inputRaw === null) {
    throw new Error('LLM tool_use input was not an object')
  }
  const resultsField = 'results' in inputRaw ? inputRaw.results : undefined
  if (!Array.isArray(resultsField)) {
    throw new Error('LLM tool_use input.results was not an array')
  }
  return resultsField.map((entry: unknown): BatchHeadliners => {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      !('eventId' in entry) ||
      !('headliners' in entry)
    ) {
      throw new Error(`Malformed headliner entry: ${JSON.stringify(entry)}`)
    }
    const { eventId, headliners } = entry
    if (typeof eventId !== 'string') {
      throw new Error(
        `Headliner entry has wrong types: ${JSON.stringify(entry)}`,
      )
    }
    if (
      !Array.isArray(headliners) ||
      headliners.some((name) => typeof name !== 'string')
    ) {
      throw new Error(
        `Headliner entry has wrong types: ${JSON.stringify(entry)}`,
      )
    }
    const names: string[] = headliners.filter(
      (name): name is string => typeof name === 'string',
    )
    return { eventId, headliners: names }
  })
}
