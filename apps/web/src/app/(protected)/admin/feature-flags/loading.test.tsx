// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import AdminFeatureFlagsLoading from './loading';

afterEach(cleanup);

describe('feature flags loading (07/loading-feature-flags)', () => {
  it('renders the busy skeleton with three flag rows', () => {
    render(<AdminFeatureFlagsLoading />);
    expect(screen.getByTestId('feature-flags-skeleton')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    const rows = screen.getAllByTestId('feature-flags-skeleton-row');
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.style.opacity)).toEqual(['1', '0.88', '0.76']);
    expect(rows[0]?.style.padding).toBe('13px 18px');
  });

  it('is a status announcing Loading', () => {
    render(<AdminFeatureFlagsLoading />);
    const status = screen.getByRole('status');
    expect(status).toBe(screen.getByTestId('feature-flags-skeleton'));
    expect(status).toHaveTextContent(ADMIN_COPY.states.loading);
    expect(screen.getByText(ADMIN_COPY.states.loading)).toHaveClass('sr-only');
  });
});
