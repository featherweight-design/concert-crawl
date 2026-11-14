// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CrewLensList } from './CrewLensList';

describe('CrewLensList', () => {
  it('reads as a failure, not an empty crew, when the feed failed', () => {
    render(
      <CrewLensList
        crewId="crew-1"
        crewName="The Regulars"
        shows={[]}
        failed
        clearLensHref="/events?view=cal"
      />,
    );
    expect(
      screen.getByText(/Couldn't look through that crew/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/homebodies/)).not.toBeInTheDocument();
  });

  it('keeps the viewer’s other params when clearing the lens', () => {
    render(
      <CrewLensList
        crewId="crew-1"
        crewName="The Regulars"
        shows={[]}
        clearLensHref="/events?view=cal&genre=rock"
      />,
    );
    expect(screen.getByRole('link', { name: /Show everyone/ })).toHaveAttribute(
      'href',
      '/events?view=cal&genre=rock',
    );
  });
});
