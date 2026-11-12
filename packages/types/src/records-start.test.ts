import { describe, expect, it } from 'vitest';
import {
  RECORDS_START_MONTH,
  recordsStartFloor,
  recordsStartLabel,
  recordsStartShort,
} from './records-start.js';

describe('records start', () => {
  it('derives every form from the one month', () => {
    expect(RECORDS_START_MONTH).toBe('2026-03');
    expect(recordsStartFloor()).toBe('2026-03-01');
    expect(recordsStartLabel()).toBe('March 2026');
    expect(recordsStartShort()).toBe('MAR 2026');
  });
});
