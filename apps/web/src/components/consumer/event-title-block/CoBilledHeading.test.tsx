// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CoBilledHeading } from './CoBilledHeading';

afterEach(cleanup);

const act = (name: string, slug: string | null) => ({ name, slug });

const renderHeading = (
  headliners: Array<{ name: string; slug: string | null }>,
  linkArtists = true,
) =>
  render(
    <CoBilledHeading
      headliners={headliners}
      linkArtists={linkArtists}
      as="h1"
      className="m-0"
      style={{}}
    />,
  );

describe('CoBilledHeading', () => {
  it('links each matched co-headliner inside one h1', () => {
    renderHeading([act('Clipse', 'clipse'), act('J.I.D', 'jid')]);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Clipse' })).toHaveAttribute(
      'href',
      '/artists/clipse',
    );
    expect(screen.getByRole('link', { name: 'J.I.D' })).toHaveAttribute(
      'href',
      '/artists/jid',
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Clipse & J.I.D',
    );
  });

  it('keeps an unmatched act as plain text', () => {
    renderHeading([act('Clipse', 'clipse'), act('J.I.D', null)]);

    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('heading').textContent).toContain('J.I.D');
  });

  it('draws no links when linking is off', () => {
    renderHeading([act('Clipse', 'clipse'), act('J.I.D', 'jid')], false);

    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('draws no chip for two acts', () => {
    renderHeading([act('A', 'a'), act('B', 'b')]);

    expect(screen.queryByTestId('cobill-chip-phone')).toBeNull();
    expect(screen.queryByTestId('cobill-chip-desktop')).toBeNull();
  });

  it('counts the hidden names for each breakpoint', () => {
    renderHeading([act('A', 'a'), act('B', 'b'), act('C', 'c'), act('D', 'd')]);

    expect(screen.getByTestId('cobill-chip-phone')).toHaveTextContent(
      '+2 more',
    );
    expect(screen.getByTestId('cobill-chip-desktop')).toHaveTextContent(
      '+1 more',
    );
  });

  it('has a phone chip only at three acts, since desktop shows all three', () => {
    renderHeading([act('A', 'a'), act('B', 'b'), act('C', 'c')]);

    expect(screen.getByTestId('cobill-chip-phone')).toHaveTextContent(
      '+1 more',
    );
    expect(screen.queryByTestId('cobill-chip-desktop')).toBeNull();
  });

  it('expands in place to every name, then collapses', () => {
    renderHeading([
      act('A', 'a'),
      act('B', 'b'),
      act('C', 'c'),
      act('D', null),
    ]);
    const chip = screen.getByTestId('cobill-chip-phone');

    fireEvent.click(chip);

    expect(chip).toHaveTextContent('Show fewer');
    expect(chip).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('heading').textContent).toBe('A, B, C & D');

    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-expanded', 'false');
  });

  it('hides the third name on a phone and the fourth everywhere until expanded', () => {
    renderHeading([act('A', 'a'), act('B', 'b'), act('C', 'c'), act('D', 'd')]);

    expect(screen.getByText('C').closest('span')).toHaveClass(
      'hidden',
      'lg:inline',
    );
    expect(screen.getByText('D').closest('span')).toHaveClass('hidden');
    expect(screen.getByText('D').closest('span')).not.toHaveClass('lg:inline');
  });
});
