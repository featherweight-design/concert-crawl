import { describe, expect, it } from 'vitest';
import {
  RECORDS_START_MONTH,
  recordsStartFloor,
  recordsStartLabel,
  recordsStartShort,
} from './records-start.js';

describe('records start', () => {
  it('derives every form from the one month', () => {
    expect(RECORDS_START_MONTH).toBe('2026-05');
    expect(recordsStartFloor()).toBe('2026-05-01');
    expect(recordsStartLabel()).toBe('May 2026');
    expect(recordsStartShort()).toBe('MAY 2026');
  });
});
