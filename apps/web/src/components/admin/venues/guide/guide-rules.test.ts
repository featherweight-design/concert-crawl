import { describe, expect, it } from 'vitest';
import type { VenueGuide } from '@concert-crawl/types';
import {
  GUIDE_SECTIONS,
  guideNeedsYou,
  publishBlocked,
  publishedCount,
  rowState,
  withSection,
} from './guide-rules';

const guide = (over: Partial<VenueGuide> = {}): VenueGuide => ({
  chips: [
    {
      chipType: 'accessibility',
      body: 'Ramp at the north door.',
      isPlaceholder: false,
    },
    { chipType: 'parking', body: 'Lot on Blake.', isPlaceholder: false },
  ],
  insiderTip: 'Come early.',
  publishedAt: null,
  ...over,
});

describe('guide rows', () => {
  it('runs the insider tip first, then the chip order', () => {
    expect(GUIDE_SECTIONS[0]).toBe('insider_tip');
    expect(GUIDE_SECTIONS).toHaveLength(9);
  });

  it('derives Missing, Draft, Published and Can’t document yet', () => {
    expect(rowState(guide(), 'transit')).toBe('missing');
    expect(rowState(guide(), 'parking')).toBe('draft');
    expect(rowState(guide(), 'insider_tip')).toBe('draft');
    expect(rowState(guide({ publishedAt: '2026-11-01' }), 'parking')).toBe(
      'published',
    );
    expect(rowState(guide({ insiderTip: '  ' }), 'insider_tip')).toBe(
      'missing',
    );
    const placeholder = guide({
      chips: [{ chipType: 'accessibility', body: '', isPlaceholder: true }],
      publishedAt: '2026-11-01',
    });
    expect(rowState(placeholder, 'accessibility')).toBe('cantDocument');
  });

  it('counts published chips out of 8, never the insider tip', () => {
    expect(publishedCount(guide())).toBe(0);
    expect(publishedCount(guide({ publishedAt: '2026-11-01' }))).toBe(2);
    expect(
      publishedCount(guide({ publishedAt: '2026-11-01', chips: [] })),
    ).toBe(0);
  });
});

describe('the publish gate and the tab dot', () => {
  it('blocks Publish while Accessibility is blank', () => {
    expect(publishBlocked(guide())).toBe(false);
    expect(publishBlocked(guide({ chips: [] }))).toBe(true);
    expect(
      publishBlocked(
        guide({
          chips: [{ chipType: 'accessibility', body: '', isPlaceholder: true }],
        }),
      ),
    ).toBe(false);
  });

  it('dots an unpublished guide, or a blocked one', () => {
    expect(guideNeedsYou(guide())).toBe(true);
    expect(guideNeedsYou(guide({ publishedAt: 'x' }))).toBe(false);
    expect(guideNeedsYou(guide({ publishedAt: 'x', chips: [] }))).toBe(true);
  });
});

describe('withSection', () => {
  it('replaces one chip and keeps the rest, in chip order', () => {
    const next = withSection(guide(), 'transit', {
      text: ' A-line. ',
      cantDocument: false,
    });
    expect(next.chips.map((chip) => chip.chipType)).toEqual([
      'accessibility',
      'parking',
      'transit',
    ]);
    expect(next.chips[2]?.body).toBe('A-line.');
    expect(next.insiderTip).toBe('Come early.');
  });

  it('drops a blanked chip and nulls a blanked tip', () => {
    expect(
      withSection(guide(), 'parking', { text: ' ', cantDocument: false }).chips,
    ).toHaveLength(1);
    expect(
      withSection(guide(), 'insider_tip', { text: '', cantDocument: false })
        .insiderTip,
    ).toBeNull();
  });

  it('writes the honest placeholder for Can’t document yet', () => {
    const next = withSection(guide(), 'accessibility', {
      text: 'ignored',
      cantDocument: true,
    });
    expect(next.chips[0]).toEqual({
      chipType: 'accessibility',
      body: '',
      isPlaceholder: true,
    });
  });
});
