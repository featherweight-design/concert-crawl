import { describe, it, expect } from 'vitest';

import { titleStepPx } from './title-step';

describe('titleStepPx', () => {
  it('holds 38 for a wrapping name (hero-320-wrap)', () => {
    expect(titleStepPx('Thievery Corporation')).toBe(38);
  });

  it('steps a long single word down to 30 (hero-320-long-word)', () => {
    expect(titleStepPx('Superorganism')).toBe(30);
  });

  it('steps down to 26 for the longest words', () => {
    expect(titleStepPx('Supercalifragilistic')).toBe(26);
  });

  // The same number of letters, not the same width.
  it('sizes by measure, not by letter count', () => {
    expect(titleStepPx('Fliltjilll')).toBe(38);
    expect(titleStepPx('Wmwmwmwmwm')).toBe(26);
  });

  it('measures full-width scripts as a full em and ignores combining marks', () => {
    // Four kana fit the 38 step; ten do not.
    expect(titleStepPx('ヨルシカ')).toBe(38);
    expect(titleStepPx('あいうえおかきくけこ')).toBe(26);
    expect(titleStepPx('Gutiérrez')).toBe(titleStepPx('Gutiérrez'));
  });

  it('sizes by the longest word, not the whole name', () => {
    expect(titleStepPx('Red Rocks Park Amphitheatre')).toBe(30);
  });
});
