// @vitest-environment jsdom
import '@testing-library/jest-dom';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import type { MergeCandidate, PreviewResult } from './merge-api';
import { CRAWLED, KEEP_CRAWLED, KEEP_MANUAL, MANUAL } from './merge-fixtures';

const COPY = ADMIN_COPY.eventEdit.merge;

const getToken = vi.fn(async () => 'token');
vi.mock('@clerk/nextjs', () => ({ useAuth: () => ({ getToken }) }));

const CANDIDATE: MergeCandidate = {
  id: MANUAL.id,
  title: MANUAL.title,
  date: MANUAL.date,
  showTime: null,
  manual: true,
  hidden: false,
  source: 'manual',
  addedBy: { handle: 'dlo' },
  watchers: 3,
  likely: true,
};

const candidates = vi.fn(
  async (_id: string, _signal?: AbortSignal): Promise<MergeCandidate[]> => [
    CANDIDATE,
  ],
);
const preview = vi.fn(
  async (kept: string, _source: string): Promise<PreviewResult> => ({
    kind: 'preview',
    preview: kept === CRAWLED.id ? KEEP_CRAWLED : KEEP_MANUAL,
  }),
);
const merge = vi.fn(
  async (_source: string, _target: string): Promise<'merged' | 'refused'> =>
    'merged',
);
vi.mock('./merge-api', () => ({
  mergeApi: () => ({ candidates, preview, merge }),
}));

const list = vi.fn(
  async (
    _filters: { query: string; when: string },
    _o: number,
    _l: number,
  ) => ({
    rows: [
      {
        id: 'e-search',
        title: 'Clipse at Ogden',
        date: '2026-11-13',
        venueName: 'Ogden Theatre',
        manual: false,
        watchingCount: 4,
      },
      {
        id: CRAWLED.id,
        title: CRAWLED.title,
        date: CRAWLED.date,
        venueName: 'Red Rocks',
        manual: false,
        watchingCount: 31,
      },
    ],
    total: 2,
    counts: {},
  }),
);
vi.mock('../list/events-api', () => ({
  eventsListApi: () => ({ list }),
}));

import { MergePanel, type MergeCurrent } from './MergePanel';

const CURRENT: MergeCurrent = {
  id: CRAWLED.id,
  title: CRAWLED.title,
  date: CRAWLED.date,
  venueName: 'Red Rocks',
  manual: false,
  watchers: 31,
};

const onClose = vi.fn();
const onMerged = vi.fn();
const renderPanel = (phone = false, when: 'upcoming' | 'past' = 'upcoming') =>
  render(
    <MergePanel
      phone={phone}
      current={CURRENT}
      when={when}
      onClose={onClose}
      onMerged={onMerged}
    />,
  );

/** Picks the likely candidate and waits for the compare step. */
const toCompare = async () => {
  fireEvent.click(await screen.findByTestId('merge-pick-row'));
  await screen.findByTestId('merge-summary');
};

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('MergePanel: pick', () => {
  it('lists this listing and the likely duplicate, on desktop and phone', async () => {
    renderPanel();
    expect(await screen.findByTestId('merge-pick-row')).toHaveTextContent(
      'Red Rocks · added by @dlo · 3 Watching',
    );
    expect(screen.getByTestId('merge-pick-current')).toHaveTextContent(
      'Red Rocks · the crawl · 31 Watching',
    );
    expect(screen.getByText(COPY.title)).toBeInTheDocument();
    cleanup();
    renderPanel(true);
    expect(await screen.findByTestId('merge-pick-row')).toBeInTheDocument();
    expect(screen.getByText(COPY.phoneTitle)).toBeInTheDocument();
  });

  it('retries a failed load of the candidates', async () => {
    candidates.mockRejectedValueOnce(new Error('down'));
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: COPY.retry }));
    expect(await screen.findByTestId('merge-pick-row')).toBeInTheDocument();
    expect(candidates).toHaveBeenCalledTimes(2);
  });

  it('searches the current side only, and leaves this listing out', async () => {
    renderPanel(false, 'past');
    await screen.findByTestId('merge-pick-row');
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'clipse' },
    });
    await waitFor(() => expect(list).toHaveBeenCalled());
    expect(list.mock.calls[0]?.[0]).toMatchObject({
      query: 'clipse',
      when: 'past',
    });
    await screen.findByText('Clipse at Ogden');
    expect(screen.getAllByTestId('merge-pick-row')).toHaveLength(2);
  });
});

