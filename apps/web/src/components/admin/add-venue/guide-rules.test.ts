import { describe, expect, it } from 'vitest';
import type { GuideDrafts } from '@/lib/admin/guide-drafts-schema';
import {
  EMPTY_FIELDS,
  anyWritten,
  draftedHost,
  guidePayload,
  mergeRedraft,
  pathOf,
  sourceLabel,
  tagOf,
} from './guide-rules';

const drafts = (over: Partial<GuideDrafts> = {}): GuideDrafts => ({
  sources: [
    { url: 'https://dazzledenver.com/faq', status: 'read' },
    { url: 'https://dazzledenver.com/policies', status: 'notFound' },
  ],
  sections: [
    {
      chipType: 'accessibility',
      state: 'drafted',
      body: 'Step-free entrance.',
      sourceUrl: 'https://dazzledenver.com/faq',
      note: null,
    },
    {
      chipType: 'parking',
      state: 'check',
      body: 'Garage nearby.',
      sourceUrl: 'https://dazzledenver.com/faq',
      note: 'Rates vary.',
    },
    {
      chipType: 'transit',
      state: 'blank',
      body: '',
      sourceUrl: null,
      note: null,
    },
  ],
  costUsd: 0.02,
  ...over,
});

describe('guide-rules', () => {
  it('tags a section by its draft state, and a hand-written blank as yours', () => {
    const sample = drafts();
    expect(tagOf(sample, 'accessibility', 'x')).toBe('drafted');
    expect(tagOf(sample, 'parking', 'x')).toBe('check');
    expect(tagOf(sample, 'transit', '')).toBe('blank');
    expect(tagOf(sample, 'transit', 'Bus 15')).toBe('yours');
    expect(tagOf(null, 'will_call', '')).toBe('blank');
  });

  it('sends only written sections, trimmed, and null for a blank tip', () => {
    const fields = {
      insiderTip: '   ',
      chips: { ...EMPTY_FIELDS.chips, parking: '  Garage  ' },
    };
    expect(guidePayload(fields)).toEqual({
      insiderTip: null,
      chips: [{ chipType: 'parking', body: 'Garage', isPlaceholder: false }],
    });
  });

  it('knows when anything, or Accessibility, is written', () => {
    expect(anyWritten(EMPTY_FIELDS)).toBe(false);
    expect(anyWritten({ ...EMPTY_FIELDS, insiderTip: 'Sit at the bar' })).toBe(
      true,
    );
  });

  it('keeps edited sections through a Redraft and refreshes untouched ones', () => {
    const before = drafts();
    const after = drafts({
      sections: [
        { ...before.sections[0]!, body: 'New accessibility text.' },
        { ...before.sections[1]!, body: 'New parking text.' },
        { ...before.sections[2]!, state: 'drafted', body: 'Bus 15.' },
      ],
    });
    const edited = {
      insiderTip: 'Mine',
      chips: {
        ...EMPTY_FIELDS.chips,
        accessibility: 'My words',
        parking: 'Garage nearby.',
      },
    };
    const merged = mergeRedraft(edited, before, after);
    expect(merged.chips.accessibility).toBe('My words');
    expect(merged.chips.parking).toBe('New parking text.');
    expect(merged.chips.transit).toBe('Bus 15.');
    expect(merged.insiderTip).toBe('Mine');
  });

  it('labels sources and the drafted host', () => {
    const sample = drafts();
    expect(sourceLabel(sample.sources[0]!)).toBe('dazzledenver.com/faq');
    expect(draftedHost(sample)).toBe('dazzledenver.com');
    expect(pathOf('https://dazzledenver.com/faq')).toBe('/faq');
    expect(draftedHost(drafts({ sources: [] }))).toBeNull();
  });
});
