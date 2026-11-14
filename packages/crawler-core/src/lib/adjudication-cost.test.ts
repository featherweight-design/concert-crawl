import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAdjudicate, mockRecordLlmCost } = vi.hoisted(() => ({
  mockAdjudicate: vi.fn(),
  mockRecordLlmCost: vi.fn(),
}));

vi.mock('./extractors/llm.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./extractors/llm.js')>()),
  adjudicateEventWithUsage: mockAdjudicate,
}));
vi.mock('./record-llm-cost.js', () => ({
  recordLlmCost: mockRecordLlmCost,
}));

import { createAdjudicationCost } from './adjudication-cost.js';
import { calculateCost } from './cost.js';
import { AdjudicationResponseError } from './extractors/llm.js';
import { LLM_EXTRACTION_MODEL } from './llm-models.js';

const USAGE = {
  inputTokens: 1000,
  outputTokens: 200,
  cacheReadTokens: 500,
  cacheWriteTokens: 0,
};
const VERDICT = {
  isConcert: true,
  headliners: ['Act'],
  supportingArtists: [],
  coversOtherArtists: false,
};
const INPUT = { title: 'Act', description: undefined };

beforeEach(() => {
  mockAdjudicate.mockReset();
  mockRecordLlmCost.mockReset().mockResolvedValue(0.01);
});

describe('createAdjudicationCost', () => {
  it('sums each answered call and writes one artist-adjudication row', async () => {
    mockAdjudicate.mockResolvedValue({ verdict: VERDICT, usage: USAGE });
    const tracker = createAdjudicationCost();
    await tracker.adjudicate(INPUT);
    await tracker.adjudicate(INPUT);

    const doubled = {
      inputTokens: 2000,
      outputTokens: 400,
      cacheReadTokens: 1000,
      cacheWriteTokens: 0,
    };
    expect(tracker.calls).toBe(2);
    expect(tracker.costUsd).toBe(calculateCost(doubled, LLM_EXTRACTION_MODEL));

    await tracker.record({ venueId: 'v1' });
    await tracker.record({ venueId: 'v1' });
    expect(mockRecordLlmCost).toHaveBeenCalledTimes(1);
    expect(mockRecordLlmCost).toHaveBeenCalledWith({
      service: 'artist-adjudication',
      usage: doubled,
      model: LLM_EXTRACTION_MODEL,
      metadata: { venueId: 'v1', calls: 2 },
    });
  });

  it('charges a billed call whose answer was malformed, and rethrows', async () => {
    const error = new AdjudicationResponseError('adjudicate_event: bad', USAGE);
    mockAdjudicate.mockRejectedValue(error);
    const tracker = createAdjudicationCost();

    await expect(tracker.adjudicate(INPUT)).rejects.toBe(error);
    expect(tracker.calls).toBe(1);
    expect(tracker.costUsd).toBe(calculateCost(USAGE, LLM_EXTRACTION_MODEL));
  });

  it('charges nothing for a call that never got an answer', async () => {
    mockAdjudicate.mockRejectedValue(new Error('network down'));
    const tracker = createAdjudicationCost();

    await expect(tracker.adjudicate(INPUT)).rejects.toThrow('network down');
    expect(tracker.calls).toBe(0);
    expect(await tracker.record({})).toBeNull();
    expect(mockRecordLlmCost).not.toHaveBeenCalled();
  });

  it('logs the lost usage and returns null when the write fails', async () => {
    mockAdjudicate.mockResolvedValue({ verdict: VERDICT, usage: USAGE });
    mockRecordLlmCost.mockRejectedValue(new Error('pool exhausted'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tracker = createAdjudicationCost();
    await tracker.adjudicate(INPUT);

    expect(await tracker.record({ venueId: 'v1' })).toBeNull();
    const logged = JSON.parse(String(warn.mock.calls[0]?.[0])) as Record<
      string,
      unknown
    >;
    expect(logged).toMatchObject({
      event: 'crawler.adjudication_cost_record_failed',
      venueId: 'v1',
      calls: 1,
      usage: USAGE,
      costUsd: calculateCost(USAGE, LLM_EXTRACTION_MODEL),
    });
    warn.mockRestore();
  });
});
