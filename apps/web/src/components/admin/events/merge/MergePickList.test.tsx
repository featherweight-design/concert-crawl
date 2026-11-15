// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MergePickList, type MergePickRow } from './MergePickList';

afterEach(cleanup);

const CURRENT: MergePickRow = {
  id: 'e1',
  title: 'Clipse & J.I.D',
  date: '2026-11-12',
  detail: 'Red Rocks · the crawl · 31 Watching',
};
const LIKELY: MergePickRow = {
  id: 'e2',
  title: 'CLIPSE with special guest JID',
  date: '2026-11-12',
  detail: 'Red Rocks · added by hand · 3 Watching',
};

const renderList = (
  props: Partial<Parameters<typeof MergePickList>[0]> = {},
) => {
  const onPick = vi.fn();
  const onRetry = vi.fn();
  const onQueryChange = vi.fn();
  render(
    <MergePickList
      current={CURRENT}
      venueName="Red Rocks"
      status="ready"
      likely={[LIKELY]}
      onPick={onPick}
      onRetry={onRetry}
      query=""
      onQueryChange={onQueryChange}
      results={null}
      searching={false}
      {...props}
    />,
  );
  return { onPick, onRetry, onQueryChange };
};

describe('MergePickList', () => {
  it('shows this listing and the likely duplicate, and picks it', () => {
    const { onPick } = renderList();
    expect(screen.getByTestId('merge-pick-current')).toHaveTextContent(
      'Clipse & J.I.D',
    );
    expect(screen.getByText('same venue and day')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('merge-pick-row'));
    expect(onPick).toHaveBeenCalledWith('e2');
  });

  it('shows a skeleton while the candidates load', () => {
    renderList({ status: 'loading', likely: [] });
    expect(screen.getByTestId('merge-pick-skeleton')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.queryByTestId('merge-pick-row')).toBeNull();
  });

  it('says nothing was found, naming the venue and day', () => {
    renderList({ likely: [] });
    expect(screen.getByTestId('merge-pick-nothing')).toHaveTextContent(
      'No other listing at Red Rocks on Thu Nov 12. If the duplicate has another date or venue, search for it.',
    );
  });

  it('offers a retry when the load fails', () => {
    const { onRetry } = renderList({ status: 'error', likely: [] });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Couldn’t load the other listings.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('reports the search and lists its results', () => {
    const { onPick, onQueryChange } = renderList({
      query: 'clip',
      results: [{ ...LIKELY, id: 'e3', title: 'Clipse at Ogden' }],
    });
    fireEvent.change(
      screen.getByRole('searchbox', { name: 'Search all shows' }),
      {
        target: { value: 'clipse' },
      },
    );
    expect(onQueryChange).toHaveBeenCalledWith('clipse');
    const rows = screen.getAllByTestId('merge-pick-row');
    fireEvent.click(rows[rows.length - 1] as HTMLElement);
    expect(onPick).toHaveBeenCalledWith('e3');
  });

  it('says when a search matched nothing', () => {
    renderList({ query: 'zzz', results: [] });
    expect(screen.getByText('No shows match.')).toBeInTheDocument();
  });
});
