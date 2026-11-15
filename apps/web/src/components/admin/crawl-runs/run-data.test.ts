import { describe, expect, it } from 'vitest';
import { parseRunRows } from './run-data';

const raw = {
  id: 'run-1',
  status: 'success',
  reason: null,
  eventsFound: 106,
  eventsInserted: 2,
  durationMs: 230000,
  llmCostUsd: 0.15,
  errorMessage: null,
  createdAt: '2026-11-10T10:01:00.000Z',
};

describe('parseRunRows: a test re-crawl', () => {
  it('keeps the trial flag, and reads an older API’s missing one as false', () => {
    const rows = parseRunRows([{ ...raw, trial: true }, raw]);
    expect(rows?.map((row) => row.trial)).toEqual([true, false]);
  });
});

describe('parseRunRows: the reader', () => {
  it('keeps the run’s extraction strategy', () => {
    expect(
      parseRunRows([{ ...raw, extractionStrategyUsed: 'llm' }])?.[0]
        ?.extractionStrategyUsed,
    ).toBe('llm');
  });

  it('keeps a row without one, or with a bad one, as no reader', () => {
    const rows = parseRunRows([raw, { ...raw, extractionStrategyUsed: 7 }]);
    expect(rows).toHaveLength(2);
    expect(rows?.[0]?.extractionStrategyUsed).toBeUndefined();
    expect(rows?.[1]?.extractionStrategyUsed).toBeNull();
  });
});
