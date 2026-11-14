import { describe, expect, it } from 'vitest';
import { MY_SHOWS_CTA_GRADIENT } from '@/components/consumer/history/definitions/constants';
import { SIGNAL_TO_CTA_END } from '@/components/settings/definitions/styles';
import { CREW_GRADIENT, pillPrimary } from './styles';

// addendum-4 03/cta-gradient-end: a gradient that FILLS a button under dark
// label text ends on --cta-end, never the raw accent.
describe('filled CTA gradients', () => {
  it.each([
    ['CREW_GRADIENT', CREW_GRADIENT],
    ['pillPrimary', String(pillPrimary.background)],
    ['MY_SHOWS_CTA_GRADIENT', MY_SHOWS_CTA_GRADIENT],
    ['SIGNAL_TO_CTA_END', SIGNAL_TO_CTA_END],
  ])('%s ends on --cta-end', (_name, value) => {
    expect(value).toContain('var(--cta-end)');
    expect(value).not.toContain('var(--accent)');
  });
});
