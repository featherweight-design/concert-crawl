// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { AdminSettings } from '@concert-crawl/types';
import { budgetPatch, parseBudget } from './budget-model';

const { mockPatch, mockRefresh } = vi.hoisted(() => ({
  mockPatch:
    vi.fn<(path: string, token: string, body: unknown) => Promise<unknown>>(),
  mockRefresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'token' }),
}));
vi.mock('@/lib/api', () => ({
  apiClient: {
    patch: (path: string, token: string, body: unknown) =>
      mockPatch(path, token, body),
  },
}));

import { LlmBudgetControl } from './LlmBudgetControl';

const settings: AdminSettings = {
  llmMonthlyBudgetUsd: 15,
  llmBudgetWarnAtPercent: 75,
  llmBudgetFallbackToStructured: false,
  approvePricesMyself: false,
  updatedAt: null,
  updatedBy: null,
};

const mount = (patch: Partial<AdminSettings> = {}) =>
  render(
    <LlmBudgetControl
      settings={{ ...settings, ...patch }}
      spentUsd={4.12}
      paceUsd={10.4}
      lastMonthUsd={17.85}
    >
      <span>LLM tile</span>
    </LlmBudgetControl>,
  );

const open = () => fireEvent.click(screen.getByTestId('llm-budget-trigger'));

beforeEach(() => {
  mockPatch.mockReset();
  mockRefresh.mockReset();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('<LlmBudgetControl />', () => {
  it('opens from the tile with the saved values and the month figures', () => {
    mount();
    expect(screen.queryByText('Monthly LLM budget')).toBeNull();
    open();
    expect(screen.getByText('Monthly LLM budget')).toBeInTheDocument();
    expect(screen.getByLabelText('Budget per month')).toHaveValue('$15');
    expect(screen.getByRole('button', { name: '75%' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // The default: keep running and warn.
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    expect(
      screen.getByText(
        'Haiku keeps running past the budget, and I get a warning.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('$4.12 · on pace for $10.40')).toBeInTheDocument();
    expect(screen.getByText('$17.85')).toBeInTheDocument();
  });

  it('saves only what changed, closes, and refreshes the page data', async () => {
    mockPatch.mockResolvedValue({});
    mount();
    open();
    fireEvent.change(screen.getByLabelText('Budget per month'), {
      target: { value: '$25' },
    });
    fireEvent.click(screen.getByRole('button', { name: '90%' }));
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(mockPatch).toHaveBeenCalledWith('/v1/admin/settings', 'token', {
      llmMonthlyBudgetUsd: 25,
      llmBudgetWarnAtPercent: 90,
      llmBudgetFallbackToStructured: true,
    });
    expect(screen.queryByText('Monthly LLM budget')).toBeNull();
  });

  it('refuses an amount the API would, without a request', () => {
    mount();
    open();
    fireEvent.change(screen.getByLabelText('Budget per month'), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter an amount above $0 and up to $1000, or leave it empty.',
    );
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('stays open and says what is still saved when the save fails', async () => {
    mockPatch.mockRejectedValue(new Error('boom'));
    mount();
    open();
    fireEvent.change(screen.getByLabelText('Budget per month'), {
      target: { value: '30' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const toast = await screen.findByTestId('save-failed');
    expect(toast).toHaveTextContent("Couldn't change the LLM budget");
    expect(toast).toHaveTextContent('The budget is still $15.');
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(screen.getByText('Monthly LLM budget')).toBeInTheDocument();
  });

  it('closes on Cancel without a request', () => {
    mount();
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Monthly LLM budget')).toBeNull();
    expect(mockPatch).not.toHaveBeenCalled();
  });
});

describe('parseBudget', () => {
  it.each([
    ['$25', 25],
    ['25.50', 25.5],
    [' 1,000 ', 1000],
    ['', null],
    ['  ', null],
  ])('reads %j as %j', (raw, value) => {
    expect(parseBudget(raw)).toEqual({ ok: true, value });
  });

  it.each(['0', '-5', '1000.01', '12.345', 'abc', '2e3'])(
    'refuses %j',
    (raw) => {
      expect(parseBudget(raw)).toEqual({ ok: false });
    },
  );
});

describe('budgetPatch', () => {
  const saved = {
    llmMonthlyBudgetUsd: 15,
    llmBudgetWarnAtPercent: 75 as const,
    llmBudgetFallbackToStructured: false,
  };

  it('carries only the changed keys, and a cleared budget as null', () => {
    expect(budgetPatch(saved, saved)).toEqual({});
    expect(budgetPatch(saved, { ...saved, llmMonthlyBudgetUsd: null })).toEqual(
      { llmMonthlyBudgetUsd: null },
    );
    expect(
      budgetPatch(saved, { ...saved, llmBudgetFallbackToStructured: true }),
    ).toEqual({ llmBudgetFallbackToStructured: true });
  });
});
