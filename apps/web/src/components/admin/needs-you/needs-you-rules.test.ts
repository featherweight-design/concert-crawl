import { describe, expect, it } from 'vitest';
import { countAfterRemoval, evidenceText } from './needs-you-rules';

describe('evidenceText', () => {
  it('says an ISO date the way the rest of the app does', () => {
    expect(evidenceText('Next show', '2026-11-12')).toBe('Thu Nov 12');
    expect(evidenceText('Last seen', '2026-11-05T18:00:00Z')).toBe('Thu Nov 5');
  });

  it('puts an artist match status in words and passes the rest through', () => {
    expect(evidenceText('Match status', 'no_match')).toBe('No match found');
    expect(evidenceText('Match status', 'ambiguous')).toBe(
      'More than one artist fits',
    );
    expect(evidenceText('Match status', 'unmatched')).toBe('unmatched');
    expect(evidenceText('Page', '/events/abc')).toBe('/events/abc');
  });
});

describe('countAfterRemoval', () => {
  const count = {
    decisions: 3,
    handledToday: 2,
    byKind: {
      'show-dropped': 2,
      'show-moved': 0,
      'venue-failing': 1,
      'venue-blocked': 0,
      artist: 0,
      'event-low-confidence': 0,
      'price-check': 0,
      'price-batch': 0,
      bug: 0,
    },
  };

  it('an answer is one fewer of its kind and one more handled', () => {
    const next = countAfterRemoval(count, 'show-dropped');
    expect(next.decisions).toBe(2);
    expect(next.handledToday).toBe(3);
    expect(next.byKind['show-dropped']).toBe(1);
  });

  it('never goes below zero', () => {
    expect(countAfterRemoval(count, 'bug').byKind.bug).toBe(0);
  });
});
