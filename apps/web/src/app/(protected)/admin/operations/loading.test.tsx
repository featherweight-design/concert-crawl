// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import AdminOperationsLoading from './loading';

afterEach(cleanup);

describe('operations loading (07/loading-activity-log)', () => {
  it('is a busy status announcing Loading', () => {
    render(<AdminOperationsLoading />);
    const status = screen.getByRole('status');
    expect(status).toBe(screen.getByTestId('operations-skeleton'));
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText(ADMIN_COPY.states.loading)).toHaveClass('sr-only');
  });

  it('marks the title bars for admin.css to hide on a phone', () => {
    render(<AdminOperationsLoading />);
    const head = screen.getByTestId('operations-skeleton-head');
    expect(head).toHaveClass('operations-skeleton-head');
    // admin.css owns display, so no inline value can beat its phone rule.
    expect(head.style.display).toBe('');
  });

  it('draws one tab pill, one per drawn tab', () => {
    render(<AdminOperationsLoading />);
    expect(screen.getAllByTestId('operations-skeleton-tab')).toHaveLength(1);
    expect(screen.getByTestId('operations-skeleton-tabs').style.gap).toBe(
      '18px',
    );
  });
});
