import { describe, it, expect } from 'vitest';
import { calculateCost, MODEL_RATES, type PricedModelId } from './cost.js';
import { GENRE_TAG_MODEL, LLM_EXTRACTION_MODEL } from './llm-models.js';

// 2,000 input + 500 output + 10,000 cache-read + 4,000 cache-write tokens.
const usage = {
  inputTokens: 2_000,
  outputTokens: 500,
  cacheReadTokens: 10_000,
  cacheWriteTokens: 4_000,
};

describe('calculateCost', () => {
  // Haiku 4.5: $1 in, $5 out, $0.10 cache read, $1.25 cache write per million.
  // 0.002 + 0.0025 + 0.001 + 0.005 = 0.0105
  it.each<PricedModelId>(['claude-haiku-4-5-20251001'])(
    'prices %s at Haiku 4.5 rates',
    (model) => {
      expect(calculateCost(usage, model)).toBeCloseTo(0.0105, 10);
    },
  );

  it('pins the per-million rates for every priced model', () => {
    const perMillion = Object.fromEntries(
      Object.entries(MODEL_RATES).map(([model, rates]) => [
        model,
        {
          input: rates.input * 1_000_000,
          output: rates.output * 1_000_000,
          cacheRead: rates.cacheRead * 1_000_000,
          cacheWrite: rates.cacheWrite * 1_000_000,
        },
      ]),
    );
    const haiku45 = { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 };
    expect(perMillion).toEqual({
      'claude-haiku-4-5-20251001': haiku45,
    });
  });

  it('prices every model the crawler calls', () => {
    for (const model of [LLM_EXTRACTION_MODEL, GENRE_TAG_MODEL]) {
      expect(calculateCost(usage, model)).toBeGreaterThan(0);
    }
  });
});
