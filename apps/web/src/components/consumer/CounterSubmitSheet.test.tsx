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
    // The line names the price and vendor; the tier and vendor are drawn as
    // locked fields, so they are not asked for.
    expect(
      screen.getByText(/Currently listed: \$40 on AXS\./),
    ).toBeInTheDocument();
    // Each locked value is read with its label (a term/definition pair).
    expect(screen.getAllByRole('term').map((node) => node.textContent)).toEqual(
      ['Tier', 'Where it’s listed'],
    );
    expect(
      screen.getAllByRole('definition').map((node) => node.textContent),
    ).toEqual(['VIP', 'AXS']);
    expect(screen.getByText('AXS')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /tier/i })).toBeNull();
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

// B9a answers a second fan's update with a 409 `price_check_update_pending`
// until migration 0100 lands: a status, never a raw server error.
describe('CounterSubmitSheet update already pending (409)', () => {
  it('shows the waiting state, not the error state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              success: false,
              error: 'Another update is already pending on this price.',
              code: 'price_check_update_pending',
            }),
            { status: 409 },
          ),
      ),
    );
    renderSheet();
    fillRequiredFields();
    submit();

    expect(await screen.findByText('Already waiting.')).toBeInTheDocument();
    expect(
      screen.getByText(
        'An update is already in review. Check back once it’s reviewed.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('sheet-rail')).toHaveTextContent('Waiting');
    expect(screen.queryByText("Didn't go through.")).toBeNull();
    expect(
      screen.queryByText('Another update is already pending on this price.'),
    ).toBeNull();
    // Refreshing now would flip the card under the open sheet: it waits for
    // the fan to dismiss the result.
    expect(refresh).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Back to show' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('treats any other 409 as an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ success: false, error: 'Conflict' }), {
            status: 409,
          }),
      ),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderSheet();
    fillRequiredFields();
    submit();

    expect(await screen.findByText("Didn't go through.")).toBeInTheDocument();
  });
});

describe('CounterSubmitSheet result states', () => {
  it('holds the success state, refreshing only on dismiss', async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    render(
      <CounterSubmitSheet
        open
        onClose={onClose}
        eventId="evt-1"
        disputedSubmissionId="sub-1"
        currentFloor={40}
        currentVendor="AXS"
        onSuccess={onSuccess}
      />,
    );
    fillRequiredFields();
    submit();

    const heading = await screen.findByRole('heading', {
      name: 'Update submitted.',
    });
    expect(refresh).not.toHaveBeenCalled();
    // Focus follows the result, since the submit button is gone.
    expect(heading).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Back to show' }));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('announces each result in one live region that stays mounted', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 500 })),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderSheet();
    const region = screen.getByRole('status');
    expect(region).toHaveTextContent('');

    fillRequiredFields();
    submit();
    await screen.findByRole('heading', { name: "Didn't go through." });
    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent("Didn't go through.");
    expect(
      screen.getByRole('heading', { name: "Didn't go through." }),
    ).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent('');
  });
});
