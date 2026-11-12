// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { StateCard } from './StateCard';

afterEach(cleanup);

describe('StateCard', () => {
  it('renders the title as a heading', () => {
    render(
      <StateCard
        icon={<i />}
        eyebrow="All caught up"
        title="Nothing yet"
        body="Later."
      />,
    );
    expect(screen.getByRole('heading', { name: 'Nothing yet' })).toBeTruthy();
  });

  it('names an alert by its title', () => {
    render(
      <StateCard
        tone="danger"
        role="alert"
        icon={<i />}
        eyebrow="Couldn't load"
        title="Try again"
        body="Check your connection."
      />,
    );
    expect(screen.getByRole('alert', { name: 'Try again' })).toBeTruthy();
  });

  it('adds no label when the card has no role', () => {
    render(<StateCard icon={<i />} eyebrow="e" title="t" body="b" />);
    expect(
      screen.getByTestId('state-card').getAttribute('aria-labelledby'),
    ).toBeNull();
  });
});
