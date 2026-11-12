// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CostByDay } from './CostByDay';

afterEach(cleanup);

// Nov 2026: three days spent, the rest to come.
const spent = [0.3, 0.4, 0.5];
const series = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-11-${String(i + 1).padStart(2, '0')}`,
  costUsd: spent[i] ?? null,
}));

describe('CostByDay', () => {
  it('draws spent days as bars and days to come dashed', () => {
    const { container } = render(
      <CostByDay series={series} month={11} budgetUsd={15} />,
    );
    const rects = container.querySelectorAll('rect');
    const dashed = container.querySelectorAll('rect[stroke-dasharray]');
    expect(rects).toHaveLength(30);
    expect(dashed).toHaveLength(27);
    expect(screen.getByText('Nov 1')).toBeInTheDocument();
    expect(screen.getByText('Nov 30')).toBeInTheDocument();
  });

  it('shows the mean so far and the daily budget line', () => {
    const { container } = render(
      <CostByDay series={series} month={11} budgetUsd={15} />,
    );
    expect(screen.getByText('$0.40 a day')).toBeInTheDocument();
    expect(screen.getByText('Daily budget $0.50')).toBeInTheDocument();
    expect(container.querySelector('line')).not.toBeNull();
  });

  it('draws no budget line when no budget is set (gap G5)', () => {
    const { container } = render(
      <CostByDay series={series} month={11} budgetUsd={null} />,
    );
    expect(container.querySelector('line')).toBeNull();
    expect(screen.queryByText(/Daily budget/)).not.toBeInTheDocument();
  });
});
