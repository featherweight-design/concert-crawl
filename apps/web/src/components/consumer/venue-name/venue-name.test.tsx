// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { splitVenueName } from './split-venue-name';
import { VenueName } from './VenueName';

describe('splitVenueName', () => {
  it('skips the article and the generic noun', () => {
    expect(splitVenueName('The Church Nightclub')?.highlight).toBe('Church');
  });

  it('takes the distinctive run before a generic noun', () => {
    expect(splitVenueName('Red Rocks Amphitheatre')?.highlight).toBe(
      'Red Rocks',
    );
    expect(splitVenueName('Mission Ballroom')?.highlight).toBe('Mission');
  });

  it('takes a single distinctive word whole', () => {
    expect(splitVenueName('Hi-Dive')?.highlight).toBe('Hi-Dive');
  });

  it('returns null when every word is generic', () => {
    expect(splitVenueName('The Music Hall')).toBeNull();
    expect(splitVenueName('')).toBeNull();
  });

  it('ignores trailing punctuation when classifying and keeps it in place', () => {
    const parts = splitVenueName('Church Nightclub.');
    expect(parts?.highlight).toBe('Church');
    expect(parts?.after).toBe(' Nightclub.');
  });

  it('round-trips the name', () => {
    const parts = splitVenueName("The Cervantes' Masterpiece Ballroom");
    expect(parts && parts.before + parts.highlight + parts.after).toBe(
      "The Cervantes' Masterpiece Ballroom",
    );
  });
});

describe('VenueName', () => {
  it.each(['The Church Nightclub', 'Red Rocks Amphitheatre'])(
    'renders exactly one gradient span for %s',
    (name) => {
      const { container } = render(
        <h1>
          <VenueName name={name} />
        </h1>,
      );
      expect(
        container.querySelectorAll('[data-venue-name-gradient]'),
      ).toHaveLength(1);
      expect(container.querySelector('h1')?.textContent).toBe(name);
    },
  );

  it('renders no span when the name is all generic', () => {
    const { container } = render(<VenueName name="The Hall" />);
    expect(container.querySelector('[data-venue-name-gradient]')).toBeNull();
  });
});
