// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type React from 'react';
import { WatchingEmpty } from './WatchingEmpty';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

// B+ `bp-s-empty_watching_m`: the dashed My shows empty card.
describe('WatchingEmpty', () => {
  it('draws the dashed card with the WATCHING eyebrow and the browse CTA', () => {
    render(<WatchingEmpty />);

    expect(screen.getByTestId('my-shows-empty-card').className).toContain(
      'border-dashed',
    );
    expect(screen.getByTestId('my-shows-empty-eyebrow')).toHaveTextContent(
      CONSUMER_COPY.watchingEmptyEyebrow,
    );
    expect(
      screen.getByRole('heading', { name: CONSUMER_COPY.watchingEmptyTitle }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: CONSUMER_COPY.watchingEmptyCta }),
    ).toHaveAttribute('href', '/events');
  });
});