describe('MergePanel: compare and merge', () => {
  it('reads both directions when a candidate is picked, keeping the first', async () => {
    renderPanel();
    await toCompare();
    expect(preview).toHaveBeenCalledWith(
      CRAWLED.id,
      MANUAL.id,
      expect.anything(),
    );
    expect(preview).toHaveBeenCalledWith(
      MANUAL.id,
      CRAWLED.id,
      expect.anything(),
    );
    const [first, second] = screen.getAllByRole('radio');
    expect(first).toBeChecked();
    expect(second).not.toBeChecked();
    expect(screen.getByTestId('merge-summary')).toHaveTextContent(
      'After merging: 34 Watching, one price, one report. The second listing redirects here.',
    );
    expect(
      screen.getByRole('button', { name: COPY.confirm('first') }),
    ).toBeEnabled();
  });

  it('moves KEEP on a tap, instantly, and rewords the summary and the button', async () => {
    renderPanel();
    await toCompare();
    const callsBefore = preview.mock.calls.length;
    fireEvent.click(screen.getByTestId('merge-card-second'));
    expect(screen.getAllByRole('radio')[1]).toBeChecked();
    expect(screen.getByTestId('merge-summary')).toHaveTextContent(
      'the $65–$495 price, one report. The first listing redirects here, and the next crawl updates this one instead of adding it again.',
    );
    expect(
      screen.getByRole('button', { name: COPY.confirm('second') }),
    ).toBeInTheDocument();
    expect(preview.mock.calls.length).toBe(callsBefore);
  });

  it('merges the other listing into this one, silently, and reports the kept id', async () => {
    renderPanel();
    await toCompare();
    fireEvent.click(
      screen.getByRole('button', { name: COPY.confirm('first') }),
    );
    await waitFor(() => expect(onMerged).toHaveBeenCalledWith(CRAWLED.id));
    // `:id` is the listing merged away; the kept one is the target.
    expect(merge).toHaveBeenCalledWith(MANUAL.id, CRAWLED.id);
  });

  it('merges this listing into the other when KEEP moved to it', async () => {
    renderPanel();
    await toCompare();
    fireEvent.click(screen.getByTestId('merge-card-second'));
    fireEvent.click(
      screen.getByRole('button', { name: COPY.confirm('second') }),
    );
    await waitFor(() => expect(onMerged).toHaveBeenCalledWith(MANUAL.id));
    expect(merge).toHaveBeenCalledWith(CRAWLED.id, MANUAL.id);
  });

  it('snaps back on a refused merge, says nothing moved, and repeats the same merge on Try again', async () => {
    merge.mockResolvedValueOnce('refused');
    renderPanel();
    await toCompare();
    fireEvent.click(
      screen.getByRole('button', { name: COPY.confirm('first') }),
    );
    expect(await screen.findByText(COPY.failedTitle)).toBeInTheDocument();
    expect(screen.getByText(COPY.failedBody)).toBeInTheDocument();
    expect(onMerged).not.toHaveBeenCalled();
    // The form is as it was: the button is back and KEEP did not move.
    expect(
      screen.getByRole('button', { name: COPY.confirm('first') }),
    ).toBeEnabled();
    fireEvent.click(
      screen.getByRole('button', {
        name: ADMIN_COPY.states.saveFailed.tryAgain,
      }),
    );
    await waitFor(() => expect(onMerged).toHaveBeenCalledWith(CRAWLED.id));
    expect(merge).toHaveBeenNthCalledWith(2, MANUAL.id, CRAWLED.id);
  });

  it('treats a thrown merge as a failure too', async () => {
    merge.mockRejectedValueOnce(new Error('offline'));
    renderPanel();
    await toCompare();
    fireEvent.click(
      screen.getByRole('button', { name: COPY.confirm('first') }),
    );
    expect(await screen.findByText(COPY.failedTitle)).toBeInTheDocument();
    expect(onMerged).not.toHaveBeenCalled();
  });

  it('sends one merge for a double press, and shows Merging… meanwhile', async () => {
    let finish: (value: 'merged') => void = () => undefined;
    merge.mockImplementationOnce(
      () =>
        new Promise<'merged'>((resolve) => {
          finish = resolve;
        }),
    );
    renderPanel();
    await toCompare();
    const button = screen.getByRole('button', { name: COPY.confirm('first') });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(
      await screen.findByRole('button', { name: COPY.merging }),
    ).toHaveAttribute('aria-busy', 'true');
    expect(merge).toHaveBeenCalledTimes(1);
    finish('merged');
    await waitFor(() => expect(onMerged).toHaveBeenCalledTimes(1));
  });

  it('says so when the comparison cannot load, and keeps Merge off', async () => {
    preview.mockRejectedValue(new Error('down'));
    renderPanel();
    fireEvent.click(await screen.findByTestId('merge-pick-row'));
    expect(await screen.findByTestId('merge-compare-failed')).toHaveTextContent(
      COPY.compareFailed,
    );
    expect(
      screen.getByRole('button', { name: COPY.confirm('first') }),
    ).toBeDisabled();
  });

  it('explains a refusal for one played and one upcoming show', async () => {
    preview.mockResolvedValue({
      kind: 'not-mergeable',
      reason: 'past_mismatch',
    });
    renderPanel();
    fireEvent.click(await screen.findByTestId('merge-pick-row'));
    expect(await screen.findByTestId('merge-compare-failed')).toHaveTextContent(
      COPY.pastMismatch,
    );
  });

  it('closes from Cancel', async () => {
    renderPanel();
    await toCompare();
    fireEvent.click(screen.getByRole('button', { name: COPY.cancel }));
    expect(onClose).toHaveBeenCalled();
  });
});
