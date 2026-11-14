// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { CounterSubmitSheet } from './CounterSubmitSheet';

const getToken = vi.fn(async () => 'test-token');
const refresh = vi.fn();

const authState = { isLoaded: true, isSignedIn: true };

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken, ...authState }),
}));

vi.mock('@/components/consumer/tier-picker/lazy', () => ({
  TierPickerSheet: ({ entry }: { entry: string }) => (
    <div data-testid="tier-picker" data-entry={entry} />
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

const renderSheetWithPreview = () =>
  render(
    <CounterSubmitSheet
      open
      onClose={vi.fn()}
      eventId="evt-1"
      disputedSubmissionId="sub-1"
      currentFloor={40}
      currentVendor="AXS"
      renderPreview={(update, onWithdraw) => (
        <button type="button" onClick={onWithdraw}>
          {`preview ${update.floor}`}
        </button>
      )}
    />,
  );

const renderSheet = () =>
  render(
    <CounterSubmitSheet
      open
      onClose={vi.fn()}
      eventId="evt-1"
      disputedSubmissionId="sub-1"
      currentFloor={40}
      currentVendor="AXS"
    />,
  );

// The sheet only POSTs once every field validates, so every submission test
// has to fill the whole form.
const fillRequiredFields = () => {
  fireEvent.change(screen.getByLabelText(/floor/i), {
    target: { value: '55' },
  });
  fireEvent.click(screen.getByRole('button', { name: /bought it myself/i }));
};

const submit = () =>
  fireEvent.click(screen.getByRole('button', { name: /submit|update/i }));

const lastPostBody = (): Record<string, unknown> => {
  const mockFetch = vi.mocked(global.fetch);
  const [, init] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1] ?? [];
  return JSON.parse(String(init?.body));
};

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ success: true }))),
  );
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  authState.isLoaded = true;
  authState.isSignedIn = true;
});

describe('CounterSubmitSheet signed-out gate (#1247)', () => {
  it('shows the tier picker instead of the form when there is no session', () => {
    authState.isSignedIn = false;
    renderSheet();

    expect(screen.queryByLabelText(/floor/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('tier-picker')).toHaveAttribute(
      'data-entry',
      'logged-out-price',
    );
  });

  it('renders the form while Clerk is still resolving', () => {
    authState.isLoaded = false;
    authState.isSignedIn = false;
    renderSheet();

    expect(screen.getByLabelText(/floor/i)).toBeInTheDocument();
  });
});

// A price update lands in the checked price's slot: the API copies its tier and
// vendor, so the sheet names that slot and asks for neither.
describe('CounterSubmitSheet slot', () => {
  it('asks for no tier or vendor', () => {
    renderSheet();
    expect(screen.queryByRole('button', { name: 'GA' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'VIP' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'Etix' })).toBeNull();
  });

  it("names the checked price's tier and vendor", () => {
    render(
      <CounterSubmitSheet
        open
        onClose={vi.fn()}
        eventId="evt-1"
        disputedSubmissionId="sub-1"
        currentFloor={40}
        currentVendor="AXS"
        currentTier="VIP"
      />,
    );
    const fields = screen.getAllByTestId('counter-locked-field');
    expect(fields.map((field) => field.textContent)).toEqual(['VIP', 'AXS']);
    expect(
      screen.getByText(/same tier and vendor as the listed price/i),
    ).toBeInTheDocument();
  });

  it('bolds the listed price in the subtitle', () => {
    renderSheet();
    expect(screen.getByText('$40').tagName).toBe('B');
  });

  it('posts without a tier or vendor', async () => {
    renderSheet();
    fillRequiredFields();
    submit();

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = lastPostBody();
    expect(body).not.toHaveProperty('tier');
    expect(body).not.toHaveProperty('vendor');
    expect(body).toMatchObject({
      priceMin: 55,
      howFound: 'bought_myself',
      disputedSubmissionId: 'sub-1',
    });
  });
});

// The B+ counter sheet (more-st-counter_m, more-st-counter_done_m).
describe('CounterSubmitSheet rail and states', () => {
  it('draws the open rail with the mark, an amber code and a boxed close', () => {
    renderSheet();
    expect(screen.getByTestId('price-rail-mark')).toBeInTheDocument();
    expect(screen.getByText('Price update')).toBeInTheDocument();
    expect(screen.getByTestId('counter-rail-code')).toHaveTextContent('Open');
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('keeps Submit disabled until a way of finding out is picked', () => {
    renderSheet();
    const submitButton = screen.getByRole('button', { name: 'Submit update' });
    expect(submitButton).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /saw the listing/i }));
    expect(submitButton).toBeEnabled();
  });

  it('puts the honesty footnote under the button, not in a box above it', () => {
    renderSheet();
    const note = screen.getByText(/intentionally false reports/i);
    const button = screen.getByRole('button', { name: 'Submit update' });
    expect(
      button.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('draws the sent rail and the preview once the update is filed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              success: true,
              data: {
                id: 'new-1',
                priceMin: 55,
                priceMax: null,
                createdAt: new Date().toISOString(),
              },
            }),
          ),
      ),
    );
    renderSheetWithPreview();
    fillRequiredFields();
    submit();

    expect(await screen.findByText('Update submitted.')).toBeInTheDocument();
    expect(screen.getByText('Got it · Submitted')).toBeInTheDocument();
    expect(screen.getByTestId('counter-rail-code')).toHaveTextContent('Sent');
    expect(screen.getByText('preview 55')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Back to show' }),
    ).toBeInTheDocument();
  });

  it('withdraws the new update from the success screen and closes', async () => {
    const onClose = vi.fn();
    const fetchMock = vi.fn(
      async (_url: string, init?: RequestInit) =>
        new Response(
          JSON.stringify({
            success: true,
            data:
              init?.method === 'DELETE' ? null : { id: 'new-1', priceMin: 55 },
          }),
        ),
    );
    vi.stubGlobal('fetch', fetchMock);
    render(
      <CounterSubmitSheet
        open
        onClose={onClose}
        eventId="evt-1"
        disputedSubmissionId="sub-1"
        currentFloor={40}
        currentVendor="AXS"
        renderPreview={(update, onWithdraw) => (
          <button type="button" onClick={onWithdraw}>
            {`preview ${update.floor}`}
          </button>
        )}
      />,
    );
    fillRequiredFields();
    submit();
    fireEvent.click(await screen.findByText('preview 55'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const del = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'DELETE',
    );
    expect(del?.[0]).toMatch(/\/v1\/submissions\/new-1$/);
  });

  it('draws the error rail in the danger colour', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 500 })),
    );
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderSheet();
    fillRequiredFields();
    submit();

    expect(await screen.findByText("Didn't go through.")).toBeInTheDocument();
    expect(screen.getByTestId('counter-rail-code')).toHaveStyle({
      color: 'var(--danger)',
    });
  });
});
