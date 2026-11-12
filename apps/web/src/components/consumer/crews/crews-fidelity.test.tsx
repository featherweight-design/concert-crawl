// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

import { EmptyState } from '../empty-state/EmptyState';
import { InviteShell } from './InviteShell';
import { gradientEdgeCard } from './lib/styles';

afterEach(cleanup);

describe('Crews B14 fidelity', () => {
  it('glows the invite page from the top centre over the ground', () => {
    render(
      <InviteShell>
        <span>hello</span>
      </InviteShell>,
    );
    const main = screen.getByRole('main');
    expect(main.style.background).toContain('radial-gradient');
    expect(main.style.background).toContain('var(--bg)');
  });

  it('runs the card edge cyan, pink, then back to the plain border', () => {
    expect(gradientEdgeCard.background).toContain(
      'linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box',
    );
  });

  it('draws the three-ticket medallion in the card empty state', () => {
    render(
      <EmptyState
        layout="card"
        glyph="tickets"
        eyebrow="Been there"
        title="No nights yet"
        body="Nights you go to together show up here."
      />,
    );
    const medallion = screen.getByTestId('empty-state-medallion');
    // Three fanned tickets, one path each.
    expect(medallion.querySelectorAll('svg path')).toHaveLength(3);
  });
});
